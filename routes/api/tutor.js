const express = require('express');
const router = express.Router();
const tutorController = require('../../controllers/tutorController');
const { authenticateJWT } = require('../../middleware/auth');

// All tutor application & certification management routes require authentication
router.use(authenticateJWT);

// Tutor Application Endpoints (Sprint 1 - Tegar)
router.post('/apply', tutorController.applyTutor);
router.get('/my-application', tutorController.getMyApplication);

// Tutor Certification Endpoints (Sprint 1 - Tegar)
router.post('/certifications', tutorController.addCertification);
router.get('/my-certifications', tutorController.getMyCertifications);
router.delete('/certifications/:id', tutorController.deleteCertification);

module.exports = router;
