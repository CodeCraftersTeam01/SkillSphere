const fs = require('fs');
const path = require('path');
const { Certificate, User, Course, ExamResult } = require('../models');
const certificateGenerator = require('../services/certificateGenerator');

/**
 * Controller Manajemen & Verifikasi Sertifikat Resmi SkillSphere AI
 * Diarsiteki oleh Arjuna Lanang (PM & Lead Backend)
 */

/**
 * 1. Verifikasi Keaslian Sertifikat secara Publik
 * GET /api/certificates/verify/:code
 * Terbuka untuk umum (siapa saja dapat memvalidasi kredensial kelulusan)
 */
async function verifyCertificate(req, res) {
  try {
    const { code } = req.params;

    if (!code || String(code).trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Kode verifikasi sertifikat wajib disertakan.',
      });
    }

    const sanitizedCode = String(code).trim();

    const certificate = await Certificate.findOne({
      where: { certificate_code: sanitizedCode },
      include: [
        {
          model: User,
          as: 'recipient',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'title', 'slug', 'level'],
          include: [
            {
              model: User,
              as: 'tutor',
              attributes: ['id', 'name'],
            },
          ],
        },
        {
          model: ExamResult,
          as: 'exam_result',
          attributes: ['id', 'score', 'is_passed', 'submitted_at'],
        },
      ],
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Sertifikat tidak ditemukan atau kode verifikasi tidak valid.',
        is_valid: false,
      });
    }

    const studentName = (certificate.recipient && certificate.recipient.name) || 'Peserta Pembelajaran';
    const courseTitle = (certificate.course && certificate.course.title) || 'Kursus Keahlian';
    const tutorName = (certificate.course && certificate.course.tutor && certificate.course.tutor.name) || 'Lead Instructor';
    const examScore = certificate.exam_result ? certificate.exam_result.score : 100;

    return res.status(200).json({
      success: true,
      message: 'Sertifikat valid dan terverifikasi secara resmi di database SkillSphere AI.',
      data: {
        is_valid: true,
        certificate_code: certificate.certificate_code,
        student_name: studentName,
        course_title: courseTitle,
        tutor_name: tutorName,
        issue_date: certificate.issue_date,
        exam_score: examScore,
        certificate_url: certificate.certificate_url,
        download_url: `/api/certificates/${certificate.certificate_code}/pdf`,
        public_verify_url: `/verify-cert/${certificate.certificate_code}`,
      },
    });
  } catch (err) {
    console.error('Error in verifyCertificate:', err);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan sistem saat memvalidasi sertifikat.',
      error: err.message,
    });
  }
}

/**
 * 2. Unduh atau Streaming File PDF Sertifikat Resmi
 * GET /api/certificates/:code/pdf
 */
async function downloadCertificatePdf(req, res) {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Kode sertifikat wajib disertakan.',
      });
    }

    const sanitizedCode = String(code).trim();

    const certificate = await Certificate.findOne({
      where: { certificate_code: sanitizedCode },
      include: [
        { model: User, as: 'recipient', attributes: ['id', 'name'] },
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'title'],
          include: [{ model: User, as: 'tutor', attributes: ['id', 'name'] }],
        },
        { model: ExamResult, as: 'exam_result', attributes: ['id', 'score'] },
      ],
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Sertifikat tidak ditemukan.',
      });
    }

    // Pastikan file PDF fisik ada di disk storage
    const pdfFileName = `cert_${sanitizedCode}.pdf`;
    const pdfFilePath = path.join(certificateGenerator.CERT_STORAGE_DIR, pdfFileName);

    if (!fs.existsSync(pdfFilePath)) {
      await certificateGenerator.generateCertificatePdf({
        certificateCode: sanitizedCode,
        studentName: (certificate.recipient && certificate.recipient.name) || 'Peserta Pembelajaran',
        courseTitle: (certificate.course && certificate.course.title) || 'Kursus Keahlian',
        tutorName: (certificate.course && certificate.course.tutor && certificate.course.tutor.name) || 'Lead Instructor',
        score: certificate.exam_result ? certificate.exam_result.score : 100,
        issueDate: certificate.issue_date || new Date(),
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Sertifikat_${sanitizedCode}.pdf"`);

    return res.sendFile(pdfFilePath);
  } catch (err) {
    console.error('Error in downloadCertificatePdf:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengunduh berkas PDF sertifikat.',
      error: err.message,
    });
  }
}

/**
 * 3. Ambil Daftar Sertifikat Milik Siswa yang Sedang Login
 * GET /api/certificates/my-certificates
 */
async function getMyCertificates(req, res) {
  try {
    const userId = req.user.id;

    const certificates = await Certificate.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'title', 'slug', 'level', 'thumbnail_url'],
          include: [{ model: User, as: 'tutor', attributes: ['id', 'name'] }],
        },
        {
          model: ExamResult,
          as: 'exam_result',
          attributes: ['id', 'score', 'is_passed', 'submitted_at'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    const formattedList = certificates.map((cert) => ({
      id: cert.id,
      certificate_code: cert.certificate_code,
      issue_date: cert.issue_date,
      certificate_url: cert.certificate_url,
      download_url: `/api/certificates/${cert.certificate_code}/pdf`,
      public_verify_url: `/verify-cert/${cert.certificate_code}`,
      course_id: cert.course_id,
      course_title: cert.course ? cert.course.title : 'Kursus',
      course_thumbnail: cert.course ? cert.course.thumbnail_url : null,
      tutor_name: cert.course && cert.course.tutor ? cert.course.tutor.name : 'Instruktur Utama',
      exam_score: cert.exam_result ? cert.exam_result.score : 100,
    }));

    return res.status(200).json({
      success: true,
      message: 'Daftar sertifikat kelulusan Anda berhasil dimuat.',
      data: formattedList,
    });
  } catch (err) {
    console.error('Error in getMyCertificates:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat sertifikat Anda.',
      error: err.message,
    });
  }
}

/**
 * 4. Ambil Daftar Sertifikat yang Telah Diterbitkan untuk Kelas Milik Tutor
 * GET /api/certificates/tutor/issued
 */
async function getTutorIssuedCertificates(req, res) {
  try {
    const tutorId = req.user.id;
    const { course_id } = req.query;

    const courseWhere = { tutor_id: tutorId };
    if (course_id) {
      courseWhere.id = course_id;
    }

    const tutorCourses = await Course.findAll({
      where: courseWhere,
      attributes: ['id', 'title', 'level'],
    });

    if (tutorCourses.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Belum ada kelas yang ditemukan.',
        data: {
          summary: { total_issued: 0, total_courses: 0, average_score: 0 },
          certificates: [],
        },
      });
    }

    const courseIds = tutorCourses.map((c) => c.id);

    const certificates = await Certificate.findAll({
      where: { course_id: courseIds },
      include: [
        {
          model: User,
          as: 'recipient',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'title', 'level'],
        },
        {
          model: ExamResult,
          as: 'exam_result',
          attributes: ['id', 'score', 'is_passed', 'submitted_at'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    let totalScore = 0;
    const formattedList = certificates.map((cert) => {
      const score = cert.exam_result ? cert.exam_result.score : 100;
      totalScore += score;
      return {
        id: cert.id,
        certificate_code: cert.certificate_code,
        student_id: cert.user_id,
        student_name: cert.recipient ? cert.recipient.name : 'Peserta Pembelajaran',
        student_email: cert.recipient ? cert.recipient.email : '-',
        course_id: cert.course_id,
        course_title: cert.course ? cert.course.title : 'Kursus',
        issue_date: cert.issue_date,
        exam_score: score,
        download_url: `/api/certificates/${cert.certificate_code}/pdf`,
        public_verify_url: `/verify-cert/${cert.certificate_code}`,
      };
    });

    const avgScore = formattedList.length > 0 ? Math.round(totalScore / formattedList.length) : 0;

    return res.status(200).json({
      success: true,
      message: 'Daftar sertifikat terbitan tutor berhasil dimuat.',
      data: {
        summary: {
          total_issued: formattedList.length,
          total_courses: tutorCourses.length,
          average_score: avgScore,
        },
        certificates: formattedList,
      },
    });
  } catch (err) {
    console.error('Error in getTutorIssuedCertificates:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat daftar sertifikat kelas pengajar.',
      error: err.message,
    });
  }
}

module.exports = {
  verifyCertificate,
  downloadCertificatePdf,
  getMyCertificates,
  getTutorIssuedCertificates,
};
