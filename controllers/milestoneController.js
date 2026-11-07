const {
  CourseMilestone,
  DiscountEarned,
  Course,
  CourseSection,
  Enrollment,
} = require('../models');

/**
 * 1. Ambil Daftar Milestone Belajar untuk Kursus Tertentu
 * GET /api/milestones/course/:course_id
 */
async function getCourseMilestones(req, res) {
  try {
    const { course_id } = req.params;
    const userId = req.user ? req.user.id : null;

    const course = await Course.findByPk(course_id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Kursus tidak ditemukan.',
      });
    }

    const milestones = await CourseMilestone.findAll({
      where: { course_id },
      include: [
        {
          model: CourseSection,
          as: 'section',
          attributes: ['id', 'title', 'order_index'],
        },
      ],
      order: [['target_days', 'ASC']],
    });

    // Jika siswa login, periksa apakah siswa sudah mengklaim voucher untuk milestone ini
    let studentVouchers = [];
    if (userId) {
      studentVouchers = await DiscountEarned.findAll({
        where: { user_id: userId },
      });
    }

    const claimedMilestoneIds = new Set(studentVouchers.map((v) => v.milestone_id));

    const enrichedMilestones = milestones.map((m) => {
      const isClaimed = claimedMilestoneIds.has(m.id);
      const matchedVoucher = studentVouchers.find((v) => v.milestone_id === m.id);
      return {
        id: m.id,
        course_id: m.course_id,
        section_id: m.section_id,
        section_title: m.section ? m.section.title : null,
        title: m.title,
        description: m.description,
        target_days: m.target_days,
        reward_discount_percentage: m.reward_discount_percentage,
        is_claimed: isClaimed,
        discount_code: isClaimed && matchedVoucher ? matchedVoucher.discount_code : null,
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Daftar milestone kursus berhasil dimuat.',
      data: enrichedMilestones,
    });
  } catch (err) {
    console.error('Error in getCourseMilestones:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat milestone kursus.',
      error: err.message,
    });
  }
}

/**
 * 2. Tutor / Admin Membuat atau Memperbarui Milestone Belajar
 * POST /api/milestones/course/:course_id
 */
async function createOrUpdateMilestone(req, res) {
  try {
    const { course_id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const {
      id,
      section_id,
      title,
      description,
      target_days = 3,
      reward_discount_percentage = 10,
    } = req.body;

    const course = await Course.findByPk(course_id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Kursus tidak ditemukan.',
      });
    }

    if (userRole !== 'admin' && course.tutor_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Anda bukan pengajar untuk kursus ini.',
      });
    }

    if (!title || String(title).trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Judul target milestone wajib diisi minimal 3 karakter.',
      });
    }

    const sanitizedDays = Math.max(1, Number(target_days) || 3);
    const sanitizedDiscount = Math.max(5, Math.min(50, Number(reward_discount_percentage) || 10));

    let milestone = null;
    let isCreated = false;

    if (id) {
      milestone = await CourseMilestone.findByPk(id);
      if (milestone && milestone.course_id === Number(course_id)) {
        await milestone.update({
          section_id: section_id || null,
          title: title.trim(),
          description: description ? description.trim() : '',
          target_days: sanitizedDays,
          reward_discount_percentage: sanitizedDiscount,
        });
      }
    }

    if (!milestone) {
      milestone = await CourseMilestone.create({
        course_id: Number(course_id),
        section_id: section_id || null,
        title: title.trim(),
        description: description ? description.trim() : '',
        target_days: sanitizedDays,
        reward_discount_percentage: sanitizedDiscount,
      });
      isCreated = true;
    }

    return res.status(isCreated ? 201 : 200).json({
      success: true,
      message: isCreated ? 'Target milestone berhasil ditambahkan.' : 'Milestone berhasil diperbarui.',
      data: milestone,
    });
  } catch (err) {
    console.error('Error in createOrUpdateMilestone:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal menyimpan target milestone.',
      error: err.message,
    });
  }
}

/**
 * 3. Siswa Mengevaluasi & Mengklaim Reward Diskon Milestone
 * POST /api/milestones/:id/claim
 */
async function evaluateAndClaimMilestone(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const milestone = await CourseMilestone.findByPk(id, {
      include: [{ model: Course, as: 'course' }],
    });

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: 'Target milestone tidak ditemukan.',
      });
    }

    // Cek pendaftaran aktif siswa
    const enrollment = await Enrollment.findOne({
      where: {
        user_id: userId,
        course_id: milestone.course_id,
        status: ['active', 'completed'],
      },
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'Anda belum terdaftar di kursus ini.',
      });
    }

    // Cek apakah reward sudah pernah diklaim
    const existingDiscount = await DiscountEarned.findOne({
      where: { user_id: userId, milestone_id: milestone.id },
    });

    if (existingDiscount) {
      return res.status(400).json({
        success: false,
        message: 'Anda sudah mengklaim reward voucher untuk milestone ini.',
        data: existingDiscount,
      });
    }

    // Hitung durasi belajar dari tanggal pendaftaran
    const enrollmentDate = new Date(enrollment.enrolled_at || enrollment.createdAt);
    const now = new Date();
    const daysElapsed = Math.max(1, Math.ceil((now - enrollmentDate) / (1000 * 60 * 60 * 24)));

    // Evaluasi gamifikasi target waktu
    const isWithinTarget = daysElapsed <= milestone.target_days;

    if (!isWithinTarget) {
      return res.status(400).json({
        success: false,
        message: `Batas waktu milestone telah terlewati (${daysElapsed} hari dari target ${milestone.target_days} hari). Terus semangat belajar untuk milestone berikutnya!`,
        data: {
          days_elapsed: daysElapsed,
          target_days: milestone.target_days,
          is_eligible: false,
        },
      });
    }

    // Buat voucher diskon unik untuk siswa (aktif 30 hari ke depan)
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const discountCode = `MILE-${milestone.reward_discount_percentage}-${randomSuffix}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const discountEarned = await DiscountEarned.create({
      user_id: userId,
      milestone_id: milestone.id,
      discount_code: discountCode,
      discount_percentage: milestone.reward_discount_percentage,
      is_used: false,
      expires_at: expiresAt,
    });

    return res.status(201).json({
      success: true,
      message: `🎉 Selamat! Anda berhasil menyelesaikan milestone dalam ${daysElapsed} hari (target ${milestone.target_days} hari). Voucher diskon ${milestone.reward_discount_percentage}% berhasil didapatkan!`,
      data: {
        discount_code: discountEarned.discount_code,
        discount_percentage: discountEarned.discount_percentage,
        expires_at: discountEarned.expires_at,
        milestone_title: milestone.title,
        course_title: milestone.course ? milestone.course.title : '',
      },
    });
  } catch (err) {
    console.error('Error in evaluateAndClaimMilestone:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengklaim reward milestone.',
      error: err.message,
    });
  }
}

/**
 * 4. Ambil Daftar Voucher Diskon yang Diperoleh Siswa
 * GET /api/milestones/my-discounts
 */
async function getStudentDiscounts(req, res) {
  try {
    const userId = req.user.id;

    const discounts = await DiscountEarned.findAll({
      where: { user_id: userId },
      include: [
        {
          model: CourseMilestone,
          as: 'milestone',
          include: [{ model: Course, as: 'course', attributes: ['id', 'title'] }],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      message: 'Daftar voucher diskon siswa berhasil dimuat.',
      data: discounts,
    });
  } catch (err) {
    console.error('Error in getStudentDiscounts:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat daftar voucher diskon.',
      error: err.message,
    });
  }
}

/**
 * 5. Validasi Kode Voucher Diskon saat Checkout Kursus
 * POST /api/milestones/validate-discount
 */
async function validateDiscountCode(req, res) {
  try {
    const userId = req.user.id;
    const { code, course_id } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Kode voucher wajib diisi.',
      });
    }

    const discount = await DiscountEarned.findOne({
      where: {
        discount_code: String(code).trim().toUpperCase(),
        user_id: userId,
      },
      include: [{ model: CourseMilestone, as: 'milestone' }],
    });

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: 'Kode voucher tidak valid atau bukan milik akun Anda.',
      });
    }

    if (discount.is_used) {
      return res.status(400).json({
        success: false,
        message: 'Voucher ini sudah pernah digunakan.',
      });
    }

    if (discount.expires_at && new Date() > new Date(discount.expires_at)) {
      return res.status(400).json({
        success: false,
        message: 'Voucher telah kedaluwarsa.',
      });
    }

    let originalPrice = 0;
    if (course_id) {
      const course = await Course.findByPk(course_id);
      if (course) {
        originalPrice = Number(course.price || 0);
      }
    }

    const discountAmount = Math.round((originalPrice * discount.discount_percentage) / 100);
    const finalPrice = Math.max(0, originalPrice - discountAmount);

    return res.status(200).json({
      success: true,
      message: `Voucher diskon ${discount.discount_percentage}% valid!`,
      data: {
        code: discount.discount_code,
        discount_percentage: discount.discount_percentage,
        original_price: originalPrice,
        discount_amount: discountAmount,
        final_price: finalPrice,
      },
    });
  } catch (err) {
    console.error('Error in validateDiscountCode:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memvalidasi kode diskon.',
      error: err.message,
    });
  }
}

/**
 * 6. Hapus Milestone
 * DELETE /api/milestones/:id
 */
async function deleteMilestone(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const milestone = await CourseMilestone.findByPk(id, {
      include: [{ model: Course, as: 'course' }],
    });

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: 'Milestone tidak ditemukan.',
      });
    }

    if (userRole !== 'admin' && milestone.course && milestone.course.tutor_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Anda tidak berhak menghapus milestone ini.',
      });
    }

    await milestone.destroy();

    return res.status(200).json({
      success: true,
      message: 'Milestone berhasil dihapus.',
    });
  } catch (err) {
    console.error('Error in deleteMilestone:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal menghapus milestone.',
      error: err.message,
    });
  }
}

module.exports = {
  getCourseMilestones,
  createOrUpdateMilestone,
  evaluateAndClaimMilestone,
  getStudentDiscounts,
  validateDiscountCode,
  deleteMilestone,
};

