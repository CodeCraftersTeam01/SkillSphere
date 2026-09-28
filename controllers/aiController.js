const { AICareerRoadmap, UserProfile, User, Course, CourseSection, CourseMaterial } = require('../models');
const geminiService = require('../services/geminiService');

/**
 * Generate or Re-generate AI Career Roadmap (Sprint 2 - Tegar)
 */
exports.generateCareerRoadmap = async (req, res) => {
  try {
    const userId = req.user.id;
    const { target_role, study_preferences, force_refresh } = req.body;

    const profile = await UserProfile.findOne({ where: { user_id: userId } });

    const finalTargetRole = target_role || (profile && profile.career_goal) || 'Fullstack AI Engineer';
    const finalPreferences = study_preferences || (profile && profile.study_preferences) || {};

    // Check if an active roadmap already exists and force_refresh is not requested
    if (!force_refresh) {
      const existingRoadmap = await AICareerRoadmap.findOne({
        where: { user_id: userId, target_role: finalTargetRole, status: 'active' },
        order: [['created_at', 'DESC']],
      });

      if (existingRoadmap) {
        return res.status(200).json({
          success: true,
          message: 'Roadmap karir AI yang sudah ada berhasil dimuat.',
          data: existingRoadmap,
        });
      }
    }

    // Generate new roadmap via Gemini AI service
    const generated = await geminiService.generateCareerRoadmap({
      targetRole: finalTargetRole,
      userProfile: profile ? profile.toJSON() : {},
      studyPreferences: finalPreferences,
    });

    // Mark previous active roadmaps as draft/completed
    await AICareerRoadmap.update(
      { status: 'draft' },
      { where: { user_id: userId, status: 'active' } }
    );

    // Save new roadmap to database
    const savedRoadmap = await AICareerRoadmap.create({
      user_id: userId,
      target_role: generated.target_role,
      recommended_skills: generated.recommended_skills,
      roadmap_data: generated.roadmap_data,
      status: 'active',
    });

    // Update career_goal in profile if changed
    if (profile && profile.career_goal !== finalTargetRole) {
      await profile.update({ career_goal: finalTargetRole });
    }

    return res.status(201).json({
      success: true,
      message: `AI Career Roadmap menuju "${finalTargetRole}" berhasil dibuat oleh Gemini AI.`,
      data: savedRoadmap,
    });
  } catch (err) {
    console.error('Error in generateCareerRoadmap:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal membuat AI Career Roadmap.',
      error: err.message,
    });
  }
};

/**
 * Get Current Active AI Career Roadmap for User (Sprint 2 - Tegar)
 */
exports.getMyCareerRoadmap = async (req, res) => {
  try {
    const userId = req.user.id;

    let roadmap = await AICareerRoadmap.findOne({
      where: { user_id: userId, status: 'active' },
      order: [['created_at', 'DESC']],
    });

    if (!roadmap) {
      // If no roadmap exists yet, automatically create one based on profile
      const profile = await UserProfile.findOne({ where: { user_id: userId } });
      const targetRole = (profile && profile.career_goal) || 'Fullstack AI Engineer';
      const studyPreferences = (profile && profile.study_preferences) || {};

      const generated = await geminiService.generateCareerRoadmap({
        targetRole,
        userProfile: profile ? profile.toJSON() : {},
        studyPreferences,
      });

      roadmap = await AICareerRoadmap.create({
        user_id: userId,
        target_role: generated.target_role,
        recommended_skills: generated.recommended_skills,
        roadmap_data: generated.roadmap_data,
        status: 'active',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Roadmap karir AI berhasil dimuat.',
      data: roadmap,
    });
  } catch (err) {
    console.error('Error in getMyCareerRoadmap:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat AI Career Roadmap.',
      error: err.message,
    });
  }
};

/**
 * Update Milestone Progress in AI Career Roadmap (Sprint 2 - Tegar)
 */
exports.updateMilestoneStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { step } = req.params;
    const { status } = req.body; // 'pending', 'in_progress', 'completed'

    const roadmap = await AICareerRoadmap.findOne({
      where: { user_id: userId, status: 'active' },
      order: [['created_at', 'DESC']],
    });

    if (!roadmap) {
      return res.status(404).json({
        success: false,
        message: 'Roadmap aktif tidak ditemukan.',
      });
    }

    const stepNumber = parseInt(step, 10);
    let roadmapData = roadmap.roadmap_data;
    if (typeof roadmapData === 'string') {
      try {
        roadmapData = JSON.parse(roadmapData);
      } catch (e) {
        roadmapData = {};
      }
    } else if (roadmapData) {
      roadmapData = JSON.parse(JSON.stringify(roadmapData));
    } else {
      roadmapData = {};
    }

    if (!Array.isArray(roadmapData.milestones)) {
      return res.status(400).json({
        success: false,
        message: 'Struktur milestones pada roadmap tidak valid.',
      });
    }

    const targetMilestone = roadmapData.milestones.find((m) => m.step === stepNumber);
    if (!targetMilestone) {
      return res.status(404).json({
        success: false,
        message: `Milestone dengan langkah #${step} tidak ditemukan.`,
      });
    }

    targetMilestone.status = status || (targetMilestone.status === 'completed' ? 'in_progress' : 'completed');
    targetMilestone.updated_at = new Date().toISOString();

    // Check if all milestones completed
    const allCompleted = roadmapData.milestones.every((m) => m.status === 'completed');
    if (allCompleted) {
      roadmap.status = 'completed';
    }

    roadmap.roadmap_data = roadmapData;
    roadmap.changed('roadmap_data', true);
    await roadmap.save();

    return res.status(200).json({
      success: true,
      message: `Status milestone #${step} berhasil diperbarui menjadi "${targetMilestone.status}".`,
      data: roadmap,
    });
  } catch (err) {
    console.error('Error in updateMilestoneStatus:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui status milestone.',
      error: err.message,
    });
  }
};

/**
 * AI Study Assistant Chat (Sprint 2 - Tegar)
 */
exports.chatStudyAssistant = async (req, res) => {
  try {
    const { message, conversation_history, course_id } = req.body;
    const studentName = req.user ? req.user.name : 'Pelajar';

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Pesan pertanyaan wajib diisi.',
      });
    }

    let courseContext = null;
    if (course_id) {
      const course = await Course.findByPk(course_id, {
        include: [{ model: CourseSection, as: 'sections' }],
      });
      if (course) {
        courseContext = {
          title: course.title,
          description: course.description,
          sections: course.sections ? course.sections.map((s) => s.title) : [],
        };
      }
    }

    const response = await geminiService.chatStudyAssistant({
      message: message.trim(),
      conversationHistory: conversation_history || [],
      courseContext,
      studentName,
    });

    return res.status(200).json({
      success: true,
      message: 'Respon asisten belajar AI berhasil dibuat.',
      data: response,
    });
  } catch (err) {
    console.error('Error in chatStudyAssistant:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan respon dari AI Study Assistant.',
      error: err.message,
    });
  }
};

/**
 * Generate Adaptive Practice Quiz (Sprint 2 - Tegar)
 */
exports.generateQuiz = async (req, res) => {
  try {
    const { topic, number_of_questions = 3, difficulty = 'medium' } = req.body;

    if (!topic || topic.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Topik soal kuis wajib ditentukan.',
      });
    }

    const quiz = await geminiService.generatePracticeQuiz({
      topic: topic.trim(),
      numberOfQuestions: Math.min(parseInt(number_of_questions, 10) || 3, 10),
      difficulty,
    });

    return res.status(200).json({
      success: true,
      message: `Kuis latihan AI untuk topik "${topic}" berhasil dibuat.`,
      data: quiz,
    });
  } catch (err) {
    console.error('Error in generateQuiz:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal membuat kuis latihan AI.',
      error: err.message,
    });
  }
};

/**
 * Generate AI Summary & Key Concepts for Course Material (Sprint 2 - Tegar)
 */
exports.explainMaterial = async (req, res) => {
  try {
    const { material_id, material_title, material_content, target_level } = req.body;

    let title = material_title;
    let content = material_content;

    if (material_id && (!title || !content)) {
      const material = await CourseMaterial.findByPk(material_id);
      if (material) {
        title = title || material.title;
        content = content || `Format: ${material.content_type}, Durasi: ${material.duration_minutes} menit`;
      }
    }

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Judul materi atau ID materi wajib disertakan.',
      });
    }

    const explanation = await geminiService.explainCourseMaterial({
      materialTitle: title,
      materialContent: content,
      targetLevel: target_level || 'intermediate',
    });

    return res.status(200).json({
      success: true,
      message: 'Penjelasan AI untuk materi berhasil dibuat.',
      data: explanation,
    });
  } catch (err) {
    console.error('Error in explainMaterial:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memproses penjelasan AI materi.',
      error: err.message,
    });
  }
};
