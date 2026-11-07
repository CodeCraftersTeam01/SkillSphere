const express = require('express');
const router = express.Router();
const milestoneController = require('../../controllers/milestoneController');
const { authenticateJWT, authorizeRoles } = require('../../middleware/auth');

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next();
  }
  return authenticateJWT(req, res, next);
};

// 1. Ambil daftar milestone kursus
router.get('/course/:course_id', optionalAuth, milestoneController.getCourseMilestones);

// 2. Ambil daftar voucher diskon yang diperoleh siswa
router.get('/my-discounts', authenticateJWT, milestoneController.getStudentDiscounts);

// 3. Validasi kode voucher diskon saat checkout
router.post('/validate-discount', authenticateJWT, milestoneController.validateDiscountCode);

// 4. Tutor / Admin membuat atau memperbarui target milestone
router.post(
  '/course/:course_id',
  authenticateJWT,
  authorizeRoles('tutor', 'admin'),
  milestoneController.createOrUpdateMilestone
);

// 5. Siswa mengklaim voucher reward milestone
router.post(
  '/:id/claim',
  authenticateJWT,
  authorizeRoles('student', 'tutor', 'admin'),
  milestoneController.evaluateAndClaimMilestone
);

// 6. Tutor / Admin menghapus milestone
router.delete(
  '/:id',
  authenticateJWT,
  authorizeRoles('tutor', 'admin'),
  milestoneController.deleteMilestone
);

module.exports = router;
