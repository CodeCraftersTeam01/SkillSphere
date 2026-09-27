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

/* GET Admin Verification UI (Sprint 1 - Satrio) */
router.get('/admin/verification', function(req, res, next) {
  res.render('admin/verification', { title: 'Verifikasi Pengajar & Sertifikat | Admin Panel SkillSphere' });
});

/* GET Tutor Material Upload & Management Portal (Sprint 2 - Satrio) */
router.get('/tutor/materials', function(req, res, next) {
  res.render('tutor/materials', { title: 'Portal Manajemen & Upload Materi | Tutor SkillSphere' });
});

module.exports = router;
