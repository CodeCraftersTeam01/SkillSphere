const { CourseMaterial, CourseSection, Course, Enrollment } = require('../models');
const { deleteStoredFile } = require('../utils/mediaStorage');

async function getMaterialsBySection(req, res) {
  try {
    const { sectionId } = req.params;
    const section = await CourseSection.findByPk(sectionId, {
      include: [
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'tutor_id', 'title', 'price', 'status'],
        },
      ],
    });

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Bagian kursus (section) tidak ditemukan.',
      });
    }

    const isTutorOrAdmin = req.user && (req.user.role === 'admin' || req.user.id === section.course.tutor_id);
    let isEnrolled = false;

    if (req.user && !isTutorOrAdmin) {
      const enrollment = await Enrollment.findOne({
        where: { user_id: req.user.id, course_id: section.course.id },
      });
      isEnrolled = !!enrollment;
    }

    const materials = await CourseMaterial.findAll({
      where: { section_id: sectionId },
      order: [['order_index', 'ASC'], ['id', 'ASC']],
    });

    const sanitizedMaterials = materials.map((item) => {
      const isAccessible = isTutorOrAdmin || isEnrolled || item.is_preview;
      const data = item.toJSON();
      if (!isAccessible) {
        data.file_url = null;
        data.is_locked = true;
      } else {
        data.is_locked = false;
      }
      return data;
    });

    return res.json({
      success: true,
      data: sanitizedMaterials,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Gagal mengambil data materi kursus.',
    });
  }
}

async function getMaterialById(req, res) {
  try {
    const { id } = req.params;
    const material = await CourseMaterial.findByPk(id, {
      include: [
        {
          model: CourseSection,
          as: 'section',
          include: [
            {
              model: Course,
              as: 'course',
              attributes: ['id', 'tutor_id', 'title', 'price', 'status'],
            },
          ],
        },
      ],
    });

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Materi kursus tidak ditemukan.',
      });
    }

    const course = material.section.course;
    const isTutorOrAdmin = req.user && (req.user.role === 'admin' || req.user.id === course.tutor_id);
    let isEnrolled = false;

    if (req.user && !isTutorOrAdmin) {
      const enrollment = await Enrollment.findOne({
        where: { user_id: req.user.id, course_id: course.id },
      });
      isEnrolled = !!enrollment;
    }

    const isAccessible = isTutorOrAdmin || isEnrolled || material.is_preview;
    const data = material.toJSON();

    if (!isAccessible) {
      data.file_url = null;
      data.is_locked = true;
    } else {
      data.is_locked = false;
    }

    return res.json({
      success: true,
      data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Gagal mengambil detail materi.',
    });
  }
}

async function createMaterial(req, res) {
  try {
    const { section_id, title, duration_minutes, is_preview, order_index } = req.body;
    let { content_type, file_url } = req.body;

    if (!section_id || !title) {
      return res.status(400).json({
        success: false,
        message: 'section_id dan title wajib diisi.',
      });
    }

    const section = await CourseSection.findByPk(section_id, {
      include: [{ model: Course, as: 'course' }],
    });

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Bagian kursus (section) tidak ditemukan.',
      });
    }

    if (req.user.role !== 'admin' && section.course.tutor_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki hak akses untuk menambahkan materi pada kursus ini.',
      });
    }

    if (req.file) {
      const category = req.detectedCategory || req.uploadCategory || 'general';
      const subfolderMap = {
        video: 'materials/videos',
        ppt: 'materials/slides',
        pdf: 'materials/documents',
        doc: 'materials/documents',
        book: 'materials/books',
      };
      const subfolder = subfolderMap[category] || 'general';
      file_url = `/uploads/${subfolder}/${req.file.filename}`;

      if (!content_type) {
        content_type = category === 'general' ? 'doc' : category;
      }
    }

    if (!file_url) {
      return res.status(400).json({
        success: false,
        message: 'File materi atau file_url wajib disertakan.',
      });
    }

    const validTypes = ['video', 'ppt', 'pdf', 'doc', 'book'];
    if (!content_type || !validTypes.includes(content_type)) {
      content_type = 'doc';
    }

    const highestOrder = await CourseMaterial.max('order_index', {
      where: { section_id },
    }) || 0;

    const material = await CourseMaterial.create({
      section_id,
      title: title.trim(),
      content_type,
      file_url,
      duration_minutes: duration_minutes ? parseInt(duration_minutes, 10) : 0,
      is_preview: is_preview === 'true' || is_preview === true || is_preview === 1,
      order_index: order_index ? parseInt(order_index, 10) : highestOrder + 1,
    });

    return res.status(201).json({
      success: true,
      message: 'Materi kursus berhasil ditambahkan.',
      data: material,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Gagal menambahkan materi kursus.',
    });
  }
}

async function updateMaterial(req, res) {
  try {
    const { id } = req.params;
    const material = await CourseMaterial.findByPk(id, {
      include: [
        {
          model: CourseSection,
          as: 'section',
          include: [{ model: Course, as: 'course' }],
        },
      ],
    });

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Materi kursus tidak ditemukan.',
      });
    }

    const course = material.section.course;
    if (req.user.role !== 'admin' && course.tutor_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki hak akses untuk memperbarui materi ini.',
      });
    }

    const updateData = {};
    if (req.body.title !== undefined) updateData.title = req.body.title.trim();
    if (req.body.content_type !== undefined) updateData.content_type = req.body.content_type;
    if (req.body.duration_minutes !== undefined) updateData.duration_minutes = parseInt(req.body.duration_minutes, 10);
    if (req.body.is_preview !== undefined) {
      updateData.is_preview = req.body.is_preview === 'true' || req.body.is_preview === true || req.body.is_preview === 1;
    }
    if (req.body.order_index !== undefined) updateData.order_index = parseInt(req.body.order_index, 10);

    if (req.file) {
      const category = req.detectedCategory || req.uploadCategory || 'general';
      const subfolderMap = {
        video: 'materials/videos',
        ppt: 'materials/slides',
        pdf: 'materials/documents',
        doc: 'materials/documents',
        book: 'materials/books',
      };
      const subfolder = subfolderMap[category] || 'general';
      const newFileUrl = `/uploads/${subfolder}/${req.file.filename}`;

      if (material.file_url) {
        await deleteStoredFile(material.file_url).catch(() => {});
      }

      updateData.file_url = newFileUrl;
      if (!req.body.content_type) {
        updateData.content_type = category === 'general' ? 'doc' : category;
      }
    } else if (req.body.file_url && req.body.file_url !== material.file_url) {
      if (material.file_url) {
        await deleteStoredFile(material.file_url).catch(() => {});
      }
      updateData.file_url = req.body.file_url;
    }

    await material.update(updateData);

    return res.json({
      success: true,
      message: 'Materi kursus berhasil diperbarui.',
      data: material,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Gagal memperbarui materi kursus.',
    });
  }
}

async function deleteMaterial(req, res) {
  try {
    const { id } = req.params;
    const material = await CourseMaterial.findByPk(id, {
      include: [
        {
          model: CourseSection,
          as: 'section',
          include: [{ model: Course, as: 'course' }],
        },
      ],
    });

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Materi kursus tidak ditemukan.',
      });
    }

    const course = material.section.course;
    if (req.user.role !== 'admin' && course.tutor_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki hak akses untuk menghapus materi ini.',
      });
    }

    if (material.file_url) {
      await deleteStoredFile(material.file_url).catch(() => {});
    }

    await material.destroy();

    return res.json({
      success: true,
      message: 'Materi kursus dan file media terkait berhasil dihapus.',
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Gagal menghapus materi kursus.',
    });
  }
}

async function reorderMaterials(req, res) {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Daftar items reorder wajib berupa array of { id, order_index }.',
      });
    }

    const firstItem = await CourseMaterial.findByPk(items[0].id, {
      include: [{ model: CourseSection, as: 'section', include: [{ model: Course, as: 'course' }] }],
    });

    if (firstItem && req.user.role !== 'admin' && firstItem.section.course.tutor_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki hak akses untuk mengatur urutan materi kursus ini.',
      });
    }

    for (const item of items) {
      if (item.id && item.order_index !== undefined) {
        await CourseMaterial.update(
          { order_index: item.order_index },
          { where: { id: item.id } }
        );
      }
    }

    return res.json({
      success: true,
      message: 'Urutan materi berhasil diperbarui.',
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Gagal mengatur ulang urutan materi.',
    });
  }
}

module.exports = {
  getMaterialsBySection,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  reorderMaterials,
};
