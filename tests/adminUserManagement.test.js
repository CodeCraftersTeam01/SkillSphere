const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');

const app = require('../app');
const {
  sequelize,
  User,
  UserProfile,
  TutorWallet,
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

async function runAdminUserManagementTests() {
  console.log('🧪 Starting Admin User Management Test Suite (Siswa, Tutor, Admin)...\n');

  try {
    await sequelize.authenticate();
    await sequelize.sync();

    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        console.log(`  ✔ Test HTTP server listening on ${baseUrl}`);
        resolve();
      });
    });

    const jwtSecret = process.env.JWT_SECRET || 'skillsphere-jwt-secret-key-2026';

    // Mock Admin User
    let adminUser = await User.findOne({ where: { role: 'admin' } });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Admin Test User',
        email: `admin.test.${Date.now()}@skillsphere.id`,
        password: 'hashedPasswordAdmin',
        role: 'admin',
        is_active: true,
        is_verified: true,
      });
    }
    const adminToken = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: 'admin', name: adminUser.name },
      jwtSecret,
      { expiresIn: '1h' }
    );
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    // Mock Student User
    let studentUser = await User.findOne({ where: { role: 'student' } });
    if (!studentUser) {
      studentUser = await User.create({
        name: 'Student Test User',
        email: `student.test.${Date.now()}@skillsphere.id`,
        password: 'hashedPasswordStudent',
        role: 'student',
        is_active: true,
        is_verified: true,
      });
    }
    const studentToken = jwt.sign(
      { id: studentUser.id, email: studentUser.email, role: 'student', name: studentUser.name },
      jwtSecret,
      { expiresIn: '1h' }
    );
    const studentHeaders = { Authorization: `Bearer ${studentToken}` };

    // 1. RBAC Test
    const rbacRes = await makeRequest('GET', '/api/admin/users', studentHeaders);
    assert.strictEqual(rbacRes.status, 403, 'Non-admin user should receive 403 Forbidden');
    console.log('  ✔ RBAC Security: Non-admin student blocked from user management endpoints (403 Forbidden).');

    // 2. GET /api/admin/users
    const listRes = await makeRequest('GET', '/api/admin/users', adminHeaders);
    assert.strictEqual(listRes.status, 200, 'GET /api/admin/users should return 200 OK');
    assert.strictEqual(listRes.body.success, true);
    assert.ok(Array.isArray(listRes.body.data.users));
    assert.ok(typeof listRes.body.data.summary.totalUsers === 'number');
    console.log(`  ✔ GET /api/admin/users: Successfully fetched ${listRes.body.data.users.length} users with role/status summary.`);

    // 3. Filter by role (student)
    const filterStudentRes = await makeRequest('GET', '/api/admin/users?role=student', adminHeaders);
    assert.strictEqual(filterStudentRes.status, 200);
    const allAreStudents = filterStudentRes.body.data.users.every((u) => u.role === 'student');
    assert.ok(allAreStudents, 'All returned users should have role student');
    console.log('  ✔ Filter by role=student verified.');

    // 4. POST /api/admin/users (Create new Student)
    const testStudentEmail = `new.student.${Date.now()}@skillsphere.id`;
    const createStudentRes = await makeRequest('POST', '/api/admin/users', adminHeaders, {
      name: 'Budi Siswa Baru',
      email: testStudentEmail,
      password: 'password123',
      role: 'student',
      is_active: true,
      is_verified: true,
      phone_number: '08123456789',
      bio: 'Siswa baru yang antusias belajar AI.',
    });
    assert.strictEqual(createStudentRes.status, 201);
    assert.strictEqual(createStudentRes.body.success, true);
    assert.strictEqual(createStudentRes.body.data.email, testStudentEmail);
    assert.strictEqual(createStudentRes.body.data.role, 'student');
    const createdStudentId = createStudentRes.body.data.id;
    console.log(`  ✔ POST /api/admin/users: Created new student account #${createdStudentId}.`);

    // 5. POST /api/admin/users (Create new Tutor with auto wallet initialization)
    const testTutorEmail = `new.tutor.${Date.now()}@skillsphere.id`;
    const createTutorRes = await makeRequest('POST', '/api/admin/users', adminHeaders, {
      name: 'Dr. Hendra Tutor Baru',
      email: testTutorEmail,
      password: 'password123',
      role: 'tutor',
      is_active: true,
      is_verified: true,
      phone_number: '08198765432',
      bio: 'Instruktur Cloud Computing bersertifikat.',
    });
    assert.strictEqual(createTutorRes.status, 201);
    assert.strictEqual(createTutorRes.body.data.role, 'tutor');
    const createdTutorId = createTutorRes.body.data.id;

    // Check tutor wallet exists
    const tutorWallet = await TutorWallet.findOne({ where: { tutor_id: createdTutorId } });
    assert.ok(tutorWallet, 'Tutor wallet must be created automatically');
    console.log(`  ✔ POST /api/admin/users: Created tutor account #${createdTutorId} with auto-initialized TutorWallet.`);

    // 6. Validation: Duplicate Email Check
    const dupRes = await makeRequest('POST', '/api/admin/users', adminHeaders, {
      name: 'Duplicate User',
      email: testStudentEmail,
      password: 'password123',
    });
    assert.strictEqual(dupRes.status, 409, 'Duplicate email must return 409 Conflict');
    console.log('  ✔ Validation: Duplicate email blocked (409 Conflict).');

    // 7. GET /api/admin/users/:id
    const detailRes = await makeRequest('GET', `/api/admin/users/${createdStudentId}`, adminHeaders);
    assert.strictEqual(detailRes.status, 200);
    assert.strictEqual(detailRes.body.data.id, createdStudentId);
    assert.ok(detailRes.body.data.profile, 'User profile should be loaded');
    console.log(`  ✔ GET /api/admin/users/:id: Fetched complete user details.`);

    // 8. PUT /api/admin/users/:id (Update User)
    const updateRes = await makeRequest('PUT', `/api/admin/users/${createdStudentId}`, adminHeaders, {
      name: 'Budi Siswa Updated',
      phone_number: '081299998888',
      bio: 'Updated student bio description.',
    });
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.data.name, 'Budi Siswa Updated');
    console.log(`  ✔ PUT /api/admin/users/:id: Updated user profile details.`);

    // 9. PUT /api/admin/users/:id/status (Suspend & Reactivate)
    const suspendRes = await makeRequest('PUT', `/api/admin/users/${createdStudentId}/status`, adminHeaders, {
      is_active: false,
      reason: 'Pelanggaran ketentuan sistem',
    });
    assert.strictEqual(suspendRes.status, 200);
    assert.strictEqual(suspendRes.body.data.is_active, false);
    console.log(`  ✔ PUT /api/admin/users/:id/status: Successfully suspended student account.`);

    // Guard check: self-suspension
    const selfSuspendRes = await makeRequest('PUT', `/api/admin/users/${adminUser.id}/status`, adminHeaders, {
      is_active: false,
    });
    assert.strictEqual(selfSuspendRes.status, 400, 'Admin cannot suspend own account');
    console.log('  ✔ Safety Guard: Admin self-suspension blocked.');

    // 10. PUT /api/admin/users/:id/role (Upgrade Student to Tutor)
    const roleRes = await makeRequest('PUT', `/api/admin/users/${createdStudentId}/role`, adminHeaders, {
      role: 'tutor',
    });
    assert.strictEqual(roleRes.status, 200);
    assert.strictEqual(roleRes.body.data.role, 'tutor');
    const upgradedWallet = await TutorWallet.findOne({ where: { tutor_id: createdStudentId } });
    assert.ok(upgradedWallet, 'Upgraded tutor must have active wallet');
    console.log(`  ✔ PUT /api/admin/users/:id/role: Upgraded student to tutor with wallet activation.`);

    // 11. DELETE /api/admin/users/:id
    const deleteRes = await makeRequest('DELETE', `/api/admin/users/${createdStudentId}`, adminHeaders);
    assert.strictEqual(deleteRes.status, 200);
    const deletedCheck = await User.findByPk(createdStudentId);
    assert.strictEqual(deletedCheck, null, 'User must be deleted from DB');
    console.log(`  ✔ DELETE /api/admin/users/:id: Removed user account cleanly.`);

    // Clean up created tutor
    await User.destroy({ where: { id: createdTutorId } });

    console.log('\n======================================================');
    console.log('🎉 ALL ADMIN USER MANAGEMENT TESTS PASSED SUCCESSFULLY!');
    console.log('======================================================\n');
  } finally {
    if (server) {
      server.close();
    }
  }
}

if (require.main === module) {
  runAdminUserManagementTests().then(() => process.exit(0)).catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
}

module.exports = runAdminUserManagementTests;
