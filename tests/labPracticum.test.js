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
  LabExercise,
  LabSubmission,
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

async function runLabPracticumTests() {
  console.log('\n=====================================================================');
  console.log('TEST SUITE: Ruang Lab & Ruang Praktikum (End-to-End Integration)');
  console.log('=====================================================================\n');

  let server;
  let port;
  const createdUserIds = [];
  const createdLabIds = [];
  let createdCourseId = null;
  let createdCategoryId = null;

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

    // Setup users: admin, tutor, student1, student2
    const admin = await User.create({
      name: `Admin Lab ${ts}`,
      email: `admin_lab_${ts}@skillsphere.test`,
      password: 'hashed_password_123',
      role: 'admin',
      is_verified: true,
    });
    createdUserIds.push(admin.id);

    const tutor = await User.create({
      name: `Tutor Lab ${ts}`,
      email: `tutor_lab_${ts}@skillsphere.test`,
      password: 'hashed_password_123',
      role: 'tutor',
      is_verified: true,
    });
    createdUserIds.push(tutor.id);

    const student1 = await User.create({
      name: `Siswa Lab Satu ${ts}`,
      email: `student1_lab_${ts}@skillsphere.test`,
      password: 'hashed_password_123',
      role: 'student',
      is_verified: true,
    });
    createdUserIds.push(student1.id);

    const student2 = await User.create({
      name: `Siswa Lab Dua ${ts}`,
      email: `student2_lab_${ts}@skillsphere.test`,
      password: 'hashed_password_123',
      role: 'student',
      is_verified: true,
    });
    createdUserIds.push(student2.id);

    const adminToken = generateToken(admin);
    const tutorToken = generateToken(tutor);
    const student1Token = generateToken(student1);
    const student2Token = generateToken(student2);

    const category = await Category.create({
      name: `Lab Engineering ${ts}`,
      slug: `lab-engineering-${ts}`,
    });
    createdCategoryId = category.id;

    const course = await Course.create({
      tutor_id: tutor.id,
      category_id: category.id,
      title: `Fullstack Lab Practicum ${ts}`,
      slug: `fullstack-lab-practicum-${ts}`,
      description: 'Kursus pemrograman praktis untuk pengujian lab.',
      price: 150000,
      status: 'published',
    });
    createdCourseId = course.id;

    // ------------------------------------------------------------------
    // 1. Auto-seed 6 default challenges via GET /api/labs
    // ------------------------------------------------------------------
    console.log('1. Testing GET /api/labs auto-seed (6 default challenges)...');
    const guestListRes = await request(port, 'GET', '/api/labs');
    assert.strictEqual(guestListRes.status, 200, 'GET /api/labs should return 200');
    assert.strictEqual(guestListRes.data.success, true);
    const allItems = guestListRes.data.data.items;
    assert(Array.isArray(allItems), 'items should be an array');
    assert(allItems.length >= 6, `Expected at least 6 seeded labs, got ${allItems.length}`);

    const labRoomItems = allItems.filter((item) => item.room_type === 'lab');
    const practicumRoomItems = allItems.filter((item) => item.room_type === 'practicum');
    const createModeItems = allItems.filter((item) => item.challenge_mode === 'create');
    const fixModeItems = allItems.filter((item) => item.challenge_mode === 'fix');

    assert(labRoomItems.length >= 1, 'Should have at least 1 lab room challenge');
    assert(practicumRoomItems.length >= 1, 'Should have at least 1 practicum room challenge');
    assert(createModeItems.length >= 1, 'Should include create mode challenges');
    assert(fixModeItems.length >= 1, 'Should include fix mode challenges');
    console.log(`   OK: Found ${allItems.length} labs (${labRoomItems.length} lab, ${practicumRoomItems.length} practicum, ${createModeItems.length} create, ${fixModeItems.length} fix).`);

    // ------------------------------------------------------------------
    // 2. Filtering: room_type (including unified all), challenge_mode, language
    // ------------------------------------------------------------------
    console.log('2. Testing GET /api/labs query filters (including unified room_type=all)...');
    const filterAllRes = await request(port, 'GET', '/api/labs?room_type=all');
    assert.strictEqual(filterAllRes.status, 200, 'GET /api/labs?room_type=all should return 200');
    const filterAllItems = filterAllRes.data.data.items;
    assert.strictEqual(
      filterAllItems.length,
      allItems.length,
      `GET /api/labs?room_type=all (${filterAllItems.length}) should match GET /api/labs (${allItems.length})`
    );
    assert(
      filterAllItems.some((i) => i.room_type === 'lab') &&
        filterAllItems.some((i) => i.room_type === 'practicum'),
      'GET /api/labs?room_type=all should include both lab and practicum items together'
    );

    const filterLabRes = await request(port, 'GET', '/api/labs?room_type=lab');
    assert.strictEqual(filterLabRes.status, 200);
    assert.strictEqual(filterLabRes.data.data.items.length, labRoomItems.length);
    assert(filterLabRes.data.data.items.every((i) => i.room_type === 'lab'));

    const filterPracticumRes = await request(port, 'GET', '/api/labs?room_type=practicum');
    assert.strictEqual(filterPracticumRes.status, 200);
    assert.strictEqual(filterPracticumRes.data.data.items.length, practicumRoomItems.length);
    assert(filterPracticumRes.data.data.items.every((i) => i.room_type === 'practicum'));

    const filterCreateRes = await request(port, 'GET', '/api/labs?challenge_mode=create');
    assert.strictEqual(filterCreateRes.status, 200);
    assert(filterCreateRes.data.data.items.length >= 1);
    assert(filterCreateRes.data.data.items.every((i) => i.challenge_mode === 'create'));

    const filterFixRes = await request(port, 'GET', '/api/labs?challenge_mode=fix');
    assert.strictEqual(filterFixRes.status, 200);
    assert(filterFixRes.data.data.items.length >= 1);
    assert(filterFixRes.data.data.items.every((i) => i.challenge_mode === 'fix'));

    const sampleLanguage = allItems[0].language;
    const filterLangRes = await request(port, 'GET', `/api/labs?language=${encodeURIComponent(sampleLanguage)}`);
    assert.strictEqual(filterLangRes.status, 200);
    assert(filterLangRes.data.data.items.length >= 1);
    assert(filterLangRes.data.data.items.every((i) => i.language === sampleLanguage));
    console.log(`   OK: All filters (room_type=all/lab/practicum, challenge_mode, language=${sampleLanguage}) passed.`);

    // ------------------------------------------------------------------
    // 3. Models LabExercise and LabSubmission CRUD & Associations
    // ------------------------------------------------------------------
    console.log('3. Testing LabExercise & LabSubmission Sequelize models and associations...');
    const modelLab = await LabExercise.create({
      course_id: course.id,
      created_by: tutor.id,
      room_type: 'lab',
      challenge_mode: 'create',
      title: `Model CRUD Lab ${ts}`,
      description: 'Pengujian relasi model LabExercise dan LabSubmission.',
      language: 'javascript',
      difficulty: 'beginner',
      starter_code: 'function tambah(a, b) { return 0; }',
      solution_reference: 'function tambah(a, b) { return a + b; }',
      expected_output: 'Hasil penjumlahan a + b',
      test_cases: [{ description: '2 + 3 = 5', input: 'tambah(2, 3)', expected: '5' }],
      hints: ['Kembalikan a + b'],
      passing_score: 70,
      is_published: true,
    });
    createdLabIds.push(modelLab.id);

    const modelSubmission = await LabSubmission.create({
      lab_id: modelLab.id,
      user_id: student2.id,
      submitted_code: 'function tambah(a, b) { return a + b; }',
      language: 'javascript',
      is_correct: true,
      score: 95,
      verdict: 'correct',
      ai_feedback: 'Implementasi tepat.',
      ai_analysis: { strengths: ['Ringkas'], issues: [], test_results: [] },
      ai_provider: 'heuristic-fallback',
    });

    const fetchedLab = await LabExercise.findByPk(modelLab.id, {
      include: [
        { model: User, as: 'creator' },
        { model: Course, as: 'course' },
        { model: LabSubmission, as: 'submissions' },
      ],
    });
    assert(fetchedLab, 'LabExercise should be found');
    assert.strictEqual(fetchedLab.creator.id, tutor.id);
    assert.strictEqual(fetchedLab.course.id, course.id);
    assert.strictEqual(fetchedLab.submissions.length, 1);

    const fetchedSub = await LabSubmission.findByPk(modelSubmission.id, {
      include: [
        { model: LabExercise, as: 'lab' },
        { model: User, as: 'student' },
      ],
    });
    assert(fetchedSub, 'LabSubmission should be found');
    assert.strictEqual(fetchedSub.lab.id, modelLab.id);
    assert.strictEqual(fetchedSub.student.id, student2.id);

    await modelSubmission.update({ score: 100 });
    await modelSubmission.reload();
    assert.strictEqual(modelSubmission.score, 100);

    await modelSubmission.destroy();
    await modelLab.destroy();
    createdLabIds.pop();
    console.log('   OK: LabExercise & LabSubmission CRUD and associations verified.');

    // ------------------------------------------------------------------
    // 4. Tutor CRUD (Create fix practicum, Read, Update, Delete)
    // ------------------------------------------------------------------
    console.log('4. Testing Tutor CRUD lifecycle on /api/labs...');
    const createPayload = {
      course_id: course.id,
      room_type: 'practicum',
      challenge_mode: 'fix',
      title: `Perbaiki Bug Kalkulator Diskon ${ts}`,
      description: 'Perbaiki bug operator pada fungsi hitungHargaAkhir agar diskon dikurangkan bukan ditambahkan.',
      language: 'javascript',
      difficulty: 'intermediate',
      starter_code: 'function hitungHargaAkhir(harga, diskon) {\n  return harga + (harga * diskon / 100);\n}',
      solution_reference: 'function hitungHargaAkhir(harga, diskon) {\n  const potongan = (harga * diskon) / 100;\n  return Math.max(0, harga - potongan);\n}',
      expected_output: '90000 untuk harga 100000 dan diskon 10',
      test_cases: [
        { description: 'Diskon 10% dari 100000 menjadi 90000', input: 'hitungHargaAkhir(100000, 10)', expected: '90000' },
      ],
      hints: ['Gunakan pengurangan untuk menghitung harga setelah diskon.'],
      passing_score: 75,
      is_published: true,
    };

    const createRes = await request(port, 'POST', '/api/labs', {
      token: tutorToken,
      body: createPayload,
    });
    assert.strictEqual(createRes.status, 201, `Expected 201 on createLab, got ${createRes.status}: ${createRes.rawText}`);
    assert.strictEqual(createRes.data.success, true);
    const tutorLabId = createRes.data.data.id;
    createdLabIds.push(tutorLabId);
    assert.strictEqual(createRes.data.data.room_type, 'practicum');
    assert.strictEqual(createRes.data.data.challenge_mode, 'fix');

    const updateRes = await request(port, 'PUT', `/api/labs/${tutorLabId}`, {
      token: tutorToken,
      body: {
        title: `Perbaiki Bug Kalkulator Diskon Updated ${ts}`,
        passing_score: 80,
      },
    });
    assert.strictEqual(updateRes.status, 200, `Expected 200 on updateLab, got ${updateRes.status}`);
    assert.strictEqual(updateRes.data.data.title, `Perbaiki Bug Kalkulator Diskon Updated ${ts}`);
    assert.strictEqual(updateRes.data.data.passing_score, 80);

    const persistedLab = await LabExercise.findByPk(tutorLabId);
    assert.strictEqual(persistedLab.title, `Perbaiki Bug Kalkulator Diskon Updated ${ts}`);
    assert.strictEqual(persistedLab.passing_score, 80);

    // Unified create: omitting room_type succeeds (HTTP 201) and defaults room_type to 'lab'
    const defaultRoomPayload = {
      course_id: course.id,
      challenge_mode: 'create',
      title: `Tantangan Unified Default Room ${ts}`,
      description: 'Pengujian pembuatan tugas kode tanpa room_type eksplisit.',
      language: 'javascript',
      difficulty: 'beginner',
      starter_code: 'function halo(nama) { return ""; }',
      solution_reference: 'function halo(nama) { return "Halo, " + nama; }',
      expected_output: 'Halo, Budi',
      test_cases: [{ description: 'Sapa Budi', input: 'halo("Budi")', expected: 'Halo, Budi' }],
      hints: ['Gabungkan string Halo dengan nama.'],
      passing_score: 70,
      is_published: true,
    };
    const defaultRoomRes = await request(port, 'POST', '/api/labs', {
      token: tutorToken,
      body: defaultRoomPayload,
    });
    assert.strictEqual(
      defaultRoomRes.status,
      201,
      `Expected 201 on POST /api/labs without room_type, got ${defaultRoomRes.status}: ${defaultRoomRes.rawText}`
    );
    assert.strictEqual(defaultRoomRes.data.success, true);
    assert.strictEqual(
      defaultRoomRes.data.data.room_type,
      'lab',
      `Expected default room_type to be 'lab', got '${defaultRoomRes.data.data.room_type}'`
    );
    createdLabIds.push(defaultRoomRes.data.data.id);
    console.log('   OK: Tutor create, update, and default room_type=lab persisted properly.');

    // ------------------------------------------------------------------
    // 5. Security / RBAC checks
    // ------------------------------------------------------------------
    console.log('5. Testing Security & RBAC (solution_reference visibility and 403 guards)...');
    // Guest list & detail: no solution_reference
    const guestDetailRes = await request(port, 'GET', `/api/labs/${tutorLabId}`);
    assert.strictEqual(guestDetailRes.status, 200);
    assert.strictEqual(guestDetailRes.data.data.solution_reference, undefined, 'Guest must not see solution_reference on detail');
    assert(
      guestListRes.data.data.items.every((item) => item.solution_reference === undefined),
      'Guest must not see solution_reference on list'
    );

    // Student list & detail: no solution_reference
    const studentListRes = await request(port, 'GET', '/api/labs', { token: student1Token });
    assert.strictEqual(studentListRes.status, 200);
    assert(
      studentListRes.data.data.items.every((item) => item.solution_reference === undefined),
      'Student must not see solution_reference on list'
    );

    const studentDetailRes = await request(port, 'GET', `/api/labs/${tutorLabId}`, { token: student1Token });
    assert.strictEqual(studentDetailRes.status, 200);
    assert.strictEqual(studentDetailRes.data.data.solution_reference, undefined, 'Student must not see solution_reference on detail');

    // Creator tutor list & detail: sees solution_reference on own lab
    const tutorDetailRes = await request(port, 'GET', `/api/labs/${tutorLabId}`, { token: tutorToken });
    assert.strictEqual(tutorDetailRes.status, 200);
    assert(
      typeof tutorDetailRes.data.data.solution_reference === 'string' && tutorDetailRes.data.data.solution_reference.length > 0,
      'Creator tutor should see solution_reference'
    );

    // Admin list & detail: sees solution_reference
    const adminListRes = await request(port, 'GET', '/api/labs', { token: adminToken });
    assert.strictEqual(adminListRes.status, 200);
    const adminFoundTutorLab = adminListRes.data.data.items.find((i) => i.id === tutorLabId);
    assert(adminFoundTutorLab && adminFoundTutorLab.solution_reference, 'Admin should see solution_reference in list');

    const adminDetailRes = await request(port, 'GET', `/api/labs/${tutorLabId}`, { token: adminToken });
    assert.strictEqual(adminDetailRes.status, 200);
    assert(adminDetailRes.data.data.solution_reference, 'Admin should see solution_reference in detail');

    // Student receives 403 on write & AI generate endpoints
    const studentCreateRes = await request(port, 'POST', '/api/labs', {
      token: student1Token,
      body: createPayload,
    });
    assert.strictEqual(studentCreateRes.status, 403, 'Student POST /api/labs must return 403');

    const studentUpdateRes = await request(port, 'PUT', `/api/labs/${tutorLabId}`, {
      token: student1Token,
      body: { title: 'Hacked' },
    });
    assert.strictEqual(studentUpdateRes.status, 403, 'Student PUT /api/labs/:id must return 403');

    const studentDeleteRes = await request(port, 'DELETE', `/api/labs/${tutorLabId}`, {
      token: student1Token,
    });
    assert.strictEqual(studentDeleteRes.status, 403, 'Student DELETE /api/labs/:id must return 403');

    const studentAiGenRes = await request(port, 'POST', '/api/labs/ai-generate', {
      token: student1Token,
      body: { topic: 'Array Filter', language: 'javascript', room_type: 'lab', challenge_mode: 'create' },
    });
    assert.strictEqual(studentAiGenRes.status, 403, 'Student POST /api/labs/ai-generate must return 403');
    console.log('   OK: All RBAC & solution_reference protections verified.');

    // ------------------------------------------------------------------
    // 6. AI Challenge Generator as Tutor
    // ------------------------------------------------------------------
    console.log('6. Testing POST /api/labs/ai-generate as tutor...');
    const aiGenRes = await request(port, 'POST', '/api/labs/ai-generate', {
      token: tutorToken,
      body: {
        topic: 'Validasi Format Nomor Telepon Indonesia',
        language: 'javascript',
        room_type: 'practicum',
        challenge_mode: 'fix',
        difficulty: 'intermediate',
      },
    });
    assert.strictEqual(aiGenRes.status, 200, `Expected 200 on ai-generate, got ${aiGenRes.status}`);
    assert.strictEqual(aiGenRes.data.success, true);
    const draft = aiGenRes.data.data;
    assert(typeof draft.title === 'string' && draft.title.length >= 3, 'Draft must include title');
    assert.strictEqual(draft.room_type, 'practicum', 'AI draft must preserve requested room_type');
    assert.strictEqual(draft.challenge_mode, 'fix', 'AI draft must preserve requested challenge_mode');
    assert(typeof draft.description === 'string' && draft.description.length > 10, 'Draft must include description');
    assert(typeof draft.starter_code === 'string' && draft.starter_code.length > 0, 'Draft must include starter_code');
    assert(typeof draft.solution_reference === 'string' && draft.solution_reference.length > 0, 'Draft must include solution_reference');
    assert(Array.isArray(draft.test_cases) && draft.test_cases.length > 0, 'Draft must include test_cases');
    assert(Array.isArray(draft.hints) && draft.hints.length > 0, 'Draft must include hints');
    console.log(`   OK: AI generated valid draft "${draft.title}".`);

    // ------------------------------------------------------------------
    // 7. Student Code Submission & AI Analysis
    // ------------------------------------------------------------------
    console.log('7. Testing POST /api/labs/:id/submit (empty, unchanged buggy, fixed valid)...');

    // 7a. Empty code rejected with 400
    const emptySubmitRes = await request(port, 'POST', `/api/labs/${tutorLabId}/submit`, {
      token: student1Token,
      body: { submitted_code: '   ', language: 'javascript' },
    });
    assert.strictEqual(emptySubmitRes.status, 400, 'Empty code submission must return 400');

    // 7b. Unchanged buggy starter_code on fix challenge
    const buggySubmitRes = await request(port, 'POST', `/api/labs/${tutorLabId}/submit`, {
      token: student1Token,
      body: {
        submitted_code: createPayload.starter_code,
        language: 'javascript',
      },
    });
    assert.strictEqual(buggySubmitRes.status, 201, `Expected 201 on buggy submit, got ${buggySubmitRes.status}`);
    assert.strictEqual(buggySubmitRes.data.success, true);
    const buggySub = buggySubmitRes.data.data.submission;
    assert.strictEqual(buggySub.is_correct, false, 'Unchanged starter_code must be is_correct: false');
    assert.strictEqual(buggySub.verdict, 'incorrect', 'Unchanged starter_code must have verdict: incorrect');
    assert(typeof buggySub.ai_feedback === 'string' && buggySub.ai_feedback.length > 0, 'Must include ai_feedback');
    assert(buggySub.ai_analysis && typeof buggySub.ai_analysis === 'object', 'Must include ai_analysis');

    // 7c. Fixed/valid code matching solution on practicum challenge
    const fixedSubmitRes = await request(port, 'POST', `/api/labs/${tutorLabId}/submit`, {
      token: student1Token,
      body: {
        submitted_code: createPayload.solution_reference,
        language: 'javascript',
      },
    });
    assert.strictEqual(fixedSubmitRes.status, 201, `Expected 201 on fixed submit, got ${fixedSubmitRes.status}`);
    const fixedSub = fixedSubmitRes.data.data.submission;
    assert.strictEqual(fixedSub.is_correct, true, `Expected is_correct: true, got score=${fixedSub.score}, verdict=${fixedSub.verdict}`);
    assert.strictEqual(fixedSub.verdict, 'correct', 'Expected verdict: correct');
    assert(fixedSub.score >= 80, `Expected score >= passing_score (80), got ${fixedSub.score}`);

    const persistedSub = await LabSubmission.findByPk(fixedSub.id);
    assert(persistedSub && persistedSub.is_correct === true, 'Submission must persist in LabSubmission table');

    // Also solve one default 'lab' room challenge for student1 so stats cover both lab_solved and practicum_solved
    const defaultLabChallenge = labRoomItems[0];
    const defaultLabAdminDetail = await request(port, 'GET', `/api/labs/${defaultLabChallenge.id}`, { token: adminToken });
    const defaultLabSolution = defaultLabAdminDetail.data.data.solution_reference;
    const solveLabRes = await request(port, 'POST', `/api/labs/${defaultLabChallenge.id}/submit`, {
      token: student1Token,
      body: {
        submitted_code: defaultLabSolution,
        language: defaultLabChallenge.language,
      },
    });
    assert.strictEqual(solveLabRes.status, 201);
    assert.strictEqual(solveLabRes.data.data.submission.is_correct, true, 'Default lab solution should pass');

    // Student2 also submits to tutorLabId to test submission history visibility
    const student2SubmitRes = await request(port, 'POST', `/api/labs/${tutorLabId}/submit`, {
      token: student2Token,
      body: {
        submitted_code: createPayload.solution_reference,
        language: 'javascript',
      },
    });
    assert.strictEqual(student2SubmitRes.status, 201);
    console.log('   OK: Code submission validation, buggy rejection, and passing evaluation verified.');

    // ------------------------------------------------------------------
    // 8. Submission history (GET /api/labs/:id/submissions)
    // ------------------------------------------------------------------
    console.log('8. Testing GET /api/labs/:id/submissions visibility (student vs tutor)...');
    const studentHistRes = await request(port, 'GET', `/api/labs/${tutorLabId}/submissions`, {
      token: student1Token,
    });
    assert.strictEqual(studentHistRes.status, 200);
    const studentHistItems = studentHistRes.data.data.items;
    assert.strictEqual(studentHistItems.length, 2, 'Student1 should see exactly their 2 attempts on tutorLabId');
    assert(
      studentHistItems.every((s) => Number(s.user_id) === Number(student1.id)),
      'Student must only see own submissions'
    );

    const tutorHistRes = await request(port, 'GET', `/api/labs/${tutorLabId}/submissions`, {
      token: tutorToken,
    });
    assert.strictEqual(tutorHistRes.status, 200);
    const tutorHistItems = tutorHistRes.data.data.items;
    assert.strictEqual(tutorHistItems.length, 3, 'Creator tutor should see all 3 submissions (2 from student1, 1 from student2)');
    assert(
      tutorHistItems.every((s) => s.student && s.student.name && s.student.email),
      'Tutor submission history must include student info (id, name, email)'
    );
    console.log('   OK: Submission history isolation and tutor student-info enrichment verified.');

    // ------------------------------------------------------------------
    // 9. Student stats (GET /api/labs/stats/me)
    // ------------------------------------------------------------------
    console.log('9. Testing GET /api/labs/stats/me...');
    const statsRes = await request(port, 'GET', '/api/labs/stats/me', {
      token: student1Token,
    });
    assert.strictEqual(statsRes.status, 200);
    const stats = statsRes.data.data;
    assert.strictEqual(stats.solved_count, 2, `Expected solved_count=2, got ${stats.solved_count}`);
    assert.strictEqual(stats.total_attempts, 3, `Expected total_attempts=3, got ${stats.total_attempts}`);
    assert.strictEqual(stats.lab_solved, 1, `Expected lab_solved=1, got ${stats.lab_solved}`);
    assert.strictEqual(stats.practicum_solved, 1, `Expected practicum_solved=1, got ${stats.practicum_solved}`);
    console.log(`   OK: Stats accurate (solved=${stats.solved_count}, attempts=${stats.total_attempts}, lab=${stats.lab_solved}, practicum=${stats.practicum_solved}).`);

    // ------------------------------------------------------------------
    // 10. Delete tutor-created lab and verify 404
    // ------------------------------------------------------------------
    console.log('10. Testing DELETE /api/labs/:id as creator tutor...');
    const deleteRes = await request(port, 'DELETE', `/api/labs/${tutorLabId}`, {
      token: tutorToken,
    });
    assert.strictEqual(deleteRes.status, 200, `Expected 200 on deleteLab, got ${deleteRes.status}`);
    const tutorLabIdx = createdLabIds.indexOf(tutorLabId);
    if (tutorLabIdx !== -1) createdLabIds.splice(tutorLabIdx, 1);

    const afterDeleteRes = await request(port, 'GET', `/api/labs/${tutorLabId}`, {
      token: adminToken,
    });
    assert.strictEqual(afterDeleteRes.status, 404, 'Deleted lab should return 404');
    console.log('   OK: Lab deletion and cascading submission cleanup verified.');

    // ------------------------------------------------------------------
    // 11. View routes: /labs, /practicum, /tutor/labs
    // ------------------------------------------------------------------
    console.log('11. Testing view routes (/labs, /practicum, /tutor/labs)...');
    for (const viewPath of ['/labs', '/practicum']) {
      const viewRes = await request(port, 'GET', viewPath);
      assert.strictEqual(viewRes.status, 200, `GET ${viewPath} should return HTTP 200, got ${viewRes.status}`);
      assert(
        viewRes.rawText.includes('<!DOCTYPE html>') || viewRes.rawText.includes('<html'),
        `GET ${viewPath} should return valid HTML`
      );
      assert(
        viewRes.rawText.includes('Ruang Lab & Praktikum Kode') ||
          viewRes.rawText.includes('Ruang Lab &amp; Praktikum Kode'),
        `GET ${viewPath} should contain "Ruang Lab & Praktikum Kode"`
      );
      assert(
        viewRes.rawText.includes('difficultyFilterGroup'),
        `GET ${viewPath} should contain "difficultyFilterGroup"`
      );
      assert(
        !viewRes.rawText.includes('roomTabLab'),
        `GET ${viewPath} must NOT contain "roomTabLab"`
      );
      assert(
        !viewRes.rawText.includes('roomTabPracticum'),
        `GET ${viewPath} must NOT contain "roomTabPracticum"`
      );
      assert(
        !viewRes.rawText.includes('room-switcher'),
        `GET ${viewPath} must NOT contain "room-switcher"`
      );
      console.log(`   OK: GET ${viewPath} returned unified HTTP 200 HTML.`);
    }

    const tutorViewRes = await request(port, 'GET', '/tutor/labs');
    assert.strictEqual(tutorViewRes.status, 200, `GET /tutor/labs should return HTTP 200, got ${tutorViewRes.status}`);
    assert(
      tutorViewRes.rawText.includes('<!DOCTYPE html>') || tutorViewRes.rawText.includes('<html'),
      'GET /tutor/labs should return valid HTML'
    );
    assert(
      tutorViewRes.rawText.includes('kpi-total-tasks'),
      'GET /tutor/labs should contain "kpi-total-tasks"'
    );
    assert(
      tutorViewRes.rawText.includes('kpi-published'),
      'GET /tutor/labs should contain "kpi-published"'
    );
    console.log('   OK: GET /tutor/labs returned unified HTTP 200 HTML with KPI markers.');

    console.log('\n=====================================================================');
    console.log('ALL RUANG LAB & RUANG PRAKTIKUM INTEGRATION TESTS PASSED!');
    console.log('=====================================================================\n');
  } catch (err) {
    console.error('\nTEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    // Cleanup test-created records cleanly
    try {
      if (createdLabIds.length > 0) {
        await LabSubmission.destroy({ where: { lab_id: createdLabIds } });
        await LabExercise.destroy({ where: { id: createdLabIds } });
      }
      if (createdUserIds.length > 0) {
        await LabSubmission.destroy({ where: { user_id: createdUserIds } });
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

runLabPracticumTests().then(() => {
  process.exit(process.exitCode || 0);
});
