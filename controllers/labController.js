const { Op } = require('sequelize');
const { LabExercise, LabSubmission, Course, User } = require('../models');
const { analyzeCodeSubmission, generateLabChallenge } = require('../services/labAiService');

const VALID_ROOM_TYPES = ['lab', 'practicum'];
const VALID_CHALLENGE_MODES = ['create', 'fix'];
const VALID_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
const VALID_VERDICTS = ['correct', 'partial', 'incorrect'];
const MAX_CODE_LENGTH = 50000;

let seedPromise = null;

const DEFAULT_LAB_CHALLENGES = [
  {
    room_type: 'lab',
    challenge_mode: 'create',
    title: 'Fungsi Filter & Hitung Total Keranjang Belanja',
    description:
      'Buat fungsi `hitungTotalKeranjang(items, diskonPersen = 0)` yang memfilter item dengan `stok > 0` dan `qty > 0`, menghitung subtotal (`harga * qty`), lalu menerapkan potongan `diskonPersen` (0 sampai 100). Kembalikan angka bulat hasil pembulatan ke bawah (`Math.floor`).',
    language: 'javascript',
    difficulty: 'beginner',
    starter_code: `function hitungTotalKeranjang(items, diskonPersen = 0) {
  // Tulis implementasi filter item valid dan hitung total akhir di sini
  return 0;
}

module.exports = { hitungTotalKeranjang };`,
    solution_reference: `function hitungTotalKeranjang(items, diskonPersen = 0) {
  if (!Array.isArray(items)) return 0;
  const clampedDiscount = Math.min(100, Math.max(0, Number(diskonPersen) || 0));
  const subtotal = items
    .filter((item) => item && item.stok > 0 && item.qty > 0 && item.harga >= 0)
    .reduce((sum, item) => sum + item.harga * item.qty, 0);
  return Math.floor(subtotal * (1 - clampedDiscount / 100));
}

module.exports = { hitungTotalKeranjang };`,
    expected_output: 'Total belanja bersih dalam integer (contoh: 180000 untuk subtotal 200000 dan diskon 10%).',
    test_cases: [
      {
        description: 'Menghitung total dengan item valid dan diskon 10%',
        input: 'hitungTotalKeranjang([{ harga: 100000, qty: 2, stok: 5 }, { harga: 50000, qty: 1, stok: 0 }], 10)',
        expected: '180000',
      },
      {
        description: 'Mengabaikan item dengan qty <= 0',
        input: 'hitungTotalKeranjang([{ harga: 75000, qty: 0, stok: 3 }], 0)',
        expected: '0',
      },
      {
        description: 'Mengembalikan 0 jika input kosong',
        input: 'hitungTotalKeranjang([], 20)',
        expected: '0',
      },
    ],
    hints: [
      'Gunakan `.filter()` untuk menyaring item dengan `stok > 0` dan `qty > 0`.',
      'Gunakan `.reduce()` untuk menjumlahkan `item.harga * item.qty`.',
      'Batasi `diskonPersen` pada rentang 0 hingga 100 sebelum menghitung hasil akhir.',
    ],
    passing_score: 70,
    is_published: true,
  },
  {
    room_type: 'lab',
    challenge_mode: 'fix',
    title: 'Perbaiki Bug Async/Loop Perhitungan Nilai Ujian',
    description:
      'Kode berikut bertujuan mengambil skor tiap modul ujian secara asynchronous lalu menghitung rata-rata nilai peserta. Namun terdapat bug pada penggunaan `forEach` dengan `async` serta pembagian saat array kosong. Perbaiki agar mengembalikan rata-rata yang akurat.',
    language: 'javascript',
    difficulty: 'intermediate',
    starter_code: `async function hitungRataRataUjian(daftarIdModul, ambilNilaiAsync) {
  let total = 0;
  daftarIdModul.forEach(async (id) => {
    const nilai = await ambilNilaiAsync(id);
    total += nilai;
  });
  return total / daftarIdModul.length;
}

module.exports = { hitungRataRataUjian };`,
    solution_reference: `async function hitungRataRataUjian(daftarIdModul, ambilNilaiAsync) {
  if (!Array.isArray(daftarIdModul) || daftarIdModul.length === 0) {
    return 0;
  }
  const daftarNilai = await Promise.all(
    daftarIdModul.map((id) => ambilNilaiAsync(id))
  );
  const total = daftarNilai.reduce((acc, nilai) => acc + Number(nilai || 0), 0);
  return Number((total / daftarNilai.length).toFixed(2));
}

module.exports = { hitungRataRataUjian };`,
    expected_output: 'Rata-rata nilai numerik yang menunggu seluruh Promise selesai (0 jika daftar kosong).',
    test_cases: [
      {
        description: 'Menghitung rata-rata dari 3 modul async',
        input: 'await hitungRataRataUjian([1, 2, 3], async (id) => id * 30)',
        expected: '60',
      },
      {
        description: 'Mengembalikan 0 saat daftarIdModul kosong tanpa NaN',
        input: 'await hitungRataRataUjian([], async () => 100)',
        expected: '0',
      },
    ],
    hints: [
      '`Array.prototype.forEach` tidak menunggu fungsi `async` di dalamnya selesai.',
      'Gunakan `for...of` dengan `await` atau `Promise.all(daftarIdModul.map(...))`.',
      'Tambahkan guard clause untuk mengembalikan `0` saat `daftarIdModul.length === 0`.',
    ],
    passing_score: 75,
    is_published: true,
  },
  {
    room_type: 'lab',
    challenge_mode: 'fix',
    title: 'Perbaiki Bug Validasi Palindrom & Indeks List',
    description:
      'Fungsi Python `filter_palindrom(daftar_kata)` seharusnya mengembalikan daftar kata palindrom (abaikan huruf kapital dan spasi), tetapi kode saat ini menimbulkan `IndexError` dan gagal membandingkan huruf besar/kecil. Perbaiki bug tersebut.',
    language: 'python',
    difficulty: 'intermediate',
    starter_code: `def is_palindrom(teks):
    for i in range(len(teks)):
        if teks[i] != teks[len(teks) - i]:
            return False
    return True

def filter_palindrom(daftar_kata):
    hasil = []
    for kata in daftar_kata:
        if is_palindrom(kata):
            hasil.append(kata)
    return hasil`,
    solution_reference: `def is_palindrom(teks):
    bersih = ''.join(ch.lower() for ch in str(teks) if ch.isalnum())
    if not bersih:
        return False
    return bersih == bersih[::-1]

def filter_palindrom(daftar_kata):
    return [kata for kata in daftar_kata if is_palindrom(kata)]`,
    expected_output: 'List kata yang merupakan palindrom tanpa IndexError dan case-insensitive.',
    test_cases: [
      {
        description: 'Menyaring palindrom case-insensitive dan frasa berspasi',
        input: 'filter_palindrom(["Katak", "Belajar", "Kasur ini rusak", "Python"])',
        expected: '["Katak", "Kasur ini rusak"]',
      },
      {
        description: 'Menangani list kosong',
        input: 'filter_palindrom([])',
        expected: '[]',
      },
    ],
    hints: [
      'Indeks terakhir string adalah `len(teks) - 1`, bukan `len(teks)`.',
      'Normalisasi huruf ke huruf kecil dan hapus spasi/tanda baca sebelum mengecek palindrom.',
      'Di Python, `bersih == bersih[::-1]` lebih ringkas dan bebas off-by-one error.',
    ],
    passing_score: 75,
    is_published: true,
  },
  {
    room_type: 'practicum',
    challenge_mode: 'create',
    title: 'Praktikum REST Validator & Sanitasi Input Pengguna',
    description:
      'Bangun fungsi `validasiPayloadRegistrasi(payload)` untuk endpoint pendaftaran siswa. Validasi: (1) `name` minimal 3 karakter setelah trim dan disanitasi dari karakter `<` dan `>`, (2) `email` berformat email valid dan lowercase, (3) `password` minimal 8 karakter dengan minimal 1 angka. Kembalikan `{ valid: boolean, errors: string[], sanitized: object | null }`.',
    language: 'javascript',
    difficulty: 'intermediate',
    starter_code: `function validasiPayloadRegistrasi(payload) {
  // Implementasikan validasi dan sanitasi payload registrasi
  return {
    valid: false,
    errors: [],
    sanitized: null,
  };
}

module.exports = { validasiPayloadRegistrasi };`,
    solution_reference: `function validasiPayloadRegistrasi(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: ['Payload tidak valid.'], sanitized: null };
  }

  const rawName = typeof payload.name === 'string' ? payload.name.trim() : '';
  const safeName = rawName.replace(/[<>]/g, '');
  if (safeName.length < 3) {
    errors.push('Nama minimal 3 karakter.');
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push('Format email tidak valid.');
  }

  const password = typeof payload.password === 'string' ? payload.password : '';
  if (password.length < 8 || !/\\d/.test(password)) {
    errors.push('Password minimal 8 karakter dan mengandung angka.');
  }

  if (errors.length > 0) {
    return { valid: false, errors, sanitized: null };
  }

  return {
    valid: true,
    errors: [],
    sanitized: { name: safeName, email },
  };
}

module.exports = { validasiPayloadRegistrasi };`,
    expected_output: 'Objek { valid, errors, sanitized } dengan email lowercase dan name bebas tag HTML.',
    test_cases: [
      {
        description: 'Payload valid menghasilkan valid: true dan data tersanitasi',
        input: 'validasiPayloadRegistrasi({ name: "  <b>Budi Santoso</b> ", email: "BUDI@Example.com", password: "rahasia123" })',
        expected: '{ valid: true, errors: [], sanitized: { name: "bBudi Santoso/b", email: "budi@example.com" } }',
      },
      {
        description: 'Password tanpa angka ditolak',
        input: 'validasiPayloadRegistrasi({ name: "Siti", email: "siti@mail.id", password: "abcdefgh" })',
        expected: 'valid === false dan errors tidak kosong',
      },
    ],
    hints: [
      'Selalu periksa tipe input sebelum memanggil `.trim()` agar tidak crash saat field undefined.',
      'Jangan kembalikan password mentah di dalam objek `sanitized`.',
      'Gunakan regex sederhana untuk memastikan email valid dan password memiliki angka.',
    ],
    passing_score: 75,
    is_published: true,
  },
  {
    room_type: 'practicum',
    challenge_mode: 'fix',
    title: 'Perbaiki Query Agregasi Pendapatan Kursus per Kategori',
    description:
      'Query SQL berikut dipakai di laporan keuangan SkillSphere untuk menghitung total transaksi sukses (`status = \'paid\'`), total pendapatan kotor, dan jatah 80% tutor per kategori kursus. Namun query gagal dijalankan karena kesalahan `GROUP BY`, `WHERE` vs `HAVING`, dan join yang salah. Perbaiki query agar valid di MySQL.',
    language: 'sql',
    difficulty: 'advanced',
    starter_code: `SELECT
  cat.name AS category_name,
  COUNT(t.id) AS total_transactions,
  SUM(t.amount) AS gross_revenue,
  SUM(t.amount) * 0.8 AS tutor_share
FROM transactions t
JOIN courses c ON t.id = c.id
JOIN categories cat ON c.category_id = cat.id
HAVING t.status = 'paid'
ORDER BY gross_revenue DESC;`,
    solution_reference: `SELECT
  cat.id AS category_id,
  cat.name AS category_name,
  COUNT(t.id) AS total_transactions,
  COALESCE(SUM(t.amount), 0) AS gross_revenue,
  ROUND(COALESCE(SUM(t.amount), 0) * 0.80, 2) AS tutor_share
FROM transactions t
INNER JOIN courses c ON t.course_id = c.id
INNER JOIN categories cat ON c.category_id = cat.id
WHERE t.status = 'paid'
GROUP BY cat.id, cat.name
ORDER BY gross_revenue DESC;`,
    expected_output: 'Agregasi per kategori yang valid dengan filter WHERE status = paid, JOIN pada t.course_id = c.id, dan GROUP BY lengkap.',
    test_cases: [
      {
        description: 'Menggunakan JOIN t.course_id = c.id (bukan t.id = c.id)',
        input: 'Inspeksi klausa JOIN',
        expected: 'JOIN courses c ON t.course_id = c.id',
      },
      {
        description: 'Menyaring status paid pada klausa WHERE sebelum agregasi',
        input: 'Inspeksi klausa WHERE & GROUP BY',
        expected: 'WHERE t.status = \'paid\' diikuti GROUP BY cat.id, cat.name',
      },
    ],
    hints: [
      'Filter baris individual seperti `t.status = \'paid\'` harus berada di `WHERE`, bukan `HAVING`.',
      'Relasi transaksi ke kursus menggunakan foreign key `t.course_id = c.id`.',
      'Tambahkan `GROUP BY cat.id, cat.name` agar lolos mode `ONLY_FULL_GROUP_BY` di MySQL.',
    ],
    passing_score: 80,
    is_published: true,
  },
  {
    room_type: 'practicum',
    challenge_mode: 'create',
    title: 'Praktikum Algoritma Klasifikasi Nilai Kelulusan Adaptif',
    description:
      'Implementasikan fungsi Python `evaluasi_kelulusan(skor_kuis, skor_proyek, kehadiran_persen)` untuk sistem pembelajaran adaptif. Bobot: kuis 30%, proyek 50%, kehadiran 20%. Aturan: nilai akhir >= 85 mendapat predikat `"Sangat Baik"` (lulus), >= 70 `"Lulus"`, < 70 `"Remedial"`. Namun jika `kehadiran_persen < 60`, status otomatis `"Remedial"` meskipun nilai akhir tinggi. Kembalikan dictionary `{ "nilai_akhir": float, "status": str, "rekomendasi": str }`.',
    language: 'python',
    difficulty: 'advanced',
    starter_code: `def evaluasi_kelulusan(skor_kuis, skor_proyek, kehadiran_persen):
    # Validasi input 0-100, hitung nilai berbobot, dan tentukan status kelulusan
    pass`,
    solution_reference: `def evaluasi_kelulusan(skor_kuis, skor_proyek, kehadiran_persen):
    for nama, nilai in [("skor_kuis", skor_kuis), ("skor_proyek", skor_proyek), ("kehadiran_persen", kehadiran_persen)]:
        if not isinstance(nilai, (int, float)) or nilai < 0 or nilai > 100:
            raise ValueError(f"{nama} harus berupa angka antara 0 hingga 100")

    nilai_akhir = round((skor_kuis * 0.30) + (skor_proyek * 0.50) + (kehadiran_persen * 0.20), 2)

    if kehadiran_persen < 60 or nilai_akhir < 70:
        status = "Remedial"
        rekomendasi = "Tingkatkan kehadiran dan ulangi modul latihan inti."
    elif nilai_akhir >= 85:
        status = "Sangat Baik"
        rekomendasi = "Lanjutkan ke jalur proyek lanjutan atau sertifikasi."
    else:
        status = "Lulus"
        rekomendasi = "Perdalam studi kasus praktik sebelum modul berikutnya."

    return {
        "nilai_akhir": nilai_akhir,
        "status": status,
        "rekomendasi": rekomendasi,
    }`,
    expected_output: 'Dictionary berisi nilai_akhir (dibulatkan 2 desimal), status kelulusan, dan rekomendasi belajar.',
    test_cases: [
      {
        description: 'Nilai tinggi dengan kehadiran baik -> Sangat Baik',
        input: 'evaluasi_kelulusan(90, 92, 95)',
        expected: '{"nilai_akhir": 92.0, "status": "Sangat Baik", ...}',
      },
      {
        description: 'Nilai tinggi tetapi kehadiran < 60 -> Remedial',
        input: 'evaluasi_kelulusan(95, 95, 50)',
        expected: '{"nilai_akhir": 86.0, "status": "Remedial", ...}',
      },
      {
        description: 'Input di luar rentang 0-100 melempar ValueError',
        input: 'evaluasi_kelulusan(120, 80, 90)',
        expected: 'Raises ValueError',
      },
    ],
    hints: [
      'Validasi seluruh angka berada pada rentang 0 sampai 100 terlebih dahulu.',
      'Cek syarat batas kehadiran `< 60` sebelum memutuskan status lulus.',
      'Gunakan `round(..., 2)` untuk menghindari error presisi floating-point.',
    ],
    passing_score: 80,
    is_published: true,
  },
];

const parsePositiveInt = (value) => {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
};

const normalizeArrayField = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }
  return [];
};

const canManageLab = (user, lab) => {
  if (!user || !lab) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'tutor' && Number(lab.created_by) === Number(user.id)) return true;
  return false;
};

const sanitizeLabForUser = (lab, user) => {
  const plain = lab && typeof lab.toJSON === 'function' ? lab.toJSON() : { ...lab };
  if (canManageLab(user, plain)) {
    return plain;
  }
  const { solution_reference, ...safeLab } = plain;
  return safeLab;
};

const ensureDefaultLabs = async () => {
  if (seedPromise) {
    return seedPromise;
  }

  seedPromise = (async () => {
    const existingCount = await LabExercise.count();
    if (existingCount > 0) return;

    const owner =
      (await User.findOne({ where: { role: 'tutor' }, order: [['id', 'ASC']] })) ||
      (await User.findOne({ where: { role: 'admin' }, order: [['id', 'ASC']] })) ||
      (await User.findOne({ order: [['id', 'ASC']] }));

    if (!owner) return;

    const rows = DEFAULT_LAB_CHALLENGES.map((item) => ({
      ...item,
      course_id: null,
      created_by: owner.id,
    }));

    await LabExercise.bulkCreate(rows);
  })().finally(() => {
    seedPromise = null;
  });

  return seedPromise;
};

const buildUserStatusMap = async (userId, labIds) => {
  const statusMap = new Map();
  if (!userId || !Array.isArray(labIds) || labIds.length === 0) {
    return statusMap;
  }

  const submissions = await LabSubmission.findAll({
    where: {
      user_id: userId,
      lab_id: { [Op.in]: labIds },
    },
    attributes: ['lab_id', 'is_correct', 'score'],
  });

  for (const sub of submissions) {
    const key = Number(sub.lab_id);
    const prev = statusMap.get(key) || { solved: false, best_score: 0, attempts: 0 };
    const score = Number(sub.score) || 0;
    statusMap.set(key, {
      solved: prev.solved || Boolean(sub.is_correct),
      best_score: Math.max(prev.best_score, score),
      attempts: prev.attempts + 1,
    });
  }

  return statusMap;
};

const buildCreatorAndCourseMaps = async (labs) => {
  const creatorIds = [...new Set(labs.map((l) => l.created_by).filter(Boolean))];
  const courseIds = [...new Set(labs.map((l) => l.course_id).filter(Boolean))];

  const [creators, courses] = await Promise.all([
    creatorIds.length
      ? User.findAll({
          where: { id: { [Op.in]: creatorIds } },
          attributes: ['id', 'name', 'role'],
        })
      : [],
    courseIds.length
      ? Course.findAll({
          where: { id: { [Op.in]: courseIds } },
          attributes: ['id', 'title'],
        })
      : [],
  ]);

  const creatorMap = new Map(creators.map((u) => [Number(u.id), { id: u.id, name: u.name, role: u.role }]));
  const courseMap = new Map(courses.map((c) => [Number(c.id), { id: c.id, title: c.title }]));

  return { creatorMap, courseMap };
};

const validateLabPayload = async (body, isUpdate = false) => {
  const errors = [];
  const data = {};

  if (!isUpdate || body.title !== undefined) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (title.length < 3 || title.length > 200) {
      errors.push('Judul tantangan wajib diisi (3 sampai 200 karakter).');
    } else {
      data.title = title;
    }
  }

  if (!isUpdate || body.description !== undefined) {
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    if (!description) {
      errors.push('Deskripsi tantangan wajib diisi.');
    } else {
      data.description = description;
    }
  }

  if (!isUpdate || body.room_type !== undefined) {
    const isEmptyRoomType =
      body.room_type === undefined ||
      body.room_type === null ||
      (typeof body.room_type === 'string' && !body.room_type.trim());
    const roomType = isEmptyRoomType
      ? 'lab'
      : typeof body.room_type === 'string'
      ? body.room_type.trim().toLowerCase()
      : '';
    if (!VALID_ROOM_TYPES.includes(roomType)) {
      errors.push('room_type harus bernilai lab atau practicum.');
    } else {
      data.room_type = roomType;
    }
  }

  if (!isUpdate || body.challenge_mode !== undefined) {
    const mode = typeof body.challenge_mode === 'string' ? body.challenge_mode.trim().toLowerCase() : '';
    if (!VALID_CHALLENGE_MODES.includes(mode)) {
      errors.push('challenge_mode harus bernilai create atau fix.');
    } else {
      data.challenge_mode = mode;
    }
  }

  if (!isUpdate || body.language !== undefined) {
    const language = typeof body.language === 'string' ? body.language.trim().toLowerCase() : '';
    if (!language || language.length > 40) {
      errors.push('Bahasa pemrograman wajib diisi (maksimal 40 karakter).');
    } else {
      data.language = language;
    }
  }

  if (!isUpdate || body.difficulty !== undefined) {
    const difficulty =
      body.difficulty === undefined
        ? 'beginner'
        : typeof body.difficulty === 'string'
        ? body.difficulty.trim().toLowerCase()
        : '';
    if (!VALID_DIFFICULTIES.includes(difficulty)) {
      errors.push('difficulty harus bernilai beginner, intermediate, atau advanced.');
    } else {
      data.difficulty = difficulty;
    }
  }

  if (!isUpdate || body.starter_code !== undefined) {
    const starterCode = body.starter_code === undefined || body.starter_code === null ? '' : String(body.starter_code);
    if (starterCode.length > MAX_CODE_LENGTH) {
      errors.push(`starter_code melebihi batas ${MAX_CODE_LENGTH} karakter.`);
    } else {
      data.starter_code = starterCode;
    }
  }

  if (!isUpdate || body.solution_reference !== undefined) {
    const solutionRef =
      body.solution_reference === undefined || body.solution_reference === null ? '' : String(body.solution_reference);
    if (solutionRef.length > MAX_CODE_LENGTH) {
      errors.push(`solution_reference melebihi batas ${MAX_CODE_LENGTH} karakter.`);
    } else {
      data.solution_reference = solutionRef;
    }
  }

  if (!isUpdate || body.expected_output !== undefined) {
    data.expected_output =
      body.expected_output === undefined || body.expected_output === null ? '' : String(body.expected_output);
  }

  if (!isUpdate || body.test_cases !== undefined) {
    data.test_cases = normalizeArrayField(body.test_cases);
  }

  if (!isUpdate || body.hints !== undefined) {
    data.hints = normalizeArrayField(body.hints);
  }

  if (!isUpdate || body.passing_score !== undefined) {
    const score = body.passing_score === undefined ? 70 : Number(body.passing_score);
    if (!Number.isFinite(score) || score < 1 || score > 100) {
      errors.push('passing_score harus berupa angka antara 1 sampai 100.');
    } else {
      data.passing_score = Math.round(score);
    }
  }

  if (!isUpdate || body.is_published !== undefined) {
    data.is_published = body.is_published === undefined ? true : Boolean(body.is_published);
  }

  if (body.course_id !== undefined) {
    if (body.course_id === null || body.course_id === '') {
      data.course_id = null;
    } else {
      const courseId = parsePositiveInt(body.course_id);
      if (!courseId) {
        errors.push('course_id harus berupa bilangan bulat positif.');
      } else {
        const course = await Course.findByPk(courseId, { attributes: ['id'] });
        if (!course) {
          errors.push('Kursus yang dipilih tidak ditemukan.');
        } else {
          data.course_id = courseId;
        }
      }
    }
  } else if (!isUpdate) {
    data.course_id = null;
  }

  return { errors, data };
};

/**
 * 1. GET /api/labs
 */
const listLabs = async (req, res) => {
  try {
    await ensureDefaultLabs();

    const { room_type, challenge_mode, language, difficulty, course_id, search, mine } = req.query;
    const where = {};

    const normalizedRoomType = typeof room_type === 'string' ? room_type.trim().toLowerCase() : '';
    if (normalizedRoomType && normalizedRoomType !== 'all' && VALID_ROOM_TYPES.includes(normalizedRoomType)) {
      where.room_type = normalizedRoomType;
    }
    if (challenge_mode && VALID_CHALLENGE_MODES.includes(String(challenge_mode).toLowerCase())) {
      where.challenge_mode = String(challenge_mode).toLowerCase();
    }
    if (language && String(language).trim()) {
      where.language = String(language).trim().toLowerCase();
    }
    if (difficulty && VALID_DIFFICULTIES.includes(String(difficulty).toLowerCase())) {
      where.difficulty = String(difficulty).toLowerCase();
    }
    if (course_id !== undefined && course_id !== '') {
      const parsedCourseId = parsePositiveInt(course_id);
      if (!parsedCourseId) {
        return res.status(400).json({
          success: false,
          message: 'Parameter course_id tidak valid.',
        });
      }
      where.course_id = parsedCourseId;
    }

    const wantMine = mine === 'true' || mine === '1';
    if (wantMine && req.user && (req.user.role === 'tutor' || req.user.role === 'admin')) {
      where.created_by = req.user.id;
    } else if (!req.user || req.user.role === 'student') {
      where.is_published = true;
    } else if (req.user.role === 'tutor') {
      where[Op.or] = [{ is_published: true }, { created_by: req.user.id }];
    }

    if (search && String(search).trim()) {
      const keyword = `%${String(search).trim()}%`;
      const searchCond = {
        [Op.or]: [{ title: { [Op.like]: keyword } }, { description: { [Op.like]: keyword } }],
      };
      if (where[Op.or]) {
        where[Op.and] = [{ [Op.or]: where[Op.or] }, searchCond];
        delete where[Op.or];
      } else {
        where[Op.or] = searchCond[Op.or];
      }
    }

    const labs = await LabExercise.findAll({
      where,
      order: [['id', 'DESC']],
    });

    const labIds = labs.map((l) => l.id);
    const [{ creatorMap, courseMap }, userStatusMap] = await Promise.all([
      buildCreatorAndCourseMaps(labs),
      req.user ? buildUserStatusMap(req.user.id, labIds) : Promise.resolve(new Map()),
    ]);

    const items = labs.map((lab) => {
      const safe = sanitizeLabForUser(lab, req.user);
      const enriched = {
        ...safe,
        creator: creatorMap.get(Number(lab.created_by)) || null,
        course: lab.course_id ? courseMap.get(Number(lab.course_id)) || null : null,
      };
      if (req.user) {
        enriched.user_status = userStatusMap.get(Number(lab.id)) || {
          solved: false,
          best_score: 0,
          attempts: 0,
        };
      }
      return enriched;
    });

    return res.status(200).json({
      success: true,
      message: 'Daftar tantangan lab dan praktikum berhasil dimuat.',
      data: {
        items,
        total: items.length,
      },
    });
  } catch (error) {
    console.error('[labController.listLabs] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat daftar tantangan lab dan praktikum.',
    });
  }
};

/**
 * 2. GET /api/labs/stats/me
 */
const getMyStats = async (req, res) => {
  try {
    await ensureDefaultLabs();

    const [publishedLabs, submissions] = await Promise.all([
      LabExercise.findAll({
        where: { is_published: true },
        attributes: ['id', 'room_type'],
      }),
      LabSubmission.findAll({
        where: { user_id: req.user.id },
        attributes: ['lab_id', 'is_correct', 'score'],
      }),
    ]);

    const labRoomMap = new Map(publishedLabs.map((l) => [Number(l.id), l.room_type]));
    const solvedLabIds = new Set();
    const bestScorePerLab = new Map();

    for (const sub of submissions) {
      const labId = Number(sub.lab_id);
      const score = Number(sub.score) || 0;
      const prevBest = bestScorePerLab.get(labId);
      if (prevBest === undefined || score > prevBest) {
        bestScorePerLab.set(labId, score);
      }
      if (sub.is_correct) {
        solvedLabIds.add(labId);
      }
    }

    let labSolved = 0;
    let practicumSolved = 0;
    for (const solvedId of solvedLabIds) {
      const roomType = labRoomMap.get(solvedId);
      if (roomType === 'lab') labSolved += 1;
      else if (roomType === 'practicum') practicumSolved += 1;
    }

    const bestScores = [...bestScorePerLab.values()];
    const averageScore =
      bestScores.length > 0
        ? Math.round(bestScores.reduce((acc, s) => acc + s, 0) / bestScores.length)
        : 0;

    return res.status(200).json({
      success: true,
      message: 'Statistik progres lab berhasil dimuat.',
      data: {
        total_labs: publishedLabs.length,
        solved_count: solvedLabIds.size,
        total_attempts: submissions.length,
        average_score: averageScore,
        lab_solved: labSolved,
        practicum_solved: practicumSolved,
      },
    });
  } catch (error) {
    console.error('[labController.getMyStats] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat statistik progres lab.',
    });
  }
};

/**
 * 3. POST /api/labs/ai-generate
 */
const aiGenerateLab = async (req, res) => {
  try {
    const topic = typeof req.body.topic === 'string' ? req.body.topic.trim() : '';
    const language =
      typeof req.body.language === 'string' && req.body.language.trim()
        ? req.body.language.trim().toLowerCase()
        : 'javascript';
    const roomType =
      typeof req.body.room_type === 'string' && req.body.room_type.trim()
        ? req.body.room_type.trim().toLowerCase()
        : 'lab';
    const challengeMode =
      typeof req.body.challenge_mode === 'string' && req.body.challenge_mode.trim()
        ? req.body.challenge_mode.trim().toLowerCase()
        : 'create';
    const difficulty =
      typeof req.body.difficulty === 'string' && req.body.difficulty.trim()
        ? req.body.difficulty.trim().toLowerCase()
        : 'beginner';

    if (!topic || topic.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Topik tantangan wajib diisi (maksimal 200 karakter).',
      });
    }
    if (!VALID_ROOM_TYPES.includes(roomType)) {
      return res.status(400).json({
        success: false,
        message: 'room_type harus bernilai lab atau practicum.',
      });
    }
    if (!VALID_CHALLENGE_MODES.includes(challengeMode)) {
      return res.status(400).json({
        success: false,
        message: 'challenge_mode harus bernilai create atau fix.',
      });
    }
    if (!VALID_DIFFICULTIES.includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: 'difficulty harus bernilai beginner, intermediate, atau advanced.',
      });
    }

    const draft = await generateLabChallenge({
      topic,
      language,
      room_type: roomType,
      challenge_mode: challengeMode,
      difficulty,
    });

    return res.status(200).json({
      success: true,
      message: 'Draft tantangan lab berhasil dibuat oleh AI.',
      data: draft,
    });
  } catch (error) {
    console.error('[labController.aiGenerateLab] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal membuat draft tantangan menggunakan AI.',
    });
  }
};

/**
 * 4. GET /api/labs/:id
 */
const getLabById = async (req, res) => {
  try {
    const labId = parsePositiveInt(req.params.id);
    if (!labId) {
      return res.status(400).json({
        success: false,
        message: 'ID tantangan lab tidak valid.',
      });
    }

    const lab = await LabExercise.findByPk(labId);
    if (!lab || (!lab.is_published && !canManageLab(req.user, lab))) {
      return res.status(404).json({
        success: false,
        message: 'Tantangan lab tidak ditemukan.',
      });
    }

    const [{ creatorMap, courseMap }, mySubmissions] = await Promise.all([
      buildCreatorAndCourseMaps([lab]),
      req.user
        ? LabSubmission.findAll({
            where: { lab_id: lab.id, user_id: req.user.id },
            order: [['id', 'DESC']],
            limit: 10,
          })
        : Promise.resolve([]),
    ]);

    const payload = {
      ...sanitizeLabForUser(lab, req.user),
      creator: creatorMap.get(Number(lab.created_by)) || null,
      course: lab.course_id ? courseMap.get(Number(lab.course_id)) || null : null,
      my_submissions: mySubmissions,
    };

    return res.status(200).json({
      success: true,
      message: 'Detail tantangan lab berhasil dimuat.',
      data: payload,
    });
  } catch (error) {
    console.error('[labController.getLabById] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat detail tantangan lab.',
    });
  }
};

/**
 * 5. POST /api/labs
 */
const createLab = async (req, res) => {
  try {
    const { errors, data } = await validateLabPayload(req.body, false);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors[0],
        errors,
      });
    }

    const created = await LabExercise.create({
      ...data,
      created_by: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: 'Tantangan lab berhasil dibuat.',
      data: created,
    });
  } catch (error) {
    console.error('[labController.createLab] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal membuat tantangan lab.',
    });
  }
};

/**
 * 6. PUT /api/labs/:id
 */
const updateLab = async (req, res) => {
  try {
    const labId = parsePositiveInt(req.params.id);
    if (!labId) {
      return res.status(400).json({
        success: false,
        message: 'ID tantangan lab tidak valid.',
      });
    }

    const lab = await LabExercise.findByPk(labId);
    if (!lab) {
      return res.status(404).json({
        success: false,
        message: 'Tantangan lab tidak ditemukan.',
      });
    }

    if (!canManageLab(req.user, lab)) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki izin untuk mengubah tantangan lab ini.',
      });
    }

    const { errors, data } = await validateLabPayload(req.body, true);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors[0],
        errors,
      });
    }

    await lab.update(data);

    return res.status(200).json({
      success: true,
      message: 'Tantangan lab berhasil diperbarui.',
      data: lab,
    });
  } catch (error) {
    console.error('[labController.updateLab] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui tantangan lab.',
    });
  }
};

/**
 * 7. DELETE /api/labs/:id
 */
const deleteLab = async (req, res) => {
  try {
    const labId = parsePositiveInt(req.params.id);
    if (!labId) {
      return res.status(400).json({
        success: false,
        message: 'ID tantangan lab tidak valid.',
      });
    }

    const lab = await LabExercise.findByPk(labId);
    if (!lab) {
      return res.status(404).json({
        success: false,
        message: 'Tantangan lab tidak ditemukan.',
      });
    }

    if (!canManageLab(req.user, lab)) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki izin untuk menghapus tantangan lab ini.',
      });
    }

    await LabSubmission.destroy({ where: { lab_id: lab.id } });
    await lab.destroy();

    return res.status(200).json({
      success: true,
      message: 'Tantangan lab berhasil dihapus.',
      data: { id: labId },
    });
  } catch (error) {
    console.error('[labController.deleteLab] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menghapus tantangan lab.',
    });
  }
};

/**
 * 8. POST /api/labs/:id/submit
 */
const submitLabCode = async (req, res) => {
  try {
    const labId = parsePositiveInt(req.params.id);
    if (!labId) {
      return res.status(400).json({
        success: false,
        message: 'ID tantangan lab tidak valid.',
      });
    }

    const lab = await LabExercise.findByPk(labId);
    if (!lab || (!lab.is_published && !canManageLab(req.user, lab))) {
      return res.status(404).json({
        success: false,
        message: 'Tantangan lab tidak ditemukan.',
      });
    }

    const submittedCode = req.body.submitted_code !== undefined ? req.body.submitted_code : req.body.code;
    if (typeof submittedCode !== 'string' || submittedCode.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Kode jawaban wajib diisi dan tidak boleh kosong.',
      });
    }
    if (submittedCode.length > MAX_CODE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Panjang kode melebihi batas maksimal ${MAX_CODE_LENGTH} karakter.`,
      });
    }

    const language =
      typeof req.body.language === 'string' && req.body.language.trim()
        ? req.body.language.trim().toLowerCase()
        : lab.language;

    const analysis = await analyzeCodeSubmission({
      lab,
      submittedCode,
      language,
    });

    const rawScore = Number(analysis && analysis.score);
    const score = Number.isFinite(rawScore) ? Math.min(100, Math.max(0, Math.round(rawScore))) : 0;
    const passingScore = Number(lab.passing_score) || 70;
    const isCorrect =
      typeof (analysis && analysis.is_correct) === 'boolean' ? analysis.is_correct : score >= passingScore;

    let verdict = analysis && VALID_VERDICTS.includes(analysis.verdict) ? analysis.verdict : null;
    if (!verdict) {
      verdict = isCorrect ? 'correct' : score >= 40 ? 'partial' : 'incorrect';
    }

    const aiFeedback =
      (analysis && (analysis.feedback || analysis.ai_feedback || analysis.summary)) ||
      'Analisis selesai.';

    const submission = await LabSubmission.create({
      lab_id: lab.id,
      user_id: req.user.id,
      submitted_code: submittedCode,
      language,
      is_correct: isCorrect,
      score,
      verdict,
      ai_feedback: String(aiFeedback),
      ai_analysis: analysis || {},
      ai_provider: (analysis && analysis.ai_provider) || (analysis && analysis.provider) || 'ai',
    });

    return res.status(201).json({
      success: true,
      message: isCorrect
        ? 'Selamat! Kode Anda lulus evaluasi AI.'
        : 'Kode berhasil dievaluasi AI. Periksa umpan balik untuk perbaikan.',
      data: {
        submission,
        analysis,
      },
    });
  } catch (error) {
    console.error('[labController.submitLabCode] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menganalisis dan menyimpan pengumpulan kode.',
    });
  }
};

/**
 * 9. GET /api/labs/:id/submissions
 */
const getLabSubmissions = async (req, res) => {
  try {
    const labId = parsePositiveInt(req.params.id);
    if (!labId) {
      return res.status(400).json({
        success: false,
        message: 'ID tantangan lab tidak valid.',
      });
    }

    const lab = await LabExercise.findByPk(labId);
    if (!lab) {
      return res.status(404).json({
        success: false,
        message: 'Tantangan lab tidak ditemukan.',
      });
    }

    const isOwnerOrAdmin = canManageLab(req.user, lab);
    const where = isOwnerOrAdmin
      ? { lab_id: lab.id }
      : { lab_id: lab.id, user_id: req.user.id };

    const submissions = await LabSubmission.findAll({
      where,
      order: [['id', 'DESC']],
    });

    let items = submissions.map((s) => (typeof s.toJSON === 'function' ? s.toJSON() : { ...s }));

    if (isOwnerOrAdmin && items.length > 0) {
      const userIds = [...new Set(items.map((s) => s.user_id).filter(Boolean))];
      const students = await User.findAll({
        where: { id: { [Op.in]: userIds } },
        attributes: ['id', 'name', 'email'],
      });
      const studentMap = new Map(
        students.map((u) => [Number(u.id), { id: u.id, name: u.name, email: u.email }])
      );
      items = items.map((s) => ({
        ...s,
        student: studentMap.get(Number(s.user_id)) || null,
      }));
    }

    return res.status(200).json({
      success: true,
      message: 'Riwayat pengumpulan kode berhasil dimuat.',
      data: {
        items,
        total: items.length,
      },
    });
  } catch (error) {
    console.error('[labController.getLabSubmissions] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat riwayat pengumpulan kode.',
    });
  }
};

module.exports = {
  listLabs,
  getMyStats,
  aiGenerateLab,
  getLabById,
  createLab,
  updateLab,
  deleteLab,
  submitLabCode,
  getLabSubmissions,
};
