const { TutorApplication, TutorCertification, User, UserProfile, TutorWallet } = require('../models');

/**
 * Submit or Update Tutor Application (Sprint 1 - Tegar)
 */
exports.applyTutor = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      institution_name,
      experience_years,
      cv_url,
      certificate_document_url,
      linkedin_url,
      portfolio_url,
      bio,
    } = req.body;

    // Check if user already has an application
    let application = await TutorApplication.findOne({ where: { user_id: userId } });

    if (application && application.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Akun Anda telah disetujui sebagai Tutor resmi.',
      });
    }

    if (application) {
      // Update existing pending/rejected application
      await application.update({
        institution_name: institution_name || application.institution_name,
        experience_years: experience_years !== undefined ? parseInt(experience_years, 10) : application.experience_years,
        cv_url: cv_url || application.cv_url,
        certificate_document_url: certificate_document_url || application.certificate_document_url,
        linkedin_url: linkedin_url ? linkedin_url.trim() : application.linkedin_url,
        portfolio_url: portfolio_url ? portfolio_url.trim() : application.portfolio_url,
        status: 'pending',
        rejection_reason: null,
      });
    } else {
      application = await TutorApplication.create({
        user_id: userId,
        institution_name: institution_name || null,
        experience_years: experience_years ? parseInt(experience_years, 10) : 0,
        cv_url: cv_url || null,
        certificate_document_url: certificate_document_url || null,
        linkedin_url: linkedin_url ? linkedin_url.trim() : null,
        portfolio_url: portfolio_url ? portfolio_url.trim() : null,
        status: 'pending',
      });
    }

    // Optionally update user profile bio
    if (bio) {
      const profile = await UserProfile.findOne({ where: { user_id: userId } });
      if (profile) {
        await profile.update({ bio });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Pengajuan menjadi pengajar/tutor berhasil dikirim dan menunggu verifikasi admin.',
      data: application,
    });
  } catch (err) {
    console.error('Error in applyTutor:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengirim pengajuan tutor.',
      error: err.message,
    });
  }
};

/**
 * Get current user's tutor application status (Sprint 1 - Tegar)
 */
exports.getMyApplication = async (req, res) => {
  try {
    const userId = req.user.id;

    const application = await TutorApplication.findOne({
      where: { user_id: userId },
      include: [
        {
          model: User,
          as: 'applicant',
          attributes: ['id', 'name', 'email', 'role', 'is_verified'],
          include: [{ model: UserProfile, as: 'profile' }],
        },
      ],
    });

    if (!application) {
      return res.status(200).json({
        success: true,
        message: 'Belum ada pengajuan tutor yang terdaftar.',
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      data: application,
    });
  } catch (err) {
    console.error('Error in getMyApplication:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat status pengajuan tutor.',
      error: err.message,
    });
  }
};

/**
 * Add official certification for tutor (Sprint 1 - Tegar)
 */
exports.addCertification = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      certificate_name,
      issuer,
      issue_date,
      expiry_date,
      credential_id,
      credential_url,
    } = req.body;

    if (!certificate_name || !issuer) {
      return res.status(400).json({
        success: false,
        message: 'Nama sertifikat dan nama instansi penerbit wajib diisi.',
      });
    }

    const certification = await TutorCertification.create({
      tutor_id: userId,
      certificate_name: certificate_name.trim(),
      issuer: issuer.trim(),
      issue_date: issue_date || null,
      expiry_date: expiry_date || null,
      credential_id: credential_id ? credential_id.trim() : null,
      credential_url: credential_url ? credential_url.trim() : null,
      is_verified: false,
    });

    return res.status(201).json({
      success: true,
      message: 'Sertifikasi pengajar berhasil didaftarkan dan menunggu verifikasi resmi admin.',
      data: certification,
    });
  } catch (err) {
    console.error('Error in addCertification:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal menambahkan sertifikasi pengajar.',
      error: err.message,
    });
  }
};

/**
 * Get all certifications of current logged-in tutor/applicant (Sprint 1 - Tegar)
 */
exports.getMyCertifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const certifications = await TutorCertification.findAll({
      where: { tutor_id: userId },
      include: [
        {
          model: User,
          as: 'admin_verifier',
          attributes: ['id', 'name'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      message: 'Daftar sertifikasi berhasil dimuat.',
      data: certifications,
    });
  } catch (err) {
    console.error('Error in getMyCertifications:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat daftar sertifikasi.',
      error: err.message,
    });
  }
};

/**
 * Delete certification by ID (Sprint 1 - Tegar)
 */
exports.deleteCertification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const certification = await TutorCertification.findOne({
      where: { id, tutor_id: userId },
    });

    if (!certification) {
      return res.status(404).json({
        success: false,
        message: 'Sertifikasi tidak ditemukan atau bukan milik Anda.',
      });
    }

    await certification.destroy();

    return res.status(200).json({
      success: true,
      message: 'Sertifikasi berhasil dihapus.',
    });
  } catch (err) {
    console.error('Error in deleteCertification:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal menghapus sertifikasi.',
      error: err.message,
    });
  }
};
