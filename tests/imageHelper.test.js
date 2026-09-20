const assert = require('assert');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { processAndConvertToWebP } = require('../utils/imageHelper');

async function runImageHelperTests() {
  console.log('🧪 Starting Image Helper & WebP Compression Unit Tests...\n');

  try {
    // 1. Create a dummy test PNG image buffer using sharp
    const testPngBuffer = await sharp({
      create: {
        width: 1200,
        height: 800,
        channels: 4,
        background: { r: 59, g: 130, b: 246, alpha: 1 },
      }
    })
    .png()
    .toBuffer();

    assert.ok(testPngBuffer.length > 0, 'Test PNG buffer should be created');
    console.log(`  ✔ Created mock certificate PNG buffer (${Math.round(testPngBuffer.length / 1024)} KB)`);

    // 2. Test buffer conversion to WebP
    const resultFromBuffer = await processAndConvertToWebP(testPngBuffer, 'certificates', { quality: 80 });
    assert.ok(resultFromBuffer.relativeUrl.startsWith('/uploads/certificates/'), 'Should return relative uploads URL');
    assert.ok(resultFromBuffer.relativeUrl.endsWith('.webp'), 'File should have .webp extension');
    assert.ok(fs.existsSync(resultFromBuffer.fullPath), 'WebP file should exist on disk');

    const webpMetadata = await sharp(resultFromBuffer.fullPath).metadata();
    assert.strictEqual(webpMetadata.format, 'webp', 'Sharp metadata format must be webp');
    console.log(`  ✔ Buffer successfully converted & compressed to WebP: ${resultFromBuffer.relativeUrl} (${Math.round(resultFromBuffer.compressedSize / 1024)} KB, saved ${resultFromBuffer.savingsPercent})`);

    // Clean up buffer test artifact
    if (fs.existsSync(resultFromBuffer.fullPath)) {
      fs.unlinkSync(resultFromBuffer.fullPath);
    }

    // 3. Test Base64 Data URL conversion to WebP
    const base64DataUrl = `data:image/png;base64,${testPngBuffer.toString('base64')}`;
    const resultFromBase64 = await processAndConvertToWebP(base64DataUrl, 'certificates', { quality: 82 });
    assert.ok(resultFromBase64.relativeUrl.endsWith('.webp'), 'Base64 converted output must end with .webp');
    assert.ok(fs.existsSync(resultFromBase64.fullPath), 'Base64 converted WebP file should exist on disk');

    const base64WebpMeta = await sharp(resultFromBase64.fullPath).metadata();
    assert.strictEqual(base64WebpMeta.format, 'webp', 'Base64 output format must be webp');
    console.log(`  ✔ Base64 Data URL successfully converted to WebP: ${resultFromBase64.relativeUrl}`);

    // Clean up base64 test artifact
    if (fs.existsSync(resultFromBase64.fullPath)) {
      fs.unlinkSync(resultFromBase64.fullPath);
    }

    console.log('\n======================================================');
    console.log('🎉 ALL IMAGE HELPER & WEBP TESTS PASSED SUCCESSFULLY!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Image Helper Test Failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  runImageHelperTests();
}

module.exports = runImageHelperTests;
