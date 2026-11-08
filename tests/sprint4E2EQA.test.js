const assert = require('assert');
const http = require('http');
const fs = require('fs');
const ejs = require('ejs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const {
  User,
  UserProfile,
  Course,
  CourseSection,
  CourseMaterial,
  Category,
  Enrollment,
  Exam,
  ExamResult,
  Certificate,
  CourseMilestone,
  DiscountEarned,
} = require('../models');

const app = require('../app');
const JWT_SECRET = process.env.JWT_SECRET || 'skillsphere_super_secret_jwt_key_2026';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function request(server, options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        let parsed = null;
        try { parsed = JSON.parse(buf.toString()); } catch (e) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed || buf.toString(),
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runQATests() {
  console.log('\n🧪 Starting Sprint 4 E2E Quality Assurance & Full Lifecycle Test Suite...\n');

  let server;
  let port;

  try {
    // 1. Uji Kompilasi EJS Seluruh Views Sprint 4
    console.log('--- Sub-test 1: EJS View Compilations ---');
    const viewsToTest = [
      { name: 'Tutor Exam Creator (Satrio)', path: 'views/tutor/exams.ejs' },
      { name: 'Student Zen Exam Mode (Bustanul)', path: 'views/student/exam.ejs' },
      { name: 'Student Certificates & Milestones (Fadiyah)', path: 'views/student/certificates.ejs' },
      { name: 'Public Certificate Verification (Arjuna)', path: 'views/certificates/verify.ejs' },
    ];

    for (const v of viewsToTest) {
      assert(fs.existsSync(v.path), `Berkas view ${v.path} harus tersedia.`);
      const content = fs.readFileSync(v.path, 'utf8');
      ejs.compile(content);
      console.log(`  ✔ EJS view ${v.name} (${v.path}) compiled cleanly.`);
    }

    // 2. Setup Server HTTP
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        port = server.address().port;
        resolve();
      });
    });

    const timestamp = Date.now();

    // 3. Setup Master Data
    const tutor = await User.create({
      name: `Tutor QA ${timestamp}`,
      email: `tutor_qa_${timestamp}@skillsphere.test`,
      password: 'password123',
      role: 'tutor',
      is_verified: true,
    });
    const tutorToken = generateToken(tutor);

    const student = await User.create({
      name: `Student QA ${timestamp}`,
      email: `student_qa_${timestamp}@skillsphere.test`,
      password: 'password123',
      role: 'student',
      is_verified: true,
    });
    const studentToken = generateToken(student);

    await UserProfile.create({
      user_id: student.id,
      bio: 'Lifelong learner',
      career_goal: 'Fullstack Architect',
    });

    const category = await Category.create({
      name: `QA Category ${timestamp}`,
      slug: `qa-category-${timestamp}`,
    });

    const course = await Course.create({
      title: `Fullstack Enterprise Mastery ${timestamp}`,
      slug: `fullstack-mastery-${timestamp}`,
      description: 'Kursus arsitektur sistem enterprise.',
      category_id: category.id,
      tutor_id: tutor.id,
      price: 500000,
      status: 'published',
      level: 'advanced',
    });

    const enrollment = await Enrollment.create({
      user_id: student.id,
      course_id: course.id,
      status: 'active',
      progress_percentage: 100,
      enrollment_date: new Date(),
    });

    console.log('\n--- Sub-test 2: Complete E2E Lifecycle Flow ---');

    // Step A: Tutor Membuat Ujian Baru (Tahap 2 - Satrio)
    const createExamRes = await request(server, {
      hostname: '127.0.0.1',
      port,
      path: '/api/exams',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tutorToken}`,
      },
    }, {
      course_id: course.id,
      title: 'Ujian Kelulusan Resmi Enterprise',
      description: 'Lulus dengan passing score minimal 75%.',
      passing_score: 75,
      duration_minutes: 60,
      questions: [
        {
          id: '1',
          question: 'Apa fungsi utama caching pada arsitektur web modern?',
          options: ['Mempercepat response time', 'Menghapus database', 'Mengunci akun user', 'Menambah latensi'],
          correct_answer: 'A',
          points: 50,
        },
        {
          id: '2',
          question: 'Protokol apa yang digunakan untuk transaksi aman?',
          options: ['HTTP', 'HTTPS & TLS', 'FTP', 'Telnet'],
          correct_answer: 'B',
          points: 50,
        },
      ],
    });

    assert.strictEqual(createExamRes.status, 201);
    assert.strictEqual(createExamRes.data.success, true);
    const examId = createExamRes.data.data.id;
    console.log(`  ✔ [Tahap 2] Tutor created course exam (ID: ${examId}) with 2 questions.`);

    // Step B: Siswa Melihat Halaman Ruang Ujian (Tahap 3 - Bustanul)
    const examViewRes = await request(server, {
      hostname: '127.0.0.1',
      port,
      path: `/exam/${examId}`,
      method: 'GET',
    });
    assert.strictEqual(examViewRes.status, 200);
    assert(examViewRes.data.includes('Ruang Ujian Zen Mode'));
    console.log('  ✔ [Tahap 3] Student Zen Exam Mode page rendered successfully.');

    // Step C: Siswa Mengerjakan & Mengumpulkan Ujian (Tahap 1 & 3)
    const submitExamRes = await request(server, {
      hostname: '127.0.0.1',
      port,
      path: `/api/exams/${examId}/submit`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
    }, {
      answers: { '1': 'A', '2': 'B' },
      time_spent_seconds: 120,
    });

    assert.strictEqual(submitExamRes.status, 200);
    assert.strictEqual(submitExamRes.data.data.is_passed, true);
    assert.strictEqual(submitExamRes.data.data.score, 100);
    assert(submitExamRes.data.data.certificate, 'Sertifikat harus diterbitkan secara otomatis.');
    const certCode = submitExamRes.data.data.certificate.certificate_code;
    console.log(`  ✔ [Tahap 1] Exam submitted & auto-scored: 100% (Passed). Official Certificate: ${certCode}`);

    // Step D: Siswa Mengakses Portfolio Sertifikat & Voucher (Tahap 4 - Fadiyah)
    const certsViewRes = await request(server, {
      hostname: '127.0.0.1',
      port,
      path: '/certificates',
      method: 'GET',
    });
    assert.strictEqual(certsViewRes.status, 200);
    assert(certsViewRes.data.includes('Sertifikat &amp; Pencapaian Belajar') || certsViewRes.data.includes('Sertifikat & Pencapaian Belajar'));
    console.log('  ✔ [Tahap 4] Student certificates & milestone vouchers view rendered successfully.');

    // Step E: Verifikasi Publik Kredensial Keaslian (Tahap 1 - Arjuna)
    const verifyApiRes = await request(server, {
      hostname: '127.0.0.1',
      port,
      path: `/api/certificates/verify/${certCode}`,
      method: 'GET',
    });
    assert.strictEqual(verifyApiRes.status, 200);
    assert.strictEqual(verifyApiRes.data.data.is_valid, true);
    assert.strictEqual(verifyApiRes.data.data.exam_score, 100);
    console.log('  ✔ [Tahap 1] Certificate cryptographically verified via public registry API.');

    console.log('\n======================================================');
    console.log('🎉 ALL SPRINT 4 E2E LIFECYCLE & QA TESTS PASSED 100%!');
    console.log('======================================================\n');
  } finally {
    if (server) server.close();
  }
}

runQATests().catch((err) => {
  console.error('\n❌ QA TEST FAILED:', err);
  process.exit(1);
});
