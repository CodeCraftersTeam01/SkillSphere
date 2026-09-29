const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');

const app = require('../app');
const {
  sequelize,
  User,
  UserProfile,
  TutorApplication,
  TutorCertification,
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

async function runTutorVerificationApiTests() {
  console.log('🧪 Starting Tutor Verification API Test Suite (Sprint 1 - Tegar)...\n');

  try {
    await sequelize.sync();

    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        console.log(`  ✔ Test HTTP server listening on ${baseUrl}`);
        resolve();
      });
    });

    const jwtSecret = process.env.JWT_SECRET || 'skillsphere_super_secret_jwt_key_2026_dev';

    // 1. Setup Test Applicant User
    const [applicantUser] = await User.findOrCreate({
      where: { email: 'tegar_applicant_test@skillsphere.id' },
      defaults: {
        name: 'Tegar Applicant Test',
        email: 'tegar_applicant_test@skillsphere.id',
        password: 'hashedpassword',
        role: 'student',
        is_verified: true,
      },
    });

    const token = jwt.sign(
      { id: applicantUser.id, email: applicantUser.email, role: 'student' },
      jwtSecret,
      { expiresIn: '1h' }
    );
    const authHeaders = { Authorization: `Bearer ${token}` };

    // 2. Test POST /api/tutor/apply (Submit application)
    const applyRes = await makeRequest('POST', '/api/tutor/apply', authHeaders, {
      institution_name: 'Institut Teknologi Sepuluh Nopember (ITS)',
      experience_years: 4,
      cv_url: 'https://storage.skillsphere.id/cv/tegar_cv.pdf',
      certificate_document_url: 'https://storage.skillsphere.id/certs/tegar_cert.pdf',
      linkedin_url: 'https://linkedin.com/in/tegar-mahardika',
      portfolio_url: 'https://tegar.dev',
      bio: 'Senior Backend Engineer & AI Enthusiast.',
    });
    assert.strictEqual(applyRes.status, 200);
    assert.strictEqual(applyRes.body.success, true);
    assert.strictEqual(applyRes.body.data.status, 'pending');
    console.log('  ✔ POST /api/tutor/apply: Submitted tutor candidate application.');

    // 3. Test GET /api/tutor/my-application
    const myAppRes = await makeRequest('GET', '/api/tutor/my-application', authHeaders);
    assert.strictEqual(myAppRes.status, 200);
    assert.strictEqual(myAppRes.body.success, true);
    assert.strictEqual(myAppRes.body.data.user_id, applicantUser.id);
    assert.strictEqual(myAppRes.body.data.institution_name, 'Institut Teknologi Sepuluh Nopember (ITS)');
    console.log('  ✔ GET /api/tutor/my-application: Retrieved active application details.');

    // 4. Test POST /api/tutor/certifications
    const addCertRes = await makeRequest('POST', '/api/tutor/certifications', authHeaders, {
      certificate_name: 'Google Cloud Professional Cloud Architect',
      issuer: 'Google Cloud',
      issue_date: '2025-01-10',
      credential_id: 'GCP-PCA-987654',
      credential_url: 'https://google.accredible.com/verify/GCP-PCA-987654',
    });
    assert.strictEqual(addCertRes.status, 201);
    assert.strictEqual(addCertRes.body.success, true);
    assert.strictEqual(addCertRes.body.data.is_verified, false);
    const createdCertId = addCertRes.body.data.id;
    console.log('  ✔ POST /api/tutor/certifications: Registered official certificate for verification.');

    // 5. Test GET /api/tutor/my-certifications
    const getCertsRes = await makeRequest('GET', '/api/tutor/my-certifications', authHeaders);
    assert.strictEqual(getCertsRes.status, 200);
    assert.strictEqual(getCertsRes.body.success, true);
    assert.ok(Array.isArray(getCertsRes.body.data));
    assert.ok(getCertsRes.body.data.some((c) => c.id === createdCertId));
    console.log(`  ✔ GET /api/tutor/my-certifications: Listed ${getCertsRes.body.data.length} registered certifications.`);

    // 6. Test DELETE /api/tutor/certifications/:id
    const deleteCertRes = await makeRequest('DELETE', `/api/tutor/certifications/${createdCertId}`, authHeaders);
    assert.strictEqual(deleteCertRes.status, 200);
    assert.strictEqual(deleteCertRes.body.success, true);
    console.log('  ✔ DELETE /api/tutor/certifications/:id: Removed certification record cleanly.');

    console.log('\n======================================================');
    console.log('🎉 ALL TUTOR VERIFICATION API TESTS PASSED (SPRINT 1 - TEGAR)!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Tutor Verification API Test Failed:', err);
    process.exit(1);
  } finally {
    if (server) server.close();
  }
}

if (require.main === module) {
  runTutorVerificationApiTests()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runTutorVerificationApiTests;
