const assert = require('assert');
const {
  sequelize,
  User,
  Course,
  Category,
  Enrollment,
  Exam,
  ExamResult,
  Certificate,
  CourseMilestone,
  DiscountEarned,
} = require('../models');
const examController = require('../controllers/examController');
const milestoneController = require('../controllers/milestoneController');

// Mock response helper
function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
}

async function runSprint4Tests() {
  console.log('🧪 Starting Sprint 4: Gamification, Exams & Milestones Test Suite (Tegar)...\n');

  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: false });

    const timestamp = Date.now();

    // 1. Setup Data: Tutor, Student, Category, Course, Enrollment
    const tutor = await User.create({
      name: `Tutor Exam ${timestamp}`,
      email: `tutor_exam_${timestamp}@skillsphere.id`,
      password: 'hashed_password_123',
      role: 'tutor',
      is_verified: true,
    });

    const student = await User.create({
      name: `Student Exam ${timestamp}`,
      email: `student_exam_${timestamp}@skillsphere.id`,
      password: 'hashed_password_123',
      role: 'student',
      is_verified: true,
    });

    const otherStudent = await User.create({
      name: `Unenrolled Student ${timestamp}`,
      email: `unenrolled_${timestamp}@skillsphere.id`,
      password: 'hashed_password_123',
      role: 'student',
      is_verified: true,
    });

    let category = await Category.findOne();
    if (!category) {
      category = await Category.create({
        name: `Technology ${timestamp}`,
        slug: `tech-${timestamp}`,
      });
    }

    const course = await Course.create({
      tutor_id: tutor.id,
      category_id: category.id,
      title: `Advanced Cloud Architecture ${timestamp}`,
      slug: `cloud-arch-${timestamp}`,
      description: 'Kursus arsitektur cloud skala enterprise.',
      price: 250000,
      status: 'published',
    });

    const enrollment = await Enrollment.create({
      user_id: student.id,
      course_id: course.id,
      status: 'active',
      progress_percentage: 50,
      enrolled_at: new Date(),
    });

    // ==========================================
    // TEST 1: Tutor membuat Exam dengan passing grade 75 & 3 soal
    // ==========================================
    const mockRes1 = createMockRes();
    const questionsSample = [
      {
        id: '1',
        question: 'Manakah cloud service model yang menyediakan runtime container?',
        options: ['IaaS', 'PaaS', 'SaaS', 'On-Premise'],
        correct_answer: 'B',
        points: 40,
      },
      {
        id: '2',
        question: 'Apa fungsi utama load balancer dalam high availability?',
        options: ['Enkripsi database', 'Mendistribusikan lalu lintas trafik', 'Menyimpan cache DNS', 'Kompilasi kode'],
        correct_answer: 'B',
        points: 30,
      },
      {
        id: '3',
        question: 'Port standar untuk protokol aman HTTPS adalah?',
        options: ['80', '21', '443', '8080'],
        correct_answer: 'C',
        points: 30,
      },
    ];

    await examController.createOrUpdateExam(
      {
        params: { course_id: course.id },
        user: { id: tutor.id, role: 'tutor' },
        body: {
          title: 'Ujian Kelulusan Arsitektur Cloud',
          description: 'Uji kompetensi arsitektur komputasi awan tingkat lanjut.',
          passing_score: 75,
          duration_minutes: 45,
          questions: questionsSample,
        },
      },
      mockRes1
    );

    assert.strictEqual(mockRes1.statusCode, 201, 'Status code harus 201 Created');
    assert.strictEqual(mockRes1.body.success, true);
    assert.strictEqual(mockRes1.body.data.passing_score, 75);
    const examId = mockRes1.body.data.id;
    console.log('  ✔ createOrUpdateExam: Tutor created exam with passing grade 75% and 3 questions.');

    // ==========================================
    // TEST 2: Siswa mengambil soal ujian (Verifikasi Kunci Jawaban Disensor)
    // ==========================================
    const mockRes2 = createMockRes();
    await examController.getCourseExam(
      {
        params: { course_id: course.id },
        user: { id: student.id, role: 'student' },
      },
      mockRes2
    );

    assert.strictEqual(mockRes2.statusCode, 200);
    assert.strictEqual(mockRes2.body.data.questions.length, 3);
    // Verifikasi keamanan: correct_answer TIDAK BOLEH ada di response siswa!
    assert.strictEqual(mockRes2.body.data.questions[0].correct_answer, undefined);
    assert.strictEqual(mockRes2.body.data.is_tutor_view, false);
    console.log('  ✔ Security Sanitization: Student view strictly strips correct_answer from payload.');

    // ==========================================
    // TEST 3: Siswa yang tidak terdaftar dilarang mengumpulkan ujian
    // ==========================================
    const mockRes3 = createMockRes();
    await examController.submitExam(
      {
        params: { id: examId },
        user: { id: otherStudent.id, role: 'student' },
        body: { answers: { '1': 'B' } },
      },
      mockRes3
    );
    assert.strictEqual(mockRes3.statusCode, 403, 'Siswa belum terdaftar harus ditolak 403');
    console.log('  ✔ Access Control: Unenrolled student blocked from submitting exam (403).');

    // ==========================================
    // TEST 4: Siswa submit jawaban salah (Skor < 75, is_passed: false, no cert)
    // ==========================================
    const mockRes4 = createMockRes();
    await examController.submitExam(
      {
        params: { id: examId },
        user: { id: student.id, role: 'student' },
        body: {
          answers: { '1': 'A', '2': 'A', '3': 'A' }, // semua salah
          time_spent_seconds: 120,
        },
      },
      mockRes4
    );

    assert.strictEqual(mockRes4.statusCode, 200);
    assert.strictEqual(mockRes4.body.data.is_passed, false);
    assert.strictEqual(mockRes4.body.data.score, 0);
    assert.strictEqual(mockRes4.body.data.certificate, null);
    console.log('  ✔ Auto-Scoring Evaluation: Failed attempt scored correctly (0%) and blocked certification.');

    // ==========================================
    // TEST 5: Siswa submit jawaban benar (Skor 100%, is_passed: true, cert auto-issued)
    // ==========================================
    const mockRes5 = createMockRes();
    await examController.submitExam(
      {
        params: { id: examId },
        user: { id: student.id, role: 'student' },
        body: {
          answers: { '1': 'B', '2': 'B', '3': 'C' }, // 40 + 30 + 30 = 100 poin
          time_spent_seconds: 450,
        },
      },
      mockRes5
    );

    assert.strictEqual(mockRes5.statusCode, 200);
    assert.strictEqual(mockRes5.body.data.is_passed, true);
    assert.strictEqual(mockRes5.body.data.score, 100);
    assert.ok(mockRes5.body.data.certificate, 'Sertifikat harus diterbitkan saat lulus');
    assert.ok(mockRes5.body.data.certificate.certificate_code.startsWith('CERT-'));

    // Verifikasi di database: enrollment status menjadi completed 100%
    const updatedEnrollment = await Enrollment.findByPk(enrollment.id);
    assert.strictEqual(updatedEnrollment.status, 'completed');
    assert.strictEqual(updatedEnrollment.progress_percentage, 100);
    console.log('  ✔ Passing Evaluation: Score 100% passed, auto-issued official Certificate & completed enrollment.');

    // ==========================================
    // TEST 6: Riwayat pengerjaan ujian siswa
    // ==========================================
    const mockRes6 = createMockRes();
    await examController.getExamHistory(
      {
        params: { id: examId },
        user: { id: student.id, role: 'student' },
      },
      mockRes6
    );
    assert.strictEqual(mockRes6.statusCode, 200);
    assert.strictEqual(mockRes6.body.data.length, 2, 'Harus ada 2 percobaan ujian yang tercatat');
    console.log('  ✔ getExamHistory: Retrieved 2 historical exam submissions with detailed scores.');

    // ==========================================
    // TEST 7: Tutor membuat Milestone Target 5 Hari dengan Reward Diskon 15%
    // ==========================================
    const mockRes7 = createMockRes();
    await milestoneController.createOrUpdateMilestone(
      {
        params: { course_id: course.id },
        user: { id: tutor.id, role: 'tutor' },
        body: {
          title: 'Selesaikan Arsitektur Dasar dalam 5 Hari',
          description: 'Selesaikan bab awal tepat waktu dan dapatkan voucher potongan 15%.',
          target_days: 5,
          reward_discount_percentage: 15,
        },
      },
      mockRes7
    );

    assert.strictEqual(mockRes7.statusCode, 201);
    assert.strictEqual(mockRes7.body.data.reward_discount_percentage, 15);
    const milestoneId = mockRes7.body.data.id;
    console.log('  ✔ createOrUpdateMilestone: Tutor created learning milestone with 15% discount voucher reward.');

    // ==========================================
    // TEST 8: Siswa mengklaim Reward Milestone (Target waktu terpenuhi)
    // ==========================================
    const mockRes8 = createMockRes();
    await milestoneController.evaluateAndClaimMilestone(
      {
        params: { id: milestoneId },
        user: { id: student.id, role: 'student' },
      },
      mockRes8
    );

    assert.strictEqual(mockRes8.statusCode, 201);
    assert.strictEqual(mockRes8.body.data.discount_percentage, 15);
    assert.ok(mockRes8.body.data.discount_code.startsWith('MILE-15-'));
    const generatedVoucherCode = mockRes8.body.data.discount_code;
    console.log(`  ✔ evaluateAndClaimMilestone: Student claimed milestone on time, generated voucher: ${generatedVoucherCode}`);

    // ==========================================
    // TEST 9: Siswa dicegah mengklaim ganda milestone yang sama
    // ==========================================
    const mockRes9 = createMockRes();
    await milestoneController.evaluateAndClaimMilestone(
      {
        params: { id: milestoneId },
        user: { id: student.id, role: 'student' },
      },
      mockRes9
    );
    assert.strictEqual(mockRes9.statusCode, 400);
    console.log('  ✔ Idempotency: Duplicate milestone claim prevented (400 Bad Request).');

    // ==========================================
    // TEST 10: Siswa melihat daftar voucher diskon yang terkumpul
    // ==========================================
    const mockRes10 = createMockRes();
    await milestoneController.getStudentDiscounts(
      {
        user: { id: student.id, role: 'student' },
      },
      mockRes10
    );
    assert.strictEqual(mockRes10.statusCode, 200);
    assert.strictEqual(mockRes10.body.data.length, 1);
    console.log('  ✔ getStudentDiscounts: Retrieved student active discount voucher list.');

    // ==========================================
    // TEST 11: Validasi Voucher Diskon saat Checkout (Potongan 15% dari Rp 250.000)
    // ==========================================
    const mockRes11 = createMockRes();
    await milestoneController.validateDiscountCode(
      {
        user: { id: student.id, role: 'student' },
        body: {
          code: generatedVoucherCode,
          course_id: course.id,
        },
      },
      mockRes11
    );

    assert.strictEqual(mockRes11.statusCode, 200);
    assert.strictEqual(mockRes11.body.data.discount_percentage, 15);
    assert.strictEqual(mockRes11.body.data.original_price, 250000);
    assert.strictEqual(mockRes11.body.data.discount_amount, 37500); // 15% dari 250.000
    assert.strictEqual(mockRes11.body.data.final_price, 212500); // 250.000 - 37.500
    console.log('  ✔ validateDiscountCode: Calculated 15% discount (Rp 37.500 off) resulting in Rp 212.500.');

    console.log('\n======================================================');
    console.log('🎉 ALL SPRINT 4 GAMIFICATION, EXAMS & MILESTONE TESTS PASSED (TEGAR)!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Sprint 4 Test Failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  runSprint4Tests().then(() => process.exit(0));
}

module.exports = runSprint4Tests;

