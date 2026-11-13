const assert = require('assert');
const http = require('http');
const app = require('../app');
const { sequelize, User, UserProfile } = require('../models');
const {
  normalizePhoneNumber,
  maskPhoneNumber,
  buildOtpMessage,
  sendWhatsAppOTP,
} = require('../services/whatsappService');

/**
 * Helper to make HTTP JSON requests against test server
 */
const request = (serverPort, { path, method = 'GET', headers = {} }, body = null) => {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port: serverPort,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...headers,
      },
    }, (res) => {
      let rawData = '';
      res.on('data', chunk => { rawData += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(rawData);
        } catch (e) {
          json = rawData;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: json,
        });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
};

const runWhatsAppOtpTestSuite = async () => {
  console.log('\n🧪 Starting WhatsApp Gateway & Fallback OTP Test Suite...\n');
  let server;
  let port;

  try {
    // 1. Unit Tests for whatsappService
    console.log('--- Sub-test 1: WhatsApp Service Unit Tests ---');

    // Normalization tests
    assert.strictEqual(normalizePhoneNumber('085648077829'), '6285648077829');
    assert.strictEqual(normalizePhoneNumber('0812-3456-7890'), '6281234567890');
    assert.strictEqual(normalizePhoneNumber('+62 856 4807 7829'), '6285648077829');
    assert.strictEqual(normalizePhoneNumber('85648077829'), '6285648077829');
    assert.strictEqual(normalizePhoneNumber('6285648077829'), '6285648077829');
    console.log('  ✔ normalizePhoneNumber handles 08xx, +62, spaces, dashes correctly.');

    // Validation rejection
    assert.throws(() => normalizePhoneNumber(''), /Nomor WhatsApp wajib diisi/);
    assert.throws(() => normalizePhoneNumber('12345'), /Format nomor WhatsApp tidak valid/);
    assert.throws(() => normalizePhoneNumber('0812abc345'), /Format nomor WhatsApp tidak valid/);
    console.log('  ✔ normalizePhoneNumber rejects invalid or truncated phone numbers.');

    // Masking test
    const masked = maskPhoneNumber('085648077829');
    assert.strictEqual(masked, '+6285****829');
    console.log('  ✔ maskPhoneNumber masks middle digits properly (+6285****829).');

    // Message building test (no em-dash)
    const msg = buildOtpMessage('123456', 'Lanvry');
    assert(msg.includes('SkillSphere AI'));
    assert(msg.includes('123456'));
    assert(msg.includes('Lanvry'));
    assert(!msg.includes('—'), 'Message must not contain em-dash per project anti-slop rules.');
    console.log('  ✔ buildOtpMessage contains OTP, user name, and strictly avoids em-dash.');

    // 2. Integration Tests with Test HTTP Server
    console.log('\n--- Sub-test 2: API Endpoints Integration (Register, WA Fallback, Verify) ---');
    await sequelize.sync();

    // Clean up test user
    const testEmail = 'wa_tester@skillsphere.id';
    const testPhone = '085648077829';
    await User.destroy({ where: { email: testEmail } }).catch(() => {});

    server = app.listen(0);
    port = server.address().port;
    console.log(`  ✔ Test HTTP Server listening on port ${port}`);

    // Test A: Register user with phone_number provided
    const regRes = await request(port, {
      path: '/api/auth/register',
      method: 'POST',
    }, {
      name: 'Tester WA OTP',
      email: testEmail,
      password: 'password123',
      role: 'student',
      phone_number: testPhone,
    });

    assert.strictEqual(regRes.status, 201);
    assert.strictEqual(regRes.body.success, true);
    assert.strictEqual(regRes.body.requireOtp, true);
    console.log('  ✔ POST /api/auth/register: User created with pending OTP & phone_number saved.');

    // Verify User and Profile in DB
    const user = await User.findOne({
      where: { email: testEmail },
      include: [{ model: UserProfile, as: 'profile' }],
    });
    assert(user, 'User should be found in DB');
    assert(user.otp_code, 'User should have active OTP code');
    assert.strictEqual(user.is_verified, false);
    assert.strictEqual(user.profile.phone_number, testPhone);
    console.log('  ✔ DB Verification: UserProfile correctly stored phone_number.');

    // Test B: Send OTP to WhatsApp via POST /api/auth/send-otp-whatsapp
    const sendWaRes = await request(port, {
      path: '/api/auth/send-otp-whatsapp',
      method: 'POST',
    }, {
      email: testEmail,
      phone_number: testPhone,
    });

    assert.strictEqual(sendWaRes.status, 200);
    assert.strictEqual(sendWaRes.body.success, true);
    assert.strictEqual(sendWaRes.body.channel, 'whatsapp');
    assert(sendWaRes.body.data.phone);
    console.log(`  ✔ POST /api/auth/send-otp-whatsapp: Successfully dispatched WhatsApp OTP (${sendWaRes.body.data.phone}).`);

    // Test C: Resend OTP specifically via channel "whatsapp"
    const resendWaRes = await request(port, {
      path: '/api/auth/resend-otp',
      method: 'POST',
    }, {
      email: testEmail,
      channel: 'whatsapp',
    });

    assert.strictEqual(resendWaRes.status, 200);
    assert.strictEqual(resendWaRes.body.success, true);
    assert.strictEqual(resendWaRes.body.channel, 'whatsapp');
    console.log('  ✔ POST /api/auth/resend-otp (channel=whatsapp): Resent fresh OTP code via WhatsApp.');

    // Refresh user from DB to obtain latest OTP code
    await user.reload();
    const latestOtp = user.otp_code;
    assert(latestOtp, 'Latest OTP must be populated');

    // Test D: Verify OTP submitted by user
    const verifyRes = await request(port, {
      path: '/api/auth/verify-otp',
      method: 'POST',
    }, {
      email: testEmail,
      otp: latestOtp,
    });

    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyRes.body.success, true);
    assert(verifyRes.body.data.accessToken, 'Access token must be returned upon successful OTP verify');
    console.log('  ✔ POST /api/auth/verify-otp: Verified OTP received via WhatsApp and issued JWT token.');

    // Test E: Verify user is now active & verified
    await user.reload();
    assert.strictEqual(user.is_verified, true);
    assert.strictEqual(user.is_active, true);
    assert.strictEqual(user.otp_code, null);
    console.log('  ✔ User is now verified and active in database.');

    // Cleanup
    await User.destroy({ where: { email: testEmail } }).catch(() => {});

    console.log('\n======================================================');
    console.log('🎉 ALL WHATSAPP GATEWAY & OTP FALLBACK TESTS PASSED!');
    console.log('======================================================\n');
  } finally {
    if (server) {
      await new Promise(r => server.close(r));
    }
  }
};

if (require.main === module) {
  runWhatsAppOtpTestSuite()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ WhatsApp OTP Test Failed:', err);
      process.exit(1);
    });
}

module.exports = runWhatsAppOtpTestSuite;
