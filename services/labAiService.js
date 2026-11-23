const { callGeminiAPI } = require('./geminiService');

const VALID_VERDICTS = new Set(['correct', 'partial', 'incorrect']);
const VALID_SEVERITIES = new Set(['error', 'warning', 'info']);

const LANGUAGE_CONSTRUCTS = {
  javascript: [/\bfunction\b/, /=>/, /\breturn\b/, /\bconst\b|\blet\b|\bvar\b/, /\bconsole\.log\b/, /\bif\b|\bfor\b|\bwhile\b/],
  typescript: [/\bfunction\b/, /=>/, /\breturn\b/, /\bconst\b|\blet\b/, /\binterface\b|\btype\b/, /\bif\b|\bfor\b/],
  python: [/\bdef\s+\w+/, /\breturn\b/, /\bprint\s*\(/, /\bif\b|\bfor\b|\bwhile\b/, /\bclass\s+\w+/],
  sql: [/\bselect\b/i, /\bfrom\b/i, /\bwhere\b|\bjoin\b|\bgroup\s+by\b|\border\s+by\b/i, /\binsert\b|\bupdate\b|\bdelete\b/i],
  html: [/<[a-z][\w-]*[^>]*>/i, /<\/[a-z][\w-]*>/i],
  css: [/[a-z.#][\w-]*\s*\{/, /:\s*[^;]+;/],
};

function isAiAvailable() {
  if (process.env.NODE_ENV === 'test') return false;
  const key = (process.env.GEMINI_API_KEY || process.env.AI_API_KEY || '').trim();
  return Boolean(key && !key.includes('your_gemini'));
}

function extractJsonObject(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  const cleaned = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

function clampScore(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function normalizeCode(code) {
  return String(code || '').replace(/\s+/g, ' ').trim();
}

function extractTokens(text) {
  if (!text) return new Set();
  const matches = String(text).toLowerCase().match(/[a-z_][a-z0-9_]{1,}|\d+/g) || [];
  return new Set(matches);
}

function computeTokenOverlap(sourceText, referenceText) {
  const refTokens = extractTokens(referenceText);
  if (refTokens.size === 0) return 0;
  const srcTokens = extractTokens(sourceText);
  let matched = 0;
  for (const token of refTokens) {
    if (srcTokens.has(token)) matched += 1;
  }
  return matched / refTokens.size;
}

function checkBalancedDelimiters(code) {
  const stack = [];
  const pairs = { ')': '(', '}': '{', ']': '[' };
  const opens = new Set(['(', '{', '[']);
  const issues = [];
  let inQuote = null;
  let escaped = false;
  let line = 1;

  for (let i = 0; i < code.length; i += 1) {
    const ch = code[i];
    if (ch === '\n') {
      line += 1;
      escaped = false;
      continue;
    }
    if (inQuote) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === inQuote) {
        inQuote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inQuote = ch;
      continue;
    }
    if (ch === '/' && code[i + 1] === '/') {
      while (i < code.length && code[i] !== '\n') i += 1;
      line += 1;
      continue;
    }
    if (opens.has(ch)) {
      stack.push({ ch, line });
    } else if (pairs[ch]) {
      const top = stack.pop();
      if (!top || top.ch !== pairs[ch]) {
        issues.push({
          line,
          severity: 'error',
          message: `Tanda kurung '${ch}' tidak memiliki pasangan pembuka yang sesuai.`,
          suggestion: 'Periksa kembali keseimbangan tanda kurung (), {}, dan [].',
        });
      }
    }
  }

  if (inQuote) {
    issues.push({
      line,
      severity: 'error',
      message: `String dengan tanda kutip ${inQuote} belum ditutup.`,
      suggestion: `Tambahkan tanda kutip penutup ${inQuote} pada akhir string.`,
    });
  }

  for (const unclosed of stack) {
    issues.push({
      line: unclosed.line,
      severity: 'error',
      message: `Tanda '${unclosed.ch}' pada baris ${unclosed.line} belum ditutup.`,
      suggestion: 'Tambahkan tanda kurung penutup yang sesuai.',
    });
  }

  return { balanced: issues.length === 0, issues: issues.slice(0, 5) };
}

function parseTestCases(rawCases) {
  if (!Array.isArray(rawCases)) return [];
  return rawCases
    .map((item, idx) => {
      if (typeof item === 'string') {
        return { description: item, expected: '' };
      }
      if (item && typeof item === 'object') {
        return {
          description: String(item.description || item.name || item.input || `Kasus uji ${idx + 1}`),
          expected: String(item.expected || item.output || ''),
        };
      }
      return null;
    })
    .filter(Boolean);
}

function normalizeAnalysisPayload(parsed, passingScore, provider) {
  const score = clampScore(parsed.score);
  const isCorrect = typeof parsed.is_correct === 'boolean'
    ? parsed.is_correct
    : score >= passingScore;
  const verdict = VALID_VERDICTS.has(parsed.verdict)
    ? parsed.verdict
    : (isCorrect ? 'correct' : (score >= 45 ? 'partial' : 'incorrect'));

  const rawAnalysis = parsed.ai_analysis && typeof parsed.ai_analysis === 'object'
    ? parsed.ai_analysis
    : {};

  const strengths = Array.isArray(rawAnalysis.strengths)
    ? rawAnalysis.strengths.map((s) => String(s)).filter(Boolean)
    : [];

  const issues = Array.isArray(rawAnalysis.issues)
    ? rawAnalysis.issues
        .filter((item) => item && typeof item === 'object')
        .map((item) => ({
          line: Number.isInteger(item.line) ? item.line : null,
          severity: VALID_SEVERITIES.has(item.severity) ? item.severity : 'info',
          message: String(item.message || 'Periksa kembali baris kode terkait.'),
          suggestion: String(item.suggestion || 'Sesuaikan logika dengan spesifikasi soal.'),
        }))
    : [];

  const testResults = Array.isArray(rawAnalysis.test_results)
    ? rawAnalysis.test_results
        .filter((item) => item && typeof item === 'object')
        .map((item) => ({
          description: String(item.description || 'Pengujian logika'),
          passed: Boolean(item.passed),
          detail: String(item.detail || ''),
        }))
    : [];

  const improvedHint = typeof rawAnalysis.improved_hint === 'string'
    ? rawAnalysis.improved_hint
    : 'Tinjau kembali alur logika dan bandingkan dengan contoh keluaran yang diharapkan.';

  return {
    is_correct: isCorrect,
    score,
    verdict,
    ai_feedback: typeof parsed.ai_feedback === 'string' && parsed.ai_feedback.trim()
      ? parsed.ai_feedback.trim()
      : 'Evaluasi kode selesai dilakukan.',
    ai_analysis: {
      strengths,
      issues,
      test_results: testResults,
      improved_hint: improvedHint,
    },
    ai_provider: provider,
  };
}

function buildHeuristicAnalysis({ lab = {}, submittedCode = '', language }) {
  const code = String(submittedCode || '');
  const trimmed = code.trim();
  const lang = String(language || lab.language || 'javascript').toLowerCase();
  const passingScore = Number(lab.passing_score) || 75;
  const testCases = parseTestCases(lab.test_cases);

  if (trimmed.length < 5) {
    return {
      is_correct: false,
      score: 0,
      verdict: 'incorrect',
      ai_feedback: 'Kode yang dikirim terlalu singkat atau kosong. Silakan tulis implementasi lengkap sesuai instruksi latihan.',
      ai_analysis: {
        strengths: [],
        issues: [{
          line: 1,
          severity: 'error',
          message: 'Kode kosong atau kurang dari 5 karakter.',
          suggestion: 'Lengkapi fungsi atau solusi berdasarkan deskripsi tugas terlebih dahulu.',
        }],
        test_results: testCases.map((tc) => ({
          description: tc.description,
          passed: false,
          detail: 'Belum ada kode yang dapat diuji.',
        })),
        improved_hint: Array.isArray(lab.hints) && lab.hints[0]
          ? String(lab.hints[0])
          : 'Mulai dengan mendefinisikan struktur dasar fungsi sesuai bahasa pemrograman yang dipilih.',
      },
      ai_provider: 'heuristic-fallback',
    };
  }

  if (lab.challenge_mode === 'fix' && lab.starter_code && normalizeCode(code) === normalizeCode(lab.starter_code)) {
    return {
      is_correct: false,
      score: 15,
      verdict: 'incorrect',
      ai_feedback: 'Kode yang dikirim masih sama persis dengan kode awal. Bug pada latihan ini belum diperbaiki.',
      ai_analysis: {
        strengths: ['Kode awal berhasil dimuat di editor.'],
        issues: [{
          line: null,
          severity: 'error',
          message: 'Belum ada perubahan perbaikan terhadap starter code.',
          suggestion: 'Identifikasi penyebab bug pada kode awal lalu ubah bagian yang bermasalah.',
        }],
        test_results: testCases.map((tc) => ({
          description: tc.description,
          passed: false,
          detail: 'Gagal karena bug pada kode awal belum diperbaiki.',
        })),
        improved_hint: Array.isArray(lab.hints) && lab.hints[0]
          ? String(lab.hints[0])
          : 'Perhatikan operator, kondisi percabangan, atau nilai kembalian yang tidak sesuai spesifikasi.',
      },
      ai_provider: 'heuristic-fallback',
    };
  }

  const strengths = [];
  const issues = [];
  let score = 20;

  // 1. Delimiter balance check
  const delimiterCheck = checkBalancedDelimiters(code);
  if (delimiterCheck.balanced) {
    score += 20;
    strengths.push('Struktur sintaks dasar dan keseimbangan tanda kurung sudah rapi.');
  } else {
    issues.push(...delimiterCheck.issues);
  }

  // 2. Language constructs check
  const patterns = LANGUAGE_CONSTRUCTS[lang] || LANGUAGE_CONSTRUCTS.javascript;
  const matchedConstructs = patterns.filter((re) => re.test(code)).length;
  if (matchedConstructs > 0) {
    const constructPoints = Math.min(20, matchedConstructs * 7);
    score += constructPoints;
    strengths.push(`Menggunakan konstruksi inti bahasa ${lang} secara tepat.`);
  } else {
    issues.push({
      line: null,
      severity: 'warning',
      message: `Konstruksi logika utama bahasa ${lang} belum terdeteksi dengan jelas.`,
      suggestion: `Pastikan kode memuat deklarasi fungsi, perintah output, atau ekspresi logika yang valid di ${lang}.`,
    });
  }

  // 3. Static safety & pure JS pattern check (never eval untrusted code)
  const isPureJs = lang === 'javascript' && !/\b(require|process|fs|fetch|eval|Function)\b/.test(code);
  if (isPureJs && /\breturn\b/.test(code) && (/\bfunction\b/.test(code) || /=>/.test(code))) {
    score += 10;
    strengths.push('Fungsi JavaScript mengembalikan nilai secara eksplisit dan aman dari efek samping eksternal.');
  }

  // 4. Similarity against solution_reference and expected_output
  const refSimilarity = lab.solution_reference ? computeTokenOverlap(code, lab.solution_reference) : 0;
  const expectedMatch = lab.expected_output
    ? code.toLowerCase().includes(String(lab.expected_output).trim().toLowerCase())
    : false;

  if (lab.solution_reference) {
    score += Math.round(refSimilarity * 35);
    if (refSimilarity >= 0.65) {
      strengths.push('Pendekatan solusi sangat selaras dengan referensi penyelesaian.');
    } else if (refSimilarity < 0.3) {
      issues.push({
        line: null,
        severity: 'warning',
        message: 'Logika solusi masih jauh dari struktur penyelesaian yang diharapkan.',
        suggestion: 'Cocokkan kembali nama fungsi, parameter, serta alur pengolahan data dengan deskripsi soal.',
      });
    }
  } else {
    // No solution reference configured: reward meaningful implementation length & structure
    if (trimmed.length >= 30 && delimiterCheck.balanced && matchedConstructs >= 2) {
      score += 25;
    }
  }

  if (expectedMatch) {
    score += 10;
    strengths.push('Keluaran yang diharapkan tercermin dalam implementasi kode.');
  }

  if (lab.challenge_mode === 'fix' && lab.starter_code && normalizeCode(code) !== normalizeCode(lab.starter_code)) {
    score += 10;
    strengths.push('Kode awal telah dimodifikasi untuk memperbaiki bug.');
  }

  score = clampScore(delimiterCheck.balanced ? score : Math.min(score, 55));
  const isCorrect = score >= passingScore && delimiterCheck.balanced;
  const verdict = isCorrect ? 'correct' : (score >= 45 ? 'partial' : 'incorrect');

  const testResults = testCases.length > 0
    ? testCases.map((tc, idx) => {
        const tcOverlap = tc.expected ? computeTokenOverlap(code, tc.expected) : refSimilarity;
        const passed = isCorrect || (delimiterCheck.balanced && (tcOverlap >= 0.5 || score >= passingScore - 5));
        return {
          description: tc.description || `Kasus uji ${idx + 1}`,
          passed,
          detail: passed
            ? 'Memenuhi kriteria analisis statis dan struktur solusi.'
            : 'Perlu penyesuaian logika agar keluaran sesuai ekspektasi.',
        };
      })
    : [{
        description: 'Validasi struktur sintaks dan kelengkapan logika',
        passed: isCorrect,
        detail: isCorrect
          ? 'Struktur kode valid dan memenuhi ambang kelulusan.'
          : 'Masih ditemukan kekurangan pada sintaks atau kelengkapan logika.',
      }];

  let aiFeedback;
  if (verdict === 'correct') {
    aiFeedback = `Bagus sekali! Solusi Anda mencapai skor ${score}/100 dan memenuhi kriteria kelulusan (${passingScore}). Struktur kode bersih dan logika sudah tepat.`;
  } else if (verdict === 'partial') {
    aiFeedback = `Solusi Anda sudah berada di jalur yang tepat dengan skor ${score}/100, namun belum mencapai batas lulus (${passingScore}). Perbaiki catatan yang diberikan untuk menyempurnakan kode.`;
  } else {
    aiFeedback = `Solusi Anda memperoleh skor ${score}/100 dan belum memenuhi spesifikasi latihan. Tinjau kembali daftar masalah serta petunjuk perbaikan di bawah ini.`;
  }

  const improvedHint = Array.isArray(lab.hints) && lab.hints.length > 0
    ? String(lab.hints[0])
    : 'Pastikan seluruh tanda kurung seimbang, fungsi mengembalikan nilai yang tepat, dan sesuai dengan kasus uji.';

  return {
    is_correct: isCorrect,
    score,
    verdict,
    ai_feedback: aiFeedback,
    ai_analysis: {
      strengths,
      issues,
      test_results: testResults,
      improved_hint: improvedHint,
    },
    ai_provider: 'heuristic-fallback',
  };
}

async function analyzeCodeSubmission({ lab, submittedCode, language }) {
  const safeLab = lab || {};
  const targetLanguage = String(language || safeLab.language || 'javascript').toLowerCase();
  const passingScore = Number(safeLab.passing_score) || 75;
  const trimmedCode = String(submittedCode || '').trim();

  if (trimmedCode.length < 5) {
    return buildHeuristicAnalysis({ lab: safeLab, submittedCode, language: targetLanguage });
  }

  if (isAiAvailable()) {
    const systemInstruction = [
      'Anda adalah reviewer kode senior dan mentor pemrograman di SkillSphere AI.',
      'Evaluasi kiriman kode siswa secara objektif, konstruktif, dan ketat dalam Bahasa Indonesia.',
      'Jangan gunakan tanda em dash. Gunakan tanda hubung biasa (-) atau titik dua (:).',
      'Kembalikan HANYA objek JSON valid tanpa teks tambahan di luar JSON.',
    ].join(' ');

    const prompt = `Analisis kiriman kode siswa untuk latihan berikut:
- Judul: ${safeLab.title || 'Latihan Pemrograman'}
- Ruang: ${safeLab.room_type || 'lab'}
- Mode Tantangan: ${safeLab.challenge_mode || 'create'} (create = buat dari awal, fix = perbaiki bug)
- Bahasa: ${targetLanguage}
- Tingkat Kesulitan: ${safeLab.difficulty || 'beginner'}
- Skor Minimum Lulus: ${passingScore}
- Deskripsi Tugas:
${safeLab.description || '-'}
- Starter Code:
${safeLab.starter_code || '(tidak ada)'}
- Referensi Solusi:
${safeLab.solution_reference || '(tidak disediakan)'}
- Expected Output:
${safeLab.expected_output || '(tidak disediakan)'}
- Test Cases:
${JSON.stringify(safeLab.test_cases || [])}

Kode Kiriman Siswa:
\`\`\`${targetLanguage}
${submittedCode}
\`\`\`

Kembalikan JSON ketat dengan struktur:
{
  "is_correct": boolean,
  "score": number (0-100),
  "verdict": "correct" | "partial" | "incorrect",
  "ai_feedback": "ringkasan evaluasi dalam Bahasa Indonesia",
  "ai_analysis": {
    "strengths": ["poin kekuatan kode"],
    "issues": [
      { "line": number atau null, "severity": "error" | "warning" | "info", "message": "penjelasan masalah", "suggestion": "saran perbaikan" }
    ],
    "test_results": [
      { "description": "deskripsi kasus uji", "passed": boolean, "detail": "hasil evaluasi kasus uji" }
    ],
    "improved_hint": "satu petunjuk terarah untuk langkah berikutnya"
  }
}`;

    try {
      const rawReply = await callGeminiAPI(prompt, systemInstruction, 0.2);
      const parsed = extractJsonObject(rawReply);
      if (parsed && typeof parsed.score !== 'undefined') {
        return normalizeAnalysisPayload(parsed, passingScore, 'gemini');
      }
    } catch (err) {
      console.warn('[LabAiService] Gemini analyzeCodeSubmission failed, using fallback:', err.message);
    }
  }

  return buildHeuristicAnalysis({ lab: safeLab, submittedCode, language: targetLanguage });
}

function buildFallbackChallenge({ topic, language, roomType, challengeMode, difficulty }) {
  const cleanTopic = String(topic || 'Logika Pemrograman Dasar').trim();
  const lang = String(language || 'javascript').toLowerCase();
  const room = roomType === 'practicum' ? 'practicum' : 'lab';
  const mode = challengeMode === 'fix' ? 'fix' : 'create';
  const diff = ['beginner', 'intermediate', 'advanced'].includes(difficulty) ? difficulty : 'beginner';
  const roomLabel = room === 'practicum' ? 'Praktikum' : 'Lab';
  const modeLabel = mode === 'fix' ? 'Perbaikan Bug' : 'Implementasi';

  const templates = {
    python: {
      createStarter: `# Implementasikan solusi untuk topik: ${cleanTopic}\ndef selesaikan(data):\n    # Tulis logika Anda di sini\n    pass\n`,
      fixStarter: `# Perbaiki bug pada fungsi berikut (${cleanTopic})\ndef hitung_total(angka_list):\n    total = 0\n    for angka in angka_list:\n        total = angka  # Bug: menimpa nilai total\n    return total\n`,
      createSolution: `def selesaikan(data):\n    return [item for item in data if item is not None]\n`,
      fixSolution: `def hitung_total(angka_list):\n    total = 0\n    for angka in angka_list:\n        total += angka\n    return total\n`,
      expected: '15',
    },
    sql: {
      createStarter: `-- Tulis query SQL untuk topik: ${cleanTopic}\nSELECT \nFROM users\nWHERE 1 = 1;\n`,
      fixStarter: `-- Perbaiki kesalahan sintaks/logika query berikut (${cleanTopic})\nSELECT name, email\nFROM users\nWHERE status = 'active'\nORDER name ASC;\n`,
      createSolution: `SELECT id, name, email\nFROM users\nWHERE is_active = 1\nORDER BY created_at DESC;\n`,
      fixSolution: `SELECT name, email\nFROM users\nWHERE status = 'active'\nORDER BY name ASC;\n`,
      expected: 'Daftar pengguna aktif terurut berdasarkan nama',
    },
    javascript: {
      createStarter: `// Implementasikan solusi untuk topik: ${cleanTopic}\nfunction solve(items) {\n  // Tulis logika Anda di sini\n  return [];\n}\n`,
      fixStarter: `// Perbaiki bug pada fungsi berikut (${cleanTopic})\nfunction hitungTotal(daftarHarga) {\n  let total = 0;\n  for (let i = 0; i <= daftarHarga.length; i++) {\n    total += daftarHarga[i];\n  }\n  return total;\n}\n`,
      createSolution: `function solve(items) {\n  if (!Array.isArray(items)) return [];\n  return items.filter(Boolean);\n}\n`,
      fixSolution: `function hitungTotal(daftarHarga) {\n  let total = 0;\n  for (let i = 0; i < daftarHarga.length; i++) {\n    total += daftarHarga[i];\n  }\n  return total;\n}\n`,
      expected: '60000',
    },
  };

  const tpl = templates[lang] || templates.javascript;
  const isFix = mode === 'fix';

  return {
    title: `${roomLabel} ${modeLabel}: ${cleanTopic}`,
    description: isFix
      ? `Analisis kode awal bertopik ${cleanTopic} pada bahasa ${lang}, temukan penyebab bug, dan perbaiki agar seluruh kasus uji lulus dengan benar.`
      : `Bangun implementasi ${lang} yang bersih dan terstruktur untuk menyelesaikan studi kasus ${cleanTopic} pada tingkat ${diff}.`,
    language: lang,
    room_type: room,
    challenge_mode: mode,
    difficulty: diff,
    starter_code: isFix ? tpl.fixStarter : tpl.createStarter,
    solution_reference: isFix ? tpl.fixSolution : tpl.createSolution,
    expected_output: tpl.expected,
    test_cases: [
      {
        description: isFix
          ? 'Bug utama berhasil diperbaiki tanpa mengubah nama fungsi'
          : 'Fungsi menangani input normal dan mengembalikan hasil sesuai spesifikasi',
        expected: tpl.expected,
      },
      {
        description: 'Tidak ada error sintaks dan penanganan kasus batas berjalan aman',
        expected: 'valid',
      },
    ],
    hints: [
      isFix
        ? 'Periksa kondisi batas perulangan, operator penugasan, atau klausa sintaks pada kode awal.'
        : 'Pecah masalah menjadi langkah kecil: validasi input, proses inti, lalu kembalikan hasil.',
    ],
    passing_score: diff === 'advanced' ? 80 : 75,
  };
}

async function generateLabChallenge({
  topic = 'Algoritma Dasar',
  language = 'javascript',
  roomType,
  room_type,
  challengeMode,
  challenge_mode,
  difficulty = 'beginner',
} = {}) {
  const effectiveRoomType = roomType || room_type || 'lab';
  const effectiveChallengeMode = challengeMode || challenge_mode || 'create';
  const room = effectiveRoomType === 'practicum' ? 'practicum' : 'lab';
  const mode = effectiveChallengeMode === 'fix' ? 'fix' : 'create';
  const diff = ['beginner', 'intermediate', 'advanced'].includes(difficulty) ? difficulty : 'beginner';
  const lang = String(language || 'javascript').toLowerCase();

  if (isAiAvailable()) {
    const systemInstruction = [
      'Anda adalah perancang kurikulum praktikum pemrograman di SkillSphere AI.',
      'Buat soal latihan pemrograman berkualitas tinggi dalam Bahasa Indonesia.',
      'Jangan gunakan tanda em dash. Gunakan tanda hubung biasa (-) atau titik dua (:).',
      'Kembalikan HANYA objek JSON valid tanpa teks tambahan.',
    ].join(' ');

    const prompt = `Buat satu tantangan pemrograman dengan parameter:
- Topik: ${topic}
- Bahasa: ${lang}
- Tipe Ruang: ${room} (lab = eksperimen terpandu, practicum = studi kasus terapan)
- Mode Tantangan: ${mode} (create = buat kode baru, fix = perbaiki bug pada starter_code)
- Tingkat Kesulitan: ${diff}

Kembalikan JSON ketat:
{
  "title": "judul singkat maksimal 120 karakter",
  "description": "deskripsi instruksi jelas dalam Bahasa Indonesia",
  "language": "${lang}",
  "room_type": "${room}",
  "challenge_mode": "${mode}",
  "difficulty": "${diff}",
  "starter_code": "kode awal untuk siswa",
  "solution_reference": "kode referensi solusi yang benar",
  "expected_output": "contoh keluaran yang diharapkan",
  "test_cases": [{ "description": "deskripsi uji", "expected": "hasil diharapkan" }],
  "hints": ["petunjuk 1", "petunjuk 2"],
  "passing_score": 75
}`;

    try {
      const rawReply = await callGeminiAPI(prompt, systemInstruction, 0.5);
      const parsed = extractJsonObject(rawReply);
      if (parsed && parsed.title && parsed.description) {
        return {
          title: String(parsed.title).slice(0, 200),
          description: String(parsed.description),
          language: String(parsed.language || lang).toLowerCase(),
          room_type: parsed.room_type === 'practicum' ? 'practicum' : room,
          challenge_mode: parsed.challenge_mode === 'fix' ? 'fix' : mode,
          difficulty: ['beginner', 'intermediate', 'advanced'].includes(parsed.difficulty) ? parsed.difficulty : diff,
          starter_code: typeof parsed.starter_code === 'string' ? parsed.starter_code : '',
          solution_reference: typeof parsed.solution_reference === 'string' ? parsed.solution_reference : '',
          expected_output: typeof parsed.expected_output === 'string' ? parsed.expected_output : '',
          test_cases: Array.isArray(parsed.test_cases) ? parsed.test_cases : [],
          hints: Array.isArray(parsed.hints) ? parsed.hints.map(String) : [],
          passing_score: clampScore(parsed.passing_score || 75) || 75,
        };
      }
    } catch (err) {
      console.warn('[LabAiService] Gemini generateLabChallenge failed, using fallback:', err.message);
    }
  }

  return buildFallbackChallenge({ topic, language: lang, roomType: room, challengeMode: mode, difficulty: diff });
}

module.exports = {
  analyzeCodeSubmission,
  generateLabChallenge,
};
