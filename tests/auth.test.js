process.env.NODE_ENV = 'test';
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
  console.log('🧪 Starting Auth, OTP Verification & Security API Test Suite...\n');

  try {
    const dialect = sequelize.getDialect();
    if (dialect === 'mysql') {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
      await sequelize.sync({ force: true });
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    } else {
      await sequelize.sync();
      await User.destroy({ where: {}, cascade: true });
    }

    server = app.listen(0);
    port = server.address().port;
    console.log(`  ✔ Test HTTP Server listening on port ${port}`);

    // 1. Test Health Check
    const health = await request({ path: '/api/health', method: 'GET' });
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.body.status, 'ok');
    console.log('  ✔ Health check endpoint verified.');

    // 2. Test Register Student (Generates OTP)
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
    assert.strictEqual(regStudentRes.body.requireOtp, true);
    console.log('  ✔ Student registration created pending OTP verification.');

    // Query OTP from DB to simulate user receiving email
    const studentUser = await User.findOne({ where: { email: 'rian@student.com' } });
    assert(studentUser.otp_code, 'User should have generated OTP code');
    assert.strictEqual(studentUser.is_verified, false);

    // 3. Test Verify Invalid OTP
    const invalidOtpRes = await request({
      path: '/api/auth/verify-otp',
      method: 'POST',
    }, {
      email: 'rian@student.com',
      otp: '000000',
    });
    assert.strictEqual(invalidOtpRes.status, 400);
    console.log('  ✔ Invalid OTP correctly rejected (400).');

    // 4. Test Verify Correct OTP
    const verifyStudentRes = await request({
      path: '/api/auth/verify-otp',
      method: 'POST',
    }, {
      email: 'rian@student.com',
      otp: studentUser.otp_code,
    });

    assert.strictEqual(verifyStudentRes.status, 200);
    assert.strictEqual(verifyStudentRes.body.success, true);
    assert(verifyStudentRes.body.data.accessToken, 'Should issue accessToken upon OTP verify');
    assert(verifyStudentRes.body.data.refreshToken, 'Should issue refreshToken upon OTP verify');
    assert.strictEqual(verifyStudentRes.body.data.user.role, 'student');
    console.log('  ✔ Student OTP email verification succeeded & JWT tokens issued.');

    const studentToken = verifyStudentRes.body.data.accessToken;

    // 5. Test Register Tutor & Resend OTP
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
    assert.strictEqual(regTutorRes.body.requireOtp, true);
    console.log('  ✔ Tutor registration created pending OTP verification.');

    // Resend OTP
    const resendRes = await request({
      path: '/api/auth/resend-otp',
      method: 'POST',
    }, {
      email: 'arjuna@tutor.com',
    });
    assert.strictEqual(resendRes.status, 200);
    console.log('  ✔ Resend OTP endpoint verified.');

    const tutorUser = await User.findOne({ where: { email: 'arjuna@tutor.com' } });
    const verifyTutorRes = await request({
      path: '/api/auth/verify-otp',
      method: 'POST',
    }, {
      email: 'arjuna@tutor.com',
      otp: tutorUser.otp_code,
    });

    assert.strictEqual(verifyTutorRes.status, 200);
    assert(verifyTutorRes.body.data.user.wallet, 'Tutor wallet should exist');
    console.log('  ✔ Tutor OTP email verification succeeded & TutorWallet active.');

    const tutorToken = verifyTutorRes.body.data.accessToken;

    // 6. Test Login with verified credentials
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

    // 7. Test Invalid Password Login
    const wrongPassRes = await request({
      path: '/api/auth/login',
      method: 'POST',
    }, {
      email: 'rian@student.com',
      password: 'wrongpassword',
    });
    assert.strictEqual(wrongPassRes.status, 401);
    console.log('  ✔ Invalid password login rejected (401 Unauthorized).');

    // 8. Test Protected Route (/api/auth/me)
    const meRes = await request({
      path: '/api/auth/me',
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.body.data.email, 'rian@student.com');
    console.log('  ✔ Protected profile /api/auth/me verified.');

    // 9. Test Protected Route without token
    const noTokenRes = await request({
      path: '/api/auth/me',
      method: 'GET',
    });
    assert.strictEqual(noTokenRes.status, 401);
    console.log('  ✔ Protected route blocked when token is missing (401).');

    // 10. Test Update Profile
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
    console.log('  ✔ Profile update (/api/auth/profile) verified.');

    // 11. Test RBAC - Student vs Tutor
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

    // 12. Test Refresh Token
    const refreshRes = await request({
      path: '/api/auth/refresh',
      method: 'POST',
    }, {
      refreshToken: loginRes.body.data.refreshToken,
    });
    assert.strictEqual(refreshRes.status, 200);
    assert(refreshRes.body.data.accessToken);
    console.log('  ✔ Refresh token rotation verified.');

    // 13. Test Change Password
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

    console.log('\n======================================================');
    console.log('🎉 ALL AUTH & OTP EMAIL TESTS PASSED SUCCESSFULLY!');
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
