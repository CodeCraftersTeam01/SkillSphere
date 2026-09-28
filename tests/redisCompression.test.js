const assert = require('assert');
const { getCache, setCache, deleteCache, isRedisConnected } = require('../config/redis');
const express = require('express');
const compressionMiddleware = require('../middleware/compression');
const { cacheMiddleware } = require('../middleware/cache');
const http = require('http');
const zlib = require('zlib');

async function runTests() {
  console.log('🧪 Starting Redis & Gzip Compression Test Suite...\n');

  // Test 1: Redis / Memory Cache Set & Get
  console.log('Test 1: Testing Cache Set, Get, and Expiry...');
  const testKey = 'test:skillsphere:unit_test_key';
  const testData = { id: 101, title: 'Machine Learning Masterclass', timestamp: Date.now() };

  await setCache(testKey, testData, 60);
  const retrieved = await getCache(testKey);
  assert.deepStrictEqual(retrieved, testData, 'Retrieved cache data must match original stored object');
  console.log('  ✅ Cache SET and GET succeeded.');

  // Test 2: Cache Delete
  console.log('Test 2: Testing Cache Deletion...');
  await deleteCache(testKey);
  const afterDelete = await getCache(testKey);
  assert.strictEqual(afterDelete, null, 'Deleted cache key must return null');
  console.log('  ✅ Cache DELETE succeeded.');

  // Test 3: Gzip Compression & Cache Middleware Integration on Express Server
  console.log('Test 3: Testing Express App with Gzip Compression & Cache Middleware...');
  const app = express();
  app.use(compressionMiddleware);

  let fetchCounter = 0;
  app.get('/api/test-data', cacheMiddleware(60), (req, res) => {
    fetchCounter++;
    // Generate large response (>1KB) so compression threshold triggers
    const payload = {
      success: true,
      message: 'Hello from SkillSphere AI API',
      fetchCount: fetchCounter,
      data: Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `Course Module Item #${i + 1} with extensive metadata for compression testing.`,
        tags: ['technology', 'ai', 'education', 'backend', 'performance'],
      })),
    };
    res.json(payload);
  });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    // Request 1: Cache MISS + Gzip Check
    const res1 = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: port,
        path: '/api/test-data',
        method: 'GET',
        headers: {
          'Accept-Encoding': 'gzip',
        },
      }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            rawBody: buffer,
          });
        });
      });
      req.on('error', reject);
      req.end();
    });

    assert.strictEqual(res1.statusCode, 200, 'HTTP Status must be 200');
    assert.strictEqual(res1.headers['content-encoding'], 'gzip', 'Response must be encoded with gzip');
    assert.strictEqual(res1.headers['x-cache'], 'MISS', 'First request must result in X-Cache: MISS');

    const decompressed1 = JSON.parse(zlib.gunzipSync(res1.rawBody).toString('utf-8'));
    assert.strictEqual(decompressed1.fetchCount, 1, 'First request counter must be 1');
    console.log('  ✅ Gzip compression verified (Content-Encoding: gzip) on first request.');
    console.log('  ✅ Cache MISS header verified (X-Cache: MISS).');

    // Request 2: Cache HIT
    const res2 = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: port,
        path: '/api/test-data',
        method: 'GET',
        headers: {
          'Accept-Encoding': 'gzip',
        },
      }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            rawBody: buffer,
          });
        });
      });
      req.on('error', reject);
      req.end();
    });

    assert.strictEqual(res2.statusCode, 200);
    assert.strictEqual(res2.headers['content-encoding'], 'gzip');
    assert.strictEqual(res2.headers['x-cache'], 'HIT', 'Second request must result in X-Cache: HIT');

    const decompressed2 = JSON.parse(zlib.gunzipSync(res2.rawBody).toString('utf-8'));
    assert.strictEqual(decompressed2.fetchCount, 1, 'Cached response must retain original payload without re-executing handler');
    console.log('  ✅ Cache HIT header verified (X-Cache: HIT) with fast response.');

  } finally {
    server.close();
  }

  // Cleanup test key
  await deleteCache('cache:/api/test-data:{}');

  console.log('\n🎉 ALL REDIS & GZIP COMPRESSION TESTS PASSED SUCCESSFULLY!\n');
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });
