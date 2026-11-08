const express = require('express');
const router = express.Router();
const certificateController = require('../../controllers/certificateController');
const { authenticateJWT, authorizeRoles } = require('../../middleware/auth');

/**
 * Rute API Sertifikasi Resmi SkillSphere AI
 * Diarsiteki oleh Arjuna Lanang (PM & Lead Backend)
 */

// 1. Verifikasi Keaslian Sertifikat secara Publik
router.get('/verify/:code', certificateController.verifyCertificate);

// 2. Download / Stream Dokumen PDF Sertifikat Resmi
router.get('/:code/pdf', certificateController.downloadCertificatePdf);
router.get('/download/:code', certificateController.downloadCertificatePdf);

// 3. Ambil Daftar Sertifikat Milik Siswa
router.get('/my-certificates', authenticateJWT, certificateController.getMyCertificates);
router.get('/', authenticateJWT, certificateController.getMyCertificates);

// 4. Ambil Daftar Sertifikat yang Telah Diterbitkan untuk Kelas Pengajar (Tutor Studio)
router.get('/tutor/issued', authenticateJWT, authorizeRoles('tutor', 'admin'), certificateController.getTutorIssuedCertificates);

module.exports = router;
