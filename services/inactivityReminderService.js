require('dotenv').config();
const { Op } = require('sequelize');
const { Enrollment, Course, User, UserProfile } = require('../models');
const { callGeminiAPI } = require('./geminiService');
const whatsappService = require('./whatsappService');

/**
 * Service to identify inactive students and dispatch personalized AI study reminders via WhatsApp.
 */

/**
 * Generate a friendly AI study encouragement message
 * @param {string} studentName
 * @param {string} courseTitle
 * @param {number} progressPercentage
 * @returns {Promise<string>}
 */
async function generateStudyEncouragement(studentName, courseTitle, progressPercentage) {
  const fallback = `Sudah beberapa hari Anda belum melanjutkan kelas ${courseTitle}. Luangkan 10 menit hari ini untuk melangkah lebih dekat ke target keahlian Anda!`;

  if (process.env.NODE_ENV === 'test') {
    return `Halo ${studentName}, tetap semangat belajar di kelas ${courseTitle}! Progres Anda sudah mencapai ${Math.round(progressPercentage)}%.`;
  }

  try {
    const prompt = `Buatkan pesan sapaan pengingat belajar yang ramah, santun, memotivasi, dan singkat (maksimal 2 kalimat) untuk siswa bernama ${studentName} yang sedang mengambil kelas "${courseTitle}" dengan progres belajar saat ini ${Math.round(progressPercentage)}%. Tulis dalam Bahasa Indonesia santai dan suportif. Jangan gunakan tanda em dash (-). Langsung tulis pesannya tanpa tanda kutip.`;
    const systemInstruction = 'Anda adalah asisten mentor AI SkillSphere yang ramah, suportif, dan memotivasi siswa untuk terus konsisten belajar.';

    const aiResponse = await callGeminiAPI(prompt, systemInstruction, 0.7);
    if (aiResponse && aiResponse.trim().length > 10) {
      // Clean up any em-dash if model produced it
      return aiResponse.replace(/—/g, '-').trim();
    }
    return fallback;
  } catch (err) {
    return fallback;
  }
}

/**
 * Check and process inactive student enrollments
 * @param {object} options
 * @param {number} options.daysInactive - threshold in days (default: 2)
 * @param {boolean} options.dryRun - if true, only returns target students without sending WA
 * @param {boolean} options.forceAllActive - if true, processes active incomplete enrollments regardless of timestamp (useful for testing)
 * @returns {Promise<{totalChecked: number, totalReminded: number, results: Array}>}
 */
async function checkAndRemindInactiveStudents({ daysInactive = 2, dryRun = false, forceAllActive = false } = {}) {
  const whereClause = {
    status: 'active',
    progress_percentage: { [Op.lt]: 100 },
  };

  if (!forceAllActive) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);
    whereClause.updated_at = { [Op.lte]: cutoffDate };
  }

  const enrollments = await Enrollment.findAll({
    where: whereClause,
    include: [
      {
        model: Course,
        as: 'course',
        attributes: ['id', 'title', 'price'],
      },
      {
        model: User,
        as: 'student',
        attributes: ['id', 'name', 'email'],
        include: [{ model: UserProfile, as: 'profile' }],
      },
    ],
    limit: 50,
  });

  const results = [];
  let totalReminded = 0;

  for (const en of enrollments) {
    if (!en.student || !en.course) continue;

    const studentName = en.student.name || 'Pelajar';
    const courseTitle = en.course.title || 'Kelas SkillSphere';
    const progress = Number(en.progress_percentage || 0);
    const phone = en.student.profile?.phone_number || '085648077829';
    const continueUrl = `${process.env.APP_URL || 'https://demo.codingsolver.my.id'}/dashboard/learning?courseId=${en.course.id}`;

    const encouragement = await generateStudyEncouragement(studentName, courseTitle, progress);

    let sendResult = null;
    if (!dryRun) {
      try {
        sendResult = await whatsappService.sendWhatsAppInactivityReminder(phone, {
          studentName,
          courseTitle,
          progressPercentage: progress,
          aiEncouragement: encouragement,
          continueUrl,
        });
        totalReminded++;
      } catch (err) {
        sendResult = { success: false, error: err.message };
      }
    }

    results.push({
      userId: en.student.id,
      studentName,
      phone,
      courseTitle,
      progress,
      encouragement,
      sent: !dryRun && sendResult?.success,
      details: sendResult,
    });
  }

  return {
    totalChecked: enrollments.length,
    totalReminded,
    results,
  };
}

module.exports = {
  generateStudyEncouragement,
  checkAndRemindInactiveStudents,
};
