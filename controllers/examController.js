const {
  Exam,
  ExamResult,
  Course,
  Enrollment,
  Certificate,
  User,
} = require('../models');
const certificateGenerator = require('../services/certificateGenerator');

/**
 * 1. Ambil Ujian berdasarkan ID Kursus
 * GET /api/exams/course/:course_id
 */
async function getCourseExam(req, res) {
  try {
    const { course_id } = req.params;
    const userId = req.user ? req.user.id : null;
    const userRole = req.user ? req.user.role : null;

    const course = await Course.findByPk(course_id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Kursus tidak ditemukan.',
      });
    }

    const exam = await Exam.findOne({
      where: { course_id },
      include: [
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'title', 'slug', 'tutor_id'],
        },
      ],
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Ujian akhir belum tersedia untuk kursus ini.',
      });
    }

    // Cek apakah yang memanggil adalah tutor pemilik atau admin
    const isOwnerTutor = userRole === 'tutor' && course.tutor_id === userId;
    const isAdmin = userRole === 'admin';

    let questionsData = exam.questions || [];

    // Jika yang mengakses adalah siswa, SENSOR / HAPUS kunci jawaban (correct_answer) demi keamanan
    if (!isOwnerTutor && !isAdmin) {
      questionsData = questionsData.map((q, idx) => ({
        id: q.id || idx + 1,
        question: q.question,
        options: q.options || [],
        points: q.points || 10,
      }));
    }

    return res.status(200).json({
      success: true,
      message: 'Data ujian berhasil dimuat.',
      data: {
        id: exam.id,
        course_id: exam.course_id,
        course_title: course.title,
        title: exam.title,
        description: exam.description,
        passing_score: exam.passing_score,
        duration_minutes: exam.duration_minutes,
        total_questions: questionsData.length,
        questions: questionsData,
        is_tutor_view: isOwnerTutor || isAdmin,
      },
    });
  } catch (err) {
    console.error('Error in getCourseExam:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat data ujian.',
      error: err.message,
    });
  }
}

/**
 * 2. Ambil Ujian berdasarkan Exam ID
 * GET /api/exams/:id
 */
async function getExamById(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;
    const userRole = req.user ? req.user.role : null;

    const exam = await Exam.findByPk(id, {
      include: [
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'title', 'slug', 'tutor_id'],
        },
      ],
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Ujian tidak ditemukan.',
      });
    }

    const isOwnerTutor = userRole === 'tutor' && exam.course && exam.course.tutor_id === userId;
    const isAdmin = userRole === 'admin';

    let questionsData = exam.questions || [];
    if (!isOwnerTutor && !isAdmin) {
      questionsData = questionsData.map((q, idx) => ({
        id: q.id || idx + 1,
        question: q.question,
        options: q.options || [],
        points: q.points || 10,
      }));
    }

    return res.status(200).json({
      success: true,
      data: {
        id: exam.id,
        course_id: exam.course_id,
        course_title: exam.course ? exam.course.title : null,
        title: exam.title,
        description: exam.description,
        passing_score: exam.passing_score,
        duration_minutes: exam.duration_minutes,
        total_questions: questionsData.length,
        questions: questionsData,
        is_tutor_view: isOwnerTutor || isAdmin,
      },
    });
  } catch (err) {
    console.error('Error in getExamById:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat detail ujian.',
      error: err.message,
    });
  }
}

/**
 * 3. Tutor / Admin Membuat atau Memperbarui Ujian Kursus
 * POST /api/exams/course/:course_id
 */
async function createOrUpdateExam(req, res) {
  try {
    const { course_id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const {
      title,
      description,
      passing_score = 70,
      duration_minutes = 60,
      questions = [],
    } = req.body;

    const course = await Course.findByPk(course_id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Kursus tidak ditemukan.',
      });
    }

    // Validasi otorisasi: hanya tutor pemilik kursus atau admin
    if (userRole !== 'admin' && course.tutor_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Anda bukan pengajar untuk kursus ini.',
      });
    }

    if (!title || String(title).trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Judul ujian wajib diisi minimal 3 karakter.',
      });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Bank soal ujian wajib memiliki minimal 1 pertanyaan.',
      });
    }

    // Validasi struktur setiap butir pertanyaan
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question || !Array.isArray(q.options) || q.options.length < 2 || !q.correct_answer) {
        return res.status(400).json({
          success: false,
          message: `Pertanyaan nomor ${i + 1} tidak valid. Pastikan pertanyaan, minimal 2 opsi jawaban, dan kunci jawaban terisi.`,
        });
      }
    }

    const sanitizedPassingScore = Math.max(10, Math.min(100, Number(passing_score) || 70));
    const sanitizedDuration = Math.max(5, Number(duration_minutes) || 60);

    let [exam, created] = await Exam.findOrCreate({
      where: { course_id },
      defaults: {
        course_id,
        title: title.trim(),
        description: description ? description.trim() : '',
        passing_score: sanitizedPassingScore,
        duration_minutes: sanitizedDuration,
        questions,
      },
    });

    if (!created) {
      await exam.update({
        title: title.trim(),
        description: description ? description.trim() : exam.description,
        passing_score: sanitizedPassingScore,
        duration_minutes: sanitizedDuration,
        questions,
      });
    }

    return res.status(created ? 201 : 200).json({
      success: true,
      message: created ? 'Ujian akhir berhasil dibuat.' : 'Ujian akhir berhasil diperbarui.',
      data: exam,
    });
  } catch (err) {
    console.error('Error in createOrUpdateExam:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal menyimpan ujian.',
      error: err.message,
    });
  }
}

/**
 * 4. Siswa Mengumpulkan Jawaban & Mesin Evaluasi Auto-Scoring Otomatis
 * POST /api/exams/:id/submit
 */
async function submitExam(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { answers = {}, time_spent_seconds = 0 } = req.body;

    const exam = await Exam.findByPk(id, {
      include: [
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'title', 'slug', 'tutor_id'],
        },
      ],
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Ujian tidak ditemukan.',
      });
    }

    // Pastikan siswa terdaftar aktif di kursus
    const enrollment = await Enrollment.findOne({
      where: {
        user_id: userId,
        course_id: exam.course_id,
        status: ['active', 'completed'],
      },
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'Anda belum terdaftar di kursus ini.',
      });
    }

    const questions = exam.questions || [];
    if (questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Ujian belum memiliki butir soal untuk dinilai.',
      });
    }

    // === MESIN AUTO-SCORING OTOMATIS ===
    let totalPoints = 0;
    let earnedPoints = 0;
    let correctCount = 0;

    const evaluationDetails = questions.map((q, idx) => {
      const qId = String(q.id || idx + 1);
      const studentAns = answers[qId] ? String(answers[qId]).trim().toUpperCase() : null;
      const correctAns = String(q.correct_answer || '').trim().toUpperCase();
      const qPoints = Number(q.points || 10);

      totalPoints += qPoints;
      const isCorrect = studentAns !== null && studentAns === correctAns;

      if (isCorrect) {
        earnedPoints += qPoints;
        correctCount += 1;
      }

      return {
        question_id: qId,
        question: q.question,
        selected_answer: studentAns,
        is_correct: isCorrect,
        points_earned: isCorrect ? qPoints : 0,
      };
    });

    const finalScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const isPassed = finalScore >= exam.passing_score;

    // Simpan hasil evaluasi ke tabel exam_results
    const examResult = await ExamResult.create({
      exam_id: exam.id,
      user_id: userId,
      enrollment_id: enrollment.id,
      score: finalScore,
      is_passed: isPassed,
      answers_data: {
        time_spent_seconds: Number(time_spent_seconds) || 0,
        total_questions: questions.length,
        correct_count: correctCount,
        details: evaluationDetails,
      },
      submitted_at: new Date(),
    });

    let certificateData = null;

    // Jika siswa LULUS, terbitkan Sertifikat Kelulusan Resmi secara otomatis
    if (isPassed) {
      // Tandai progres pendaftaran kelas 100% dan status completed
      enrollment.status = 'completed';
      enrollment.progress_percentage = 100;
      await enrollment.save();

      // Terbitkan Sertifikat jika belum pernah terbit untuk siswa & kursus ini
      let existingCert = await Certificate.findOne({
        where: { user_id: userId, course_id: exam.course_id },
      });

      // Ambil data pendukung untuk rendering PDF sertifikat resmi
      const studentUser = await User.findByPk(userId, { attributes: ['id', 'name', 'email'] });
      let tutorName = 'Lead Instructor';
      if (exam.course && exam.course.tutor_id) {
        const tutorUser = await User.findByPk(exam.course.tutor_id, { attributes: ['id', 'name'] });
        if (tutorUser && tutorUser.name) tutorName = tutorUser.name;
      }

      if (!existingCert) {
        const certCode = `CERT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        
        // Buat file PDF sertifikat fisik dengan stempel QR code validasi
        try {
          const pdfResult = await certificateGenerator.generateCertificatePdf({
            certificateCode: certCode,
            studentName: (studentUser && studentUser.name) || 'Peserta Pembelajaran',
            courseTitle: (exam.course && exam.course.title) || 'Kursus Keahlian',
            tutorName,
            score: finalScore,
            issueDate: new Date(),
          });

          existingCert = await Certificate.create({
            certificate_code: certCode,
            user_id: userId,
            course_id: exam.course_id,
            exam_result_id: examResult.id,
            issue_date: new Date(),
            certificate_url: pdfResult.publicUrl,
          });
        } catch (pdfErr) {
          console.error('[Certificate] Error generating PDF during exam submission:', pdfErr.message);
          existingCert = await Certificate.create({
            certificate_code: certCode,
            user_id: userId,
            course_id: exam.course_id,
            exam_result_id: examResult.id,
            issue_date: new Date(),
            certificate_url: `/api/certificates/${certCode}/pdf`,
          });
        }
      }

      certificateData = {
        certificate_code: existingCert.certificate_code,
        issue_date: existingCert.issue_date,
        certificate_url: existingCert.certificate_url,
        download_url: `/api/certificates/${existingCert.certificate_code}/pdf`,
      };
    }

    return res.status(200).json({
      success: true,
      message: isPassed
        ? 'Selamat! Anda dinyatakan LULUS ujian akhir kursus.'
        : 'Nilai Anda belum mencapai passing grade kelulusan. Pelajari kembali materi dan Anda dapat mencoba lagi.',
      data: {
        exam_result_id: examResult.id,
        course_id: exam.course_id,
        course_title: exam.course ? exam.course.title : '',
        score: finalScore,
        passing_score: exam.passing_score,
        is_passed: isPassed,
        total_questions: questions.length,
        correct_count: correctCount,
        certificate: certificateData,
        submitted_at: examResult.submitted_at,
      },
    });
  } catch (err) {
    console.error('Error in submitExam:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengevaluasi jawaban ujian.',
      error: err.message,
    });
  }
}

/**
 * 5. Riwayat Hasil Ujian Siswa
 * GET /api/exams/:id/history
 */
async function getExamHistory(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const results = await ExamResult.findAll({
      where: { exam_id: id, user_id: userId },
      order: [['submitted_at', 'DESC']],
      include: [
        {
          model: Certificate,
          as: 'certificate',
          attributes: ['certificate_code', 'issue_date', 'certificate_url'],
        },
      ],
    });

    return res.status(200).json({
      success: true,
      message: 'Riwayat ujian berhasil dimuat.',
      data: results,
    });
  } catch (err) {
    console.error('Error in getExamHistory:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat riwayat ujian.',
      error: err.message,
    });
  }
}

/**
 * 6. Hapus Ujian
 * DELETE /api/exams/:id
 */
async function deleteExam(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const exam = await Exam.findByPk(id, {
      include: [{ model: Course, as: 'course' }],
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Ujian tidak ditemukan.',
      });
    }

    if (userRole !== 'admin' && exam.course && exam.course.tutor_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Anda tidak berhak menghapus ujian ini.',
      });
    }

    await exam.destroy();

    return res.status(200).json({
      success: true,
      message: 'Ujian berhasil dihapus.',
    });
  } catch (err) {
    console.error('Error in deleteExam:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal menghapus ujian.',
      error: err.message,
    });
  }
}

module.exports = {
  getCourseExam,
  getExamById,
  createOrUpdateExam,
  submitExam,
  getExamHistory,
  deleteExam,
};

