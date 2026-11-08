const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
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
  sequelize,
} = require('../models');

const certificateGenerator = require('../services/certificateGenerator');
const app = require('../app');

const JWT_SECRET = process.env.JWT_SECRET || 'skillsphere_super_secret_jwt_key_2026';

function generateTestToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, username: user.username },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function makeRequest(server, options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        let parsedJson = null;
        try {
          parsedJson = JSON.parse(buffer.toString());
        } catch (e) {
          // Non-JSON response (e.g. PDF or HTML)
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsedJson || buffer.toString(),
          rawBuffer: buffer,
        });
      });
    });

    req.on('error', reject);

    if (postData) {
      if (typeof postData === 'object' && !(postData instanceof Buffer)) {
        req.write(JSON.stringify(postData));
      } else {
        req.write(postData);
      }
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n🧪 Starting Sprint 4: Certificate PDF Generator, Public Verification & AI Exam Readiness Tests (Arjuna)...\n');

  let server;
  let port;
  let testStudent;
  let testTutor;
  let studentToken;
  let testCourse;
  let testExam;
  let generatedCertCode;

  try {
    // 0. Setup Server
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        port = server.address().port;
        console.log(`  ✔ Test HTTP server listening on port ${port}`);
        resolve();
      });
    });

    const timestamp = Date.now();

    // 1. Setup Test Users
    testTutor = await User.create({
      name: `Tutor Arjuna ${timestamp}`,
      email: `tutor_arjuna_${timestamp}@skillsphere.test`,
      password: 'password123',
      role: 'tutor',
      is_verified: true,
    });

    testStudent = await User.create({
      name: `Arjuna Candidate ${timestamp}`,
      email: `student_arjuna_${timestamp}@skillsphere.test`,
      password: 'password123',
      role: 'student',
      is_verified: true,
    });

    studentToken = generateTestToken(testStudent);

    await UserProfile.create({
      user_id: testStudent.id,
      bio: 'Enthusiastic Learner focusing on AI systems',
      career_goal: 'AI Backend Architect',
    });

    const testCategory = await Category.create({
      name: `AI Engineering ${timestamp}`,
      slug: `ai-engineering-${timestamp}`,
    });

    testCourse = await Course.create({
      title: `Orion AI & Distributed Systems Masterclass ${timestamp}`,
      slug: `orion-ai-masterclass-${timestamp}`,
      description: 'Kursus arsitektur sistem kecerdasan buatan enterprise.',
      category_id: testCategory.id,
      tutor_id: testTutor.id,
      price: 350000,
      status: 'published',
      level: 'advanced',
    });

    const testSection = await CourseSection.create({
      course_id: testCourse.id,
      title: 'Modul 1: Dasar Prompt Engineering & Tokenomics',
      order_index: 1,
    });

    await CourseMaterial.create({
      section_id: testSection.id,
      title: 'Materi 1.1: Memahami Latensi dan Throughput LLM',
      content_type: 'video',
      file_url: '/uploads/videos/mock_llm.mp4',
      order_index: 1,
    });

    await CourseMaterial.create({
      section_id: testSection.id,
      title: 'Materi 1.2: Optimasi Konteks dan Caching',
      content_type: 'pdf',
      file_url: '/uploads/documents/mock_caching.pdf',
      order_index: 2,
    });

    testExam = await Exam.create({
      course_id: testCourse.id,
      title: 'Ujian Kelulusan Resmi: Orion AI Architecture',
      description: 'Evaluasi komprehensif kelulusan dengan passing score 75%.',
      passing_score: 75,
      duration_minutes: 60,
      questions: [
        {
          id: '1',
          question: 'Berapa passing score ujian ini?',
          options: ['50%', '60%', '75%', '100%'],
          correct_answer: 'C',
          points: 10,
        },
        {
          id: '2',
          question: 'Format output sistem validasi sertifikat adalah?',
          options: ['XML', 'JSON & PDF', 'CSV', 'Plain Text'],
          correct_answer: 'B',
          points: 10,
        },
      ],
    });

    const testEnrollment = await Enrollment.create({
      user_id: testStudent.id,
      course_id: testCourse.id,
      status: 'active',
      progress_percentage: 100,
      enrollment_date: new Date(),
    });

    // ==========================================
    // TEST 1: Service Generator PDF & QR Code Fisik
    // ==========================================
    generatedCertCode = `SKILL-CERT-${Date.now()}-TEST`;
    const genResult = await certificateGenerator.generateCertificatePdf({
      certificateCode: generatedCertCode,
      studentName: testStudent.name,
      courseTitle: testCourse.title,
      tutorName: testTutor.name,
      score: 100,
      issueDate: new Date(),
    });

    assert(fs.existsSync(genResult.filePath), 'File PDF sertifikat harus tersimpan pada disk storage.');
    assert(genResult.pdfBuffer.length > 2000, 'Ukuran file PDF sertifikat harus memiliki bobot valid (> 2 KB).');
    assert.strictEqual(genResult.publicUrl, `/uploads/certificates/cert_${generatedCertCode}.pdf`);
    console.log('  ✔ certificateGenerator: Successfully created PDF & validated QR code stamp on disk.');

    // Simpan sertifikat ke database untuk pengujian endpoint
    const dbCert = await Certificate.create({
      certificate_code: generatedCertCode,
      user_id: testStudent.id,
      course_id: testCourse.id,
      issue_date: new Date(),
      certificate_url: genResult.publicUrl,
    });

    const dbExamResult = await ExamResult.create({
      exam_id: testExam.id,
      user_id: testStudent.id,
      enrollment_id: testEnrollment.id,
      score: 100,
      is_passed: true,
      answers_data: { total: 2, correct: 2 },
      submitted_at: new Date(),
    });

    await dbCert.update({ exam_result_id: dbExamResult.id });

    // ==========================================
    // TEST 2: Endpoint Publik Verifikasi Sertifikat (GET /api/certificates/verify/:code)
    // ==========================================
    const verifyRes = await makeRequest(server, {
      hostname: '127.0.0.1',
      port,
      path: `/api/certificates/verify/${generatedCertCode}`,
      method: 'GET',
    });

    assert.strictEqual(verifyRes.statusCode, 200);
    assert.strictEqual(verifyRes.body.success, true);
    assert.strictEqual(verifyRes.body.data.is_valid, true);
    assert.strictEqual(verifyRes.body.data.certificate_code, generatedCertCode);
    assert.strictEqual(verifyRes.body.data.student_name, testStudent.name);
    assert.strictEqual(verifyRes.body.data.course_title, testCourse.title);
    assert.strictEqual(verifyRes.body.data.exam_score, 100);
    console.log('  ✔ GET /api/certificates/verify/:code: Public certificate verification endpoint verified.');

    // ==========================================
    // TEST 3: Verifikasi Sertifikat Tidak Valid (404)
    // ==========================================
    const invalidVerifyRes = await makeRequest(server, {
      hostname: '127.0.0.1',
      port,
      path: '/api/certificates/verify/FAKE-CERT-999999',
      method: 'GET',
    });

    assert.strictEqual(invalidVerifyRes.statusCode, 404);
    assert.strictEqual(invalidVerifyRes.body.success, false);
    assert.strictEqual(invalidVerifyRes.body.is_valid, false);
    console.log('  ✔ GET /api/certificates/verify/:code (invalid): Successfully blocked bogus certificate code (404).');

    // ==========================================
    // TEST 4: Unduh / Streaming File PDF Resmi (GET /api/certificates/:code/pdf)
    // ==========================================
    const pdfStreamRes = await makeRequest(server, {
      hostname: '127.0.0.1',
      port,
      path: `/api/certificates/${generatedCertCode}/pdf`,
      method: 'GET',
    });

    assert.strictEqual(pdfStreamRes.statusCode, 200);
    assert.strictEqual(pdfStreamRes.headers['content-type'], 'application/pdf');
    assert(pdfStreamRes.headers['content-disposition'].includes(generatedCertCode));
    assert(pdfStreamRes.rawBuffer.length > 2000, 'Raw stream harus berisi binary buffer PDF.');
    console.log('  ✔ GET /api/certificates/:code/pdf: Streamed official PDF certificate with correct headers.');

    // ==========================================
    // TEST 5: Ambil Daftar Sertifikat Milik Siswa (GET /api/certificates/my-certificates)
    // ==========================================
    const myCertsRes = await makeRequest(server, {
      hostname: '127.0.0.1',
      port,
      path: '/api/certificates/my-certificates',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${studentToken}`,
      },
    });

    assert.strictEqual(myCertsRes.statusCode, 200);
    assert.strictEqual(myCertsRes.body.success, true);
    assert(Array.isArray(myCertsRes.body.data));
    assert.strictEqual(myCertsRes.body.data.length, 1);
    assert.strictEqual(myCertsRes.body.data[0].certificate_code, generatedCertCode);
    console.log('  ✔ GET /api/certificates/my-certificates: Retrieved student certificate portfolio.');

    // ==========================================
    // TEST 6: Halaman Web Publik Verifikasi EJS (GET /verify-cert/:code)
    // ==========================================
    const webViewRes = await makeRequest(server, {
      hostname: '127.0.0.1',
      port,
      path: `/verify-cert/${generatedCertCode}`,
      method: 'GET',
    });

    assert.strictEqual(webViewRes.statusCode, 200);
    assert(webViewRes.body.includes('Sertifikat Asli &amp; Terverifikasi Resmi') || webViewRes.body.includes('Sertifikat Asli & Terverifikasi Resmi'));
    assert(webViewRes.body.includes(testStudent.name));
    assert(webViewRes.body.includes(generatedCertCode));
    assert(webViewRes.body.includes('Arjuna Lanang, S.Kom., M.T.'));
    console.log('  ✔ GET /verify-cert/:code: Rendered public warm-paper certificate verification page.');

    // ==========================================
    // TEST 7: Halaman Web Publik Sertifikat Tidak Valid
    // ==========================================
    const webViewInvalidRes = await makeRequest(server, {
      hostname: '127.0.0.1',
      port,
      path: '/verify-cert/INVALID-RANDOM-CODE-999',
      method: 'GET',
    });

    assert.strictEqual(webViewInvalidRes.statusCode, 200);
    assert(webViewInvalidRes.body.includes('Sertifikat Tidak Ditemukan atau Tidak Valid'));
    console.log('  ✔ GET /verify-cert/:code (invalid): Handled invalid code gracefully in web UI.');

    // ==========================================
    // TEST 8: Evaluasi Kesiapan Ujian Orion AI (GET /api/ai/exam-readiness/:courseId)
    // ==========================================
    const readinessRes = await makeRequest(server, {
      hostname: '127.0.0.1',
      port,
      path: `/api/ai/exam-readiness/${testCourse.id}`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${studentToken}`,
      },
    });

    assert.strictEqual(readinessRes.statusCode, 200);
    assert.strictEqual(readinessRes.body.success, true);
    assert(readinessRes.body.data.readiness_evaluation);
    const evalData = readinessRes.body.data.readiness_evaluation;
    assert(typeof evalData.readiness_percentage === 'number');
    assert(evalData.readiness_level);
    assert(Array.isArray(evalData.strengths));
    assert(Array.isArray(evalData.areas_to_review));
    assert(Array.isArray(evalData.study_strategy));
    assert(Array.isArray(evalData.exam_tips));
    assert(evalData.confidence_verdict);
    console.log(`  ✔ GET /api/ai/exam-readiness/:courseId: Orion AI assessed readiness (${evalData.readiness_level} - ${evalData.readiness_percentage}%).`);

    // ==========================================
    // TEST 9: Integrasi End-to-End Submit Exam Lulus Menerbitkan PDF Fisik
    // ==========================================
    const submitRes = await makeRequest(server, {
      hostname: '127.0.0.1',
      port,
      path: `/api/exams/${testExam.id}/submit`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
    }, {
      answers: { '1': 'C', '2': 'B' },
      time_spent_seconds: 300,
    });

    assert.strictEqual(submitRes.statusCode, 200);
    assert.strictEqual(submitRes.body.data.is_passed, true);
    assert.strictEqual(submitRes.body.data.score, 100);
    assert(submitRes.body.data.certificate);
    assert(submitRes.body.data.certificate.certificate_code);
    console.log('  ✔ POST /api/exams/:id/submit: Passed exam auto-generated Certificate record & PDF link.');

    // Cleanup generated test PDF
    if (fs.existsSync(genResult.filePath)) {
      fs.unlinkSync(genResult.filePath);
    }

    console.log('\n======================================================');
    console.log('🎉 ALL SPRINT 4 CERTIFICATE & AI READINESS TESTS PASSED (ARJUNA)!');
    console.log('======================================================\n');
    process.exit(0);
  } finally {
    if (server) {
      server.close();
    }
  }
}

runTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
