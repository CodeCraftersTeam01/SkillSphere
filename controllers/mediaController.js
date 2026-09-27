const path = require('path');
const fs = require('fs');
const {
  processThumbnail,
  deleteStoredFile,
  streamMediaFile,
  getFileMetadata,
  UPLOADS_ROOT,
} = require('../utils/mediaStorage');
const { Course, CourseMaterial } = require('../models');

async function uploadThumbnail(req, res) {
  try {
    if (!req.file && !req.body.image_base64) {
      return res.status(400).json({
        success: false,
        message: 'File gambar thumbnail atau data Base64 wajib diunggah.',
      });
    }

    const input = req.file ? req.file.buffer : req.body.image_base64;
    const quality = req.body.quality ? parseInt(req.body.quality, 10) : 85;
    const maxWidth = req.body.max_width ? parseInt(req.body.max_width, 10) : 1280;
    const maxHeight = req.body.max_height ? parseInt(req.body.max_height, 10) : 720;

    const result = await processThumbnail(input, {
      quality,
      maxWidth,
      maxHeight,
      subfolder: 'courses/thumbnails',
    });

    if (req.body.course_id) {
      const course = await Course.findByPk(req.body.course_id);
      if (course) {
        if (req.user.role !== 'admin' && course.tutor_id !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'Anda tidak memiliki hak akses untuk mengubah kursus ini.',
          });
        }
        if (course.thumbnail_url) {
          await deleteStoredFile(course.thumbnail_url).catch(() => {});
        }
        await course.update({ thumbnail_url: result.relativeUrl });
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Thumbnail berhasil diunggah dan dioptimasi ke format WebP.',
      data: result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Gagal memproses thumbnail.',
    });
  }
}

async function uploadMaterial(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File materi wajib diunggah.',
      });
    }

    const file = req.file;
    const category = req.detectedCategory || req.uploadCategory || 'general';
    const relativeUrl = `/uploads/${category === 'general' ? 'general' : getCategorySubfolder(category)}/${file.filename}`;

    const metadata = {
      filename: file.filename,
      originalName: file.originalname,
      contentType: mapCategoryToContentType(category),
      detectedCategory: category,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      sizeMB: (file.size / (1024 * 1024)).toFixed(2),
      relativeUrl,
      fullPath: file.path,
    };

    return res.status(201).json({
      success: true,
      message: 'File materi berhasil diunggah.',
      data: metadata,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Gagal mengunggah file materi.',
    });
  }
}

async function uploadGeneral(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File wajib diunggah.',
      });
    }

    const file = req.file;
    const relativeUrl = `/uploads/general/${file.filename}`;

    return res.status(201).json({
      success: true,
      message: 'File berhasil diunggah.',
      data: {
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        sizeMB: (file.size / (1024 * 1024)).toFixed(2),
        relativeUrl,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Gagal mengunggah file.',
    });
  }
}

async function deleteMedia(req, res) {
  try {
    const fileUrl = req.body.file_url || req.query.file_url;
    if (!fileUrl) {
      return res.status(400).json({
        success: false,
        message: 'Parameter file_url wajib disertakan.',
      });
    }

    const deleted = await deleteStoredFile(fileUrl);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'File tidak ditemukan atau sudah dihapus.',
      });
    }

    return res.json({
      success: true,
      message: 'File media berhasil dihapus dari server.',
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Gagal menghapus file media.',
    });
  }
}

async function streamMedia(req, res) {
  try {
    const { type, filename } = req.params;
    if (!type || !filename) {
      return res.status(400).json({
        success: false,
        message: 'Parameter tipe dan nama file wajib disertakan.',
      });
    }

    const sanitizedFilename = path.basename(filename);
    const subfolder = getCategorySubfolder(type);
    const fullPath = path.join(UPLOADS_ROOT, subfolder, sanitizedFilename);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        message: 'File media tidak ditemukan.',
      });
    }

    const ext = path.extname(sanitizedFilename).toLowerCase();
    const mimeByExt = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mkv': 'video/x-matroska',
      '.mov': 'video/quicktime',
      '.pdf': 'application/pdf',
      '.epub': 'application/epub+zip',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.webp': 'image/webp',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
    };

    const mimeType = mimeByExt[ext] || 'application/octet-stream';
    streamMediaFile(req, res, fullPath, mimeType);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Gagal melakukan streaming media.',
    });
  }
}

async function getMediaInfo(req, res) {
  try {
    const fileUrl = req.query.file_url;
    if (!fileUrl) {
      return res.status(400).json({
        success: false,
        message: 'Parameter file_url wajib disertakan.',
      });
    }

    const cleanRelative = fileUrl.replace(/^\/+/g, '');
    const absolutePath = path.join(__dirname, '..', 'public', cleanRelative);

    const metadata = getFileMetadata(absolutePath);
    if (!metadata) {
      return res.status(404).json({
        success: false,
        message: 'File media tidak ditemukan.',
      });
    }

    return res.json({
      success: true,
      data: metadata,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Gagal mengambil informasi metadata media.',
    });
  }
}

function getCategorySubfolder(category) {
  const map = {
    video: 'materials/videos',
    videos: 'materials/videos',
    ppt: 'materials/slides',
    slides: 'materials/slides',
    pdf: 'materials/documents',
    doc: 'materials/documents',
    docs: 'materials/documents',
    documents: 'materials/documents',
    book: 'materials/books',
    books: 'materials/books',
    thumbnail: 'courses/thumbnails',
    thumbnails: 'courses/thumbnails',
    general: 'general',
  };
  return map[category] || category;
}

function mapCategoryToContentType(category) {
  const map = {
    video: 'video',
    ppt: 'ppt',
    pdf: 'pdf',
    doc: 'doc',
    book: 'book',
  };
  return map[category] || 'doc';
}

module.exports = {
  uploadThumbnail,
  uploadMaterial,
  uploadGeneral,
  deleteMedia,
  streamMedia,
  getMediaInfo,
};
