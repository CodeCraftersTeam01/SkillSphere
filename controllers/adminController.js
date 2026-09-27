const {
  User,
  UserProfile,
  TutorApplication,
  TutorCertification,
  TutorWallet,
  Course,
  Enrollment,
} = require('../models');
const { Op } = require('sequelize');

/**
 * Get Admin Dashboard & Verification Stats
 */
exports.getAdminStats = async (req, res) => {
  try {
    const totalApplications = await TutorApplication.count();
    const pendingApplications = await TutorApplication.count({ where: { status: 'pending' } });
    const approvedApplications = await TutorApplication.count({ where: { status: 'approved' } });
    const rejectedApplications = await TutorApplication.count({ where: { status: 'rejected' } });

    const totalCertifications = await TutorCertification.count();
    const verifiedCertifications = await TutorCertification.count({ where: { is_verified: true } });
    const pendingCertifications = await TutorCertification.count({ where: { is_verified: false } });

    const totalTutors = await User.count({ where: { role: 'tutor' } });
    const totalStudents = await User.count({ where: { role: 'student' } });
    const totalCourses = await Course.count();

    return res.status(200).json({
      success: true,
      message: 'Statistik admin berhasil dimuat.',
      data: {
        applications: {
          total: totalApplications,
          pending: pendingApplications,
          approved: approvedApplications,
          rejected: rejectedApplications,
        },
        certifications: {
          total: totalCertifications,
          verified: verifiedCertifications,
          pending: pendingCertifications,
        },
        system: {
          totalTutors,
          totalStudents,
          totalCourses,
        },
      },
    });
  } catch (err) {
    console.error('Error in getAdminStats:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat statistik admin.',
      error: err.message,
    });
  }
};

/**
 * Get list of Tutor Applications with filters & search
 */
exports.getTutorApplications = async (req, res) => {
  try {
    const { status, search, limit = 50, offset = 0 } = req.query;

    const whereClause = {};
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    const userWhereClause = {};
    if (search) {
      userWhereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    const applications = await TutorApplication.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'applicant',
          where: Object.keys(userWhereClause).length ? userWhereClause : undefined,
          attributes: ['id', 'name', 'email', 'role', 'is_verified', 'created_at'],
          include: [
            {
              model: UserProfile,
              as: 'profile',
              attributes: ['avatar_url', 'phone_number', 'bio'],
            },
          ],
        },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    return res.status(200).json({
      success: true,
      message: 'Daftar pengajuan tutor berhasil dimuat.',
      data: {
        total: applications.count,
        applications: applications.rows,
      },
    });
  } catch (err) {
    console.error('Error in getTutorApplications:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat daftar pengajuan tutor.',
      error: err.message,
    });
  }
};

/**
 * Get detail of a Tutor Application
 */
exports.getTutorApplicationById = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await TutorApplication.findByPk(id, {
      include: [
        {
          model: User,
          as: 'applicant',
          attributes: ['id', 'name', 'email', 'role', 'is_verified', 'created_at'],
          include: [
            {
              model: UserProfile,
              as: 'profile',
            },
            {
              model: TutorCertification,
              as: 'tutor_certifications',
            },
          ],
        },
      ],
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Pengajuan tutor tidak ditemukan.',
      });
    }

    return res.status(200).json({
      success: true,
      data: application,
    });
  } catch (err) {
    console.error('Error in getTutorApplicationById:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat detail pengajuan tutor.',
      error: err.message,
    });
  }
};

/**
 * Approve Tutor Application
 */
exports.approveTutorApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await TutorApplication.findByPk(id, {
      include: [{ model: User, as: 'applicant' }],
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Pengajuan tutor tidak ditemukan.',
      });
    }

    if (application.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Pengajuan tutor ini sudah disetujui sebelumnya.',
      });
    }

    // Update Application Status
    application.status = 'approved';
    application.rejection_reason = null;
    await application.save();

    // Upgrade User Role to 'tutor'
    const user = application.applicant;
    if (user) {
      user.role = 'tutor';
      user.is_verified = true;
      await user.save();

      // Ensure TutorWallet exists
      await TutorWallet.findOrCreate({
        where: { tutor_id: user.id },
        defaults: {
          tutor_id: user.id,
          balance: 0.0,
          pending_balance: 0.0,
          total_withdrawn: 0.0,
          is_active: true,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: `Pengajuan tutor untuk ${user ? user.name : 'pengguna'} berhasil disetujui. Akun telah ditingkatkan menjadi Tutor dan Dompet telah aktif.`,
      data: application,
    });
  } catch (err) {
    console.error('Error in approveTutorApplication:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal menyetujui pengajuan tutor.',
      error: err.message,
    });
  }
};

/**
 * Reject Tutor Application
 */
exports.rejectTutorApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Alasan penolakan pengajuan wajib diisi.',
      });
    }

    const application = await TutorApplication.findByPk(id, {
      include: [{ model: User, as: 'applicant' }],
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Pengajuan tutor tidak ditemukan.',
      });
    }

    application.status = 'rejected';
    application.rejection_reason = reason.trim();
    await application.save();

    return res.status(200).json({
      success: true,
      message: `Pengajuan tutor telah ditolak dengan alasan: "${application.rejection_reason}"`,
      data: application,
    });
  } catch (err) {
    console.error('Error in rejectTutorApplication:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal menolak pengajuan tutor.',
      error: err.message,
    });
  }
};

/**
 * Get list of Tutor Certifications with filters
 */
exports.getTutorCertifications = async (req, res) => {
  try {
    const { is_verified, search, limit = 50, offset = 0 } = req.query;

    const whereClause = {};
    if (is_verified !== undefined && is_verified !== 'all') {
      whereClause.is_verified = is_verified === 'true' || is_verified === '1';
    }

    const tutorWhereClause = {};
    if (search) {
      tutorWhereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    const certifications = await TutorCertification.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'tutor',
          where: Object.keys(tutorWhereClause).length ? tutorWhereClause : undefined,
          attributes: ['id', 'name', 'email', 'role'],
          include: [
            {
              model: UserProfile,
              as: 'profile',
              attributes: ['avatar_url', 'bio'],
            },
          ],
        },
        {
          model: User,
          as: 'admin_verifier',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    return res.status(200).json({
      success: true,
      message: 'Daftar sertifikasi tutor berhasil dimuat.',
      data: {
        total: certifications.count,
        certifications: certifications.rows,
      },
    });
  } catch (err) {
    console.error('Error in getTutorCertifications:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat sertifikasi pengajar.',
      error: err.message,
    });
  }
};

/**
 * Verify Tutor Certification
 */
exports.verifyTutorCertification = async (req, res) => {
  try {
    const { id } = req.params;

    const cert = await TutorCertification.findByPk(id, {
      include: [{ model: User, as: 'tutor' }],
    });

    if (!cert) {
      return res.status(404).json({
        success: false,
        message: 'Sertifikasi pengajar tidak ditemukan.',
      });
    }

    cert.is_verified = true;
    cert.verified_at = new Date();
    cert.verified_by = req.user.id;
    await cert.save();

    return res.status(200).json({
      success: true,
      message: `Sertifikat "${cert.certificate_name}" dari ${cert.tutor ? cert.tutor.name : 'pengajar'} berhasil diverifikasi resmi oleh Admin.`,
      data: cert,
    });
  } catch (err) {
    console.error('Error in verifyTutorCertification:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memverifikasi sertifikat pengajar.',
      error: err.message,
    });
  }
};

/**
 * Unverify / Revoke Tutor Certification
 */
exports.unverifyTutorCertification = async (req, res) => {
  try {
    const { id } = req.params;

    const cert = await TutorCertification.findByPk(id);

    if (!cert) {
      return res.status(404).json({
        success: false,
        message: 'Sertifikasi pengajar tidak ditemukan.',
      });
    }

    cert.is_verified = false;
    cert.verified_at = null;
    cert.verified_by = null;
    await cert.save();

    return res.status(200).json({
      success: true,
      message: `Status verifikasi sertifikat "${cert.certificate_name}" telah dibatalkan.`,
      data: cert,
    });
  } catch (err) {
    console.error('Error in unverifyTutorCertification:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal membatalkan verifikasi sertifikat.',
      error: err.message,
    });
  }
};
