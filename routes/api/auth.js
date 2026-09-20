const express = require('express');
const router = express.Router();
const authController = require('../../controllers/authController');
const { authenticateJWT, authorizeRoles } = require('../../middleware/auth');
const {
  validateRegister,
  validateLogin,
  validateProfileUpdate,
  validateChangePassword,
} = require('../../middleware/validator');

// Public routes
router.post('/register', validateRegister, authController.register);
router.post('/verify-otp', authController.verifyOTP);
router.post('/resend-otp', authController.resendOTP);
router.post('/login', validateLogin, authController.login);
router.post('/refresh', authController.refreshToken);
router.get('/oauth/:provider', authController.oauthRedirect);

const { upload } = require('../../utils/imageHelper');

// Protected routes (Requires valid JWT)
router.get('/me', authenticateJWT, authController.getProfile);
router.put('/profile', authenticateJWT, validateProfileUpdate, authController.updateProfile);
router.post('/upload-certificate', authenticateJWT, upload.single('certificate'), authController.uploadCertificate);
router.post('/personalize', authenticateJWT, authController.personalize);
router.put('/change-password', authenticateJWT, validateChangePassword, authController.changePassword);
router.post('/logout', authenticateJWT, authController.logout);

// Role test endpoints for verification
router.get('/test-admin', authenticateJWT, authorizeRoles('admin'), (req, res) => {
  res.json({ success: true, message: 'Selamat datang di area khusus Admin!', user: req.user });
});

router.get('/test-tutor', authenticateJWT, authorizeRoles('tutor', 'admin'), (req, res) => {
  res.json({ success: true, message: 'Selamat datang di area khusus Tutor!', user: req.user });
});

router.get('/test-student', authenticateJWT, authorizeRoles('student', 'admin'), (req, res) => {
  res.json({ success: true, message: 'Selamat datang di area Peserta!', user: req.user });
});

module.exports = router;
