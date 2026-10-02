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
} = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

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
