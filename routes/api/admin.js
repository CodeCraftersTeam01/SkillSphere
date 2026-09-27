const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/adminController');
const { authenticateJWT, authorizeRoles } = require('../../middleware/auth');

// Protect all admin routes with JWT and admin role check
router.use(authenticateJWT, authorizeRoles('admin'));

// Admin Dashboard & Overview Stats
router.get('/stats', adminController.getAdminStats);

// Tutor Applications Review & Approval
router.get('/tutor-applications', adminController.getTutorApplications);
router.get('/tutor-applications/:id', adminController.getTutorApplicationById);
router.put('/tutor-applications/:id/approve', adminController.approveTutorApplication);
router.put('/tutor-applications/:id/reject', adminController.rejectTutorApplication);

// Tutor Certifications Validation
router.get('/tutor-certifications', adminController.getTutorCertifications);
router.put('/tutor-certifications/:id/verify', adminController.verifyTutorCertification);
router.put('/tutor-certifications/:id/unverify', adminController.unverifyTutorCertification);

module.exports = router;
