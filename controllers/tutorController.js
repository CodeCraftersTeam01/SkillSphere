const {
  TutorApplication,
  TutorCertification,
  User,
  UserProfile,
  TutorWallet,
  Course,
  Enrollment,
  Transaction,
  Exam,
  ExamResult,
  Certificate,
} = require('../models');
const whatsappService = require('../services/whatsappService');

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

    // Kirim notifikasi WhatsApp ke Admin terkait pendaftaran tutor baru
    (async () => {
      try {
        const admin = await User.findOne({
          where: { role: 'admin' },
          include: [{ model: UserProfile, as: 'profile' }],
        });
        const applicant = await User.findByPk(userId);
        const adminPhone = admin?.profile?.phone_number || '085648077829';

        await whatsappService.sendWhatsAppTutorApplicationAlert(adminPhone, {
          adminName: admin?.name || 'Administrator',
          applicantName: applicant?.name || 'Calon Pengajar',
          applicantEmail: applicant?.email || '',
          specialization: institution_name || 'Teknologi & Keahlian Digital',
          reviewUrl: `${process.env.APP_URL || 'https://demo.codingsolver.my.id'}/admin/tutors`,
        });
      } catch (waErr) {
        console.warn('⚠️ [Tutor Application WA Alert] Gagal mengirim alert ke admin:', waErr.message);
      }
    })();

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

/**
 * Tutor Teaching Performance & Course Analytics (Clean & Minimalist)
 * GET /api/tutor/analytics
 */
exports.getTutorAnalytics = async (req, res) => {
  try {
    const tutorId = req.user.id;

    // 1. Tutor Wallet & Sales Summary
    const [wallet] = await TutorWallet.findOrCreate({
      where: { tutor_id: tutorId },
      defaults: { balance: 0.00, pending_balance: 0.00 },
    });

    // 2. Courses owned by tutor
    const courses = await Course.findAll({
      where: { tutor_id: tutorId },
      include: [
        {
          model: Enrollment,
          as: 'enrollments',
          include: [
            {
              model: User,
              as: 'student',
              attributes: ['id', 'name', 'email'],
              include: [{ model: UserProfile, as: 'profile', attributes: ['phone_number', 'avatar_url'] }],
            },
          ],
        },
        {
          model: Exam,
          as: 'exams',
          include: [
            { model: ExamResult, as: 'results' },
          ],
        },
      ],
    });

    const courseIds = courses.map(c => c.id);

    // Total sales transactions for this tutor's courses
    const salesTransactions = courseIds.length > 0 ? await Transaction.findAll({
      where: {
        course_id: courseIds,
        payment_status: 'settlement',
      },
      attributes: ['course_id', 'amount', 'tutor_earning', 'created_at'],
    }) : [];

    const totalEarning = salesTransactions.reduce((acc, t) => acc + Number(t.tutor_earning || 0), 0);
    const totalGrossRevenue = salesTransactions.reduce((acc, t) => acc + Number(t.amount || 0), 0);

    // 3. Students & Progress Calculation
    let totalEnrolledStudents = 0;
    let totalCompletedStudents = 0;
    let sumProgress = 0;
    const atRiskStudents = [];

    const courseBreakdown = courses.map(c => {
      const enrollments = c.enrollments || [];
      const studentCount = enrollments.length;
      totalEnrolledStudents += studentCount;

      let courseSumProgress = 0;
      let courseCompleted = 0;

      for (const en of enrollments) {
        const prog = Number(en.progress_percentage || 0);
        courseSumProgress += prog;
        sumProgress += prog;
        if (prog >= 100) {
          courseCompleted++;
          totalCompletedStudents++;
        } else if (prog < 30 && en.student) {
          atRiskStudents.push({
            studentId: en.student.id,
            studentName: en.student.name,
            studentEmail: en.student.email,
            phone: en.student.profile?.phone_number || '085648077829',
            courseId: c.id,
            courseTitle: c.title,
            progress: prog,
            enrolledAt: en.created_at,
          });
        }
      }

      const avgCourseProgress = studentCount > 0 ? Math.round(courseSumProgress / studentCount) : 0;
      const courseSales = salesTransactions.filter(t => t.course_id === c.id);
      const courseEarning = courseSales.reduce((acc, t) => acc + Number(t.tutor_earning || 0), 0);

      // Exam stats for this course
      const examResults = (c.exams || []).flatMap(e => e.results || []);
      const examPassCount = examResults.filter(r => r.is_passed).length;
      const examPassRate = examResults.length > 0 ? Math.round((examPassCount / examResults.length) * 100) : 0;

      return {
        id: c.id,
        title: c.title,
        price: Number(c.price || 0),
        status: c.status,
        total_students: studentCount,
        tutor_earning: courseEarning,
        avg_progress: avgCourseProgress,
        completed_count: courseCompleted,
        exam_pass_rate: examPassRate,
      };
    });

    const overallAvgProgress = totalEnrolledStudents > 0 ? Math.round(sumProgress / totalEnrolledStudents) : 0;
    const completionRate = totalEnrolledStudents > 0 ? Math.round((totalCompletedStudents / totalEnrolledStudents) * 100) : 0;

    return res.status(200).json({
      success: true,
      message: 'Data analitik performa pengajar berhasil dimuat.',
      data: {
        financial: {
          total_earning: totalEarning,
          total_gross_revenue: totalGrossRevenue,
          wallet_balance: Number(wallet.balance || 0),
          pending_balance: Number(wallet.pending_balance || 0),
          total_withdrawn: Number(wallet.total_withdrawn || 0),
        },
        learning: {
          total_courses: courses.length,
          total_enrolled: totalEnrolledStudents,
          total_completed: totalCompletedStudents,
          overall_avg_progress: overallAvgProgress,
          completion_rate: completionRate,
        },
        courses: courseBreakdown,
        at_risk_students: atRiskStudents.slice(0, 10),
      },
    });
  } catch (err) {
    console.error('Error in getTutorAnalytics:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat analitik pengajar.',
      error: err.message,
    });
  }
};
