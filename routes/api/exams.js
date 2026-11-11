const express = require('express');
const router = express.Router();
const examController = require('../../controllers/examController');
const { authenticateJWT, authorizeRoles } = require('../../middleware/auth');

// Optional auth middleware agar siswa bisa load soal atau tutor load dengan kunci jawaban
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next();
  }
  return authenticateJWT(req, res, next);
};

// 1a. Ambil seluruh daftar ujian & kuis untuk suatu kursus
router.get('/course/:course_id/all', optionalAuth, examController.getCourseExams);

// 1. Ambil data ujian untuk kursus (siswa melihat soal tersanitasi tanpa kunci jawaban, tutor melihat lengkap)
router.get('/course/:course_id', optionalAuth, examController.getCourseExam);

// 2. Ambil detail ujian berdasarkan Exam ID
router.get('/:id', optionalAuth, examController.getExamById);

// 3. Tutor / Admin membuat atau memperbarui ujian kursus
router.post(
  '/course/:course_id',
  authenticateJWT,
  authorizeRoles('tutor', 'admin'),
  examController.createOrUpdateExam
);
router.post(
  '/',
  authenticateJWT,
  authorizeRoles('tutor', 'admin'),
  examController.createOrUpdateExam
);
router.put(
  '/:id',
  authenticateJWT,
  authorizeRoles('tutor', 'admin'),
  examController.createOrUpdateExam
);

// 4. Siswa mengumpulkan ujian & auto-scoring
router.post(
  '/:id/submit',
  authenticateJWT,
  authorizeRoles('student', 'tutor', 'admin'),
  examController.submitExam
);

// 5. Riwayat pengerjaan ujian siswa
router.get(
  '/:id/history',
  authenticateJWT,
  examController.getExamHistory
);

// 6. Tutor / Admin menghapus ujian
router.delete(
  '/:id',
  authenticateJWT,
  authorizeRoles('tutor', 'admin'),
  examController.deleteExam
);

module.exports = router;

