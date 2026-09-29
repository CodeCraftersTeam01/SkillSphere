const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');

const app = require('../app');
const {
  sequelize,
  User,
  UserProfile,
  AICareerRoadmap,
  Course,
  CourseSection,
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

async function runAiGeminiIntegrationTests() {
  console.log('🧪 Starting AI Gemini Integration Test Suite (Sprint 2 - Tegar)...\n');

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

    // 1. Setup Student User for AI testing
    const [studentUser] = await User.findOrCreate({
      where: { email: 'student_ai_test@skillsphere.id' },
      defaults: {
        name: 'AI Test Student',
        email: 'student_ai_test@skillsphere.id',
        password: 'hashedpassword',
        role: 'student',
        is_verified: true,
      },
    });

    await UserProfile.findOrCreate({
      where: { user_id: studentUser.id },
      defaults: {
        user_id: studentUser.id,
        full_name: 'AI Test Student',
        career_goal: 'Cloud & AI Backend Engineer',
        study_preferences: {
          topics: ['Node.js', 'PostgreSQL', 'Gemini AI', 'Docker'],
          education_status: 'Sarjana Teknik Informatika',
          weekly_commitment: '10 jam/minggu',
        },
      },
    });

    const token = jwt.sign(
      { id: studentUser.id, email: studentUser.email, role: 'student' },
      jwtSecret,
      { expiresIn: '1h' }
    );
    const authHeaders = { Authorization: `Bearer ${token}` };

    // 2. Test POST /api/ai/career-roadmap/generate
    const genRoadmapRes = await makeRequest('POST', '/api/ai/career-roadmap/generate', authHeaders, {
      target_role: 'Senior Backend & AI Architect',
      force_refresh: true,
    });
    assert.strictEqual(genRoadmapRes.status, 201);
    assert.strictEqual(genRoadmapRes.body.success, true);
    assert.strictEqual(genRoadmapRes.body.data.target_role, 'Senior Backend & AI Architect');
    assert.ok(Array.isArray(genRoadmapRes.body.data.recommended_skills));
    assert.ok(Array.isArray(genRoadmapRes.body.data.roadmap_data.milestones));
    assert.ok(genRoadmapRes.body.data.roadmap_data.milestones.length >= 3);
    console.log(`  ✔ POST /api/ai/career-roadmap/generate: Generated AI Roadmap with ${genRoadmapRes.body.data.roadmap_data.milestones.length} milestones & saved to DB.`);

    // 3. Test GET /api/ai/career-roadmap/my-roadmap
    const getRoadmapRes = await makeRequest('GET', '/api/ai/career-roadmap/my-roadmap', authHeaders);
    assert.strictEqual(getRoadmapRes.status, 200);
    assert.strictEqual(getRoadmapRes.body.success, true);
    assert.strictEqual(getRoadmapRes.body.data.target_role, 'Senior Backend & AI Architect');
    console.log('  ✔ GET /api/ai/career-roadmap/my-roadmap: Successfully loaded active AI roadmap from DB.');

    // 4. Test PATCH /api/ai/career-roadmap/milestone/:step
    const updateMilestoneRes = await makeRequest('PATCH', '/api/ai/career-roadmap/milestone/1', authHeaders, {
      status: 'completed',
    });
    assert.strictEqual(updateMilestoneRes.status, 200);
    assert.strictEqual(updateMilestoneRes.body.success, true);
    const step1 = updateMilestoneRes.body.data.roadmap_data.milestones.find((m) => m.step === 1);
    assert.strictEqual(step1.status, 'completed');
    console.log('  ✔ PATCH /api/ai/career-roadmap/milestone/:step: Updated milestone #1 status to "completed".');

    // 5. Test POST /api/ai/study-assistant/chat
    const chatRes = await makeRequest('POST', '/api/ai/study-assistant/chat', authHeaders, {
      message: 'Bagaimana cara kerja mekanisme split payment 20%/80% di platform ini?',
      conversation_history: [],
    });
    assert.strictEqual(chatRes.status, 200);
    assert.strictEqual(chatRes.body.success, true);
    assert.ok(chatRes.body.data.message);
    assert.ok(chatRes.body.data.message.length > 20);
    console.log('  ✔ POST /api/ai/study-assistant/chat: Received pedagogic response from AI Study Assistant.');

    // 6. Test POST /api/ai/quiz/generate
    const quizRes = await makeRequest('POST', '/api/ai/quiz/generate', authHeaders, {
      topic: 'Database Relasional & Sequelize ORM',
      number_of_questions: 2,
      difficulty: 'medium',
    });
    assert.strictEqual(quizRes.status, 200);
    assert.strictEqual(quizRes.body.success, true);
    assert.ok(Array.isArray(quizRes.body.data.questions));
    assert.ok(quizRes.body.data.questions.length >= 1);
    assert.ok(quizRes.body.data.questions[0].options.length === 4);
    console.log(`  ✔ POST /api/ai/quiz/generate: Generated ${quizRes.body.data.questions.length} multiple-choice quiz questions with explanations.`);

    // 7. Test POST /api/ai/material/explain
    const explainRes = await makeRequest('POST', '/api/ai/material/explain', authHeaders, {
      material_title: 'Arsitektur JWT Authentication dan Token Rotation',
      material_content: 'Materi mengenai implementasi Access Token 24 jam dan Refresh Token 7 hari.',
      target_level: 'intermediate',
    });
    assert.strictEqual(explainRes.status, 200);
    assert.strictEqual(explainRes.body.success, true);
    assert.ok(explainRes.body.data.summary);
    assert.ok(explainRes.body.data.analogy);
    assert.ok(Array.isArray(explainRes.body.data.key_takeaways));
    console.log('  ✔ POST /api/ai/material/explain: Generated AI summary, analogy, and study key takeaways.');

    console.log('\n======================================================');
    console.log('🎉 ALL AI GEMINI INTEGRATION TESTS PASSED (SPRINT 2 - TEGAR)!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ AI Gemini Integration Test Failed:', err);
    process.exit(1);
  } finally {
    if (server) server.close();
  }
}

if (require.main === module) {
  runAiGeminiIntegrationTests()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runAiGeminiIntegrationTests;
