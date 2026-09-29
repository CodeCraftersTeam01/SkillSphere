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

/* GET Student Profile & Settings Page (Sprint 1 - Fadiyah) */
router.get(['/profile', '/dashboard/profile'], function(req, res, next) {
  res.render('profile', { title: 'Profil & Pengaturan Akun | SkillSphere AI' });
});

/* GET Course Catalog Page (Sprint 2 - Fadiyah) */
router.get(['/courses', '/catalog', '/katalog'], function(req, res, next) {
  res.render('courses/index', { title: 'Katalog Kursus & Kurikulum | SkillSphere AI' });
});

/* GET Course Detail & Syllabus Page (Sprint 2 - Fadiyah) */
router.get('/courses/:id', function(req, res, next) {
  res.render('courses/detail', { title: 'Detail Kursus | SkillSphere AI', courseId: req.params.id });
});

/* GET Admin Dashboard & Verification UI (Sprint 1 - Satrio) */
router.get(['/admin', '/admin/dashboard', '/admin/verification'], function(req, res, next) {
  res.render('admin/verification', { title: 'Dashboard Admin & Verifikasi Pengajar | SkillSphere AI' });
});

/* GET Tutor Material Upload & Management Portal (Sprint 2 - Satrio) */
router.get('/tutor/materials', function(req, res, next) {
  res.render('tutor/materials', { title: 'Portal Manajemen & Upload Materi | Tutor SkillSphere' });
});

/* GET Terms of Service page */
router.get(['/terms', '/terms-of-service', '/syarat-ketentuan'], function(req, res, next) {
  res.render('terms', { title: 'Syarat dan Ketentuan Layanan | SkillSphere AI' });
});

/* GET Privacy Policy page */
router.get(['/privacy', '/privacy-policy', '/kebijakan-privasi'], function(req, res, next) {
  res.render('privacy', { title: 'Kebijakan Privasi | SkillSphere AI' });
});

module.exports = router;

