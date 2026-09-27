const express = require('express');
const router = express.Router();
const mediaController = require('../../controllers/mediaController');
const { authenticateJWT, authorizeRoles } = require('../../middleware/auth');
const {
  createMulterUploader,
  materialUploader,
} = require('../../utils/mediaStorage');

const thumbnailUploader = createMulterUploader('thumbnail', { useMemory: true });
const generalUploader = createMulterUploader('general', { useMemory: false });

router.post(
  '/upload/thumbnail',
  authenticateJWT,
  authorizeRoles('tutor', 'admin'),
  thumbnailUploader.single('thumbnail'),
  mediaController.uploadThumbnail
);

router.post(
  '/upload/material',
  authenticateJWT,
  authorizeRoles('tutor', 'admin'),
  materialUploader.single('file'),
  mediaController.uploadMaterial
);

router.post(
  '/upload/general',
  authenticateJWT,
  generalUploader.single('file'),
  mediaController.uploadGeneral
);

router.delete(
  '/file',
  authenticateJWT,
  authorizeRoles('tutor', 'admin'),
  mediaController.deleteMedia
);

router.get('/stream/:type/:filename', mediaController.streamMedia);

router.get('/info', mediaController.getMediaInfo);

module.exports = router;
