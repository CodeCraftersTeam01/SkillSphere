const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');

const app = require('../app');
const {
  sequelize,
  User,
  Category,
  Course,
  Enrollment,
} = require('../models');

let server;
let baseUrl;

function makeRequest(method, endpoint, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, baseUrl);
    const reqOptions = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { ...headers },
    };

    if (body && !headers['Content-Type'] && typeof body === 'object') {
      reqOptions.headers['Content-Type'] = 'application/json';
    }

    const req = http.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const rawBuffer = Buffer.concat(chunks);
        const text = rawBuffer.toString('utf8');
        let json = null;
        try {
          json = JSON.parse(text);
        } catch (_) {}

        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: json,
          rawBody: text,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      if (typeof body === 'object') {
        req.write(JSON.stringify(body));
      } else {
        req.write(body);
      }
    }

    req.end();
  });
}

async function runCourseEditPublishTests() {
  console.log('🧪 Starting Course Edit & Publication Status (Public vs Private) Test Suite...\n');

  try {
    await sequelize.authenticate();

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const timestamp = Date.now();
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key';

    // 1. Create Tutor A, Tutor B, Student
    const tutorA = await User.create({
      name: `Tutor A ${timestamp}`,
      email: `tutor_a_${timestamp}@skillsphere.test`,
      password: 'hash_test_123',
      role: 'tutor',
      is_verified: true,
    });
    const tokenTutorA = jwt.sign({ id: tutorA.id, role: tutorA.role, email: tutorA.email }, jwtSecret, { expiresIn: '1h' });

    const tutorB = await User.create({
      name: `Tutor B ${timestamp}`,
      email: `tutor_b_${timestamp}@skillsphere.test`,
      password: 'hash_test_123',
      role: 'tutor',
      is_verified: true,
    });
    const tokenTutorB = jwt.sign({ id: tutorB.id, role: tutorB.role, email: tutorB.email }, jwtSecret, { expiresIn: '1h' });

    const student = await User.create({
      name: `Student ${timestamp}`,
      email: `student_${timestamp}@skillsphere.test`,
      password: 'hash_test_123',
      role: 'student',
      is_verified: true,
    });
    const tokenStudent = jwt.sign({ id: student.id, role: student.role, email: student.email }, jwtSecret, { expiresIn: '1h' });

    const category = await Category.create({
      name: `Kategori Test ${timestamp}`,
      slug: `kategori-test-${timestamp}`,
      description: 'Deskripsi kategori untuk unit test',
    });

    // 2. Tutor A creates a new course with initial status published
    const course = await Course.create({
      tutor_id: tutorA.id,
      category_id: category.id,
      title: `Kelas Machine Learning Dasar ${timestamp}`,
      slug: `kelas-machine-learning-dasar-${timestamp}`,
      description: 'Pengenalan ML untuk pemula.',
      price: 250000,
      level: 'beginner',
      status: 'published',
    });

    console.log('  ✔ Created seed data (Tutors, Student, Category, Initial Course).');

    // Test 1: Verify Course Edit Page GET /tutor/courses/edit responds with 200 HTML
    const resEditView = await makeRequest('GET', `/tutor/courses/edit?courseId=${course.id}`, {
      'Cookie': `token=${tokenTutorA}`,
    });
    assert.strictEqual(resEditView.status, 200, 'GET /tutor/courses/edit harus mengembalikan HTTP 200');
    assert(resEditView.rawBody.includes('Pengaturan & Edit Kelas'), 'View harus memuat judul Pengaturan & Edit Kelas');
    console.log('  ✔ Test 1 Passed: GET /tutor/courses/edit loads successfully.');

    // Test 2: Tutor A updates course details (title, price, level, thumbnail, and sets status to private)
    const updatePayload = {
      title: `Kelas Machine Learning Lanjutan ${timestamp}`,
      category_id: category.id,
      description: 'Materi diperbarui untuk tingkat menengah.',
      price: 350000,
      level: 'intermediate',
      thumbnail_url: 'https://cdn.skillsphere.test/thumb-sample.webp',
      status: 'private',
    };

    const resUpdate = await makeRequest('PUT', `/api/courses/${course.id}`, {
      'Authorization': `Bearer ${tokenTutorA}`,
    }, updatePayload);

    assert.strictEqual(resUpdate.status, 200, 'PUT /api/courses/:id harus mengembalikan HTTP 200');
    assert.strictEqual(resUpdate.body.success, true, 'Response body success harus true');
    assert.strictEqual(resUpdate.body.data.status, 'private', 'Status kursus harus berubah menjadi private');
    assert.strictEqual(resUpdate.body.data.price, 350000, 'Harga kursus harus terupdate menjadi 350000');
    console.log('  ✔ Test 2 Passed: Tutor owner successfully updated course details & set status to private.');

    // Test 3: Public course catalog does NOT include private courses
    const resCatalog = await makeRequest('GET', `/api/courses?search=${encodeURIComponent(course.id)}`);
    assert.strictEqual(resCatalog.status, 200);
    const catalogCourses = (resCatalog.body && Array.isArray(resCatalog.body.data)) ? resCatalog.body.data : [];
    const isFoundInCatalog = catalogCourses.some(c => c.id === course.id);
    assert.strictEqual(isFoundInCatalog, false, 'Kursus dengan status private TIDAK boleh muncul di katalog publik siswa');
    console.log('  ✔ Test 3 Passed: Private course is hidden from public course catalog.');

    // Test 4: Student accessing private course details directly gets 404
    const resStudentViewDetail = await makeRequest('GET', `/api/courses/${course.id}`, {
      'Authorization': `Bearer ${tokenStudent}`,
    });
    assert.strictEqual(resStudentViewDetail.status, 404, 'Siswa yang belum terdaftar tidak boleh mengakses detail kelas privat (harus 404)');
    console.log('  ✔ Test 4 Passed: Non-enrolled student receives 404 when requesting private course details.');

    // Test 5: Student attempting to enroll in private course receives 403 Forbidden
    const resEnrollPrivate = await makeRequest('POST', `/api/courses/${course.id}/enroll`, {
      'Authorization': `Bearer ${tokenStudent}`,
    });
    assert.strictEqual(resEnrollPrivate.status, 403, 'Siswa tidak dapat mendaftar kursus berstatus privat (harus 403)');
    console.log('  ✔ Test 5 Passed: Enrollment in private course is blocked with HTTP 403.');

    // Test 6: Tutor owner can still access their private course in tutor studio
    const resTutorViewDetail = await makeRequest('GET', `/api/courses/${course.id}`, {
      'Authorization': `Bearer ${tokenTutorA}`,
    });
    assert.strictEqual(resTutorViewDetail.status, 200, 'Tutor pemilik harus tetap bisa melihat detail kelas privatnya');
    assert.strictEqual(resTutorViewDetail.body.data.id, course.id);
    console.log('  ✔ Test 6 Passed: Tutor owner can access private course details in tutor portal.');

    // Test 7: Unauthorized Tutor B cannot modify Tutor A's course
    const resUnauthorizedEdit = await makeRequest('PUT', `/api/courses/${course.id}`, {
      'Authorization': `Bearer ${tokenTutorB}`,
    }, { title: 'Hacked Title' });
    assert.strictEqual(resUnauthorizedEdit.status, 403, 'Tutor lain tidak boleh mengedit kursus milik tutor lain (harus 403)');
    console.log('  ✔ Test 7 Passed: Unauthorized tutor is blocked from editing another tutor\'s course.');

    // Test 8: Tutor A toggles course status back to 'published'
    const resPublishBack = await makeRequest('PUT', `/api/courses/${course.id}`, {
      'Authorization': `Bearer ${tokenTutorA}`,
    }, { status: 'published' });
    assert.strictEqual(resPublishBack.status, 200);
    assert.strictEqual(resPublishBack.body.data.status, 'published', 'Status kursus harus kembali published');

    // Test 9: Now student CAN view the course details
    const resStudentViewPublished = await makeRequest('GET', `/api/courses/${course.id}`, {
      'Authorization': `Bearer ${tokenStudent}`,
    });
    assert.strictEqual(resStudentViewPublished.status, 200, 'Siswa harus bisa melihat kursus setelah statusnya dipublikasikan');
    console.log('  ✔ Test 8 & 9 Passed: Tutor toggles course back to published, and student can view course.');

    // Cleanup seed data
    await Course.destroy({ where: { id: course.id } });
    await Category.destroy({ where: { id: category.id } });
    await User.destroy({ where: { id: [tutorA.id, tutorB.id, student.id] } });

    console.log('\n======================================================');
    console.log('🎉 ALL COURSE EDIT & PUBLISH/PRIVATE TESTS PASSED!');
    console.log('======================================================\n');
    process.exit(0);

  } catch (err) {
    console.error('❌ Course Edit & Publish Test Failed:', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
  }
}

runCourseEditPublishTests();
