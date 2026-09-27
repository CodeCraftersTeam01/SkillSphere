const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');

const app = require('../app');
const {
  sequelize,
  User,
  Category,
  Course,
  CourseSection,
  CourseMaterial,
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
      if (Buffer.isBuffer(body)) {
        req.write(body);
      } else if (typeof body === 'object') {
        req.write(JSON.stringify(body));
      } else {
        req.write(body);
      }
    }
    req.end();
  });
}

function buildMultipartFormData(fields = {}, files = {}) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const chunks = [];

  for (const [name, val] of Object.entries(fields)) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${val}\r\n`));
  }

  for (const [name, fileObj] of Object.entries(files)) {
    const filename = fileObj.filename || 'file.dat';
    const contentType = fileObj.contentType || 'application/octet-stream';
    const fileBuffer = Buffer.isBuffer(fileObj.buffer) ? fileObj.buffer : Buffer.from(fileObj.buffer || '');

    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`));
    chunks.push(fileBuffer);
    chunks.push(Buffer.from('\r\n'));
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`));

  const bodyBuffer = Buffer.concat(chunks);
  const headers = {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': bodyBuffer.length,
  };

  return { headers, bodyBuffer };
}

async function runTutorMaterialsPortalTests() {
  console.log('🧪 Starting Tutor Materials Portal & Curriculum Test Suite (Sprint 2 - Satrio)...\n');

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

    // 1. Setup Tutor User
    const [tutorUser] = await User.findOrCreate({
      where: { email: 'tutor_portal_test@skillsphere.id' },
      defaults: {
        name: 'Tutor Portal Satrio',
        email: 'tutor_portal_test@skillsphere.id',
        password: 'hashedpassword',
        role: 'tutor',
        is_verified: true,
      },
    });

    const tutorToken = jwt.sign(
      { id: tutorUser.id, email: tutorUser.email, role: 'tutor' },
      jwtSecret,
      { expiresIn: '1h' }
    );
    const tutorAuth = { Authorization: `Bearer ${tutorToken}` };

    // 2. Setup Category & Course
    const [category] = await Category.findOrCreate({
      where: { slug: 'cloud-computing' },
      defaults: { name: 'Cloud Computing', slug: 'cloud-computing' },
    });

    const createCourseRes = await makeRequest(
      'POST',
      '/api/courses',
      tutorAuth,
      {
        title: 'Mastering Kubernetes and Cloud Native',
        category_id: category.id,
        description: 'Comprehensive course on microservices and container orchestration.',
        price: 350000,
        level: 'advanced',
      }
    );
    assert.strictEqual(createCourseRes.status, 201);
    assert.strictEqual(createCourseRes.body.success, true);
    const course = createCourseRes.body.data;
    console.log(`  ✔ POST /api/courses: Created course "${course.title}" with initial default section.`);

    // 3. Test GET /api/courses/tutor/my-courses
    const myCoursesRes = await makeRequest('GET', '/api/courses/tutor/my-courses', tutorAuth);
    assert.strictEqual(myCoursesRes.status, 200);
    assert.ok(myCoursesRes.body.data.length > 0);
    console.log(`  ✔ GET /api/courses/tutor/my-courses: Fetched ${myCoursesRes.body.data.length} courses for tutor.`);

    // 4. Test Section Creation
    const createSectionRes = await makeRequest(
      'POST',
      `/api/courses/${course.id}/sections`,
      tutorAuth,
      { title: 'Bab 2: Pods, Services & Ingress Networking' }
    );
    assert.strictEqual(createSectionRes.status, 201);
    assert.strictEqual(createSectionRes.body.data.title, 'Bab 2: Pods, Services & Ingress Networking');
    const section2 = createSectionRes.body.data;
    console.log('  ✔ POST /api/courses/:id/sections: Created new curriculum section.');

    // 5. Test Multi-Format Material Uploads
    // 5a. Video material upload
    const videoData = buildMultipartFormData(
      {
        section_id: String(section2.id),
        title: 'Video 1: Membangun Cluster Kubernetes Lokal',
        content_type: 'video',
        duration_minutes: '20',
        is_preview: 'true',
        order_index: '1',
      },
      {
        file: {
          filename: 'k8s_cluster.mp4',
          contentType: 'video/mp4',
          buffer: Buffer.from('FAKE_VIDEO_CONTENT_STREAM'),
        },
      }
    );

    const uploadVideoRes = await makeRequest(
      'POST',
      '/api/materials',
      { ...tutorAuth, ...videoData.headers },
      videoData.bodyBuffer
    );
    assert.strictEqual(uploadVideoRes.status, 201);
    assert.strictEqual(uploadVideoRes.body.data.content_type, 'video');
    assert.strictEqual(uploadVideoRes.body.data.is_preview, true);
    const material1 = uploadVideoRes.body.data;
    console.log(`  ✔ POST /api/materials: Uploaded video material "${material1.title}".`);

    // 5b. PPT slides material upload
    const pptData = buildMultipartFormData(
      {
        section_id: String(section2.id),
        title: 'Slide Presentasi: Arsitektur Master & Worker Node',
        content_type: 'ppt',
        duration_minutes: '15',
        is_preview: 'false',
        order_index: '2',
      },
      {
        file: {
          filename: 'k8s_architecture.pptx',
          contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          buffer: Buffer.from('FAKE_PPT_SLIDE_CONTENT'),
        },
      }
    );

    const uploadPptRes = await makeRequest(
      'POST',
      '/api/materials',
      { ...tutorAuth, ...pptData.headers },
      pptData.bodyBuffer
    );
    assert.strictEqual(uploadPptRes.status, 201);
    const material2 = uploadPptRes.body.data;
    console.log(`  ✔ POST /api/materials: Uploaded PPT presentation "${material2.title}".`);

    // 6. Test Reorder Materials
    const reorderRes = await makeRequest(
      'PATCH',
      '/api/materials/reorder',
      tutorAuth,
      {
        items: [
          { id: material2.id, order_index: 1 },
          { id: material1.id, order_index: 2 },
        ],
      }
    );
    assert.strictEqual(reorderRes.status, 200);
    console.log('  ✔ PATCH /api/materials/reorder: Reordered materials successfully.');

    // 7. Test Delete Material & Section Cleanup
    const deleteMatRes = await makeRequest('DELETE', `/api/materials/${material1.id}`, tutorAuth);
    assert.strictEqual(deleteMatRes.status, 200);
    console.log('  ✔ DELETE /api/materials/:id: Deleted material and purged storage.');

    const deleteSecRes = await makeRequest('DELETE', `/api/courses/sections/${section2.id}`, tutorAuth);
    assert.strictEqual(deleteSecRes.status, 200);
    console.log('  ✔ DELETE /api/courses/sections/:id: Cleaned up section.');

    console.log('\n======================================================');
    console.log('🎉 ALL TUTOR MATERIALS PORTAL TESTS PASSED (SPRINT 2 - SATRIO)!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Tutor Materials Portal Test Failed:', err);
    process.exit(1);
  } finally {
    if (server) server.close();
  }
}

if (require.main === module) {
  runTutorMaterialsPortalTests();
}

module.exports = runTutorMaterialsPortalTests;
