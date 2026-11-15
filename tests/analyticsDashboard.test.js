const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const jwt = require('jsonwebtoken');
const app = require('../app');
const { sequelize, User, Course, Enrollment, Transaction, TutorWallet } = require('../models');

process.env.NODE_ENV = 'test';
const JWT_SECRET = process.env.JWT_SECRET || 'skillsphere_super_secret_jwt_key_2026_production_ready';

const generateToken = (user) => jwt.sign(
  { id: user.id, email: user.email, role: user.role, name: user.name },
  JWT_SECRET,
  { expiresIn: '1h' }
);

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

async function runAnalyticsTestSuite() {
  console.log('\n🧪 Memulai Test Suite Laporan & Analitik (Admin & Tutor)...\n');

  // Test 1: EJS Compilations
  console.log('🔹 Test 1: Kompilasi EJS Template admin/analytics & tutor/analytics');
  const adminViewPath = path.join(__dirname, '../views/admin/analytics.ejs');
  const tutorViewPath = path.join(__dirname, '../views/tutor/analytics.ejs');

  assert.ok(fs.existsSync(adminViewPath), 'views/admin/analytics.ejs harus ada di direktori.');
  assert.ok(fs.existsSync(tutorViewPath), 'views/tutor/analytics.ejs harus ada di direktori.');

  const adminViewSource = fs.readFileSync(adminViewPath, 'utf8');
  const tutorViewSource = fs.readFileSync(tutorViewPath, 'utf8');

  // Anti-slop check: Zero em-dash
  assert.ok(!adminViewSource.includes('—'), 'admin/analytics.ejs tidak boleh mengandung tanda em dash.');
  assert.ok(!tutorViewSource.includes('—'), 'tutor/analytics.ejs tidak boleh mengandung tanda em dash.');

  ejs.compile(adminViewSource, { filename: adminViewPath });
  ejs.compile(tutorViewSource, { filename: tutorViewPath });
  console.log('✅ Test 1 Passed: Seluruh EJS view analitik terkompilasi bersih tanpa syntax error.');

  // Test 2: Start HTTP Server for API Tests
  console.log('🔹 Test 2: Inisialisasi HTTP server pengujian');
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`✅ Test 2 Passed: Server uji berjalan pada port ${port}.`);

  try {
    // Generate test tokens
    const adminUser = await User.findOne({ where: { role: 'admin' } });
    const tutorUser = await User.findOne({ where: { role: 'tutor' } });
    const studentUser = await User.findOne({ where: { role: 'student' } });

    assert.ok(adminUser, 'Admin user harus ada di database.');
    assert.ok(tutorUser, 'Tutor user harus ada di database.');
    assert.ok(studentUser, 'Student user harus ada di database.');

    const adminToken = generateToken(adminUser);
    const tutorToken = generateToken(tutorUser);
    const studentToken = generateToken(studentUser);

    // Test 3: GET /api/admin/analytics access control
    console.log('🔹 Test 3: Verifikasi otorisasi endpoint GET /api/admin/analytics');
    const resNoAuth = await request(port, { path: '/api/admin/analytics' });
    assert.strictEqual(resNoAuth.status, 401, 'Request tanpa token harus diblokir (401).');

    const resStudentBlocked = await request(port, {
      path: '/api/admin/analytics',
      headers: { 'Authorization': 'Bearer ' + studentToken },
    });
    assert.strictEqual(resStudentBlocked.status, 403, 'Siswa harus diblokir dari analitik admin (403).');

    const resAdminSuccess = await request(port, {
      path: '/api/admin/analytics',
      headers: { 'Authorization': 'Bearer ' + adminToken },
    });
    assert.strictEqual(resAdminSuccess.status, 200);
    assert.strictEqual(resAdminSuccess.body.success, true);
    assert.ok(resAdminSuccess.body.data.financial, 'Harus memuat data finansial platform.');
    assert.ok(resAdminSuccess.body.data.courses, 'Harus memuat distribusi kursus.');
    assert.ok(typeof resAdminSuccess.body.data.financial.total_gmv === 'number');
    console.log('✅ Test 3 Passed: Endpoint GET /api/admin/analytics merespons metrik lengkap.');

    // Test 4: GET /api/tutor/analytics
    console.log('🔹 Test 4: Verifikasi endpoint GET /api/tutor/analytics');
    const resTutorNoAuth = await request(port, { path: '/api/tutor/analytics' });
    assert.strictEqual(resTutorNoAuth.status, 401);

    const resTutorSuccess = await request(port, {
      path: '/api/tutor/analytics',
      headers: { 'Authorization': 'Bearer ' + tutorToken },
    });
    assert.strictEqual(resTutorSuccess.status, 200);
    assert.strictEqual(resTutorSuccess.body.success, true);
    assert.ok(resTutorSuccess.body.data.financial, 'Harus memuat data keuangan tutor.');
    assert.ok(Array.isArray(resTutorSuccess.body.data.courses), 'courses harus berbentuk array.');
    assert.ok(Array.isArray(resTutorSuccess.body.data.at_risk_students), 'at_risk_students harus berbentuk array.');
    console.log('✅ Test 4 Passed: Endpoint GET /api/tutor/analytics merespons data performa pengajar.');

    // Test 5: Web UI Route GET /admin/analytics & GET /tutor/analytics
    console.log('🔹 Test 5: Verifikasi route halaman web GET /admin/analytics & GET /tutor/analytics');
    const resAdminPage = await request(port, { path: '/admin/analytics' });
    assert.strictEqual(resAdminPage.status, 200);
    assert.ok(typeof resAdminPage.body === 'string' && resAdminPage.body.includes('Laporan & Analitik Platform'));

    const resTutorPage = await request(port, { path: '/tutor/analytics' });
    assert.strictEqual(resTutorPage.status, 200);
    assert.ok(typeof resTutorPage.body === 'string' && resTutorPage.body.includes('Laporan & Analitik Pengajar'));
    console.log('✅ Test 5 Passed: Halaman web analitik Admin dan Pengajar merespons HTTP 200 OK.');

    console.log('\n🎉 ALL 5 ANALYTICS & REPORTS TESTS PASSED SUCCESSFULLY! 🚀\n');
  } finally {
    server.close();
  }
}

if (require.main === module) {
  runAnalyticsTestSuite()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Analytics test failed:', err);
      process.exit(1);
    });
}

module.exports = runAnalyticsTestSuite;
