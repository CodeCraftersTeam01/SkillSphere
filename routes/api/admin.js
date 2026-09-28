const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/adminController');
const { authenticateJWT, authorizeRoles } = require('../../middleware/auth');
const { invalidateCacheMiddleware } = require('../../middleware/cache');

// Protect all admin routes with JWT and admin role check
router.use(authenticateJWT, authorizeRoles('admin'));

// Admin Dashboard & Overview Stats
router.get('/stats', adminController.getAdminStats);

// Tutor Applications Review & Approval
router.get('/tutor-applications', adminController.getTutorApplications);
router.get('/tutor-applications/:id', adminController.getTutorApplicationById);
router.put('/tutor-applications/:id/approve', invalidateCacheMiddleware(['cache:/api/admin*', 'cache:/api/courses*']), adminController.approveTutorApplication);
router.put('/tutor-applications/:id/reject', invalidateCacheMiddleware(['cache:/api/admin*']), adminController.rejectTutorApplication);

// Tutor Certifications Validation
router.get('/tutor-certifications', adminController.getTutorCertifications);
router.put('/tutor-certifications/:id/verify', invalidateCacheMiddleware(['cache:/api/admin*']), adminController.verifyTutorCertification);
router.put('/tutor-certifications/:id/unverify', invalidateCacheMiddleware(['cache:/api/admin*']), adminController.unverifyTutorCertification);

// Financial & Revenue Sharing Overview
router.get('/financial', adminController.getFinancialData);

module.exports = router;
