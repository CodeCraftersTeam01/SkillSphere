const { Op } = require('sequelize');
const {
  Course,
  CourseSection,
  CourseMaterial,
  Category,
  User,
  UserProfile,
  Enrollment,
} = require('../models');

/**
 * Get all courses taught by the current tutor
 */
exports.getMyCourses = async (req, res) => {
  try {
    const tutorId = req.user.id;
    const where = req.user.role === 'admin' ? {} : { tutor_id: tutorId };
    const courses = await Course.findAll({
      where,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug', 'icon'],
        },
        {
          model: User,
          as: 'tutor',
          attributes: ['id', 'name', 'email', 'role'],
        },
        {
          model: CourseSection,
          as: 'sections',
          include: [
            {
              model: CourseMaterial,
              as: 'materials',
              attributes: ['id', 'title', 'content_type', 'duration_minutes', 'is_preview', 'order_index', 'file_url'],
            },
          ],
        },
        {
          model: Enrollment,
          as: 'enrollments',
          attributes: ['id', 'user_id', 'status', 'created_at'],
        },
      ],
      order: [['created_at', 'DESC'], [{ model: CourseSection, as: 'sections' }, 'order_index', 'ASC']],
    });

    return res.status(200).json({
      success: true,
      data: courses,
    });
  } catch (err) {
    console.error('Error in getMyCourses:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat daftar kursus pengajar.',
      error: err.message,
    });
  }
};

/**
 * Get single course detail with full sections & materials
 */
exports.getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const isNumeric = /^\d+$/.test(id);
    const whereClause = isNumeric ? { id: parseInt(id, 10) } : { slug: id };

    const course = await Course.findOne({
      where: whereClause,
      include: [
        {
          model: Category,
          as: 'category',
        },
        {
          model: User,
          as: 'tutor',
          attributes: ['id', 'name', 'email', 'role'],
        },
        {
          model: CourseSection,
          as: 'sections',
          include: [
            {
              model: CourseMaterial,
              as: 'materials',
            },
          ],
        },
      ],
      order: [
        [{ model: CourseSection, as: 'sections' }, 'order_index', 'ASC'],
        [{ model: CourseSection, as: 'sections' }, { model: CourseMaterial, as: 'materials' }, 'order_index', 'ASC'],
      ],
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Kursus tidak ditemukan.',
      });
    }

    const courseData = course.toJSON();
    courseData.is_enrolled = false;
    courseData.is_owner = false;

    // Optional user auth detection if Authorization header is present
    if (req.user) {
      if (req.user.id === course.tutor_id || req.user.role === 'admin') {
        courseData.is_owner = true;
        courseData.is_enrolled = true;
      } else {
        const enrollment = await Enrollment.findOne({
          where: { user_id: req.user.id, course_id: course.id },
        });
        courseData.is_enrolled = !!enrollment;
      }
    }

    return res.status(200).json({
      success: true,
      data: courseData,
    });
  } catch (err) {
    console.error('Error in getCourseById:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat detail kursus.',
      error: err.message,
    });
  }
};

/**
 * Create a new course (Tutor & Admin)
 */
exports.createCourse = async (req, res) => {
  try {
    let tutorId = req.user.id;
    if (req.user.role === 'admin' && req.body.tutor_id) {
      tutorId = parseInt(req.body.tutor_id, 10);
    }

    const {
      title,
      category_id,
      description,
      price = 0,
      level = 'beginner',
      thumbnail_url,
      status = 'draft',
      initial_section_title = 'Bab 1: Pengantar & Dasar Teori',
    } = req.body;

    if (!title || !category_id) {
      return res.status(400).json({
        success: false,
        message: 'Judul kursus dan kategori wajib diisi.',
      });
    }

    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')}-${Date.now().toString().slice(-4)}`;

    const course = await Course.create({
      tutor_id: tutorId,
      category_id,
      title: title.trim(),
      slug,
      description: description ? description.trim() : null,
      price: parseFloat(price) || 0,
      level,
      thumbnail_url: thumbnail_url || null,
      status,
    });

    // Create default initial section
    const defaultSection = await CourseSection.create({
      course_id: course.id,
      title: (initial_section_title || 'Bab 1: Pengantar & Dasar Teori').trim(),
      order_index: 1,
    });

    return res.status(201).json({
      success: true,
      message: 'Kursus baru berhasil dibuat.',
      data: {
        ...course.toJSON(),
        sections: [defaultSection],
      },
    });
  } catch (err) {
    console.error('Error in createCourse:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal membuat kursus baru.',
      error: err.message,
    });
  }
};

/**
 * Update course info & thumbnail
 */
exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const tutorId = req.user.id;

    const course = await Course.findByPk(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Kursus tidak ditemukan.',
      });
    }

    if (req.user.role !== 'admin' && course.tutor_id !== tutorId) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki izin mengubah kursus ini.',
      });
    }

    const {
      title,
      category_id,
      description,
      price,
      level,
      thumbnail_url,
      status,
      tutor_id,
    } = req.body;

    if (title) course.title = title.trim();
    if (category_id) course.category_id = category_id;
    if (description !== undefined) course.description = description ? description.trim() : null;
    if (price !== undefined) course.price = parseFloat(price);
    if (level) course.level = level;
    if (thumbnail_url !== undefined) course.thumbnail_url = thumbnail_url;
    if (status) course.status = status;
    if (req.user.role === 'admin' && tutor_id) {
      course.tutor_id = parseInt(tutor_id, 10);
    }

    await course.save();

    return res.status(200).json({
      success: true,
      message: 'Informasi kursus berhasil diperbarui.',
      data: course,
    });
  } catch (err) {
    console.error('Error in updateCourse:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui kursus.',
      error: err.message,
    });
  }
};

/**
 * Delete a course and cascade sections & materials
 */
exports.deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findByPk(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Kursus tidak ditemukan.',
      });
    }

    if (req.user.role !== 'admin' && course.tutor_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Anda tidak memiliki wewenang untuk menghapus kursus ini.',
      });
    }

    const courseTitle = course.title;
    await course.destroy();

    return res.status(200).json({
      success: true,
      message: `Kursus "${courseTitle}" berhasil dihapus dari platform.`,
    });
  } catch (err) {
    console.error('Error in deleteCourse:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal menghapus kursus.',
      error: err.message,
    });
  }
};

/**
 * Create a new section under a course
 */
exports.createSection = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, order_index } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Judul bab/modul wajib diisi.',
      });
    }

    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Kursus tidak ditemukan.',
      });
    }

    if (req.user.role !== 'admin' && course.tutor_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki hak akses pada kursus ini.',
      });
    }

    const maxOrder = await CourseSection.max('order_index', { where: { course_id: courseId } }) || 0;
    const finalOrder = order_index !== undefined ? parseInt(order_index, 10) : maxOrder + 1;

    const section = await CourseSection.create({
      course_id: courseId,
      title: title.trim(),
      order_index: finalOrder,
    });

    return res.status(201).json({
      success: true,
      message: 'Bab baru berhasil ditambahkan.',
      data: {
        ...section.toJSON(),
        materials: [],
      },
    });
  } catch (err) {
    console.error('Error in createSection:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal membuat bab baru.',
      error: err.message,
    });
  }
};

/**
 * Update section title/order
 */
exports.updateSection = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { title, order_index } = req.body;

    const section = await CourseSection.findByPk(sectionId, {
      include: [{ model: Course, as: 'course' }],
    });

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Bab kursus tidak ditemukan.',
      });
    }

    if (req.user.role !== 'admin' && section.course.tutor_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak.',
      });
    }

    if (title) section.title = title.trim();
    if (order_index !== undefined) section.order_index = parseInt(order_index, 10);
    await section.save();

    return res.status(200).json({
      success: true,
      message: 'Bab berhasil diperbarui.',
      data: section,
    });
  } catch (err) {
    console.error('Error in updateSection:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui bab.',
      error: err.message,
    });
  }
};

/**
 * Delete a section and cascade materials
 */
exports.deleteSection = async (req, res) => {
  try {
    const { sectionId } = req.params;

    const section = await CourseSection.findByPk(sectionId, {
      include: [{ model: Course, as: 'course' }],
    });

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Bab kursus tidak ditemukan.',
      });
    }

    if (req.user.role !== 'admin' && section.course.tutor_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak.',
      });
    }

    await section.destroy();

    return res.status(200).json({
      success: true,
      message: 'Bab berhasil dihapus.',
    });
  } catch (err) {
    console.error('Error in deleteSection:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal menghapus bab.',
      error: err.message,
    });
  }
};

/**
 * Get all categories
 */
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      order: [['name', 'ASC']],
    });
    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat kategori.',
    });
  }
};

/**
 * Get all courses across platform (pagination, search, filtering)
 */
exports.getAllCourses = async (req, res) => {
  try {
    const { category_id, search, limit = 20, page = 1, status } = req.query;
    const parsedLimit = Math.min(parseInt(limit, 10) || 20, 100);
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (parsedPage - 1) * parsedLimit;

    const where = {};
    if (status) {
      where.status = status;
    } else {
      where.status = 'published';
    }
    if (category_id) {
      where.category_id = category_id;
    }
    if (search) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Course.findAndCountAll({
      where,
      limit: parsedLimit,
      offset,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug', 'icon'],
        },
        {
          model: User,
          as: 'tutor',
          attributes: ['id', 'name', 'email', 'role'],
        },
      ],
      order: [
        [Course.sequelize.literal('CASE WHEN thumbnail_url IS NOT NULL AND thumbnail_url != "" THEN 0 ELSE 1 END'), 'ASC'],
        ['created_at', 'DESC'],
      ],
    });

    return res.status(200).json({
      success: true,
      data: {
        total: count,
        page: parsedPage,
        limit: parsedLimit,
        total_pages: Math.ceil(count / parsedLimit),
        courses: rows,
      },
    });
  } catch (err) {
    console.error('Error in getAllCourses:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat daftar kursus platform.',
      error: err.message,
    });
  }
};

/**
 * Get courses enrolled by current student
 */
exports.getMyLearning = async (req, res) => {
  try {
    const studentId = req.user.id;
    const enrollments = await Enrollment.findAll({
      where: { user_id: studentId },
      include: [
        {
          model: Course,
          as: 'course',
          include: [
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name', 'slug', 'icon'],
            },
            {
              model: User,
              as: 'tutor',
              attributes: ['id', 'name', 'email'],
            },
            {
              model: CourseSection,
              as: 'sections',
              include: [
                {
                  model: CourseMaterial,
                  as: 'materials',
                  attributes: ['id', 'title', 'content_type', 'duration_minutes', 'is_preview', 'order_index'],
                },
              ],
            },
          ],
        },
      ],
      order: [['updated_at', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      data: enrollments,
    });
  } catch (err) {
    console.error('Error in getMyLearning:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat aktivitas belajar.',
      error: err.message,
    });
  }
};

/**
 * Enroll student into a course
 */
exports.enrollCourse = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { id } = req.params;
    const isNumeric = /^\d+$/.test(id);
    const whereClause = isNumeric ? { id: parseInt(id, 10) } : { slug: id };

    const course = await Course.findOne({ where: whereClause });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Kursus tidak ditemukan.',
      });
    }

    const [enrollment, created] = await Enrollment.findOrCreate({
      where: { user_id: studentId, course_id: course.id },
      defaults: {
        progress_percentage: 0.0,
        status: 'active',
        enrolled_at: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: created ? 'Berhasil mendaftar ke kursus!' : 'Anda sudah terdaftar di kursus ini.',
      data: enrollment,
    });
  } catch (err) {
    console.error('Error in enrollCourse:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal mendaftar ke kursus.',
      error: err.message,
    });
  }
};

/**
 * Update student learning progress for a course
 */
exports.updateLearningProgress = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { id } = req.params;
    const { progress_percentage, status } = req.body;

    const isNumeric = /^\d+$/.test(id);
    const whereClause = isNumeric ? { id: parseInt(id, 10) } : { slug: id };

    const course = await Course.findOne({ where: whereClause });
    if (!course) {
      return res.status(404).json({ success: false, message: 'Kursus tidak ditemukan.' });
    }

    const enrollment = await Enrollment.findOne({
      where: { user_id: studentId, course_id: course.id }
    });

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Data pendaftaran kursus tidak ditemukan.' });
    }

    if (progress_percentage !== undefined) {
      enrollment.progress_percentage = Math.min(100, Math.max(0, parseFloat(progress_percentage)));
    }

    if (enrollment.progress_percentage >= 100 || status === 'completed') {
      enrollment.status = 'completed';
      if (!enrollment.completed_at) enrollment.completed_at = new Date();
    } else if (status) {
      enrollment.status = status;
    }

    await enrollment.save();

    return res.status(200).json({
      success: true,
      message: 'Progres belajar berhasil diperbarui.',
      data: enrollment
    });
  } catch (err) {
    console.error('Error in updateLearningProgress:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui progres belajar.',
      error: err.message
    });
  }
};

/**
 * Submit Course Rating & Review (Sprint 3 - Tegar)
 * POST /api/courses/:id/reviews
 */
exports.submitReview = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { id } = req.params;
    const { rating, review } = req.body;

    const numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating wajib berupa angka bulat antara 1 sampai 5.',
      });
    }

    const isNumeric = /^\d+$/.test(id);
    const course = await Course.findOne({
      where: isNumeric ? { id: parseInt(id, 10) } : { slug: id },
    });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Kursus tidak ditemukan.',
      });
    }

    const enrollment = await Enrollment.findOne({
      where: { user_id: studentId, course_id: course.id },
    });
    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'Anda harus terdaftar di kursus ini untuk dapat memberikan ulasan dan rating.',
      });
    }

    enrollment.rating = numRating;
    enrollment.review = review ? String(review).trim() : null;
    await enrollment.save();

    // Hitung ulang rata-rata rating kursus
    const allReviews = await Enrollment.findAll({
      where: {
        course_id: course.id,
        rating: { [Op.ne]: null },
      },
      attributes: ['rating'],
    });

    const count = allReviews.length;
    const avg = count > 0 ? allReviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;

    course.rating_avg = parseFloat(avg.toFixed(1));
    course.rating_count = count;
    await course.save();

    return res.status(200).json({
      success: true,
      message: 'Ulasan dan rating Anda berhasil disimpan.',
      data: {
        rating: enrollment.rating,
        review: enrollment.review,
        course_rating_avg: course.rating_avg,
        course_rating_count: course.rating_count,
      },
    });
  } catch (err) {
    console.error('Error in submitReview:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengirimkan ulasan.',
      error: err.message,
    });
  }
};

/**
 * Get Course Reviews (Sprint 3 - Tegar)
 * GET /api/courses/:id/reviews
 */
exports.getCourseReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const isNumeric = /^\d+$/.test(id);
    const course = await Course.findOne({
      where: isNumeric ? { id: parseInt(id, 10) } : { slug: id },
    });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Kursus tidak ditemukan.',
      });
    }

    const enrollments = await Enrollment.findAll({
      where: {
        course_id: course.id,
        rating: { [Op.ne]: null },
      },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email'],
          include: [
            {
              model: UserProfile,
              as: 'profile',
              attributes: ['avatar_url', 'career_goal'],
            },
          ],
        },
      ],
      order: [['updated_at', 'DESC']],
      limit: 50,
    });

    const reviews = enrollments.map(e => ({
      id: e.id,
      rating: e.rating,
      review: e.review,
      created_at: e.updated_at,
      student_name: (e.student && e.student.name) || 'Pelajar',
      avatar_url: (e.student && e.student.profile && e.student.profile.avatar_url) || null,
    }));

    return res.status(200).json({
      success: true,
      data: {
        rating_avg: course.rating_avg,
        rating_count: course.rating_count,
        reviews,
      },
    });
  } catch (err) {
    console.error('Error in getCourseReviews:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat ulasan kursus.',
      error: err.message,
    });
  }
};

/**
 * Toggle Wishlist (Sprint 3 - Tegar)
 * POST /api/courses/wishlist/toggle
 */
exports.toggleWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { course_id } = req.body;

    if (!course_id) {
      return res.status(400).json({
        success: false,
        message: 'Parameter course_id wajib disertakan.',
      });
    }

    const targetCourseId = parseInt(course_id, 10);
    const course = await Course.findByPk(targetCourseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Kursus tidak ditemukan.',
      });
    }

    const [profile] = await UserProfile.findOrCreate({
      where: { user_id: userId },
      defaults: { study_preferences: { wishlist: [] } },
    });

    let prefs = profile.study_preferences;
    if (!prefs || typeof prefs !== 'object') {
      prefs = { wishlist: [] };
    }
    if (!Array.isArray(prefs.wishlist)) {
      prefs.wishlist = [];
    }

    const index = prefs.wishlist.indexOf(targetCourseId);
    let isWishlisted = false;
    if (index > -1) {
      // Hapus dari wishlist
      prefs.wishlist.splice(index, 1);
      isWishlisted = false;
    } else {
      // Tambahkan ke wishlist
      prefs.wishlist.push(targetCourseId);
      isWishlisted = true;
    }

    profile.study_preferences = { ...prefs };
    profile.changed('study_preferences', true);
    await profile.save();

    return res.status(200).json({
      success: true,
      message: isWishlisted
        ? 'Kursus berhasil ditambahkan ke wishlist.'
        : 'Kursus berhasil dihapus dari wishlist.',
      data: {
        is_wishlisted: isWishlisted,
        wishlist_count: prefs.wishlist.length,
      },
    });
  } catch (err) {
    console.error('Error in toggleWishlist:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui wishlist.',
      error: err.message,
    });
  }
};

/**
 * Get Wishlist Courses (Sprint 3 - Tegar)
 * GET /api/courses/wishlist
 */
exports.getWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await UserProfile.findOne({ where: { user_id: userId } });

    const wishlistIds = (profile && profile.study_preferences && Array.isArray(profile.study_preferences.wishlist))
      ? profile.study_preferences.wishlist
      : [];

    if (wishlistIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const courses = await Course.findAll({
      where: {
        id: { [Op.in]: wishlistIds },
      },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug'],
        },
        {
          model: User,
          as: 'tutor',
          attributes: ['id', 'name'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      data: courses,
    });
  } catch (err) {
    console.error('Error in getWishlist:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat daftar wishlist.',
      error: err.message,
    });
  }
};


