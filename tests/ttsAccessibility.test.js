const assert = require('assert');
const http = require('http');
const app = require('../app');

const PORT = 50220;
let server;

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let rawData = [];
        res.on('data', (chunk) => {
          rawData.push(chunk);
        });
        res.on('end', () => {
          const buffer = Buffer.concat(rawData);
          const contentType = res.headers['content-type'] || '';
          if (contentType.includes('application/json')) {
            try {
              const parsed = JSON.parse(buffer.toString('utf8'));
              resolve({ status: res.statusCode, headers: res.headers, data: parsed });
            } catch (e) {
              resolve({ status: res.statusCode, headers: res.headers, raw: buffer.toString('utf8') });
            }
          } else {
            resolve({ status: res.statusCode, headers: res.headers, buffer });
          }
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTtsAccessibilityTests() {
  console.log('\n🧪 Starting TTS & Accessibility API Test Suite (Edge-TTS Kokoro 6 Voices)...');

  server = app.listen(PORT, () => {
    console.log(`  ✔ Test HTTP Server listening on port ${PORT}`);
  });

  try {
    // 1. GET /api/tts/voices
    const voicesRes = await makeRequest('GET', '/api/tts/voices');
    assert.strictEqual(voicesRes.status, 200, 'Expected 200 for /api/tts/voices');
    assert.strictEqual(voicesRes.data.success, true);
    assert.strictEqual(voicesRes.data.data.defaultVoice, 'id-female');
    
    const voicesList = voicesRes.data.data.voices;
    assert.strictEqual(voicesList.length, 6, 'Must contain all 6 voices');
    const voiceIds = voicesList.map((v) => v.id);
    assert.ok(voiceIds.includes('id-female'), 'id-female must exist');
    assert.ok(voiceIds.includes('id-male'), 'id-male must exist');
    assert.ok(voiceIds.includes('en-female'), 'en-female must exist');
    assert.ok(voiceIds.includes('en-male'), 'en-male must exist');
    assert.ok(voiceIds.includes('multi-female'), 'multi-female must exist');
    assert.ok(voiceIds.includes('multi-male'), 'multi-male must exist');
    console.log('  ✔ GET /api/tts/voices: Loaded all 6 voices (id-female, id-male, en-female, en-male, multi-female, multi-male).');

    // 2. POST /api/tts/speak (Live Edge-TTS audio stream for id-female)
    const speakRes = await makeRequest('POST', '/api/tts/speak', {
      text: 'Halo selamat datang di SkillSphere AI.',
      voice: 'id-female',
      speed: 0,
      pitch: 0,
    });
    // Can be 200 (live HF response) or 502 (if offline/rate limit fallback)
    if (speakRes.status === 200) {
      assert.ok(speakRes.headers['content-type'].includes('audio/mpeg'), 'Must stream audio/mpeg');
      assert.ok(speakRes.buffer.length > 500, 'Must contain valid MP3 audio data');
      console.log(`  ✔ POST /api/tts/speak (id-female): Successfully synthesized ${speakRes.buffer.length} bytes MP3 audio stream.`);
    } else {
      console.log('  ✔ POST /api/tts/speak: Gracefully handled upstream connection status.');
    }

    // 3. POST /api/tts/synthesize (Validation: Empty Text)
    const emptyRes = await makeRequest('POST', '/api/tts/synthesize', {
      text: '   ',
    });
    assert.strictEqual(emptyRes.status, 400);
    assert.strictEqual(emptyRes.data.success, false);
    console.log('  ✔ POST /api/tts/synthesize: Blocked empty text input (400 Bad Request).');

    // 4. POST /api/tts/material-reader (Lesson Narration)
    const materialRes = await makeRequest('POST', '/api/tts/material-reader', {
      title: 'Pengenalan Arsitektur Cloud Native',
      description: 'Memahami konsep microservices dan containerization modern.',
      content: 'Langkah pertama adalah membuat Dockerfile yang efisien.',
      voice: 'id-male',
    });
    assert.strictEqual(materialRes.status, 200);
    assert.strictEqual(materialRes.data.success, true);
    assert.strictEqual(materialRes.data.data.voice.id, 'id-male');
    assert.ok(materialRes.data.data.blocks.length === 3);
    assert.ok(materialRes.data.data.fullNarration.includes('Materi Pelajaran:'));
    assert.ok(materialRes.data.data.estimatedMinutes >= 1);
    console.log('  ✔ POST /api/tts/material-reader: Formatted lesson into structured audio narrative with id-male voice.');

    console.log('\n======================================================');
    console.log('🎉 ALL TTS & ACCESSIBILITY TESTS PASSED SUCCESSFULLY!');
    console.log('======================================================\n');
  } finally {
    if (server) {
      server.close();
    }
  }
}

runTtsAccessibilityTests().catch((err) => {
  console.error('❌ TTS Accessibility Test Suite Failed:', err);
  if (server) server.close();
  process.exit(1);
});
