process.env.NODE_ENV = 'test';

const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const {
  sequelize,
  User,
  Category,
  Course,
  Enrollment,
  Exam,
  ExamResult,
  LabExercise,
  LabSubmission,
  Certificate,
} = require('../models');

const app = require('../app');
const JWT_SECRET = process.env.JWT_SECRET || 'skillsphere-super-secret-jwt-key-2025';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

function request(port, method, path, { token = null, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body !== null ? JSON.stringify(body) : null;
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (payload !== null) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          const rawText = buf.toString('utf8');
          let parsed = null;
          try {
            parsed = JSON.parse(rawText);
          } catch (_) {
            parsed = null;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed !== null ? parsed : rawText,
            rawText,
          });
        });
      }
    );

    req.on('error', reject);
    if (payload !== null) {
      req.write(payload);
    }
    req.end();
  });
}

function assertClampedNumericSeries(arr, expectedLength, label) {
  assert(Array.isArray(arr), `${label} must be an array`);
  assert.strictEqual(
    arr.length,
    expectedLength,
    `${label} length (${arr.length}) must match labels length (${expectedLength})`
  );
  for (let i = 0; i < arr.length; i += 1) {
    const val = arr[i];
    assert.strictEqual(typeof val, 'number', `${label}[${i}] must be a number`);
    assert(Number.isFinite(val), `${label}[${i}] must be finite`);
    assert(val >= 0 && val <= 100, `${label}[${i}] (${val}) must be clamped within 0..100`);
  }
}

async function runStudentLearningRadarTests() {
  console.log('\n=====================================================================');
  console.log('TEST SUITE: Student Learning Radar Chart (Integration)');
  console.log('=====================================================================\n');

  let server;
  let port;
  const createdUserIds = [];
  let createdCategoryId = null;
  let createdCourseId = null;
  let createdEnrollmentId = null;
  let createdExamId = null;
  let createdExamResultId = null;
  let createdLabId = null;
  let createdLabSubmissionId = null;
  let createdCertificateId = null;

  try {
    await sequelize.authenticate();
    await sequelize.sync();

    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        port = server.address().port;
        resolve();
      });
    });

    const ts = Date.now();

    const tutor = await User.create({
      name: `Tutor Radar ${ts}`,
      email: `tutor_radar_${ts}@skillsphere.test`,
      password: 'hashed_password_123',
      role: 'tutor',
      is_verified: true,
    });
    createdUserIds.push(tutor.id);

    const freshStudent = await User.create({
      name: `Siswa Baru Radar ${ts}`,
      email: `fresh_radar_${ts}@skillsphere.test`,
      password: 'hashed_password_123',
      role: 'student',
      is_verified: true,
    });
    createdUserIds.push(freshStudent.id);

    const activeStudent = await User.create({
      name: `Siswa Aktif Radar ${ts}`,
      email: `active_radar_${ts}@skillsphere.test`,
      password: 'hashed_password_123',
      role: 'student',
      is_verified: true,
    });
    createdUserIds.push(activeStudent.id);

    const freshStudentToken = generateToken(freshStudent);
    const activeStudentToken = generateToken(activeStudent);

    // ------------------------------------------------------------------
    // 1. Unauthenticated request -> HTTP 401
    // ------------------------------------------------------------------
    console.log('1. Testing GET /api/student/learning-radar without auth -> HTTP 401...');
    const unauthRes = await request(port, 'GET', '/api/student/learning-radar');
    assert.strictEqual(unauthRes.status, 401, `Expected HTTP 401, got ${unauthRes.status}`);
    assert.strictEqual(unauthRes.data.success, false, 'Unauthenticated response must have success: false');
    console.log('   OK: Unauthenticated request rejected with HTTP 401.');

    // ------------------------------------------------------------------
    // 2. Brand-new student -> Pondasi stage, valid radar arrays 0..100
    // ------------------------------------------------------------------
    console.log('2. Testing GET /api/student/learning-radar as brand-new student...');
    const freshRes = await request(port, 'GET', '/api/student/learning-radar', {
      token: freshStudentToken,
    });
    assert.strictEqual(
      freshRes.status,
      200,
      `Expected HTTP 200 for brand-new student, got ${freshRes.status}: ${freshRes.rawText}`
    );
    assert.strictEqual(freshRes.data.success, true);

    const freshData = freshRes.data.data;
    assert(freshData && typeof freshData === 'object', 'data payload must be an object');
    assert.strictEqual(
      freshData.current_stage.label,
      'Pondasi',
      `Expected brand-new student stage label "Pondasi", got "${freshData.current_stage.label}"`
    );
    assert.strictEqual(freshData.current_stage.level, 1, 'Expected brand-new student stage level 1');

    assert(Array.isArray(freshData.skill_radar.labels), 'skill_radar.labels must be an array');
    assert(
      freshData.skill_radar.labels.length >= 5,
      `Expected skill_radar.labels.length >= 5, got ${freshData.skill_radar.labels.length}`
    );
    assertClampedNumericSeries(
      freshData.skill_radar.series.material_mastery,
      freshData.skill_radar.labels.length,
      'fresh skill_radar.series.material_mastery'
    );
    assertClampedNumericSeries(
      freshData.skill_radar.series.practice_score,
      freshData.skill_radar.labels.length,
      'fresh skill_radar.series.practice_score'
    );
    assertClampedNumericSeries(
      freshData.skill_radar.series.target_level,
      freshData.skill_radar.labels.length,
      'fresh skill_radar.series.target_level'
    );

    assert(Array.isArray(freshData.stage_radar.labels), 'stage_radar.labels must be an array');
    assert.strictEqual(
      freshData.stage_radar.labels.length,
      6,
      `Expected stage_radar.labels.length === 6, got ${freshData.stage_radar.labels.length}`
    );
    assertClampedNumericSeries(
      freshData.stage_radar.series.current_score,
      6,
      'fresh stage_radar.series.current_score'
    );
    assertClampedNumericSeries(
      freshData.stage_radar.series.target_score,
      6,
      'fresh stage_radar.series.target_score'
    );

    assert.strictEqual(freshData.metrics.enrolled_courses, 0);
    assert.strictEqual(freshData.metrics.completed_courses, 0);
    assert.strictEqual(freshData.metrics.labs_solved, 0);
    assert.strictEqual(freshData.metrics.exams_passed, 0);
    assert.strictEqual(freshData.metrics.certificates_earned, 0);
    console.log(
      `   OK: Fresh student stage="${freshData.current_stage.label}", skill_labels=${freshData.skill_radar.labels.length}, stage_labels=${freshData.stage_radar.labels.length}.`
    );

    // ------------------------------------------------------------------
    // 3. Active student with Enrollment(100%), passed ExamResult(95),
    //    solved LabSubmission(90), and Certificate
    // ------------------------------------------------------------------
    console.log('3. Testing GET /api/student/learning-radar with completed enrollment, exam, lab, and certificate...');
    const category = await Category.create({
      name: `Radar Web Engineering ${ts}`,
      slug: `radar-web-engineering-${ts}`,
    });
    createdCategoryId = category.id;

    const course = await Course.create({
      tutor_id: tutor.id,
      category_id: category.id,
      title: `Arsitektur Web Modern ${ts}`,
      slug: `arsitektur-web-modern-${ts}`,
      description: 'Kursus pengujian integrasi grafik radar pembelajaran siswa.',
      price: 200000,
      status: 'published',
    });
    createdCourseId = course.id;

    const enrollment = await Enrollment.create({
      user_id: activeStudent.id,
      course_id: course.id,
      progress_percentage: 100,
      status: 'active',
    });
    createdEnrollmentId = enrollment.id;

    const exam = await Exam.create({
      course_id: course.id,
      exam_type: 'final',
      title: `Ujian Akhir Web Modern ${ts}`,
      passing_score: 75,
      duration_minutes: 45,
      questions: [{ question: 'Apa itu HTTP?', options: ['Protokol', 'Bahasa'], answer: 0 }],
    });
    createdExamId = exam.id;

    const examResult = await ExamResult.create({
      exam_id: exam.id,
      user_id: activeStudent.id,
      enrollment_id: enrollment.id,
      score: 95,
      is_passed: true,
    });
    createdExamResultId = examResult.id;

    const lab = await LabExercise.create({
      course_id: course.id,
      created_by: tutor.id,
      room_type: 'lab',
      challenge_mode: 'create',
      title: `Praktikum Radar HTML5 ${ts}`,
      description: 'Latihan kode untuk pengujian radar pembelajaran.',
      language: 'html',
      difficulty: 'intermediate',
      starter_code: '<section></section>',
      solution_reference: '<section><h1>SkillSphere</h1></section>',
      expected_output: 'Heading SkillSphere di dalam section',
      test_cases: [{ description: 'Render h1', input: 'DOM', expected: 'SkillSphere' }],
      hints: ['Tambahkan tag h1 di dalam section'],
      passing_score: 70,
      is_published: true,
    });
    createdLabId = lab.id;

    const labSubmission = await LabSubmission.create({
      lab_id: lab.id,
      user_id: activeStudent.id,
      submitted_code: '<section><h1>SkillSphere</h1></section>',
      language: 'html',
      is_correct: true,
      score: 90,
      verdict: 'correct',
      ai_feedback: 'Struktur semantik HTML5 sangat baik.',
      ai_analysis: { strengths: ['Semantik'], issues: [], test_results: [] },
      ai_provider: 'heuristic-fallback',
    });
    createdLabSubmissionId = labSubmission.id;

    const certificate = await Certificate.create({
      certificate_code: `SKL-RADAR-${ts}`,
      user_id: activeStudent.id,
      course_id: course.id,
      exam_result_id: examResult.id,
      issue_date: new Date(),
    });
    createdCertificateId = certificate.id;

    const activeRes = await request(port, 'GET', '/api/student/learning-radar', {
      token: activeStudentToken,
    });
    assert.strictEqual(
      activeRes.status,
      200,
      `Expected HTTP 200 for active student, got ${activeRes.status}: ${activeRes.rawText}`
    );
    assert.strictEqual(activeRes.data.success, true);

    const activeData = activeRes.data.data;
    assert(
      activeData.current_stage.level >= 3,
      `Expected elevated current_stage.level >= 3, got ${activeData.current_stage.level} (${activeData.current_stage.label}, score=${activeData.current_stage.overall_score})`
    );

    assert(Array.isArray(activeData.studied_topics), 'studied_topics must be an array');
    const topic = activeData.studied_topics.find((t) => Number(t.course_id) === Number(course.id));
    assert(topic, 'studied_topics must contain the enrolled course');
    assert.strictEqual(topic.progress_percent, 100, `Expected progress_percent=100, got ${topic.progress_percent}`);
    assert.strictEqual(topic.exam_passed, true, 'Expected exam_passed=true');
    assert(topic.lab_solved >= 1, `Expected lab_solved >= 1, got ${topic.lab_solved}`);

    assert.strictEqual(activeData.metrics.enrolled_courses, 1, 'Expected enrolled_courses=1');
    assert.strictEqual(activeData.metrics.completed_courses, 1, 'Expected completed_courses=1');
    assert.strictEqual(activeData.metrics.labs_solved, 1, 'Expected labs_solved=1');
    assert.strictEqual(activeData.metrics.labs_attempted, 1, 'Expected labs_attempted=1');
    assert.strictEqual(activeData.metrics.avg_lab_score, 90, 'Expected avg_lab_score=90');
    assert.strictEqual(activeData.metrics.exams_passed, 1, 'Expected exams_passed=1');
    assert.strictEqual(activeData.metrics.avg_exam_score, 95, 'Expected avg_exam_score=95');
    assert.strictEqual(activeData.metrics.certificates_earned, 1, 'Expected certificates_earned=1');

    assertClampedNumericSeries(
      activeData.skill_radar.series.material_mastery,
      activeData.skill_radar.labels.length,
      'active skill_radar.series.material_mastery'
    );
    assertClampedNumericSeries(
      activeData.skill_radar.series.practice_score,
      activeData.skill_radar.labels.length,
      'active skill_radar.series.practice_score'
    );
    assertClampedNumericSeries(
      activeData.skill_radar.series.target_level,
      activeData.skill_radar.labels.length,
      'active skill_radar.series.target_level'
    );
    assertClampedNumericSeries(
      activeData.stage_radar.series.current_score,
      6,
      'active stage_radar.series.current_score'
    );
    assertClampedNumericSeries(
      activeData.stage_radar.series.target_score,
      6,
      'active stage_radar.series.target_score'
    );
    console.log(
      `   OK: Active student stage="${activeData.current_stage.label}" (level ${activeData.current_stage.level}, score ${activeData.current_stage.overall_score}), topic progress=100%, exam_passed=true, lab_solved=${topic.lab_solved}.`
    );

    // ------------------------------------------------------------------
    // 4. GET /dashboard HTML markers for Student Learning Radar Chart
    // ------------------------------------------------------------------
    console.log('4. Testing GET /dashboard HTML contains radar markers and assets...');
    const dashRes = await request(port, 'GET', '/dashboard');
    assert.strictEqual(dashRes.status, 200, `Expected GET /dashboard HTTP 200, got ${dashRes.status}`);
    const requiredMarkers = [
      'studentRadarSection',
      'studentLearningRadarCanvas',
      '/stylesheets/student-radar.css',
      '/javascripts/chart.umd.min.js',
      '/javascripts/student-radar.js',
    ];
    for (const marker of requiredMarkers) {
      assert(
        dashRes.rawText.includes(marker),
        `GET /dashboard HTML must contain "${marker}"`
      );
    }
    console.log('   OK: GET /dashboard returned HTTP 200 HTML with all required radar markers.');

    console.log('\n=====================================================================');
    console.log('ALL STUDENT LEARNING RADAR INTEGRATION TESTS PASSED!');
    console.log('=====================================================================\n');
  } catch (err) {
    console.error('\nTEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    try {
      if (createdCertificateId) {
        await Certificate.destroy({ where: { id: createdCertificateId } });
      }
      if (createdExamResultId) {
        await ExamResult.destroy({ where: { id: createdExamResultId } });
      }
      if (createdExamId) {
        await Exam.destroy({ where: { id: createdExamId } });
      }
      if (createdLabSubmissionId) {
        await LabSubmission.destroy({ where: { id: createdLabSubmissionId } });
      }
      if (createdLabId) {
        await LabExercise.destroy({ where: { id: createdLabId } });
      }
      if (createdEnrollmentId) {
        await Enrollment.destroy({ where: { id: createdEnrollmentId } });
      }
      if (createdCourseId) {
        await Course.destroy({ where: { id: createdCourseId } });
      }
      if (createdCategoryId) {
        await Category.destroy({ where: { id: createdCategoryId } });
      }
      if (createdUserIds.length > 0) {
        await User.destroy({ where: { id: createdUserIds } });
      }
    } catch (cleanupErr) {
      console.error('Cleanup warning:', cleanupErr.message);
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await sequelize.close();
  }
}

runStudentLearningRadarTests().then(() => {
  process.exit(process.exitCode || 0);
});
