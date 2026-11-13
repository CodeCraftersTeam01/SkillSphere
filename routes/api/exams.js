const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User, UserProfile } = require('../../models');
const examController = require('../../controllers/examController');
const { authenticateJWT, authorizeRoles } = require('../../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'skillsphere_super_secret_jwt_key_2026_production_ready';

// Optional auth middleware agar siswa & tutor bisa load soal tanpa terblokir jika token kedaluwarsa
const optionalAuth = async (req, res, next) => {
  try {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token || token === 'undefined' || token === 'null') {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      include: [{ model: UserProfile, as: 'profile' }],
      attributes: { exclude: ['password', 'refresh_token'] },
    });

    if (user && user.is_active) {
      req.user = user;
    } else {
      req.user = null;
    }
    return next();
  } catch (err) {
    req.user = null;
    return next();
  }
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

