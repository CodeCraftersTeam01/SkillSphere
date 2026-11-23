const {
  Enrollment,
  Course,
  Category,
  LabSubmission,
  LabExercise,
  ExamResult,
  Exam,
  Certificate,
  UserProfile,
  AICareerRoadmap,
} = require('../models');

const FALLBACK_CATEGORIES = [
  'Backend & Cloud',
  'Frontend & UI/UX',
  'AI & Machine Learning',
  'Data Science',
  'Keamanan Siber',
];

const STAGE_DEFINITIONS = [
  { level: 1, name: 'Pondasi', min_score: 0 },
  { level: 2, name: 'Eksplorasi', min_score: 25 },
  { level: 3, name: 'Praktisi', min_score: 50 },
  { level: 4, name: 'Spesialis', min_score: 75 },
  { level: 5, name: 'Expert', min_score: 90 },
];

const STAGE_RADAR_LABELS = [
  'Penguasaan Materi',
  'Praktikum Kode',
  'Evaluasi Ujian',
  'Sertifikasi',
  'Konsistensi Belajar',
  'Kesiapan Karier',
];

function clampScore(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function averageScores(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const total = values.reduce((sum, val) => sum + (Number(val) || 0), 0);
  return clampScore(total / values.length);
}

function parseJsonObject(value) {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      return {};
    }
  }
  return {};
}

function resolveTargetLevel(profile) {
  if (!profile) return 80;
  const prefs = parseJsonObject(profile.study_preferences);
  const rawLevel = String(
    prefs.skill_level || prefs.experience_level || prefs.level || ''
  ).toLowerCase();

  if (rawLevel.includes('advanced') || rawLevel.includes('mahir')) return 95;
  if (rawLevel.includes('intermediate') || rawLevel.includes('menengah')) return 85;
  if (rawLevel.includes('beginner') || rawLevel.includes('pemula')) return 75;

  const expYears = Number(prefs.experience_years);
  if (Number.isFinite(expYears) && expYears >= 4) return 95;
  if (Number.isFinite(expYears) && expYears >= 2) return 85;

  return 80;
}

function findMatchingCategory(dbCategoryNames, keywords, fallback) {
  const found = dbCategoryNames.find((name) => {
    const lower = name.toLowerCase();
    return keywords.some((kw) => lower.includes(kw));
  });
  return found || fallback;
}

function resolveLabCategory(submission, dbCategoryNames) {
  const courseCategory = submission.lab?.course?.category?.name;
  if (courseCategory) return courseCategory;

  const lang = String(submission.language || submission.lab?.language || '').toLowerCase();
  if (['html', 'css', 'scss', 'jsx', 'tsx', 'vue', 'svelte'].includes(lang)) {
    return findMatchingCategory(dbCategoryNames, ['frontend', 'ui/ux', 'web'], 'Frontend & UI/UX');
  }
  if (['python', 'py', 'r', 'jupyter'].includes(lang)) {
    return findMatchingCategory(
      dbCategoryNames,
      ['data science', 'ai', 'machine learning'],
      'Data Science'
    );
  }
  if (['sql', 'javascript', 'js', 'typescript', 'ts', 'node', 'go', 'java', 'php', 'rust'].includes(lang)) {
    return findMatchingCategory(dbCategoryNames, ['backend', 'cloud'], 'Backend & Cloud');
  }
  if (['dart', 'flutter', 'kotlin', 'swift'].includes(lang)) {
    return findMatchingCategory(dbCategoryNames, ['mobile'], 'Frontend & UI/UX');
  }

  return findMatchingCategory(dbCategoryNames, ['backend', 'cloud'], 'Backend & Cloud');
}

function getTopicStageLabel(progressPercent, status) {
  if (status === 'completed' || progressPercent >= 100) return 'Selesai';
  if (progressPercent >= 70) return 'Hampir Selesai';
  if (progressPercent >= 15) return 'Sedang Dipelajari';
  return 'Baru Dimulai';
}

function buildStageSummary(stage, nextLabel, overallScore, metrics, stageScores) {
  if (
    metrics.enrolled_courses === 0 &&
    metrics.labs_attempted === 0 &&
    metrics.exams_passed === 0
  ) {
    return 'Kamu berada di tahap Pondasi. Mulai ikuti kursus pertama atau coba praktikum kode untuk memetakan kompetensimu.';
  }

  const weakestIndex = stageScores.reduce(
    (minIdx, score, idx, arr) => (score < arr[minIdx] ? idx : minIdx),
    0
  );
  const weakestArea = STAGE_RADAR_LABELS[weakestIndex];

  if (!nextLabel) {
    return `Skor kompetensi ${overallScore}/100 menempatkanmu di tahap Expert dengan ${metrics.completed_courses} kursus selesai dan ${metrics.certificates_earned} sertifikat.`;
  }

  return `Kamu berada di tahap ${stage.name} (skor ${overallScore}/100). Tingkatkan ${weakestArea} untuk naik ke tahap ${nextLabel}.`;
}

async function buildStudentLearningRadar(userId) {
  const parsedUserId = Number(userId);
  const hasValidUser = Number.isInteger(parsedUserId) && parsedUserId > 0;

  const [
    enrollments,
    labSubmissions,
    examResults,
    certificates,
    profile,
    roadmaps,
    dbCategories,
  ] = await Promise.all([
    hasValidUser
      ? Enrollment.findAll({
          where: { user_id: parsedUserId },
          include: [
            {
              model: Course,
              as: 'course',
              include: [{ model: Category, as: 'category' }],
            },
          ],
        })
      : [],
    hasValidUser
      ? LabSubmission.findAll({
          where: { user_id: parsedUserId },
          include: [
            {
              model: LabExercise,
              as: 'lab',
              include: [
                {
                  model: Course,
                  as: 'course',
                  include: [{ model: Category, as: 'category' }],
                },
              ],
            },
          ],
        })
      : [],
    hasValidUser
      ? ExamResult.findAll({
          where: { user_id: parsedUserId },
          include: [
            {
              model: Exam,
              as: 'exam',
              include: [
                {
                  model: Course,
                  as: 'course',
                  include: [{ model: Category, as: 'category' }],
                },
              ],
            },
          ],
        })
      : [],
    hasValidUser
      ? Certificate.findAll({
          where: { user_id: parsedUserId },
          include: [
            {
              model: Course,
              as: 'course',
              include: [{ model: Category, as: 'category' }],
            },
          ],
        })
      : [],
    hasValidUser ? UserProfile.findOne({ where: { user_id: parsedUserId } }) : null,
    hasValidUser
      ? AICareerRoadmap.findAll({
          where: { user_id: parsedUserId },
          order: [['updated_at', 'DESC']],
        })
      : [],
    Category.findAll({ attributes: ['id', 'name'], order: [['id', 'ASC']] }),
  ]);

  const dbCategoryNames = dbCategories.map((c) => c.name).filter(Boolean);
  const targetLevel = resolveTargetLevel(profile);

  // Aggregate distinct labs (best score & solved flag per lab_id)
  const labBestById = new Map();
  for (const sub of labSubmissions) {
    const labId = sub.lab_id;
    const score = clampScore(sub.score);
    const solved = Boolean(sub.is_correct) || sub.verdict === 'correct';
    const categoryName = resolveLabCategory(sub, dbCategoryNames);
    const courseId = sub.lab?.course_id || null;

    const existing = labBestById.get(labId);
    if (!existing) {
      labBestById.set(labId, {
        lab_id: labId,
        course_id: courseId,
        category: categoryName,
        best_score: score,
        solved,
      });
    } else {
      existing.best_score = Math.max(existing.best_score, score);
      existing.solved = existing.solved || solved;
    }
  }

  // Aggregate distinct exams (best score & passed flag per exam_id)
  const examBestById = new Map();
  for (const res of examResults) {
    const examId = res.exam_id;
    const score = clampScore(res.score);
    const passed = Boolean(res.is_passed);
    const courseId = res.exam?.course_id || null;
    const categoryName = res.exam?.course?.category?.name || null;

    const existing = examBestById.get(examId);
    if (!existing) {
      examBestById.set(examId, {
        exam_id: examId,
        course_id: courseId,
        category: categoryName,
        best_score: score,
        passed,
      });
    } else {
      existing.best_score = Math.max(existing.best_score, score);
      existing.passed = existing.passed || passed;
    }
  }

  // Core metrics
  const enrolledCourses = enrollments.length;
  const completedCourses = enrollments.filter(
    (e) => e.status === 'completed' || clampScore(e.progress_percentage) >= 100
  ).length;

  const labEntries = Array.from(labBestById.values());
  const labsAttempted = labEntries.length;
  const labsSolved = labEntries.filter((l) => l.solved).length;
  const avgLabScore = averageScores(labEntries.map((l) => l.best_score));

  const examEntries = Array.from(examBestById.values());
  const examsAttempted = examEntries.length;
  const examsPassed = examEntries.filter((x) => x.passed).length;
  const avgExamScore = averageScores(examEntries.map((x) => x.best_score));

  const certificatesEarned = certificates.length;

  const metrics = {
    enrolled_courses: enrolledCourses,
    completed_courses: completedCourses,
    labs_solved: labsSolved,
    labs_attempted: labsAttempted,
    avg_lab_score: avgLabScore,
    exams_passed: examsPassed,
    avg_exam_score: avgExamScore,
    certificates_earned: certificatesEarned,
  };

  // Build studied_topics sorted by progress_percent DESC
  const solvedLabsByCourse = new Map();
  for (const lab of labEntries) {
    if (lab.solved && lab.course_id) {
      solvedLabsByCourse.set(lab.course_id, (solvedLabsByCourse.get(lab.course_id) || 0) + 1);
    }
  }

  const passedExamCourses = new Set();
  for (const exam of examEntries) {
    if (exam.passed && exam.course_id) {
      passedExamCourses.add(exam.course_id);
    }
  }

  const studiedTopics = enrollments
    .map((e) => {
      const progressPercent = clampScore(e.progress_percentage);
      return {
        course_id: e.course_id,
        slug: e.course?.slug || null,
        title: e.course?.title || 'Kursus Tanpa Judul',
        category: e.course?.category?.name || 'Umum',
        progress_percent: progressPercent,
        stage_label: getTopicStageLabel(progressPercent, e.status),
        lab_solved: solvedLabsByCourse.get(e.course_id) || 0,
        exam_passed: passedExamCourses.has(e.course_id),
      };
    })
    .sort((a, b) => b.progress_percent - a.progress_percent);

  // Build skill_radar labels (5 to 6 categories)
  const categorySet = new Set();
  const addCategory = (name) => {
    if (name && categorySet.size < 6) categorySet.add(name);
  };

  for (const e of enrollments) addCategory(e.course?.category?.name);
  for (const lab of labEntries) addCategory(lab.category);
  for (const exam of examEntries) addCategory(exam.category);
  for (const cert of certificates) addCategory(cert.course?.category?.name);

  for (const dbCat of dbCategoryNames) {
    if (categorySet.size >= 6) break;
    addCategory(dbCat);
  }
  for (const fallbackCat of FALLBACK_CATEGORIES) {
    if (categorySet.size >= 5) break;
    addCategory(fallbackCat);
  }

  const skillLabels = Array.from(categorySet).slice(0, 6);

  const materialMasterySeries = [];
  const practiceScoreSeries = [];
  const targetLevelSeries = [];

  for (const label of skillLabels) {
    const catEnrollments = enrollments.filter((e) => e.course?.category?.name === label);
    const mastery = averageScores(catEnrollments.map((e) => clampScore(e.progress_percentage)));

    const catPracticeScores = [
      ...labEntries.filter((l) => l.category === label).map((l) => l.best_score),
      ...examEntries.filter((x) => x.category === label).map((x) => x.best_score),
    ];
    const practice = averageScores(catPracticeScores);

    materialMasterySeries.push(mastery);
    practiceScoreSeries.push(practice);
    targetLevelSeries.push(targetLevel);
  }

  // Build stage_radar (6 dimensions)
  const prefs = parseJsonObject(profile?.study_preferences);

  const materialScore = averageScores(enrollments.map((e) => clampScore(e.progress_percentage)));
  const practicumScore =
    labsAttempted > 0
      ? clampScore(avgLabScore * 0.7 + (labsSolved / labsAttempted) * 100 * 0.3)
      : 0;
  const examScore =
    examsAttempted > 0
      ? clampScore(avgExamScore * 0.75 + (examsPassed / examsAttempted) * 100 * 0.25)
      : 0;
  const certificationScore =
    enrolledCourses > 0
      ? clampScore((certificatesEarned / enrolledCourses) * 100)
      : clampScore(certificatesEarned * 50);

  let consistencyScore = 0;
  if (enrolledCourses > 0) consistencyScore += 25;
  if (completedCourses > 0) consistencyScore += 20;
  if (labsAttempted > 0) consistencyScore += 20;
  if (examsAttempted > 0) consistencyScore += 20;
  if (prefs.onboarding_completed) consistencyScore += 15;
  consistencyScore = clampScore(consistencyScore);

  let careerReadinessScore = 0;
  if (profile?.career_goal || prefs.career_goal) careerReadinessScore += 20;
  if (roadmaps.length > 0) careerReadinessScore += 25;
  if (profile?.linkedin_url || profile?.portfolio_url || prefs.linkedin_url || prefs.portfolio_url) {
    careerReadinessScore += 15;
  }
  if (completedCourses > 0 || certificatesEarned > 0) careerReadinessScore += 20;
  if (avgExamScore >= 70 || labsSolved > 0) careerReadinessScore += 20;
  careerReadinessScore = clampScore(careerReadinessScore);

  const stageCurrentScores = [
    materialScore,
    practicumScore,
    examScore,
    certificationScore,
    consistencyScore,
    careerReadinessScore,
  ];

  // Weighted overall score
  const overallScore = clampScore(
    materialScore * 0.25 +
      practicumScore * 0.2 +
      examScore * 0.2 +
      certificationScore * 0.15 +
      consistencyScore * 0.1 +
      careerReadinessScore * 0.1
  );

  let currentStageDef = STAGE_DEFINITIONS[0];
  for (const stageDef of STAGE_DEFINITIONS) {
    if (overallScore >= stageDef.min_score) {
      currentStageDef = stageDef;
    }
  }

  const nextStageDef = STAGE_DEFINITIONS.find((s) => s.level === currentStageDef.level + 1) || null;
  const nextLabel = nextStageDef ? nextStageDef.name : null;

  const stages = STAGE_DEFINITIONS.map((s) => ({
    level: s.level,
    name: s.name,
    min_score: s.min_score,
    reached: overallScore >= s.min_score,
  }));

  const summary = buildStageSummary(
    currentStageDef,
    nextLabel,
    overallScore,
    metrics,
    stageCurrentScores
  );

  return {
    current_stage: {
      level: currentStageDef.level,
      label: currentStageDef.name,
      next_label: nextLabel,
      overall_score: overallScore,
      summary,
      stages,
    },
    skill_radar: {
      labels: skillLabels,
      series: {
        material_mastery: materialMasterySeries,
        practice_score: practiceScoreSeries,
        target_level: targetLevelSeries,
      },
    },
    stage_radar: {
      labels: STAGE_RADAR_LABELS,
      series: {
        current_score: stageCurrentScores,
        target_score: STAGE_RADAR_LABELS.map(() => targetLevel),
      },
    },
    studied_topics: studiedTopics,
    metrics,
  };
}

module.exports = {
  buildStudentLearningRadar,
};
