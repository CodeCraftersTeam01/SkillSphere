const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

// Configure upload root directory under public/uploads
const UPLOADS_ROOT = path.join(__dirname, '..', 'public', 'uploads');

/**
 * Ensure directory exists
 */
function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Multer memory storage for direct buffer processing with sharp
 */
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/tiff',
    'image/bmp',
  ];

  if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('Format file tidak didukung. Harap unggah gambar (JPG, PNG, WEBP).'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter,
});

/**
 * Process, optimize & compress image buffer or base64 into ultra-lightweight WebP format
 * @param {Buffer|string} input - Buffer or Base64 Data URL
 * @param {string} subfolder - target subdirectory within public/uploads (e.g. 'certificates', 'avatars')
 * @param {object} options - sharp options (quality, maxWidth, maxHeight)
 * @returns {Promise<{ relativeUrl: string, filename: string, originalSize: number, compressedSize: number, savingsPercent: string }>}
 */
async function processAndConvertToWebP(input, subfolder = 'certificates', options = {}) {
  const {
    quality = 82,
    maxWidth = 2000,
    maxHeight = 2000,
  } = options;

  let buffer;
  let originalSize = 0;

  if (Buffer.isBuffer(input)) {
    buffer = input;
    originalSize = buffer.length;
  } else if (typeof input === 'string') {
    // Check if base64 data uri: e.g. "data:image/png;base64,iVBORw0KG..."
    const base64Data = input.replace(/^data:image\/\w+;base64,/, '');
    buffer = Buffer.from(base64Data, 'base64');
    originalSize = buffer.length;
  } else {
    throw new Error('Input gambar tidak valid (harus berupa Buffer atau Base64 string).');
  }

  const targetDir = path.join(UPLOADS_ROOT, subfolder);
  ensureDirExists(targetDir);

  const uniqueId = crypto.randomBytes(6).toString('hex');
  const filename = `${subfolder}_${Date.now()}_${uniqueId}.webp`;
  const destinationPath = path.join(targetDir, filename);

  // Process image with Sharp
  // 1. auto rotate based on EXIF (crucial for smartphone photo uploads)
  // 2. resize inside max bounds without upscaling
  // 3. compress to WebP with modern compression parameters
  const processedBuffer = await sharp(buffer)
    .rotate()
    .resize({
      width: maxWidth,
      height: maxHeight,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({
      quality,
      effort: 4, // higher effort = better compression ratio at same quality
    })
    .toBuffer();

  await fs.promises.writeFile(destinationPath, processedBuffer);

  const compressedSize = processedBuffer.length;
  const savingsPercent = originalSize > 0 
    ? (((originalSize - compressedSize) / originalSize) * 100).toFixed(1) + '%'
    : '0%';

  return {
    relativeUrl: `/uploads/${subfolder}/${filename}`,
    fullPath: destinationPath,
    filename,
    originalSize,
    compressedSize,
    savingsPercent,
  };
}

module.exports = {
  upload,
  processAndConvertToWebP,
};
