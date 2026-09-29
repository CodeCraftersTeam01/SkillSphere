const https = require('https');
const http = require('http');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

/**
 * Low-level caller to Google Gemini REST API using native Node.js HTTP/HTTPS
 */
async function callGeminiAPI(prompt, systemInstruction = null, temperature = 0.7) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('your_gemini') || GEMINI_API_KEY.trim() === '') {
    return null; // Signals fallback mode
  }

  const model = GEMINI_MODEL;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      temperature,
      maxOutputTokens: 2048,
    },
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const payload = JSON.stringify(requestBody);

  return new Promise((resolve) => {
    const url = new URL(endpoint);
    const options = {
      method: 'POST',
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 15000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const parsed = JSON.parse(data);
            const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
            resolve(text || null);
          } else {
            console.warn(`[Gemini API] HTTP ${res.statusCode}:`, data);
            resolve(null);
          }
        } catch (err) {
          console.warn('[Gemini API] Parse error:', err.message);
          resolve(null);
        }
      });
    });

    req.on('error', (err) => {
      console.warn('[Gemini API] Request error:', err.message);
      resolve(null);
    });

    req.on('timeout', () => {
      req.destroy();
      console.warn('[Gemini API] Request timed out.');
      resolve(null);
    });

    req.write(payload);
    req.end();
  });
}

/**
 * 1. Generate AI Career Roadmap (Sprint 2 - Tegar)
 */
async function generateCareerRoadmap({ targetRole, userProfile = {}, studyPreferences = {} }) {
  const currentSkills = studyPreferences.topics || userProfile.skills || [];
  const education = studyPreferences.education_status || 'Umum';
  const weeklyCommitment = studyPreferences.weekly_commitment || '5-10 jam/minggu';
  const experienceYears = studyPreferences.experience_years || 0;

  const systemPrompt = `Anda adalah AI Principal Career Architect di platform SkillSphere AI.
Tugas Anda adalah merancang AI Career Roadmap terstruktur dalam format JSON murni.
Aturan:
- Gunakan Bahasa Indonesia profesional dan motivatif.
- Jangan gunakan em dash (—), gunakan tanda hubung (-) atau titik dua (:).
- Output HANYA berupa JSON valid tanpa blok markdown (\`\`\`json).`;

  const userPrompt = `Rancang kurikulum peta karir (Career Roadmap) untuk:
Target Role: "${targetRole}"
Latar Belakang: Pendidikan ${education}, Pengalaman ${experienceYears} tahun
Skill Saat Ini: ${Array.isArray(currentSkills) ? currentSkills.join(', ') : currentSkills}
Komitmen Belajar: ${weeklyCommitment}

Format JSON yang wajib dihasilkan:
{
  "target_role": "${targetRole}",
  "estimated_duration_weeks": 16,
  "summary": "Deskripsi ringkas jalur karir...",
  "recommended_skills": ["Skill 1", "Skill 2", "Skill 3", "Skill 4", "Skill 5"],
  "milestones": [
    {
      "step": 1,
      "title": "Judul Milestone 1",
      "description": "Deskripsi tujuan dan materi yang dipelajari...",
      "topics": ["Topik A", "Topik B"],
      "estimated_weeks": 3,
      "project_assignment": "Tugas proyek hands-on...",
      "status": "in_progress"
    },
    {
      "step": 2,
      "title": "Judul Milestone 2",
      "description": "Deskripsi tujuan...",
      "topics": ["Topik C", "Topik D"],
      "estimated_weeks": 4,
      "project_assignment": "Tugas proyek...",
      "status": "pending"
    },
    {
      "step": 3,
      "title": "Judul Milestone 3",
      "description": "Deskripsi tujuan...",
      "topics": ["Topik E", "Topik F"],
      "estimated_weeks": 5,
      "project_assignment": "Tugas proyek...",
      "status": "pending"
    },
    {
      "step": 4,
      "title": "Judul Milestone 4: Capstone Portfolio & Sertifikasi",
      "description": "Pengembangan portofolio komprehensif...",
      "topics": ["Portfolio Deployment", "Interview Prep"],
      "estimated_weeks": 4,
      "project_assignment": "Deploy production-ready portfolio project",
      "status": "pending"
    }
  ]
}`;

  let rawResponse = await callGeminiAPI(userPrompt, systemPrompt, 0.4);

  if (rawResponse) {
    try {
      // Clean possible markdown code fences
      const cleanJson = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (parsed.target_role && Array.isArray(parsed.milestones)) {
        return {
          target_role: parsed.target_role,
          recommended_skills: parsed.recommended_skills || ['Modern Architecture', 'Clean Code', 'Deployment', 'Problem Solving'],
          roadmap_data: {
            estimated_duration_weeks: parsed.estimated_duration_weeks || 16,
            summary: parsed.summary || `Kurikulum adaptif menuju karir ${targetRole}.`,
            milestones: parsed.milestones,
            generated_at: new Date().toISOString(),
            source: 'gemini_ai',
          },
        };
      }
    } catch (e) {
      console.warn('[Gemini Service] JSON parse fallback triggered:', e.message);
    }
  }

  // Resilient High Quality Intelligent Fallback Generator
  return buildAdaptiveRoadmapFallback(targetRole, currentSkills);
}

/**
 * 2. AI Study Assistant Chat (Sprint 2 - Tegar)
 */
async function chatStudyAssistant({ message, conversationHistory = [], courseContext = null, studentName = 'Pelajar' }) {
  const systemPrompt = `Anda adalah "SkillSphere AI Study Assistant", mentor belajar pribadi yang ramah, cerdas, dan pedagogis.
Panduan Menjawab:
- Jelaskan konsep dengan analogi sederhana terlebih dahulu, diikuti penjelasan teknis dan contoh kode jika relevan.
- Berikan respon dalam Bahasa Indonesia yang lugas dan terstruktur.
- Jangan gunakan em dash (—), gunakan tanda hubung (-) atau titik dua (:).
- Bersikap suportif dan berikan tips belajar praktis.
${courseContext ? `\nKonteks Kursus yang Sedang Dipelajari:\nJudul: ${courseContext.title || 'Kursus'}\nDeskripsi: ${courseContext.description || '-'}\nBab/Materi: ${courseContext.currentSection || '-'}` : ''}`;

  let prompt = '';
  if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
    prompt += 'Riwayat Diskusi:\n';
    conversationHistory.slice(-6).forEach((h) => {
      prompt += `${h.role === 'user' ? studentName : 'AI Assistant'}: ${h.content}\n`;
    });
    prompt += '\n';
  }
  prompt += `${studentName}: ${message}\nAI Assistant:`;

  const aiResponse = await callGeminiAPI(prompt, systemPrompt, 0.7);

  if (aiResponse) {
    return {
      message: aiResponse.trim().replace(/—/g, '-'),
      source: 'gemini_ai',
      timestamp: new Date().toISOString(),
    };
  }

  // Resilient Intelligent Fallback Assistant
  return {
    message: generateStudyAssistantFallback(message, courseContext),
    source: 'study_assistant_fallback',
    timestamp: new Date().toISOString(),
  };
}

/**
 * 3. AI Practice Quiz Generator (Sprint 2 - Tegar)
 */
async function generatePracticeQuiz({ topic, numberOfQuestions = 3, difficulty = 'medium' }) {
  const systemPrompt = `Anda adalah AI Exam & Quiz Generator di SkillSphere AI.
Hasilkan ${numberOfQuestions} soal kuis pilihan ganda terstruktur dalam format JSON murni.
Aturan:
- Gunakan Bahasa Indonesia.
- Jangan gunakan em dash (—).
- Output HANYA berupa JSON valid tanpa backtick markdown.`;

  const userPrompt = `Buatkan ${numberOfQuestions} soal kuis pilihan ganda mengenai topik: "${topic}" dengan tingkat kesulitan ${difficulty}.
Format JSON:
{
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "id": 1,
      "question": "Pertanyaan soal...",
      "options": ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
      "answer_index": 0,
      "explanation": "Penjelasan mengapa pilihan A benar..."
    }
  ]
}`;

  const rawResponse = await callGeminiAPI(userPrompt, systemPrompt, 0.3);

  if (rawResponse) {
    try {
      const cleanJson = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed.questions)) {
        return parsed;
      }
    } catch (e) {
      console.warn('[Gemini Service] Quiz JSON parse error:', e.message);
    }
  }

  // Fallback Quiz Generator
  return buildQuizFallback(topic, numberOfQuestions, difficulty);
}

/**
 * 4. Explain Course Material / Generate Study Notes (Sprint 2 - Tegar)
 */
async function explainCourseMaterial({ materialTitle, materialContent = '', targetLevel = 'intermediate' }) {
  const systemPrompt = `Anda adalah AI Educational Tutor di SkillSphere AI.
Jelaskan materi belajar berikut menjadi ringkasan yang mudah dipahami, analogi dunia nyata, dan poin kunci.
Gunakan Bahasa Indonesia, tanpa em dash (—).
Format output dalam JSON valid:
{
  "title": "${materialTitle}",
  "summary": "Ringkasan konsep utama...",
  "analogy": "Analogi intuitif...",
  "key_takeaways": ["Poin penting 1", "Poin penting 2", "Poin penting 3"],
  "self_check_questions": ["Pertanyaan refleksi 1", "Pertanyaan refleksi 2"]
}`;

  const userPrompt = `Jelaskan materi: "${materialTitle}"
Konten/Deskripsi: "${materialContent || materialTitle}"
Level: ${targetLevel}`;

  const rawResponse = await callGeminiAPI(userPrompt, systemPrompt, 0.4);

  if (rawResponse) {
    try {
      const cleanJson = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      console.warn('[Gemini Service] Material explain JSON parse error:', e.message);
    }
  }

  return {
    title: materialTitle,
    summary: `Materi "${materialTitle}" membahas fondasi penting dalam pengembangan perangkat lunak modern dengan standar industri.`,
    analogy: `Ibaratkan konsep ini seperti merancang cetak biru fondasi bangunan: semakin solid arsitekturnya, semakin kokoh aplikasi saat menampung ribuan pengguna.`,
    key_takeaways: [
      `Memahami arsitektur inti dari ${materialTitle}`,
      'Menerapkan praktik keamanan dan modularitas terbaik',
      'Mempersiapkan kode untuk skalabilitas jangka panjang',
    ],
    self_check_questions: [
      `Bagaimana Anda akan mengimplementasikan ${materialTitle} pada proyek nyata?`,
      'Apa saja tantangan utama dan solusi mitigasi saat menggunakan teknik ini?',
    ],
  };
}

/**
 * Heuristic Fallbacks for Seamless Offline/Dev Execution
 */
function buildAdaptiveRoadmapFallback(targetRole, currentSkills) {
  const isBackend = /backend|node|sql|cloud|api|devops/i.test(targetRole);
  const isFrontend = /frontend|react|ui|ux|web|mobile|flutter/i.test(targetRole);
  const isAI = /ai|machine learning|data|ml|llm|intelligence/i.test(targetRole);

  let recommendedSkills = ['Problem Solving', 'Git Version Control', 'REST API', 'Software Testing'];
  let milestones = [];

  if (isBackend) {
    recommendedSkills = ['Node.js & Express', 'Sequelize & PostgreSQL/MySQL', 'JWT Security & RBAC', 'Redis Caching', 'Docker & CI/CD'];
    milestones = [
      {
        step: 1,
        title: 'Pondasi Database Relasional & ORM',
        description: 'Mendalami perancangan skema relasional, normalisasi data, indeks, dan pemodelan Sequelize.',
        topics: ['PostgreSQL/MySQL Modeling', 'Sequelize Associations', 'Transactions & ACID'],
        estimated_weeks: 3,
        project_assignment: 'Membangun skema ERD 10+ relasi tabel untuk aplikasi e-learning',
        status: 'in_progress',
      },
      {
        step: 2,
        title: 'Keamanan REST API & Autentikasi JWT',
        description: 'Implementasi otentikasi token JWT ganda (Access & Refresh), Role-Based Access Control, dan Helmet security.',
        topics: ['JWT Token Rotation', 'RBAC Middleware', 'Rate Limiting & OWASP'],
        estimated_weeks: 4,
        project_assignment: 'Membuat modul auth enterprise lengkap dengan OTP email verification',
        status: 'pending',
      },
      {
        step: 3,
        title: 'Payment Engine & Revenue Split Mechanism',
        description: 'Mengintegrasikan gateway pembayaran multi-vendor, webhook verifikasi, dan pembagian bagi hasil otomatis.',
        topics: ['Payment Gateway Webhooks', 'Virtual Wallet Mutation', 'Financial Auditing'],
        estimated_weeks: 4,
        project_assignment: 'Sistem split payment 20% platform & 80% tutor dengan automated wallet holding',
        status: 'pending',
      },
      {
        step: 4,
        title: 'Arsitektur Skalabilitas & AI Integration',
        description: 'Penerapan caching Redis resilien, kompresi HTTP gzip, optimasi streaming materi, dan integrasi Gemini API.',
        topics: ['Redis Cache Strategy', 'HTTP 206 Video Streaming', 'Gemini API Integration', 'Docker Deployment'],
        estimated_weeks: 5,
        project_assignment: 'Deploy backend mikro modern ke cloud dengan pemantauan performa real-time',
        status: 'pending',
      },
    ];
  } else if (isFrontend) {
    recommendedSkills = ['HTML5 & Modern CSS', 'JavaScript ESNext', 'React / Next.js', 'State Management', 'Responsive Design'];
    milestones = [
      {
        step: 1,
        title: 'Semantic UI & Warm Paper Design System',
        description: 'Membangun sistem desain modern berstandar aksesibilitas tinggi dan responsif mobile-first.',
        topics: ['CSS Custom Properties', 'Accessibility WCAG AA', 'Clean Vanilla Styling'],
        estimated_weeks: 3,
        project_assignment: 'Membuat UI dashboard interaktif dengan mode terang/gelap',
        status: 'in_progress',
      },
      {
        step: 2,
        title: 'Komponen Interaktif & State Management',
        description: 'Menangani aliran data dinamis, form validasi real-time, dan micro-animations.',
        topics: ['State Architecture', 'Asynchronous API Fetching', 'Custom UI Components'],
        estimated_weeks: 4,
        project_assignment: 'Membangun portal katalog kursus dengan filter instan dan pencarian dinamis',
        status: 'pending',
      },
      {
        step: 3,
        title: 'Media Player & Interactive Learning Portal',
        description: 'Integrasi pemutar video kustom, pembaca dokumen, dan modul ujian interaktif.',
        topics: ['Custom Video Player', 'Exam Stepper Engine', 'Gamification Badges'],
        estimated_weeks: 4,
        project_assignment: 'Membuat modul belajar siswa terintegrasi dengan pelacakan progres real-time',
        status: 'pending',
      },
      {
        step: 4,
        title: 'Optimasi Web Vitals & Production Deployment',
        description: 'Meningkatkan skor Lighthouse, kompresi aset, dan deployment CI/CD ke Vercel/Netlify.',
        topics: ['Core Web Vitals', 'Code Splitting', 'PWA & SEO'],
        estimated_weeks: 5,
        project_assignment: 'Deploy portofolio frontend enterprise dengan skor performa > 95',
        status: 'pending',
      },
    ];
  } else {
    // General AI / Software Engineering
    recommendedSkills = ['Python / JavaScript', 'AI Prompt Engineering', 'Gemini API & LLMs', 'Data Pipelines', 'API Engineering'];
    milestones = [
      {
        step: 1,
        title: 'Fondasi Pemrograman & Data Engineering',
        description: 'Memahami dasar logika algoritma, struktur data terapan, dan pengolahan data terstruktur.',
        topics: ['Data Structures', 'REST APIs', 'Database Integration'],
        estimated_weeks: 3,
        project_assignment: 'Membangun pipeline ekstraksi dan transformasi data otomatis',
        status: 'in_progress',
      },
      {
        step: 2,
        title: 'Integrasi Model AI & Prompt Engineering',
        description: 'Mendalami integrasi API LLM (Gemini), pembuatan prompt terstruktur, dan pemrosesan output JSON.',
        topics: ['Gemini API SDK', 'Structured JSON Prompting', 'Few-shot Learning'],
        estimated_weeks: 4,
        project_assignment: 'Membangun asisten AI karir cerdas dengan respon kontekstual',
        status: 'pending',
      },
      {
        step: 3,
        title: 'RAG (Retrieval-Augmented Generation) & Knowledge Base',
        description: 'Menghubungkan basis data materi kursus dengan AI untuk memberikan jawaban berbasis sumber belajar akurat.',
        topics: ['Embeddings', 'Context Injection', 'Semantic Search'],
        estimated_weeks: 4,
        project_assignment: 'Sistem tanya jawab materi kuliah berbasis konteks cerdas',
        status: 'pending',
      },
      {
        step: 4,
        title: 'Deployment & Monitoring Solusi AI',
        description: 'Mempersiapkan solusi AI untuk produksi dengan rate limiting, caching respon cerdas, dan mitigasi token cost.',
        topics: ['AI Cost Optimization', 'Response Caching', 'Cloud Microservices'],
        estimated_weeks: 5,
        project_assignment: 'Deploy aplikasi AI full-stack siap produksi dengan pemantauan latensi',
        status: 'pending',
      },
    ];
  }

  return {
    target_role: targetRole,
    recommended_skills: recommendedSkills,
    roadmap_data: {
      estimated_duration_weeks: 16,
      summary: `Rencana pembelajaran terstruktur yang dipersonalisasi untuk mencapai posisi ${targetRole}.`,
      milestones,
      generated_at: new Date().toISOString(),
      source: 'heuristic_adaptive_engine',
    },
  };
}

function generateStudyAssistantFallback(message, courseContext) {
  const msgLower = (message || '').toLowerCase();

  if (msgLower.includes('jwt') || msgLower.includes('token') || msgLower.includes('auth')) {
    return 'JSON Web Token (JWT) terdiri dari 3 bagian: Header (algoritma), Payload (klaim data seperti user id & role), dan Signature (kunci verifikasi). Di platform SkillSphere, kami menggunakan arsitektur Token Ganda: Access Token (masa aktif 24 jam) untuk otentikasi request cepat, dan Refresh Token (masa aktif 7 hari) untuk memperbarui sesi tanpa memaksa pengguna login ulang.';
  }

  if (msgLower.includes('split') || msgLower.includes('revenue') || msgLower.includes('20%') || msgLower.includes('80%')) {
    return 'Di SkillSphere, setiap transaksi kursus dibagi secara transparan: 20% dialokasikan untuk biaya platform (server, AI API, operasional) dan 80% masuk langsung ke dompet virtual Tutor (TutorWallet). Dana akan berada dalam masa holding selama 7 hari sebelum siap dicairkan (minimal penarikan Rp 100.000).';
  }

  if (msgLower.includes('milestone') || msgLower.includes('diskon') || msgLower.includes('voucher')) {
    return 'Sistem Gamifikasi Milestone di SkillSphere memberikan penghargaan kepada pelajar yang disiplin. Jika Anda menyelesaikan sebuah bab/section dalam target waktu yang ditentukan (misalnya dalam 3 hari), sistem akan secara otomatis menerbitkan voucher diskon reward (misal 15%) untuk pembelian kursus berikutnya!';
  }

  return `Halo! Saya adalah Asisten Belajar AI SkillSphere. Pertanyaan Anda mengenai "${message}" sangat menarik. Anda dapat menanyakan konsep pemrograman, arsitektur database relasional, logika bisnis payment gateway, integrasi Gemini AI, atau meminta tips belajar dan ringkasan materi kursus kapan saja. Ada hal spesifik yang ingin kita bahas lebih dalam?`;
}

function buildQuizFallback(topic, numberOfQuestions, difficulty) {
  return {
    topic,
    difficulty,
    questions: [
      {
        id: 1,
        question: `Dalam arsitektur sistem berbasis ${topic}, apa tujuan utama dari pemisahan layer controller dan service/model?`,
        options: [
          'Mempercepat kompilasi CSS',
          'Memastikan Separation of Concerns dan kemudahan unit testing',
          'Mengurangi ukuran database MySQL',
          'Menghilangkan kebutuhan autentikasi JWT',
        ],
        answer_index: 1,
        explanation: 'Pemisahan controller dan model/service memastikan setiap komponen memiliki tanggung jawab tunggal (Separation of Concerns), sehingga kode mudah dirawat dan diuji.',
      },
      {
        id: 2,
        question: `Bagaimana praktik terbaik untuk mengamankan data sensitif pengguna pada aplikasi ${topic}?`,
        options: [
          'Menyimpan password dalam bentuk plaintext di database',
          'Menggunakan algoritma hashing kuat seperti bcrypt dengan salt dan HTTPS',
          'Menampilkan token rahasia pada response URL parameter',
          'Menonaktifkan CORS dan validasi input',
        ],
        answer_index: 1,
        explanation: 'Password wajib di-hash menggunakan algoritma modern seperti bcryptjs dengan salt rounds yang memadai untuk mencegah kebocoran kredensial.',
      },
    ],
  };
}

module.exports = {
  callGeminiAPI,
  generateCareerRoadmap,
  chatStudyAssistant,
  generatePracticeQuiz,
  explainCourseMaterial,
};
