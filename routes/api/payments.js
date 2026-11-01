const express = require('express');
const router = express.Router();
const paymentController = require('../../controllers/paymentController');
const { authenticateJWT, authorizeRoles } = require('../../middleware/auth');

// Public Webhook dari Midtrans (harus tanpa JWT auth karena dipanggil oleh Midtrans Server)
router.post('/notification', paymentController.handleNotification);

// Status check transaksi
router.get('/status/:code', paymentController.getTransactionStatus);

// Protected routes (Student/User)
router.post('/snap-token', authenticateJWT, paymentController.createSnapToken);
router.get('/transactions', authenticateJWT, paymentController.getStudentTransactions);

// Protected routes (Tutor Financial Portal)
router.get('/wallet', authenticateJWT, authorizeRoles('tutor', 'admin'), paymentController.getTutorWallet);
router.post('/withdraw', authenticateJWT, authorizeRoles('tutor', 'admin'), paymentController.requestWithdrawal);

module.exports = router;
