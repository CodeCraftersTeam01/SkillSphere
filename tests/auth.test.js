const assert = require('assert');
const http = require('http');
const app = require('../app');
const { sequelize, User } = require('../models');

let server;
let port;

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: '127.0.0.1',
      port: port,
      path: options.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runAuthTests() {
  console.log('🧪 Starting Auth & Security API Test Suite...\n');

  try {
    await sequelize.sync();
    // Clean user table for test run
    await User.destroy({ where: {}, cascade: true });

    server = app.listen(0);
    port = server.address().port;
    console.log(`  ✔ Test HTTP Server listening on port ${port}`);

    // 1. Test Health Check
    const health = await request({ path: '/api/health', method: 'GET' });
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.body.status, 'ok');
    console.log('  ✔ Health check endpoint verified.');

    // 2. Test Register Student
    const regStudentRes = await request({
      path: '/api/auth/register',
      method: 'POST',
    }, {
      name: 'Rian Pratama',
      email: 'rian@student.com',
      password: 'password123',
      role: 'student',
      career_goal: 'Fullstack Engineer',
    });

    assert.strictEqual(regStudentRes.status, 201);
    assert.strictEqual(regStudentRes.body.success, true);
    assert(regStudentRes.body.data.accessToken, 'Should return accessToken');
    assert(regStudentRes.body.data.refreshToken, 'Should return refreshToken');
    assert.strictEqual(regStudentRes.body.data.user.role, 'student');
    assert.strictEqual(regStudentRes.body.data.user.profile.career_goal, 'Fullstack Engineer');
    console.log('  ✔ Student registration with profile creation verified.');

    const studentToken = regStudentRes.body.data.accessToken;
    const studentRefreshToken = regStudentRes.body.data.refreshToken;

    // 3. Test Duplicate Email Prevention
    const dupRes = await request({
      path: '/api/auth/register',
      method: 'POST',
    }, {
      name: 'Duplicate User',
      email: 'rian@student.com',
      password: 'password123',
    });
    assert.strictEqual(dupRes.status, 409);
    assert.strictEqual(dupRes.body.success, false);
    console.log('  ✔ Duplicate email registration prevented (409 Conflict).');

    // 4. Test Register Tutor (Should initialize TutorWallet)
    const regTutorRes = await request({
      path: '/api/auth/register',
      method: 'POST',
    }, {
      name: 'Arjuna Tutor',
      email: 'arjuna@tutor.com',
      password: 'password123',
      role: 'tutor',
    });

    assert.strictEqual(regTutorRes.status, 201);
    assert.strictEqual(regTutorRes.body.data.user.role, 'tutor');
    assert(regTutorRes.body.data.user.wallet, 'Tutor wallet should be created automatically');
    console.log('  ✔ Tutor registration with automatic TutorWallet creation verified.');

    const tutorToken = regTutorRes.body.data.accessToken;

    // 5. Test Login
    const loginRes = await request({
      path: '/api/auth/login',
      method: 'POST',
    }, {
      email: 'rian@student.com',
      password: 'password123',
    });
    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginRes.body.success, true);
    assert(loginRes.body.data.accessToken);
    console.log('  ✔ User login with password verification verified.');

    // 6. Test Invalid Password Login
    const wrongPassRes = await request({
      path: '/api/auth/login',
      method: 'POST',
    }, {
      email: 'rian@student.com',
      password: 'wrongpassword',
    });
    assert.strictEqual(wrongPassRes.status, 401);
    console.log('  ✔ Invalid password login rejected (401 Unauthorized).');

    // 7. Test Protected Route (/api/auth/me)
    const meRes = await request({
      path: '/api/auth/me',
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.body.data.email, 'rian@student.com');
    console.log('  ✔ Protected profile /api/auth/me verified.');

    // 8. Test Protected Route without token
    const noTokenRes = await request({
      path: '/api/auth/me',
      method: 'GET',
    });
    assert.strictEqual(noTokenRes.status, 401);
    console.log('  ✔ Protected route blocked when token is missing (401).');

    // 9. Test Update Profile
    const updateProfileRes = await request({
      path: '/api/auth/profile',
      method: 'PUT',
      headers: { Authorization: `Bearer ${studentToken}` },
    }, {
      full_name: 'Rian Pratama Updated',
      bio: 'Lifelong learner',
      phone_number: '081999888777',
      career_goal: 'AI Solutions Architect',
    });
    assert.strictEqual(updateProfileRes.status, 200);
    assert.strictEqual(updateProfileRes.body.data.profile.full_name, 'Rian Pratama Updated');
    assert.strictEqual(updateProfileRes.body.data.profile.career_goal, 'AI Solutions Architect');
    console.log('  ✔ Profile update (/api/auth/profile) verified.');

    // 10. Test RBAC - Student accessing Student route vs Tutor route
    const studentAccessStudentRoute = await request({
      path: '/api/auth/test-student',
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(studentAccessStudentRoute.status, 200);
    console.log('  ✔ RBAC: Student authorized for student endpoint.');

    const studentAccessTutorRoute = await request({
      path: '/api/auth/test-tutor',
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(studentAccessTutorRoute.status, 403);
    console.log('  ✔ RBAC: Student blocked from tutor endpoint (403 Forbidden).');

    const tutorAccessTutorRoute = await request({
      path: '/api/auth/test-tutor',
      method: 'GET',
      headers: { Authorization: `Bearer ${tutorToken}` },
    });
    assert.strictEqual(tutorAccessTutorRoute.status, 200);
    console.log('  ✔ RBAC: Tutor authorized for tutor endpoint.');

    // 11. Test Refresh Token
    const refreshRes = await request({
      path: '/api/auth/refresh',
      method: 'POST',
    }, {
      refreshToken: loginRes.body.data.refreshToken,
    });
    assert.strictEqual(refreshRes.status, 200);
    assert(refreshRes.body.data.accessToken);
    console.log('  ✔ Refresh token rotation verified.');

    // 12. Test Change Password
    const changePassRes = await request({
      path: '/api/auth/change-password',
      method: 'PUT',
      headers: { Authorization: `Bearer ${studentToken}` },
    }, {
      current_password: 'password123',
      new_password: 'newpassword123',
      confirm_password: 'newpassword123',
    });
    assert.strictEqual(changePassRes.status, 200);
    console.log('  ✔ Change password verified.');

    // Login with new password
    const loginWithNewPass = await request({
      path: '/api/auth/login',
      method: 'POST',
    }, {
      email: 'rian@student.com',
      password: 'newpassword123',
    });
    assert.strictEqual(loginWithNewPass.status, 200);
    console.log('  ✔ Login with new password successful.');

    console.log('\n======================================================');
    console.log('🎉 ALL AUTH & SECURITY TESTS PASSED SUCCESSFULLY!');
    console.log('======================================================\n');

    server.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Auth Test Failed:', err);
    if (server) server.close();
    process.exit(1);
  }
}

if (require.main === module) {
  runAuthTests();
}

module.exports = runAuthTests;
