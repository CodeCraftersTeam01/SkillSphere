const {
  Course,
  CourseSection,
  CourseMaterial,
  Category,
  User,
  Enrollment,
} = require('../models');

/**
 * Get all courses taught by the current tutor
 */
exports.getMyCourses = async (req, res) => {
  try {
    const tutorId = req.user.id;
    const courses = await Course.findAll({
      where: { tutor_id: tutorId },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug', 'icon'],
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
    const course = await Course.findByPk(id, {
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

    return res.status(200).json({
      success: true,
      data: course,
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
 * Create a new course (Tutor)
 */
exports.createCourse = async (req, res) => {
  try {
    const tutorId = req.user.id;
    const {
      title,
      category_id,
      description,
      price = 0,
      level = 'beginner',
      thumbnail_url,
      status = 'draft',
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
      title,
      slug,
      description,
      price: parseFloat(price) || 0,
      level,
      thumbnail_url,
      status,
    });

    // Create default initial section
    const defaultSection = await CourseSection.create({
      course_id: course.id,
      title: 'Bab 1: Pengantar & Dasar Teori',
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
    } = req.body;

    if (title) course.title = title;
    if (category_id) course.category_id = category_id;
    if (description !== undefined) course.description = description;
    if (price !== undefined) course.price = parseFloat(price);
    if (level) course.level = level;
    if (thumbnail_url !== undefined) course.thumbnail_url = thumbnail_url;
    if (status) course.status = status;

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
      order: [['created_at', 'DESC']],
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
    const courseId = req.params.id;

    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Kursus tidak ditemukan.',
      });
    }

    const [enrollment, created] = await Enrollment.findOrCreate({
      where: { user_id: studentId, course_id: courseId },
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

