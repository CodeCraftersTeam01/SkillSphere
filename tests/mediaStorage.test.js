const assert = require('assert');
const path = require('path');
const fs = require('fs');
const http = require('http');
const sharp = require('sharp');
const jwt = require('jsonwebtoken');

const app = require('../app');
const {
  sequelize,
  User,
  Category,
  Course,
  CourseSection,
  CourseMaterial,
  Enrollment,
} = require('../models');
const {
  processThumbnail,
  deleteStoredFile,
  getFileMetadata,
  UPLOADS_ROOT,
} = require('../utils/mediaStorage');

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
          buffer: rawBuffer,
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

async function runMediaStorageTests() {
  console.log('🧪 Starting Media Storage Service & Course Materials Test Suite...\n');

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

    // 1. Health check verification
    const healthRes = await makeRequest('GET', '/api/health');
    assert.strictEqual(healthRes.status, 200);
    assert.strictEqual(healthRes.body.status, 'ok');
    assert.ok(healthRes.body.sprint.includes('Sprint 2'));
    console.log('  ✔ Health check includes Sprint 2 Media Storage Service info.');

    // 2. Setup mock users (Tutor, Student, Admin)
    const [tutorUser] = await User.findOrCreate({
      where: { email: 'tutor_media@skillsphere.ai' },
      defaults: {
        name: 'Tutor Media',
        email: 'tutor_media@skillsphere.ai',
        password: 'hashedpassword',
        role: 'tutor',
        is_verified: true,
      },
    });

    const [studentUser] = await User.findOrCreate({
      where: { email: 'student_media@skillsphere.ai' },
      defaults: {
        name: 'Student Media',
        email: 'student_media@skillsphere.ai',
        password: 'hashedpassword',
        role: 'student',
        is_verified: true,
      },
    });

    const tutorToken = jwt.sign(
      { id: tutorUser.id, email: tutorUser.email, role: 'tutor' },
      process.env.JWT_SECRET || 'SkillSphere_Super_Secret_JWT_Key_2026',
      { expiresIn: '1h' }
    );

    const studentToken = jwt.sign(
      { id: studentUser.id, email: studentUser.email, role: 'student' },
      process.env.JWT_SECRET || 'SkillSphere_Super_Secret_JWT_Key_2026',
      { expiresIn: '1h' }
    );

    const tutorAuthHeader = { Authorization: `Bearer ${tutorToken}` };
    const studentAuthHeader = { Authorization: `Bearer ${studentToken}` };

    // 3. Test Thumbnail processing directly and via API
    const testImageBuffer = await sharp({
      create: {
        width: 1920,
        height: 1080,
        channels: 4,
        background: { r: 16, g: 185, b: 129, alpha: 1 },
      },
    }).png().toBuffer();

    const directThumb = await processThumbnail(testImageBuffer, { quality: 80 });
    assert.ok(directThumb.relativeUrl.startsWith('/uploads/courses/thumbnails/'));
    assert.ok(fs.existsSync(directThumb.fullPath));
    const thumbMeta = await sharp(directThumb.fullPath).metadata();
    assert.strictEqual(thumbMeta.format, 'webp');
    console.log(`  ✔ Direct thumbnail conversion to WebP: ${directThumb.relativeUrl} (${Math.round(directThumb.compressedSize / 1024)} KB)`);

    // Clean up direct thumbnail
    await deleteStoredFile(directThumb.relativeUrl);
    assert.strictEqual(fs.existsSync(directThumb.fullPath), false);
    console.log('  ✔ Secure file deletion of thumbnail verified.');

    // 4. Test Thumbnail Upload via REST API
    const thumbMultipart = buildMultipartFormData(
      { quality: '85', max_width: '800' },
      { thumbnail: { filename: 'course_banner.png', contentType: 'image/png', buffer: testImageBuffer } }
    );
    const thumbUploadRes = await makeRequest(
      'POST',
      '/api/media/upload/thumbnail',
      { ...tutorAuthHeader, ...thumbMultipart.headers },
      thumbMultipart.bodyBuffer
    );
    assert.strictEqual(thumbUploadRes.status, 201);
    assert.strictEqual(thumbUploadRes.body.success, true);
    assert.ok(thumbUploadRes.body.data.relativeUrl.endsWith('.webp'));
    console.log(`  ✔ API POST /api/media/upload/thumbnail processed WebP image (${thumbUploadRes.body.data.relativeUrl})`);

    const uploadedThumbPath = path.join(__dirname, '..', 'public', thumbUploadRes.body.data.relativeUrl.replace(/^\//, ''));
    assert.ok(fs.existsSync(uploadedThumbPath));

    // 5. Test Multi-Format Media Uploads
    // 5a. Video upload
    const mockVideoBuffer = Buffer.from('FAKE_MP4_VIDEO_HEADER_AND_STREAM_CONTENT_FOR_TESTING');
    const videoMultipart = buildMultipartFormData(
      {},
      { file: { filename: 'intro_lesson.mp4', contentType: 'video/mp4', buffer: mockVideoBuffer } }
    );
    const videoUploadRes = await makeRequest(
      'POST',
      '/api/media/upload/material',
      { ...tutorAuthHeader, ...videoMultipart.headers },
      videoMultipart.bodyBuffer
    );
    assert.strictEqual(videoUploadRes.status, 201);
    assert.strictEqual(videoUploadRes.body.data.contentType, 'video');
    assert.ok(videoUploadRes.body.data.relativeUrl.includes('/uploads/materials/videos/'));
    console.log(`  ✔ Video upload handled: ${videoUploadRes.body.data.relativeUrl}`);

    // 5b. PPT upload
    const mockPptBuffer = Buffer.from('MOCK_PPTX_PRESENTATION_SLIDES_BUFFER');
    const pptMultipart = buildMultipartFormData(
      {},
      {
        file: {
          filename: 'slide_deck.pptx',
          contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          buffer: mockPptBuffer,
        },
      }
    );
    const pptUploadRes = await makeRequest(
      'POST',
      '/api/media/upload/material',
      { ...tutorAuthHeader, ...pptMultipart.headers },
      pptMultipart.bodyBuffer
    );
    assert.strictEqual(pptUploadRes.status, 201);
    assert.strictEqual(pptUploadRes.body.data.contentType, 'ppt');
    assert.ok(pptUploadRes.body.data.relativeUrl.includes('/uploads/materials/slides/'));
    console.log(`  ✔ PPT slide upload handled: ${pptUploadRes.body.data.relativeUrl}`);

    // 5c. PDF Document upload
    const mockPdfBuffer = Buffer.from('%PDF-1.4 mock pdf stream for testing course documents');
    const pdfMultipart = buildMultipartFormData(
      {},
      { file: { filename: 'syllabus.pdf', contentType: 'application/pdf', buffer: mockPdfBuffer } }
    );
    const pdfUploadRes = await makeRequest(
      'POST',
      '/api/media/upload/material',
      { ...tutorAuthHeader, ...pdfMultipart.headers },
      pdfMultipart.bodyBuffer
    );
    assert.strictEqual(pdfUploadRes.status, 201);
    assert.strictEqual(pdfUploadRes.body.data.contentType, 'pdf');
    assert.ok(pdfUploadRes.body.data.relativeUrl.includes('/uploads/materials/documents/'));
    console.log(`  ✔ PDF document upload handled: ${pdfUploadRes.body.data.relativeUrl}`);

    // 5d. DOC upload
    const mockDocBuffer = Buffer.from('MOCK_DOCX_FILE_BUFFER');
    const docMultipart = buildMultipartFormData(
      {},
      {
        file: {
          filename: 'assignment.docx',
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          buffer: mockDocBuffer,
        },
      }
    );
    const docUploadRes = await makeRequest(
      'POST',
      '/api/media/upload/material',
      { ...tutorAuthHeader, ...docMultipart.headers },
      docMultipart.bodyBuffer
    );
    assert.strictEqual(docUploadRes.status, 201);
    assert.strictEqual(docUploadRes.body.data.contentType, 'doc');
    assert.ok(docUploadRes.body.data.relativeUrl.includes('/uploads/materials/documents/'));
    console.log(`  ✔ DOC document upload handled: ${docUploadRes.body.data.relativeUrl}`);

    // 5e. Digital Book (ePUB) upload
    const mockEpubBuffer = Buffer.from('MOCK_EPUB_DIGITAL_BOOK_BINARY_DATA');
    const epubMultipart = buildMultipartFormData(
      {},
      { file: { filename: 'handbook.epub', contentType: 'application/epub+zip', buffer: mockEpubBuffer } }
    );
    const epubUploadRes = await makeRequest(
      'POST',
      '/api/media/upload/material',
      { ...tutorAuthHeader, ...epubMultipart.headers },
      epubMultipart.bodyBuffer
    );
    assert.strictEqual(epubUploadRes.status, 201);
    assert.strictEqual(epubUploadRes.body.data.contentType, 'book');
    assert.ok(epubUploadRes.body.data.relativeUrl.includes('/uploads/materials/books/'));
    console.log(`  ✔ Digital Book (ePUB) upload handled: ${epubUploadRes.body.data.relativeUrl}`);

    // 6. Test Metadata info API
    const metaRes = await makeRequest('GET', `/api/media/info?file_url=${videoUploadRes.body.data.relativeUrl}`);
    assert.strictEqual(metaRes.status, 200);
    assert.strictEqual(metaRes.body.data.detectedType, 'video');
    assert.strictEqual(metaRes.body.data.extension, '.mp4');
    console.log('  ✔ Media metadata endpoint (/api/media/info) verified.');

    // 7. Test HTTP Range Streaming (206 Partial Content)
    const videoPathOnDisk = path.join(__dirname, '..', 'public', videoUploadRes.body.data.relativeUrl.replace(/^\//, ''));
    const videoFilename = path.basename(videoPathOnDisk);

    // 7a. Full request
    const streamFullRes = await makeRequest('GET', `/api/media/stream/videos/${videoFilename}`);
    assert.strictEqual(streamFullRes.status, 200);
    assert.strictEqual(streamFullRes.headers['content-type'], 'video/mp4');
    assert.strictEqual(streamFullRes.buffer.toString(), mockVideoBuffer.toString());

    // 7b. Partial Range request (bytes 0-10)
    const streamRangeRes = await makeRequest(
      'GET',
      `/api/media/stream/videos/${videoFilename}`,
      { Range: 'bytes=0-10' }
    );
    assert.strictEqual(streamRangeRes.status, 206);
    assert.ok(streamRangeRes.headers['content-range'].startsWith('bytes 0-10/'));
    assert.strictEqual(streamRangeRes.buffer.length, 11);
    console.log('  ✔ HTTP 206 Partial Content video streaming verified.');

    // 8. Test Course Material Lifecycle & Database Integration
    const [category] = await Category.findOrCreate({
      where: { slug: 'web-development' },
      defaults: { name: 'Web Development', slug: 'web-development' },
    });

    const course = await Course.create({
      tutor_id: tutorUser.id,
      category_id: category.id,
      title: 'Fullstack Node.js & React Architecture',
      slug: `fullstack-node-react-${Date.now()}`,
      price: 250000.0,
      level: 'intermediate',
      status: 'published',
    });

    const section = await CourseSection.create({
      course_id: course.id,
      title: 'Bab 1: Media Storage Architecture',
      order_index: 1,
    });

    // 8a. Create material directly linked with file
    const mat1Multipart = buildMultipartFormData(
      {
        section_id: String(section.id),
        title: 'Video Pembelajaran: Setup Multi-Format Storage',
        duration_minutes: '15',
        is_preview: 'true',
        order_index: '1',
      },
      {
        file: {
          filename: 'lesson_1.mp4',
          contentType: 'video/mp4',
          buffer: Buffer.from('MOCK_VIDEO_BUFFER_1'),
        },
      }
    );

    const createMatRes = await makeRequest(
      'POST',
      '/api/materials',
      { ...tutorAuthHeader, ...mat1Multipart.headers },
      mat1Multipart.bodyBuffer
    );
    assert.strictEqual(createMatRes.status, 201);
    assert.strictEqual(createMatRes.body.data.title, 'Video Pembelajaran: Setup Multi-Format Storage');
    assert.strictEqual(createMatRes.body.data.content_type, 'video');
    assert.strictEqual(createMatRes.body.data.is_preview, true);
    console.log(`  ✔ CourseMaterial created with uploaded file: ${createMatRes.body.data.file_url}`);

    const material1Id = createMatRes.body.data.id;
    const material1FileUrl = createMatRes.body.data.file_url;

    // 8b. Create a locked material (is_preview = false)
    const mat2Multipart = buildMultipartFormData(
      {
        section_id: String(section.id),
        title: 'Buku Pegangan: Arsitektur Cloud Media',
        duration_minutes: '45',
        is_preview: 'false',
        order_index: '2',
      },
      {
        file: {
          filename: 'handbook_vol1.pdf',
          contentType: 'application/pdf',
          buffer: Buffer.from('%PDF-1.4 secret handbook'),
        },
      }
    );

    const createMat2Res = await makeRequest(
      'POST',
      '/api/materials',
      { ...tutorAuthHeader, ...mat2Multipart.headers },
      mat2Multipart.bodyBuffer
    );
    assert.strictEqual(createMat2Res.status, 201);
    const material2Id = createMat2Res.body.data.id;
    const material2FileUrl = createMat2Res.body.data.file_url;

    // 8c. Access control check: Unenrolled student viewing locked material
    const studentViewRes = await makeRequest('GET', `/api/materials/${material2Id}`, studentAuthHeader);
    assert.strictEqual(studentViewRes.status, 200);
    assert.strictEqual(studentViewRes.body.data.is_locked, true);
    assert.strictEqual(studentViewRes.body.data.file_url, null);
    console.log('  ✔ Access control: Unenrolled student cannot access locked material file_url.');

    // 8d. Access control check: Preview material is unlocked for students
    const studentPreviewRes = await makeRequest('GET', `/api/materials/${material1Id}`, studentAuthHeader);
    assert.strictEqual(studentPreviewRes.status, 200);
    assert.strictEqual(studentPreviewRes.body.data.is_locked, false);
    assert.ok(studentPreviewRes.body.data.file_url.includes('/uploads/'));
    console.log('  ✔ Access control: Preview material is accessible to students.');

    // 8e. Access control check: Enrolled student can access locked material
    await Enrollment.create({
      user_id: studentUser.id,
      course_id: course.id,
      progress_percent: 0,
      status: 'active',
    });

    const enrolledViewRes = await makeRequest('GET', `/api/materials/${material2Id}`, studentAuthHeader);
    assert.strictEqual(enrolledViewRes.status, 200);
    assert.strictEqual(enrolledViewRes.body.data.is_locked, false);
    assert.ok(enrolledViewRes.body.data.file_url.includes('/uploads/'));
    console.log('  ✔ Access control: Enrolled student can access locked material.');

    // 8f. Reorder materials
    const reorderRes = await makeRequest(
      'PATCH',
      '/api/materials/reorder',
      tutorAuthHeader,
      {
        items: [
          { id: material2Id, order_index: 1 },
          { id: material1Id, order_index: 2 },
        ],
      }
    );
    assert.strictEqual(reorderRes.status, 200);

    const sectionMaterialsRes = await makeRequest('GET', `/api/materials/section/${section.id}`, tutorAuthHeader);
    assert.strictEqual(sectionMaterialsRes.status, 200);
    assert.strictEqual(sectionMaterialsRes.body.data[0].id, material2Id);
    assert.strictEqual(sectionMaterialsRes.body.data[1].id, material1Id);
    console.log('  ✔ Reorder materials verified.');

    // 8g. Delete material with automatic file cleanup
    const deleteMatRes = await makeRequest('DELETE', `/api/materials/${material1Id}`, tutorAuthHeader);
    assert.strictEqual(deleteMatRes.status, 200);

    const checkMat1DiskPath = path.join(__dirname, '..', 'public', material1FileUrl.replace(/^\//, ''));
    assert.strictEqual(fs.existsSync(checkMat1DiskPath), false);
    console.log('  ✔ Material deletion and automatic disk cleanup verified.');

    // 9. Clean up remaining test files
    await deleteStoredFile(thumbUploadRes.body.data.relativeUrl);
    await deleteStoredFile(videoUploadRes.body.data.relativeUrl);
    await deleteStoredFile(pptUploadRes.body.data.relativeUrl);
    await deleteStoredFile(pdfUploadRes.body.data.relativeUrl);
    await deleteStoredFile(docUploadRes.body.data.relativeUrl);
    await deleteStoredFile(epubUploadRes.body.data.relativeUrl);
    await deleteStoredFile(material2FileUrl);

    // 10. Path traversal security check
    try {
      await deleteStoredFile('../../../etc/passwd');
      assert.fail('Should reject path traversal');
    } catch (err) {
      assert.ok(err.message.includes('Akses file ditolak'));
      console.log('  ✔ Path traversal attack prevented on deleteStoredFile.');
    }

    console.log('\n======================================================');
    console.log('🎉 ALL MEDIA STORAGE & SPRINT 2 TESTS PASSED SUCCESSFULLY!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Media Storage Test Failed:', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
  }
}

if (require.main === module) {
  runMediaStorageTests();
}

module.exports = runMediaStorageTests;
