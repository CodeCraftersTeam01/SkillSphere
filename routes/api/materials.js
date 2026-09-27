const express = require('express');
const router = express.Router();
const courseMaterialController = require('../../controllers/courseMaterialController');
const { authenticateJWT, authorizeRoles } = require('../../middleware/auth');
const { materialUploader } = require('../../utils/mediaStorage');

// Optional auth middleware for viewing materials (so preview is viewable publicly or enrolled users get unlocked)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next();
  }
  return authenticateJWT(req, res, next);
};

router.get('/section/:sectionId', optionalAuth, courseMaterialController.getMaterialsBySection);
router.get('/:id', optionalAuth, courseMaterialController.getMaterialById);

router.post(
  '/',
  authenticateJWT,
  authorizeRoles('tutor', 'admin'),
  materialUploader.single('file'),
  courseMaterialController.createMaterial
);

router.put(
  '/:id',
  authenticateJWT,
  authorizeRoles('tutor', 'admin'),
  materialUploader.single('file'),
  courseMaterialController.updateMaterial
);

router.delete(
  '/:id',
  authenticateJWT,
  authorizeRoles('tutor', 'admin'),
  courseMaterialController.deleteMaterial
);

router.patch(
  '/reorder',
  authenticateJWT,
  authorizeRoles('tutor', 'admin'),
  courseMaterialController.reorderMaterials
);

module.exports = router;
