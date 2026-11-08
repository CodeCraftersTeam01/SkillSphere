const express = require('express');
const router = express.Router();

/* GET home page - redirect to login or dashboard */
router.get('/', function(req, res, next) {
  res.redirect('/login');
});

/* GET login page */
router.get('/login', function(req, res, next) {
  res.render('login', { title: 'Masuk | SkillSphere AI' });
});

/* GET register page */
router.get('/register', function(req, res, next) {
  res.render('register', { title: 'Daftar Akun | SkillSphere AI' });
});

/* GET onboarding / personalization page under dashboard */
router.get('/dashboard/onboarding', function(req, res, next) {
  res.render('onboarding', { title: 'Personalisasi Belajar | SkillSphere AI' });
});

/* Legacy redirect /onboarding -> /dashboard/onboarding */
router.get('/onboarding', function(req, res, next) {
  res.redirect('/dashboard/onboarding');
});

/* GET dashboard page */
router.get('/dashboard', function(req, res, next) {
  res.render('dashboard', { title: 'Dashboard | SkillSphere AI' });
});

/* GET Student AI Career Roadmap / Jalur Belajar Page (Sprint 2 - Tegar) */
router.get(['/roadmap', '/dashboard/roadmap', '/jalur-belajar'], function(req, res, next) {
  res.render('roadmap', { title: 'Jalur Belajar AI & Karir | SkillSphere AI' });
});

/* GET Student Profile & Settings Page (Sprint 1 - Fadiyah) */
router.get(['/profile', '/dashboard/profile'], function(req, res, next) {
  res.render('profile', { title: 'Profil & Pengaturan Akun | SkillSphere AI' });
});

/* GET Student Transactions History (Sprint 3 - Bustanul) */
router.get(['/transactions', '/dashboard/transactions', '/riwayat-transaksi'], function(req, res, next) {
  res.render('student/transactions', {
    title: 'Riwayat Transaksi Belajar | SkillSphere AI',
    midtransClientKey: process.env.MIDTRANS_CLIENT_KEY,
    midtransSnapUrl: process.env.MIDTRANS_SNAP_URL,
  });
});

/* GET Student Wishlist Page (Sprint 3 - Bustanul) */
router.get(['/wishlist', '/dashboard/wishlist', '/kursus-favorit'], function(req, res, next) {
  res.render('student/wishlist', { title: 'Wishlist Kursus Favorit | SkillSphere AI' });
});

/* GET Student Certificates & Milestones Page (Sprint 4 - Fadiyah) */
router.get(['/certificates', '/dashboard/certificates', '/sertifikat'], function(req, res, next) {
  res.render('student/certificates', { title: 'Sertifikat & Milestone Belajar | SkillSphere AI' });
});


/* GET Course Catalog Page (Sprint 2 - Fadiyah) */
router.get(['/courses', '/catalog', '/katalog'], function(req, res, next) {
  res.render('courses/index', { title: 'Katalog Kursus & Kurikulum | SkillSphere AI' });
});

/* GET Course Detail & Syllabus Page (Sprint 2 - Fadiyah) */
router.get('/courses/:id', function(req, res, next) {
  res.render('courses/detail', { title: 'Detail Kursus | SkillSphere AI', courseId: req.params.id });
});

/* GET Course Checkout & Payment Page (Sprint 3 - Fadiyah) */
router.get(['/courses/:id/checkout', '/checkout/:id'], function(req, res, next) {
  res.render('courses/checkout', {
    title: 'Checkout Pembayaran Kursus | SkillSphere AI',
    courseId: req.params.id,
    midtransClientKey: process.env.MIDTRANS_CLIENT_KEY,
    midtransSnapUrl: process.env.MIDTRANS_SNAP_URL,
  });
});


/* GET Interactive Classroom Learning Space (Sprint 2 - Dicoding & Claude Style) */
router.get(['/courses/:id/learn', '/courses/:id/ruang-belajar'], function(req, res, next) {
  res.render('courses/learn', { title: 'Ruang Belajar Interaktif | SkillSphere AI', courseId: req.params.id });
});

/* GET Interactive Zen Exam Mode Room (Sprint 4 - Bustanul Arifin) */
router.get(['/exam/:id', '/ujian/:id'], function(req, res, next) {
  res.render('student/exam', { title: 'Ruang Ujian Zen Mode | SkillSphere AI', examId: req.params.id });
});

router.get(['/courses/:courseId/exam', '/courses/:courseId/ujian'], async function(req, res, next) {
  try {
    const { Exam } = require('../models');
    const exam = await Exam.findOne({ where: { course_id: req.params.courseId } });
    if (exam) {
      return res.redirect(`/exam/${exam.id}`);
    }
    return res.redirect(`/courses/${req.params.courseId}`);
  } catch (err) {
    next(err);
  }
});

/* GET cinematic warp transition page */
router.get('/warp', function(req, res, next) {
  res.render('warp', { title: 'Memasuki Ruang Belajar | SkillSphere AI' });
});

/* GET Motion Graphics Introduction Video Page */
router.get(['/intro', '/video'], function(req, res, next) {
  res.redirect('/motion/');
});

/* GET Admin Dashboard & Verification UI (Sprint 1 - Satrio) */
router.get(['/admin', '/admin/dashboard', '/admin/verification'], function(req, res, next) {
  res.render('admin/verification', { title: 'Dashboard Admin & Verifikasi Pengajar | SkillSphere AI' });
});

/* GET Tutor Material Upload & Management Portal (Sprint 2 - Satrio) */
router.get('/tutor/materials', function(req, res, next) {
  res.render('tutor/materials', { title: 'Portal Manajemen & Upload Materi | Tutor SkillSphere' });
});

/* GET Tutor Exam Creator Portal (Sprint 4 - Satrio) */
router.get(['/tutor/exams', '/tutor/exam-creator', '/dashboard/tutor/exams'], function(req, res, next) {
  res.render('tutor/exams', { title: 'Pembuat Ujian Kelulusan | Studio Pengajar SkillSphere AI' });
});

/* GET Tutor Financial Wallet Portal (Sprint 3) */
router.get(['/tutor/wallet', '/dashboard/wallet'], function(req, res, next) {
  res.render('tutor/wallet', { title: 'Dompet Digital & Pendapatan Pengajar | SkillSphere AI' });
});

/* GET Dedicated Tutor Withdrawal Portal (Sprint 3) */
router.get(['/tutor/withdrawal', '/tutor/withdraw', '/dashboard/withdrawal'], function(req, res, next) {
  res.render('tutor/withdrawal', { title: 'Portal Penarikan Dana Pengajar | SkillSphere AI' });
});


/* GET Standalone Tutor Verification Form Page */
router.get(['/tutor/verify', '/tutor/verification', '/dashboard/tutor-verify'], function(req, res, next) {
  res.render('tutor/verify', { title: 'Verifikasi Akun Pengajar | SkillSphere AI' });
});

/* GET Terms of Service page */
router.get(['/terms', '/terms-of-service', '/syarat-ketentuan'], function(req, res, next) {
  res.render('terms', { title: 'Syarat dan Ketentuan Layanan | SkillSphere AI' });
});

/* GET Privacy Policy page */
router.get(['/privacy', '/privacy-policy', '/kebijakan-privasi'], function(req, res, next) {
  res.render('privacy', { title: 'Kebijakan Privasi | SkillSphere AI' });
});

/* GET Public Certificate Verification Page (Sprint 4 - Arjuna) */
router.get(['/verify-cert/:code', '/certificate/verify/:code'], async function(req, res, next) {
  try {
    const { code } = req.params;
    const { Certificate, User, Course, ExamResult } = require('../models');

    const certificate = await Certificate.findOne({
      where: { certificate_code: code },
      include: [
        { model: User, as: 'recipient', attributes: ['id', 'name', 'email'] },
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'title', 'slug', 'level'],
          include: [{ model: User, as: 'tutor', attributes: ['id', 'name'] }],
        },
        { model: ExamResult, as: 'exam_result', attributes: ['id', 'score'] },
      ],
    });

    if (!certificate) {
      return res.render('certificates/verify', {
        title: 'Verifikasi Sertifikat | SkillSphere AI',
        isValid: false,
        queryCode: code,
        certificate: null,
      });
    }

    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = new Date(certificate.issue_date || Date.now()).toLocaleDateString('id-ID', options);

    return res.render('certificates/verify', {
      title: `Verifikasi Sertifikat: ${certificate.certificate_code} | SkillSphere AI`,
      isValid: true,
      queryCode: code,
      certificate: {
        certificate_code: certificate.certificate_code,
        student_name: certificate.recipient ? certificate.recipient.name : 'Peserta Pembelajaran',
        course_title: certificate.course ? certificate.course.title : 'Kursus Keahlian',
        course_slug: certificate.course ? certificate.course.slug : null,
        tutor_name: certificate.course && certificate.course.tutor ? certificate.course.tutor.name : 'Lead Instructor',
        score: certificate.exam_result ? certificate.exam_result.score : 100,
        formatted_date: formattedDate,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

