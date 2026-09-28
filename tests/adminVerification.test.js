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

async function runAdminVerificationTests() {
  console.log('🧪 Starting Admin Verification & Tutor Validation Test Suite (Sprint 1 - Satrio)...\n');

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

    // 1. Setup Test Users: Admin, Student, and Applicant
    const [adminUser] = await User.findOrCreate({
      where: { email: 'admin_test_satrio@skillsphere.id' },
      defaults: {
        name: 'Admin Satrio Test',
        email: 'admin_test_satrio@skillsphere.id',
        password: 'hashedpassword',
        role: 'admin',
        is_verified: true,
      },
    });

    const [studentUser] = await User.findOrCreate({
      where: { email: 'student_test_satrio@skillsphere.id' },
      defaults: {
        name: 'Student Satrio Test',
        email: 'student_test_satrio@skillsphere.id',
        password: 'hashedpassword',
        role: 'student',
        is_verified: true,
      },
    });

    const [applicantUser] = await User.findOrCreate({
      where: { email: 'applicant_test_satrio@skillsphere.id' },
      defaults: {
        name: 'Applicant Satrio Test',
        email: 'applicant_test_satrio@skillsphere.id',
        password: 'hashedpassword',
        role: 'student',
        is_verified: true,
      },
    });

    const adminToken = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: 'admin' },
      jwtSecret,
      { expiresIn: '1h' }
    );
    const studentToken = jwt.sign(
      { id: studentUser.id, email: studentUser.email, role: 'student' },
      jwtSecret,
      { expiresIn: '1h' }
    );

    const adminAuth = { Authorization: `Bearer ${adminToken}` };
    const studentAuth = { Authorization: `Bearer ${studentToken}` };

    // 2. Test RBAC: Non-admin is blocked with 403 Forbidden
    const forbiddenRes = await makeRequest('GET', '/api/admin/stats', studentAuth);
    assert.strictEqual(forbiddenRes.status, 403);
    assert.strictEqual(forbiddenRes.body.success, false);
    console.log('  ✔ RBAC Security: Non-admin student blocked from admin endpoints (403 Forbidden).');

    // 3. Test GET /api/admin/stats (Admin Authorized)
    const statsRes = await makeRequest('GET', '/api/admin/stats', adminAuth);
    assert.strictEqual(statsRes.status, 200);
    assert.strictEqual(statsRes.body.success, true);
    assert.ok(statsRes.body.data.applications);
    assert.ok(statsRes.body.data.certifications);
    console.log('  ✔ Admin Stats API verified (Total, Pending, Approved, Verified metrics).');

    // 4. Create dummy Tutor Application
    const [testApp] = await TutorApplication.findOrCreate({
      where: { user_id: applicantUser.id },
      defaults: {
        user_id: applicantUser.id,
        cv_url: 'https://storage.skillsphere.id/cv/test.pdf',
        institution_name: 'Institut Teknologi Bandung (ITB)',
        experience_years: 3,
        status: 'pending',
      },
    });
    testApp.status = 'pending';
    await testApp.save();
    applicantUser.role = 'student';
    await applicantUser.save();

    // 5. Test GET /api/admin/tutor-applications
    const listAppsRes = await makeRequest('GET', '/api/admin/tutor-applications?status=all', adminAuth);
    assert.strictEqual(listAppsRes.status, 200);
    assert.strictEqual(listAppsRes.body.success, true);
    assert.ok(listAppsRes.body.data.applications.length > 0);
    console.log(`  ✔ GET /api/admin/tutor-applications fetched ${listAppsRes.body.data.applications.length} applications.`);

    // 6. Test GET /api/admin/tutor-applications/:id
    const detailAppRes = await makeRequest('GET', `/api/admin/tutor-applications/${testApp.id}`, adminAuth);
    assert.strictEqual(detailAppRes.status, 200);
    assert.strictEqual(detailAppRes.body.data.id, testApp.id);
    assert.strictEqual(detailAppRes.body.data.applicant.email, applicantUser.email);
    console.log('  ✔ GET /api/admin/tutor-applications/:id detail view verified.');

    // 7. Test PUT /api/admin/tutor-applications/:id/approve
    const approveRes = await makeRequest('PUT', `/api/admin/tutor-applications/${testApp.id}/approve`, adminAuth);
    assert.strictEqual(approveRes.status, 200);
    assert.strictEqual(approveRes.body.success, true);
    assert.strictEqual(approveRes.body.data.status, 'approved');

    // Verify applicant upgraded to tutor & wallet created
    const updatedApplicant = await User.findByPk(applicantUser.id, {
      include: [{ model: TutorWallet, as: 'wallet' }],
    });
    assert.strictEqual(updatedApplicant.role, 'tutor');
    assert.ok(updatedApplicant.wallet);
    console.log('  ✔ PUT /api/admin/tutor-applications/:id/approve: Upgraded role to "tutor" & activated TutorWallet.');

    // 8. Test PUT /api/admin/tutor-applications/:id/reject with reason
    const [rejectCandidate] = await User.findOrCreate({
      where: { email: 'reject_candidate@skillsphere.id' },
      defaults: {
        name: 'Reject Candidate',
        email: 'reject_candidate@skillsphere.id',
        password: 'hashedpassword',
        role: 'student',
      },
    });
    const [rejectApp] = await TutorApplication.findOrCreate({
      where: { user_id: rejectCandidate.id },
      defaults: {
        user_id: rejectCandidate.id,
        institution_name: 'Dummy University',
        experience_years: 0,
        status: 'pending',
      },
    });
    rejectApp.status = 'pending';
    rejectApp.rejection_reason = null;
    await rejectApp.save();

    const rejectRes = await makeRequest(
      'PUT',
      `/api/admin/tutor-applications/${rejectApp.id}/reject`,
      adminAuth,
      { reason: 'Dokumen kualifikasi tidak mencukupi standar minimum.' }
    );
    assert.strictEqual(rejectRes.status, 200);
    assert.strictEqual(rejectRes.body.data.status, 'rejected');
    assert.strictEqual(rejectRes.body.data.rejection_reason, 'Dokumen kualifikasi tidak mencukupi standar minimum.');
    console.log('  ✔ PUT /api/admin/tutor-applications/:id/reject recorded rejection reason successfully.');


    // 9. Test Tutor Certification verification
    const [testCert] = await TutorCertification.findOrCreate({
      where: { credential_id: 'TEST-CERT-SATRIO-101' },
      defaults: {
        tutor_id: applicantUser.id,
        certificate_name: 'Professional Data Engineer Certified',
        issuer: 'Google Cloud Certified',
        credential_id: 'TEST-CERT-SATRIO-101',
        is_verified: false,
      },
    });

    const verifyCertRes = await makeRequest('PUT', `/api/admin/tutor-certifications/${testCert.id}/verify`, adminAuth);
    assert.strictEqual(verifyCertRes.status, 200);
    assert.strictEqual(verifyCertRes.body.data.is_verified, true);
    assert.strictEqual(verifyCertRes.body.data.verified_by, adminUser.id);
    console.log('  ✔ PUT /api/admin/tutor-certifications/:id/verify: Verified teacher official certification.');

    const unverifyCertRes = await makeRequest('PUT', `/api/admin/tutor-certifications/${testCert.id}/unverify`, adminAuth);
    assert.strictEqual(unverifyCertRes.status, 200);
    assert.strictEqual(unverifyCertRes.body.data.is_verified, false);
    console.log('  ✔ PUT /api/admin/tutor-certifications/:id/unverify: Certification verification revoked cleanly.');

    console.log('\n======================================================');
    console.log('🎉 ALL ADMIN VERIFICATION TESTS PASSED (SPRINT 1 - SATRIO)!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Admin Verification Test Failed:', err);
    process.exit(1);
  } finally {
    if (server) server.close();
  }
}

if (require.main === module) {
  runAdminVerificationTests()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runAdminVerificationTests;
