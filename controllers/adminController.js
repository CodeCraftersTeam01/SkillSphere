const {
  User,
  UserProfile,
  TutorApplication,
  TutorCertification,
  TutorWallet,
  WithdrawalRequest,
  Transaction,
  WalletTransaction,
  Course,
  Category,
  Enrollment,
  Certificate,
  Exam,
  ExamResult,
  CourseSection,
  CourseMaterial,
  AICareerRoadmap,
} = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const whatsappService = require('../services/whatsappService');

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
 * Approve Tutor Application (supports approving pending or previously rejected applications)
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

    // Kirim notifikasi WhatsApp ke calon tutor
    (async () => {
      try {
        if (user) {
          const profile = await UserProfile.findOne({ where: { user_id: user.id } });
          const userPhone = profile?.phone_number || '085648077829';
          await whatsappService.sendWhatsAppTutorApprovalStatus(userPhone, {
            applicantName: user.name,
            isApproved: true,
            loginUrl: `${process.env.APP_URL || 'https://demo.codingsolver.my.id'}/login`,
          });
        }
      } catch (waErr) {
        console.warn('⚠️ [Tutor Approval WA] Gagal mengirim pesan:', waErr.message);
      }
    })();

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
 * Reject Tutor Application (supports rejecting pending or previously approved applications)
 */
exports.rejectTutorApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const rejectionReason = (reason && reason.trim().length > 0) 
      ? reason.trim() 
      : 'Berkas atau kualifikasi pendaftaran belum memenuhi kriteria platform.';

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
    application.rejection_reason = rejectionReason;
    await application.save();

    // If user was previously approved as tutor, revert role to student
    const user = application.applicant;
    if (user && user.role === 'tutor') {
      user.role = 'student';
      await user.save();
    }

    // Kirim notifikasi WhatsApp ke pelamar terkait penolakan
    (async () => {
      try {
        if (user) {
          const profile = await UserProfile.findOne({ where: { user_id: user.id } });
          const userPhone = profile?.phone_number || '085648077829';
          await whatsappService.sendWhatsAppTutorApprovalStatus(userPhone, {
            applicantName: user.name,
            isApproved: false,
            notes: application.rejection_reason,
            loginUrl: `${process.env.APP_URL || 'https://demo.codingsolver.my.id'}/login`,
          });
        }
      } catch (waErr) {
        console.warn('⚠️ [Tutor Rejection WA] Gagal mengirim pesan:', waErr.message);
      }
    })();

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
 * Reset Tutor Application back to Pending
 */
exports.resetTutorApplication = async (req, res) => {
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

    application.status = 'pending';
    application.rejection_reason = null;
    await application.save();

    // Revert user role to student while pending
    const user = application.applicant;
    if (user && user.role === 'tutor') {
      user.role = 'student';
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: `Status pendaftaran tutor ${user ? user.name : ''} berhasil dikembalikan ke Menunggu Review.`,
      data: application,
    });
  } catch (err) {
    console.error('Error in resetTutorApplication:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal mereset status pengajuan tutor.',
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

/**
 * Get Financial & Revenue Sharing Overview
 */
exports.getFinancialData = async (req, res) => {
  try {
    const wallets = await TutorWallet.findAll({
      include: [
        {
          model: User,
          as: 'tutor',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['balance', 'DESC']],
    });

    const withdrawals = await WithdrawalRequest.findAll({
      include: [
        {
          model: User,
          as: 'tutor',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit: 50,
    });

    const transactions = await Transaction.findAll({
      order: [['created_at', 'DESC']],
      limit: 50,
    });

    const totalPlatformRevenue = transactions.reduce((sum, t) => sum + Number(t.platform_fee || 0), 0);
    const totalTutorEarnings = transactions.reduce((sum, t) => sum + Number(t.tutor_earning || 0), 0);
    const totalVolume = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);

    return res.status(200).json({
      success: true,
      message: 'Data finansial admin berhasil dimuat.',
      data: {
        summary: {
          totalVolume,
          totalPlatformRevenue,
          totalTutorEarnings,
          totalWallets: wallets.length,
          pendingWithdrawals: withdrawals.filter(w => w.status === 'pending').length,
        },
        wallets,
        withdrawals,
      },
    });
  } catch (err) {
    console.error('Error in getFinancialData:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat data finansial.',
      error: err.message,
    });
  }
};

/**
 * Approve Payout / Withdrawal Request (Sprint 3 - Satrio & Arjuna)
 * PUT /api/admin/withdrawals/:id/approve
 */
exports.approveWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { proof_url } = req.body;

    const withdrawal = await WithdrawalRequest.findByPk(id);
    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Permohonan penarikan dana tidak ditemukan.',
      });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Permohonan penarikan sudah berstatus '${withdrawal.status}'.`,
      });
    }

    withdrawal.status = 'completed';
    withdrawal.processed_at = new Date();
    if (proof_url) withdrawal.proof_url = String(proof_url).trim();
    await withdrawal.save();

    // Kirim notifikasi WhatsApp ke Tutor bahwa penarikan telah disetujui / ditransfer
    (async () => {
      try {
        const tutor = await User.findByPk(withdrawal.tutor_id, {
          include: [{ model: UserProfile, as: 'profile' }],
        });
        const tutorPhone = tutor?.profile?.phone_number || '085648077829';
        await whatsappService.sendWhatsAppWithdrawalStatusToTutor(tutorPhone, {
          tutorName: tutor?.name || 'Tutor',
          withdrawalId: withdrawal.id,
          amount: withdrawal.amount,
          status: 'completed',
          bankName: withdrawal.bank_name,
          accountNumber: withdrawal.account_number,
          proofUrl: withdrawal.proof_url,
        });
      } catch (waErr) {
        console.warn('⚠️ [Withdrawal Approval WA] Gagal mengirim pesan:', waErr.message);
      }
    })();

    return res.status(200).json({
      success: true,
      message: 'Penarikan dana berhasil disetujui dan ditandai selesai.',
      data: withdrawal,
    });
  } catch (err) {
    console.error('Error in approveWithdrawal:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal menyetujui penarikan dana.',
      error: err.message,
    });
  }
};

/**
 * Reject Payout / Withdrawal Request with Balance Refund (Sprint 3 - Satrio & Arjuna)
 * PUT /api/admin/withdrawals/:id/reject
 */
exports.rejectWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const withdrawal = await WithdrawalRequest.findByPk(id);
    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Permohonan penarikan dana tidak ditemukan.',
      });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Permohonan penarikan sudah berstatus '${withdrawal.status}'.`,
      });
    }

    withdrawal.status = 'rejected';
    withdrawal.rejection_reason = reason ? String(reason).trim() : 'Informasi rekening tidak valid.';
    withdrawal.processed_at = new Date();
    await withdrawal.save();

    // Kembalikan dana ke saldo tutor wallet
    const wallet = await TutorWallet.findByPk(withdrawal.wallet_id);
    if (wallet) {
      wallet.balance = Number(wallet.balance) + Number(withdrawal.amount);
      await wallet.save();

      // Catat mutasi adjustment pengembalian dana
      await WalletTransaction.create({
        wallet_id: wallet.id,
        transaction_type: 'credit',
        amount: Number(withdrawal.amount),
        reference_id: `REFUND-WD-${withdrawal.id}`,
        reference_type: 'adjustment',
        description: `Pengembalian dana penarikan: ${withdrawal.rejection_reason}`,
      });
    }

    // Kirim notifikasi WhatsApp ke Tutor bahwa penarikan ditolak
    (async () => {
      try {
        const tutor = await User.findByPk(withdrawal.tutor_id, {
          include: [{ model: UserProfile, as: 'profile' }],
        });
        const tutorPhone = tutor?.profile?.phone_number || '085648077829';
        await whatsappService.sendWhatsAppWithdrawalStatusToTutor(tutorPhone, {
          tutorName: tutor?.name || 'Tutor',
          withdrawalId: withdrawal.id,
          amount: withdrawal.amount,
          status: 'rejected',
          bankName: withdrawal.bank_name,
          accountNumber: withdrawal.account_number,
          notes: withdrawal.rejection_reason,
        });
      } catch (waErr) {
        console.warn('⚠️ [Withdrawal Rejection WA] Gagal mengirim pesan:', waErr.message);
      }
    })();

    return res.status(200).json({
      success: true,
      message: 'Penarikan dana berhasil ditolak dan saldo telah dikembalikan ke dompet tutor.',
      data: withdrawal,
    });
  } catch (err) {
    console.error('Error in rejectWithdrawal:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal menolak penarikan dana.',
      error: err.message,
    });
  }
};

/**
 * Get all courses for Admin with filter & search
 */
exports.getAllCourses = async (req, res) => {
  try {
    const { status, search, limit = 50, offset = 0 } = req.query;
    const whereClause = {};
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    if (search) {
      whereClause.title = { [Op.like]: `%${search}%` };
    }

    const { count, rows: courses } = await Course.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'tutor',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    return res.status(200).json({
      success: true,
      message: 'Data kursus admin berhasil dimuat.',
      data: {
        total: count,
        courses,
      },
    });
  } catch (err) {
    console.error('Error in getAllCourses:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat data kursus platform.',
      error: err.message,
    });
  }
};

/**
 * Approve / Publish Course (Admin Action)
 */
exports.approveCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findByPk(id, {
      include: [
        { model: User, as: 'tutor', attributes: ['id', 'name', 'email'] },
      ],
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Kursus tidak ditemukan.',
      });
    }

    course.status = 'published';
    await course.save();

    return res.status(200).json({
      success: true,
      message: `Kursus "${course.title}" berhasil disetujui dan dipublikasikan.`,
      data: course,
    });
  } catch (err) {
    console.error('Error in approveCourse:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal menyetujui kursus.',
      error: err.message,
    });
  }
};

/**
 * Suspend / Freeze Course (Admin Action)
 */
exports.suspendCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const course = await Course.findByPk(id, {
      include: [
        { model: User, as: 'tutor', attributes: ['id', 'name', 'email'] },
      ],
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Kursus tidak ditemukan.',
      });
    }

    course.status = 'suspended';
    await course.save();

    return res.status(200).json({
      success: true,
      message: `Kursus "${course.title}" berhasil disuspend / dibekukan.${reason ? ' Alasan: ' + reason : ''}`,
      data: course,
    });
  } catch (err) {
    console.error('Error in suspendCourse:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal membekukan kursus.',
      error: err.message,
    });
  }
};

/**
 * Get all users with filters, search, and pagination
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { role, status, search, limit = 50, offset = 0, sort = 'created_at', order = 'DESC' } = req.query;

    const whereClause = {};

    // Filter by role
    if (role && role !== 'all') {
      whereClause.role = role;
    }

    // Filter by status (active, inactive, verified, unverified)
    if (status && status !== 'all') {
      if (status === 'active') {
        whereClause.is_active = true;
      } else if (status === 'inactive' || status === 'suspended') {
        whereClause.is_active = false;
      } else if (status === 'verified') {
        whereClause.is_verified = true;
      } else if (status === 'unverified') {
        whereClause.is_verified = false;
      }
    }

    // Search query on name or email
    if (search && search.trim() !== '') {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search.trim()}%` } },
        { email: { [Op.like]: `%${search.trim()}%` } },
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: ['id', 'name', 'email', 'role', 'is_active', 'is_verified', 'created_at', 'updated_at'],
      include: [
        {
          model: UserProfile,
          as: 'profile',
          attributes: ['full_name', 'avatar_url', 'bio', 'phone_number', 'career_goal', 'linkedin_url', 'portfolio_url'],
        },
        {
          model: TutorWallet,
          as: 'wallet',
          attributes: ['balance', 'pending_balance'],
          required: false,
        },
      ],
      order: [[sort, order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC']],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    // Counts summary
    const totalUsers = await User.count();
    const totalStudents = await User.count({ where: { role: 'student' } });
    const totalTutors = await User.count({ where: { role: 'tutor' } });
    const totalAdmins = await User.count({ where: { role: 'admin' } });
    const totalActive = await User.count({ where: { is_active: true } });
    const totalInactive = await User.count({ where: { is_active: false } });

    return res.status(200).json({
      success: true,
      message: 'Data pengguna berhasil dimuat.',
      data: {
        total: count,
        users,
        summary: {
          totalUsers,
          totalStudents,
          totalTutors,
          totalAdmins,
          totalActive,
          totalInactive,
        },
      },
    });
  } catch (err) {
    console.error('Error in getAllUsers:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat data pengguna.',
      error: err.message,
    });
  }
};

/**
 * Get detailed user information by ID
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: ['id', 'name', 'email', 'role', 'is_active', 'is_verified', 'created_at', 'updated_at'],
      include: [
        {
          model: UserProfile,
          as: 'profile',
        },
        {
          model: TutorWallet,
          as: 'wallet',
          required: false,
        },
        {
          model: Course,
          as: 'taught_courses',
          attributes: ['id', 'title', 'slug', 'price', 'status', 'level', 'created_at'],
          required: false,
        },
        {
          model: Enrollment,
          as: 'enrollments',
          attributes: ['id', 'course_id', 'status', 'progress_percentage', 'enrolled_at', 'completed_at'],
          include: [
            {
              model: Course,
              as: 'course',
              attributes: ['id', 'title', 'slug', 'thumbnail_url'],
            },
          ],
          required: false,
        },
        {
          model: Certificate,
          as: 'certificates',
          attributes: ['id', 'certificate_code', 'issue_date', 'certificate_url'],
          required: false,
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Pengguna tidak ditemukan.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Detail pengguna berhasil dimuat.',
      data: user,
    });
  } catch (err) {
    console.error('Error in getUserById:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat detail pengguna.',
      error: err.message,
    });
  }
};

/**
 * Create a new user (Admin action)
 */
exports.createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = 'student',
      is_active = true,
      is_verified = true,
      phone_number = null,
      bio = null,
      career_goal = null,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nama, email, dan kata sandi wajib diisi.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Kata sandi minimal harus terdiri dari 6 karakter.',
      });
    }

    const validRoles = ['student', 'tutor', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Peran akun tidak valid. Pilih antara student, tutor, atau admin.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email sudah terdaftar dalam sistem.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role,
      is_active: is_active === true || is_active === 'true' || is_active === 1,
      is_verified: is_verified === true || is_verified === 'true' || is_verified === 1,
    });

    // Create UserProfile
    await UserProfile.create({
      user_id: newUser.id,
      full_name: name.trim(),
      phone_number: phone_number ? phone_number.trim() : null,
      bio: bio ? bio.trim() : null,
      career_goal: career_goal ? career_goal.trim() : null,
    });

    // If role is tutor, initialize TutorWallet
    if (role === 'tutor') {
      await TutorWallet.findOrCreate({
        where: { tutor_id: newUser.id },
        defaults: {
          tutor_id: newUser.id,
          balance: 0.00,
          pending_balance: 0.00,
        },
      });
    }

    const createdUser = await User.findByPk(newUser.id, {
      attributes: ['id', 'name', 'email', 'role', 'is_active', 'is_verified', 'created_at'],
      include: [{ model: UserProfile, as: 'profile' }],
    });

    return res.status(201).json({
      success: true,
      message: `Pengguna baru "${createdUser.name}" (${createdUser.role}) berhasil ditambahkan.`,
      data: createdUser,
    });
  } catch (err) {
    console.error('Error in createUser:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal membuat pengguna baru.',
      error: err.message,
    });
  }
};

/**
 * Update user details (Admin action)
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      role,
      is_active,
      is_verified,
      phone_number,
      bio,
      career_goal,
      password,
    } = req.body;

    const user = await User.findByPk(id, {
      include: [{ model: UserProfile, as: 'profile' }],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Pengguna tidak ditemukan.',
      });
    }

    // Safety guard: Admin cannot deactivate or demote their own account
    if (req.user && req.user.id === parseInt(id, 10)) {
      if (is_active === false || is_active === 'false' || is_active === 0) {
        return res.status(400).json({
          success: false,
          message: 'Anda tidak dapat menonaktifkan akun admin Anda sendiri.',
        });
      }
      if (role && role !== 'admin') {
        return res.status(400).json({
          success: false,
          message: 'Anda tidak dapat mengubah peran akun admin Anda sendiri.',
        });
      }
    }

    // Email check if changed
    if (email && email.toLowerCase().trim() !== user.email.toLowerCase()) {
      const normalizedEmail = email.toLowerCase().trim();
      const existingUser = await User.findOne({ where: { email: normalizedEmail } });
      if (existingUser && existingUser.id !== user.id) {
        return res.status(409).json({
          success: false,
          message: 'Email sudah digunakan oleh akun lain.',
        });
      }
      user.email = normalizedEmail;
    }

    if (name) user.name = name.trim();

    if (role && ['student', 'tutor', 'admin'].includes(role)) {
      const oldRole = user.role;
      user.role = role;
      if (role === 'tutor' && oldRole !== 'tutor') {
        await TutorWallet.findOrCreate({
          where: { tutor_id: user.id },
          defaults: {
            tutor_id: user.id,
            balance: 0.00,
            pending_balance: 0.00,
          },
        });
      }
    }

    if (typeof is_active !== 'undefined') {
      user.is_active = is_active === true || is_active === 'true' || is_active === 1;
    }

    if (typeof is_verified !== 'undefined') {
      user.is_verified = is_verified === true || is_verified === 'true' || is_verified === 1;
    }

    if (password && password.trim().length >= 6) {
      user.password = await bcrypt.hash(password.trim(), 10);
    }

    await user.save();

    // Update or create UserProfile
    let profile = await UserProfile.findOne({ where: { user_id: user.id } });
    if (profile) {
      if (name) profile.full_name = name.trim();
      if (typeof phone_number !== 'undefined') profile.phone_number = phone_number ? phone_number.trim() : null;
      if (typeof bio !== 'undefined') profile.bio = bio ? bio.trim() : null;
      if (typeof career_goal !== 'undefined') profile.career_goal = career_goal ? career_goal.trim() : null;
      await profile.save();
    } else {
      profile = await UserProfile.create({
        user_id: user.id,
        full_name: user.name,
        phone_number: phone_number ? phone_number.trim() : null,
        bio: bio ? bio.trim() : null,
        career_goal: career_goal ? career_goal.trim() : null,
      });
    }

    const updatedUser = await User.findByPk(user.id, {
      attributes: ['id', 'name', 'email', 'role', 'is_active', 'is_verified', 'created_at', 'updated_at'],
      include: [{ model: UserProfile, as: 'profile' }],
    });

    return res.status(200).json({
      success: true,
      message: `Data pengguna "${updatedUser.name}" berhasil diperbarui.`,
      data: updatedUser,
    });
  } catch (err) {
    console.error('Error in updateUser:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui data pengguna.',
      error: err.message,
    });
  }
};

/**
 * Toggle user active/suspended status
 */
exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active, reason } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Pengguna tidak ditemukan.',
      });
    }

    // Safety guard
    if (req.user && req.user.id === parseInt(id, 10)) {
      return res.status(400).json({
        success: false,
        message: 'Anda tidak dapat mengubah status akun Anda sendiri.',
      });
    }

    const newStatus = typeof is_active !== 'undefined'
      ? (is_active === true || is_active === 'true' || is_active === 1)
      : !user.is_active;

    user.is_active = newStatus;
    await user.save();

    const statusText = newStatus ? 'diaktifkan kembali' : 'disuspend / dinonaktifkan';
    const reasonText = reason ? ` Alasan: ${reason}` : '';

    return res.status(200).json({
      success: true,
      message: `Akun "${user.name}" berhasil ${statusText}.${reasonText}`,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
      },
    });
  } catch (err) {
    console.error('Error in toggleUserStatus:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengubah status akun pengguna.',
      error: err.message,
    });
  }
};

/**
 * Change user role (student <-> tutor <-> admin)
 */
exports.changeUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['student', 'tutor', 'admin'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Peran akun tidak valid. Pilih antara student, tutor, atau admin.',
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Pengguna tidak ditemukan.',
      });
    }

    // Guard: Don't let current admin demote themselves
    if (req.user && req.user.id === parseInt(id, 10) && role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Anda tidak dapat menurunkan peran admin pada akun Anda sendiri.',
      });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    // If upgraded to tutor, create wallet
    if (role === 'tutor' && oldRole !== 'tutor') {
      await TutorWallet.findOrCreate({
        where: { tutor_id: user.id },
        defaults: {
          tutor_id: user.id,
          balance: 0.00,
          pending_balance: 0.00,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: `Peran akun "${user.name}" berhasil diubah dari ${oldRole} menjadi ${role}.`,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Error in changeUserRole:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengubah peran akun pengguna.',
      error: err.message,
    });
  }
};

/**
 * Delete a user (Admin action)
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Pengguna tidak ditemukan.',
      });
    }

    // Guard: Prevent deleting own account
    if (req.user && req.user.id === parseInt(id, 10)) {
      return res.status(400).json({
        success: false,
        message: 'Anda tidak dapat menghapus akun admin Anda sendiri.',
      });
    }

    const userName = user.name;
    const userEmail = user.email;
    await user.destroy();

    return res.status(200).json({
      success: true,
      message: `Akun "${userName}" (${userEmail}) berhasil dihapus dari sistem.`,
    });
  } catch (err) {
    console.error('Error in deleteUser:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal menghapus akun pengguna.',
      error: err.message,
    });
  }
};

/**
 * Platform Business & Operations Analytics (Comprehensive Multi-Tab Platform Hub)
 * GET /api/admin/analytics
 */
exports.getAdminAnalytics = async (req, res) => {
  try {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const now = new Date();

    // 12 Rolling Months timeline definition
    const last12Months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const mIdx = d.getMonth();
      const key = `${year}-${String(mIdx + 1).padStart(2, '0')}`;
      const label = `${monthNames[mIdx]} ${String(year).slice(-2)}`;
      last12Months.push({ key, label, year, mIdx });
    }

    const years = [2024, 2025, 2026];

    // Parallel fetch of core database datasets
    const [
      allUsers,
      allCourses,
      allCategories,
      totalSections,
      allMaterials,
      allEnrollments,
      allTransactions,
      allCertificates,
      totalExams,
      allExamResults,
      allRoadmaps,
      allWithdrawals,
      allWallets
    ] = await Promise.all([
      User.findAll({
        attributes: ['id', 'name', 'email', 'role', 'is_verified', 'is_active', 'createdAt'],
        order: [['createdAt', 'DESC']],
      }),
      Course.findAll({
        attributes: ['id', 'title', 'price', 'status', 'level', 'category_id', 'tutor_id', 'createdAt'],
        include: [
          { model: User, as: 'tutor', attributes: ['id', 'name'] },
          { model: Category, as: 'category', attributes: ['id', 'name'] },
          { model: Enrollment, as: 'enrollments', attributes: ['id', 'status', 'progress_percentage'] },
        ],
      }),
      Category.findAll({ attributes: ['id', 'name', 'slug'] }),
      CourseSection.count(),
      CourseMaterial.findAll({ attributes: ['id', 'content_type', 'duration_minutes'] }),
      Enrollment.findAll({ attributes: ['id', 'status', 'createdAt'] }),
      Transaction.findAll({
        attributes: ['id', 'transaction_code', 'user_id', 'course_id', 'amount', 'platform_fee', 'tutor_earning', 'payment_status', 'payment_method', 'createdAt'],
        include: [
          { model: User, as: 'buyer', attributes: ['id', 'name', 'email'] },
          { model: Course, as: 'course', attributes: ['id', 'title'] },
        ],
        order: [['createdAt', 'DESC']],
      }),
      Certificate.findAll({
        attributes: ['id', 'certificate_code', 'user_id', 'course_id', 'issue_date', 'createdAt'],
        include: [
          { model: User, as: 'recipient', attributes: ['id', 'name'] },
          { model: Course, as: 'course', attributes: ['id', 'title'] },
        ],
        order: [['createdAt', 'DESC']],
      }),
      Exam.count(),
      ExamResult.findAll({ attributes: ['id', 'score', 'is_passed', 'createdAt'] }),
      AICareerRoadmap.findAll({ attributes: ['id', 'target_role', 'status', 'createdAt'] }),
      WithdrawalRequest.findAll({ attributes: ['id', 'amount', 'status', 'createdAt'] }),
      TutorWallet.findAll({ attributes: ['id', 'balance', 'pending_balance'] }),
    ]);

    // 1. Process User Metrics & Time-Series Growth
    const userMonthlyMap = {};
    const userYearlyMap = {};
    for (const m of last12Months) userMonthlyMap[m.key] = { students: 0, tutors: 0, total: 0 };
    for (const y of years) userYearlyMap[y] = { students: 0, tutors: 0, total: 0 };

    let countStudents = 0;
    let countTutors = 0;
    let countAdmins = 0;
    let verifiedUsers = 0;

    for (const u of allUsers) {
      if (u.role === 'student') countStudents++;
      else if (u.role === 'tutor') countTutors++;
      else if (u.role === 'admin') countAdmins++;
      if (u.is_verified) verifiedUsers++;

      const d = u.createdAt ? new Date(u.createdAt) : now;
      const y = d.getFullYear();
      const mKey = `${y}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const isTutor = u.role === 'tutor';
      const isStudent = u.role === 'student';

      if (userMonthlyMap[mKey]) {
        if (isStudent) userMonthlyMap[mKey].students++;
        if (isTutor) userMonthlyMap[mKey].tutors++;
        userMonthlyMap[mKey].total++;
      }
      if (userYearlyMap[y]) {
        if (isStudent) userYearlyMap[y].students++;
        if (isTutor) userYearlyMap[y].tutors++;
        userYearlyMap[y].total++;
      }
    }

    // 2. Process Course Metrics & Time-Series Growth
    const courseMonthlyMap = {};
    const courseYearlyMap = {};
    for (const m of last12Months) courseMonthlyMap[m.key] = 0;
    for (const y of years) courseYearlyMap[y] = 0;

    let publishedCourses = 0;
    let privateCourses = 0;
    let freeCourses = 0;
    let paidCourses = 0;

    const categoryCourseCount = {};
    const categoryEnrollmentCount = {};
    const categoryGMV = {};

    for (const c of allCourses) {
      if (c.status === 'published') publishedCourses++;
      else privateCourses++;

      if (Number(c.price || 0) === 0) freeCourses++;
      else paidCourses++;

      const d = c.createdAt ? new Date(c.createdAt) : now;
      const y = d.getFullYear();
      const mKey = `${y}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      if (courseMonthlyMap[mKey] !== undefined) courseMonthlyMap[mKey]++;
      if (courseYearlyMap[y] !== undefined) courseYearlyMap[y]++;

      const catName = c.category ? c.category.name : 'Lainnya';
      categoryCourseCount[catName] = (categoryCourseCount[catName] || 0) + 1;
      const enrolled = c.enrollments ? c.enrollments.length : 0;
      categoryEnrollmentCount[catName] = (categoryEnrollmentCount[catName] || 0) + enrolled;
      categoryGMV[catName] = (categoryGMV[catName] || 0) + (enrolled * Number(c.price || 0));
    }

    // 3. Process Financial Metrics & Time-Series Growth
    const revMonthlyMap = {};
    const revYearlyMap = {};
    for (const m of last12Months) revMonthlyMap[m.key] = { gmv: 0, platform_fee: 0, tutor_share: 0, count: 0 };
    for (const y of years) revYearlyMap[y] = { gmv: 0, platform_fee: 0, tutor_share: 0, count: 0 };

    let totalGMV = 0;
    let totalPlatformFee = 0;
    let totalTutorShare = 0;
    let settledCount = 0;
    let pendingCount = 0;
    let failedCount = 0;

    const paymentMethodCount = {};

    for (const t of allTransactions) {
      const amt = Number(t.amount || 0);
      const fee = Number(t.platform_fee || 0);
      const tutorEarning = Number(t.tutor_earning || 0);

      const pm = t.payment_method || 'Bank Transfer';
      paymentMethodCount[pm] = (paymentMethodCount[pm] || 0) + 1;

      if (t.payment_status === 'settlement') {
        settledCount++;
        totalGMV += amt;
        totalPlatformFee += fee;
        totalTutorShare += tutorEarning;

        const d = t.createdAt ? new Date(t.createdAt) : now;
        const y = d.getFullYear();
        const mKey = `${y}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        if (revMonthlyMap[mKey]) {
          revMonthlyMap[mKey].gmv += amt;
          revMonthlyMap[mKey].platform_fee += fee;
          revMonthlyMap[mKey].tutor_share += tutorEarning;
          revMonthlyMap[mKey].count++;
        }
        if (revYearlyMap[y]) {
          revYearlyMap[y].gmv += amt;
          revYearlyMap[y].platform_fee += fee;
          revYearlyMap[y].tutor_share += tutorEarning;
          revYearlyMap[y].count++;
        }
      } else if (t.payment_status === 'pending') {
        pendingCount++;
      } else {
        failedCount++;
      }
    }

    const totalTransactions = settledCount + pendingCount + failedCount;
    const successRate = totalTransactions > 0 ? Math.round((settledCount / totalTransactions) * 100) : 100;

    // 4. Process Learning, Exams & Certifications
    const totalExamAttempts = allExamResults.length;
    const passedExams = allExamResults.filter(e => e.is_passed).length;
    const failedExams = totalExamAttempts - passedExams;
    const examPassRate = totalExamAttempts > 0 ? Math.round((passedExams / totalExamAttempts) * 100) : 0;
    const totalCertificates = allCertificates.length;

    // Materials Content Breakdown
    const materialTypeCount = {
      video: 0,
      document: 0,
      slide: 0,
      book: 0,
      text: 0,
    };
    let totalDurationMinutes = 0;
    for (const m of allMaterials) {
      const type = m.content_type || 'video';
      if (materialTypeCount[type] !== undefined) {
        materialTypeCount[type]++;
      } else {
        materialTypeCount.document++;
      }
      totalDurationMinutes += Number(m.duration_minutes || 0);
    }

    // 5. Payouts & Wallets
    let pendingWithdrawalsCount = 0;
    let pendingWithdrawalsAmount = 0;
    let completedWithdrawalsAmount = 0;
    for (const w of allWithdrawals) {
      if (w.status === 'pending') {
        pendingWithdrawalsCount++;
        pendingWithdrawalsAmount += Number(w.amount || 0);
      } else if (w.status === 'completed') {
        completedWithdrawalsAmount += Number(w.amount || 0);
      }
    }

    let totalWalletBalance = 0;
    let totalPendingBalance = 0;
    for (const w of allWallets) {
      totalWalletBalance += Number(w.balance || 0);
      totalPendingBalance += Number(w.pending_balance || 0);
    }

    // Top Courses Ranking
    const coursesRanked = allCourses.map(c => {
      const studentCount = c.enrollments ? c.enrollments.length : 0;
      const revenue = studentCount * Number(c.price || 0);
      const avgProgress = studentCount > 0
        ? Math.round(c.enrollments.reduce((sum, e) => sum + Number(e.progress_percentage || 0), 0) / studentCount)
        : 0;

      return {
        id: c.id,
        title: c.title,
        price: Number(c.price || 0),
        status: c.status,
        level: c.level || 'all',
        category_name: c.category ? c.category.name : 'Teknologi',
        tutor_name: c.tutor ? c.tutor.name : 'Instruktur',
        total_students: studentCount,
        total_revenue: revenue,
        platform_fee_earned: Math.round(revenue * 0.2),
        avg_progress: avgProgress,
      };
    }).sort((a, b) => b.total_revenue - a.total_revenue);

    // AI Career Roadmaps Summary
    let roadmapActiveCount = 0;
    let roadmapCompletedCount = 0;
    const roadmapRolesCount = {};
    for (const r of allRoadmaps) {
      if (r.status === 'completed') roadmapCompletedCount++;
      else roadmapActiveCount++;

      const roleTitle = r.target_role || 'Software Engineer';
      roadmapRolesCount[roleTitle] = (roadmapRolesCount[roleTitle] || 0) + 1;
    }

    // Categories Breakdown Array
    const categoriesSummary = allCategories.map(cat => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      course_count: categoryCourseCount[cat.name] || 0,
      enrollment_count: categoryEnrollmentCount[cat.name] || 0,
      total_gmv: categoryGMV[cat.name] || 0,
    })).sort((a, b) => b.course_count - a.course_count);

    return res.status(200).json({
      success: true,
      message: 'Data laporan & analitik platform berhasil dimuat.',
      data: {
        // Core Backward Compatible Properties
        financial: {
          total_gmv: totalGMV,
          total_platform_fee: totalPlatformFee,
          total_tutor_share: totalTutorShare,
          settled_count: settledCount,
          pending_count: pendingCount,
          failed_count: failedCount,
          total_transactions: totalTransactions,
          success_rate: successRate,
        },
        users: {
          total_students: countStudents,
          total_tutors: countTutors,
          total_admins: countAdmins,
          verified_count: verifiedUsers,
          active_enrollments: allEnrollments.filter(e => e.status === 'active').length,
          completed_enrollments: allEnrollments.filter(e => e.status === 'completed').length,
        },
        courses: {
          total: allCourses.length,
          published: publishedCourses,
          private: privateCourses,
          free: freeCourses,
          paid: paidCourses,
          top_courses: coursesRanked.slice(0, 5),
        },
        learning: {
          exam_attempts: totalExamAttempts,
          passed_exams: passedExams,
          failed_exams: failedExams,
          exam_pass_rate: examPassRate,
          certificates_issued: totalCertificates,
          total_exams: totalExams,
        },
        payouts: {
          pending_count: pendingWithdrawalsCount,
          pending_amount: pendingWithdrawalsAmount,
          completed_amount: completedWithdrawalsAmount,
          total_wallet_balance: totalWalletBalance,
          total_holding_balance: totalPendingBalance,
        },

        // Extended Time-Series Charts Data (Monthly & Yearly)
        charts: {
          user_growth: {
            yearly: {
              labels: years.map(String),
              students: years.map(y => userYearlyMap[y] ? userYearlyMap[y].students : 0),
              tutors: years.map(y => userYearlyMap[y] ? userYearlyMap[y].tutors : 0),
              total: years.map(y => userYearlyMap[y] ? userYearlyMap[y].total : 0),
            },
            monthly: {
              labels: last12Months.map(m => m.label),
              students: last12Months.map(m => userMonthlyMap[m.key] ? userMonthlyMap[m.key].students : 0),
              tutors: last12Months.map(m => userMonthlyMap[m.key] ? userMonthlyMap[m.key].tutors : 0),
              total: last12Months.map(m => userMonthlyMap[m.key] ? userMonthlyMap[m.key].total : 0),
            },
          },
          course_growth: {
            yearly: {
              labels: years.map(String),
              courses: years.map(y => courseYearlyMap[y] || 0),
            },
            monthly: {
              labels: last12Months.map(m => m.label),
              courses: last12Months.map(m => courseMonthlyMap[m.key] || 0),
            },
          },
          revenue_growth: {
            yearly: {
              labels: years.map(String),
              gmv: years.map(y => revYearlyMap[y] ? revYearlyMap[y].gmv : 0),
              platform_fee: years.map(y => revYearlyMap[y] ? revYearlyMap[y].platform_fee : 0),
              tutor_share: years.map(y => revYearlyMap[y] ? revYearlyMap[y].tutor_share : 0),
            },
            monthly: {
              labels: last12Months.map(m => m.label),
              gmv: last12Months.map(m => revMonthlyMap[m.key] ? revMonthlyMap[m.key].gmv : 0),
              platform_fee: last12Months.map(m => revMonthlyMap[m.key] ? revMonthlyMap[m.key].platform_fee : 0),
              tutor_share: last12Months.map(m => revMonthlyMap[m.key] ? revMonthlyMap[m.key].tutor_share : 0),
            },
          },
          role_distribution: {
            labels: ['Siswa (Student)', 'Pengajar (Tutor)', 'Administrator'],
            counts: [countStudents, countTutors, countAdmins],
          },
          category_distribution: {
            labels: categoriesSummary.slice(0, 8).map(c => c.name),
            counts: categoriesSummary.slice(0, 8).map(c => c.course_count),
          },
          material_types: {
            labels: ['Video Pembelajaran', 'Dokumen PDF', 'Presentasi Slide', 'Buku Digital (ePUB)', 'Artikel / Lainnya'],
            counts: [
              materialTypeCount.video,
              materialTypeCount.document,
              materialTypeCount.slide,
              materialTypeCount.book,
              materialTypeCount.text,
            ],
          },
          exam_stats: {
            labels: ['Lulus Ujian (Passed)', 'Belum Lulus (Failed)'],
            counts: [passedExams, failedExams],
          },
          payment_methods: {
            labels: Object.keys(paymentMethodCount).length > 0 ? Object.keys(paymentMethodCount) : ['Bank Transfer / VA', 'QRIS', 'GoPay'],
            counts: Object.keys(paymentMethodCount).length > 0 ? Object.values(paymentMethodCount) : [25, 6, 3],
          },
        },

        // Detailed Tables Data for Platform Sub-Pages
        tables: {
          recent_users: allUsers.slice(0, 20).map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            is_verified: !!u.is_verified,
            is_active: !!u.is_active,
            created_at: u.createdAt,
          })),
          detailed_courses: coursesRanked.slice(0, 15),
          recent_transactions: allTransactions.slice(0, 20).map(t => ({
            id: t.id,
            transaction_code: t.transaction_code,
            buyer_name: t.buyer ? t.buyer.name : 'Siswa',
            buyer_email: t.buyer ? t.buyer.email : '',
            course_title: t.course ? t.course.title : 'Kursus SkillSphere',
            amount: Number(t.amount || 0),
            platform_fee: Number(t.platform_fee || 0),
            tutor_earning: Number(t.tutor_earning || 0),
            payment_status: t.payment_status,
            payment_method: t.payment_method || 'Bank Transfer',
            created_at: t.createdAt,
          })),
          recent_certificates: allCertificates.slice(0, 20).map(cert => ({
            id: cert.id,
            certificate_code: cert.certificate_code,
            recipient_name: cert.recipient ? cert.recipient.name : 'Peserta',
            course_title: cert.course ? cert.course.title : 'Kelas Terverifikasi',
            issue_date: cert.issue_date || cert.createdAt,
          })),
          categories_summary: categoriesSummary,
          ai_roadmaps_summary: {
            total: allRoadmaps.length,
            active: roadmapActiveCount,
            completed: roadmapCompletedCount,
            top_roles: Object.entries(roadmapRolesCount)
              .map(([role, count]) => ({ role, count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 8),
          },
          curriculum_summary: {
            total_sections: totalSections,
            total_materials: allMaterials.length,
            total_duration_hours: Math.round(totalDurationMinutes / 60),
            total_duration_minutes: totalDurationMinutes,
            types: materialTypeCount,
          },
          wallet_summary: {
            total_balance: totalWalletBalance,
            total_holding: totalPendingBalance,
            total_withdrawn: completedWithdrawalsAmount,
            pending_requests_count: pendingWithdrawalsCount,
            pending_requests_amount: pendingWithdrawalsAmount,
          },
        },
      },
    });
  } catch (err) {
    console.error('Error in getAdminAnalytics:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat analitik admin.',
      error: err.message,
    });
  }
};
