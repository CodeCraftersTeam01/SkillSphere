const express = require('express');
const router = express.Router();
const labController = require('../../controllers/labController');
const { authenticateJWT, authorizeRoles, optionalAuth } = require('../../middleware/auth');

// 1. Daftar tantangan Ruang Lab & Ruang Praktikum (optional auth)
router.get('/', optionalAuth, labController.listLabs);

// 2. Statistik progres lab milik pengguna login
router.get('/stats/me', authenticateJWT, labController.getMyStats);

// 3. Generator draft tantangan berbasis AI (tutor & admin)
router.post('/ai-generate', authenticateJWT, authorizeRoles('tutor', 'admin'), labController.aiGenerateLab);

// 4. Detail tantangan berdasarkan ID (optional auth)
router.get('/:id', optionalAuth, labController.getLabById);

// 5. Buat tantangan baru (tutor & admin)
router.post('/', authenticateJWT, authorizeRoles('tutor', 'admin'), labController.createLab);

// 6. Perbarui tantangan (pembuat tutor atau admin)
router.put('/:id', authenticateJWT, authorizeRoles('tutor', 'admin'), labController.updateLab);

// 7. Hapus tantangan (pembuat tutor atau admin)
router.delete('/:id', authenticateJWT, authorizeRoles('tutor', 'admin'), labController.deleteLab);

// 8. Kumpulkan kode untuk evaluasi AI (semua pengguna login)
router.post('/:id/submit', authenticateJWT, labController.submitLabCode);

// 9. Riwayat pengumpulan kode untuk tantangan tertentu
router.get('/:id/submissions', authenticateJWT, labController.getLabSubmissions);

module.exports = router;
