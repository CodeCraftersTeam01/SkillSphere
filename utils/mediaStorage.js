const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const sharp = require('sharp');

const UPLOADS_ROOT = path.join(__dirname, '..', 'public', 'uploads');

const MEDIA_CATEGORIES = {
  thumbnail: {
    dir: 'courses/thumbnails',
    maxSize: 10 * 1024 * 1024,
    allowedMime: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'],
    allowedExt: ['.jpg', '.jpeg', '.png', '.webp', '.svg'],
  },
  video: {
    dir: 'materials/videos',
    maxSize: 500 * 1024 * 1024,
    allowedMime: [
      'video/mp4',
      'video/webm',
      'video/x-matroska',
      'video/quicktime',
      'video/x-msvideo',
      'video/ogg',
    ],
    allowedExt: ['.mp4', '.webm', '.mkv', '.mov', '.avi', '.ogv'],
  },
  ppt: {
    dir: 'materials/slides',
    maxSize: 50 * 1024 * 1024,
    allowedMime: [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.oasis.opendocument.presentation',
    ],
    allowedExt: ['.ppt', '.pptx', '.odp'],
  },
  pdf: {
    dir: 'materials/documents',
    maxSize: 50 * 1024 * 1024,
    allowedMime: ['application/pdf'],
    allowedExt: ['.pdf'],
  },
  doc: {
    dir: 'materials/documents',
    maxSize: 50 * 1024 * 1024,
    allowedMime: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.oasis.opendocument.text',
      'text/plain',
    ],
    allowedExt: ['.doc', '.docx', '.odt', '.txt'],
  },
  book: {
    dir: 'materials/books',
    maxSize: 100 * 1024 * 1024,
    allowedMime: [
      'application/epub+zip',
      'application/pdf',
      'application/x-mobipocket-ebook',
      'application/vnd.amazon.ebook',
      'application/octet-stream',
    ],
    allowedExt: ['.epub', '.pdf', '.mobi', '.azw3'],
  },
  general: {
    dir: 'general',
    maxSize: 20 * 1024 * 1024,
    allowedMime: ['*/*'],
    allowedExt: [],
  },
};

function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function sanitizeBaseName(originalName) {
  const parsed = path.parse(originalName);
  return parsed.name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
}

function resolveUploadDir(category) {
  const conf = MEDIA_CATEGORIES[category] || MEDIA_CATEGORIES.general;
  const targetDir = path.join(UPLOADS_ROOT, conf.dir);
  ensureDirExists(targetDir);
  return { targetDir, relativeDir: `/uploads/${conf.dir}` };
}

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = req.uploadCategory || 'general';
    const { targetDir } = resolveUploadDir(category);
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const category = req.uploadCategory || 'general';
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanName = sanitizeBaseName(file.originalname);
    const uniqueSuffix = crypto.randomBytes(6).toString('hex');
    const filename = `${category}_${Date.now()}_${uniqueSuffix}_${cleanName}${ext}`;
    cb(null, filename);
  },
});

function createMulterUploader(category, options = {}) {
  const conf = MEDIA_CATEGORIES[category] || MEDIA_CATEGORIES.general;
  const useMemory = options.useMemory || false;

  const storage = useMemory ? multer.memoryStorage() : diskStorage;

  const fileFilter = (req, file, cb) => {
    req.uploadCategory = category;
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();

    if (category === 'general') {
      return cb(null, true);
    }

    const mimeAllowed = conf.allowedMime.includes(mime) || conf.allowedMime.includes('*/*');
    const extAllowed = conf.allowedExt.includes(ext);

    if (!mimeAllowed && !extAllowed) {
      const err = new Error(
        `Format file tidak didukung untuk tipe ${category}. Format yang diperbolehkan: ${conf.allowedExt.join(', ')}`
      );
      err.code = 'INVALID_FILE_TYPE';
      return cb(err, false);
    }

    cb(null, true);
  };

  return multer({
    storage,
    limits: {
      fileSize: conf.maxSize,
    },
    fileFilter,
  });
}

const multiFormatFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  let detectedCategory = null;
  for (const [catName, conf] of Object.entries(MEDIA_CATEGORIES)) {
    if (catName === 'general') continue;
    if (conf.allowedMime.includes(mime) || conf.allowedExt.includes(ext)) {
      detectedCategory = catName;
      break;
    }
  }

  req.detectedCategory = detectedCategory || 'general';
  req.uploadCategory = req.detectedCategory;
  cb(null, true);
};

const materialUploader = multer({
  storage: diskStorage,
  limits: {
    fileSize: 500 * 1024 * 1024,
  },
  fileFilter: multiFormatFilter,
});

async function processThumbnail(input, options = {}) {
  const {
    quality = 85,
    maxWidth = 1280,
    maxHeight = 720,
    subfolder = 'courses/thumbnails',
  } = options;

  let buffer;
  let originalSize = 0;

  if (Buffer.isBuffer(input)) {
    buffer = input;
    originalSize = buffer.length;
  } else if (typeof input === 'string') {
    const base64Data = input.replace(/^data:image\/\w+;base64,/, '');
    buffer = Buffer.from(base64Data, 'base64');
    originalSize = buffer.length;
  } else {
    throw new Error('Input thumbnail harus berupa Buffer atau Base64 string.');
  }

  const targetDir = path.join(UPLOADS_ROOT, subfolder);
  ensureDirExists(targetDir);

  const uniqueId = crypto.randomBytes(6).toString('hex');
  const filename = `thumb_${Date.now()}_${uniqueId}.webp`;
  const destinationPath = path.join(targetDir, filename);

  const processedBuffer = await sharp(buffer)
    .rotate()
    .resize({
      width: maxWidth,
      height: maxHeight,
      fit: 'cover',
      withoutEnlargement: true,
    })
    .webp({
      quality,
      effort: 4,
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
    mimeType: 'image/webp',
    width: maxWidth,
    height: maxHeight,
  };
}

async function deleteStoredFile(relativeOrFullPath) {
  if (!relativeOrFullPath) return false;

  const normalizedUploadsRoot = path.resolve(UPLOADS_ROOT);
  let absolutePath;

  if (typeof relativeOrFullPath === 'string' && relativeOrFullPath.startsWith(normalizedUploadsRoot)) {
    absolutePath = path.resolve(relativeOrFullPath);
  } else {
    // Treat as web relative path (/uploads/...) or relative to public directory
    const cleanRelative = relativeOrFullPath.replace(/^\/+/g, '');
    absolutePath = path.resolve(path.join(__dirname, '..', 'public', cleanRelative));
  }

  // Prevent directory traversal outside uploads directory
  if (!absolutePath.startsWith(normalizedUploadsRoot)) {
    throw new Error('Akses file ditolak: path berada di luar direktori upload.');
  }

  if (fs.existsSync(absolutePath)) {
    await fs.promises.unlink(absolutePath);
    return true;
  }
  return false;
}

function streamMediaFile(req, res, filePath, mimeType = 'video/mp4') {
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      message: 'File media tidak ditemukan di server.',
    });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize) {
      res.status(416).header('Content-Range', `bytes */${fileSize}`).end();
      return;
    }

    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': mimeType,
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
}

function getFileMetadata(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const stat = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();

  let detectedType = 'general';
  for (const [key, conf] of Object.entries(MEDIA_CATEGORIES)) {
    if (conf.allowedExt.includes(ext)) {
      detectedType = key;
      break;
    }
  }

  return {
    filename: path.basename(filePath),
    extension: ext,
    sizeBytes: stat.size,
    sizeMB: (stat.size / (1024 * 1024)).toFixed(2),
    detectedType,
    createdAt: stat.birthtime,
    modifiedAt: stat.mtime,
  };
}

module.exports = {
  UPLOADS_ROOT,
  MEDIA_CATEGORIES,
  createMulterUploader,
  materialUploader,
  processThumbnail,
  deleteStoredFile,
  streamMediaFile,
  getFileMetadata,
  resolveUploadDir,
  ensureDirExists,
};
