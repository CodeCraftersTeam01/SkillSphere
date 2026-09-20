require('dotenv').config();
const bcrypt = require('bcryptjs');
const {
  sequelize,
  User,
  UserProfile,
  TutorApplication,
  TutorCertification,
  Category,
  Course,
  CourseSection,
  CourseMaterial,
  AICareerRoadmap,
  Enrollment,
  CourseMilestone,
  Exam,
  ExamResult,
  DiscountEarned,
  Certificate,
  Transaction,
  TutorWallet,
  WalletTransaction,
  WithdrawalRequest,
} = require('../models');

async function seedDatabase() {
  try {
    const dialect = sequelize.getDialect();
    if (dialect === 'mysql') {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
      await sequelize.sync({ force: true });
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    } else if (dialect === 'sqlite') {
      await sequelize.query('PRAGMA foreign_keys = OFF;');
      await sequelize.sync({ force: true });
      await sequelize.query('PRAGMA foreign_keys = ON;');
    } else {
      await sequelize.sync({ force: true });
    }
    console.log(`✅ Fresh database schema created on ${dialect.toUpperCase()} (19 tables).`);

    const defaultPassword = await bcrypt.hash('password123', 10);

    // 1. Create Users
    const admin = await User.create({
      name: 'Admin SkillSphere',
      email: 'admin@skillsphere.id',
      password: defaultPassword,
      role: 'admin',
      is_active: true,
      is_verified: true,
    });

    const tutor = await User.create({
      name: 'Arjuna Lanang (Lead Tutor)',
      email: 'arjuna.tutor@skillsphere.id',
      password: defaultPassword,
      role: 'tutor',
      is_active: true,
      is_verified: true,
    });

    const student = await User.create({
      name: 'Budi Santoso',
      email: 'budi.student@skillsphere.id',
      password: defaultPassword,
      role: 'student',
      is_active: true,
      is_verified: true,
    });

    // 2. Create User Profiles
    await UserProfile.create({
      user_id: admin.id,
      full_name: 'Super Admin SkillSphere',
      bio: 'Administrator platform SkillSphere AI.',
      phone_number: '081234567890',
    });

    await UserProfile.create({
      user_id: tutor.id,
      full_name: 'Arjuna Lanang Adiwarsana, S.Kom',
      bio: 'Senior Backend Architect & AI Engineering Instructor.',
      phone_number: '081234567891',
      career_goal: 'Principal Software Architect',
      study_preferences: { topics: ['Backend', 'Cloud', 'Microservices', 'AI'] },
    });

    await UserProfile.create({
      user_id: student.id,
      full_name: 'Budi Santoso',
      bio: 'Mahasiswa antusias yang sedang mendalami Fullstack & AI engineering.',
      phone_number: '081234567892',
      career_goal: 'Fullstack AI Developer',
      study_preferences: { topics: ['Node.js', 'React', 'Gemini AI', 'DevOps'] },
    });

    // 3. Tutor Wallet & Certification
    const tutorWallet = await TutorWallet.create({
      tutor_id: tutor.id,
      balance: 1600000.00, // Rp 1.600.000 available
      pending_balance: 400000.00, // Rp 400.000 (holding period 7 days)
    });

    await TutorApplication.create({
      user_id: tutor.id,
      cv_url: 'https://storage.skillsphere.id/cv/arjuna_cv.pdf',
      certificate_document_url: 'https://storage.skillsphere.id/certs/aws_pro.pdf',
      institution_name: 'Politeknik Elektronika Negeri Surabaya (PENS)',
      experience_years: 5,
      status: 'approved',
    });

    const tutorCert = await TutorCertification.create({
      tutor_id: tutor.id,
      certificate_name: 'AWS Certified Solutions Architect - Professional',
      issuer: 'Amazon Web Services',
      issue_date: '2024-01-15',
      credential_id: 'AWS-PSA-992140',
      credential_url: 'https://aws.amazon.com/verify?id=AWS-PSA-992140',
      is_verified: true,
      verified_at: new Date(),
      verified_by: admin.id,
    });

    // 4. Categories
    const catAI = await Category.create({
      name: 'AI & Machine Learning',
      slug: 'ai-machine-learning',
      description: 'Pelajari integrasi LLM, Gemini API, prompt engineering, dan computer vision.',
      icon: 'sparkles',
    });

    const catBackend = await Category.create({
      name: 'Backend & Cloud Architecture',
      slug: 'backend-cloud-architecture',
      description: 'Mastering Node.js, Express, REST API, Database Relasional, dan Microservices.',
      icon: 'server',
    });

    const catFrontend = await Category.create({
      name: 'Frontend & UI/UX Engineering',
      slug: 'frontend-ui-ux',
      description: 'Membangun antarmuka modern dengan React, Vue, dan Claude aesthetic styling.',
      icon: 'palette',
    });

    // 5. Course & Content Hierarchy
    const coursePrice = 500000.00; // Rp 500.000
    const course = await Course.create({
      tutor_id: tutor.id,
      category_id: catBackend.id,
      title: 'Mastering Enterprise Backend Architecture & AI Integration',
      slug: 'mastering-enterprise-backend-ai',
      description: 'Panduan lengkap membangun backend handal, payment gateway, dan integrasi AI cerdas.',
      thumbnail_url: 'https://storage.skillsphere.id/courses/backend_ai_hero.jpg',
      price: coursePrice,
      level: 'intermediate',
      rating_avg: 4.9,
      rating_count: 128,
      status: 'published',
    });

    const sec1 = await CourseSection.create({
      course_id: course.id,
      title: 'Bab 1: Pondasi Database Relasional & Keamanan JWT',
      order_index: 1,
    });

    const sec2 = await CourseSection.create({
      course_id: course.id,
      title: 'Bab 2: Payment Gateway & Revenue Sharing Multi-Vendor',
      order_index: 2,
    });

    await CourseMaterial.create({
      section_id: sec1.id,
      title: '1.1 Pengenalan Relasi Database & Integritas Data',
      content_type: 'video',
      file_url: 'https://storage.skillsphere.id/materials/v1_db_intro.mp4',
      duration_minutes: 25,
      is_preview: true,
      order_index: 1,
    });

    await CourseMaterial.create({
      section_id: sec1.id,
      title: '1.2 Panduan Implementasi JWT & RBAC Middleware',
      content_type: 'pdf',
      file_url: 'https://storage.skillsphere.id/materials/jwt_rbac_guide.pdf',
      duration_minutes: 15,
      is_preview: false,
      order_index: 2,
    });

    // 6. Course Milestone & Discount Reward
    const milestone = await CourseMilestone.create({
      course_id: course.id,
      section_id: sec1.id,
      title: 'Selesaikan Bab 1 dalam 3 Hari',
      description: 'Dapatkan voucher diskon reward 15% untuk kursus lanjutan!',
      target_days: 3,
      reward_discount_percentage: 15,
    });

    await DiscountEarned.create({
      user_id: student.id,
      milestone_id: milestone.id,
      discount_code: 'FASTLEARN15-BUDI',
      discount_percentage: 15,
      is_used: false,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // 7. Exam & Results
    const exam = await Exam.create({
      course_id: course.id,
      title: 'Ujian Akhir: Backend Architecture & JWT Security',
      description: 'Ujian komprehensif menguji pemahaman arsitektur backend, RBAC, dan integritas data.',
      passing_score: 75,
      duration_minutes: 60,
      questions: [
        {
          id: 1,
          question: 'Berapa persen split revenue default untuk tutor di platform SkillSphere?',
          options: ['50%', '70%', '80%', '90%'],
          answer_index: 2,
        },
        {
          id: 2,
          question: 'Berapa lama masa holding period dana transaksi sebelum siap di-withdraw?',
          options: ['1 hari', '3 hari', '7 hari', '14 hari'],
          answer_index: 2,
        },
      ],
    });

    // 8. Enrollment
    const enrollment = await Enrollment.create({
      user_id: student.id,
      course_id: course.id,
      progress_percentage: 100.0,
      status: 'completed',
      completed_at: new Date(),
    });

    const examResult = await ExamResult.create({
      exam_id: exam.id,
      user_id: student.id,
      enrollment_id: enrollment.id,
      score: 95.0,
      is_passed: true,
      answers_data: { 1: 2, 2: 2 },
    });

    // 9. Certificate
    await Certificate.create({
      certificate_code: 'CERT-SKILL-2026-9901',
      user_id: student.id,
      course_id: course.id,
      exam_result_id: examResult.id,
      issue_date: '2026-03-01',
      certificate_url: 'https://storage.skillsphere.id/certs/CERT-SKILL-2026-9901.pdf',
    });

    // 10. AI Career Roadmap
    await AICareerRoadmap.create({
      user_id: student.id,
      target_role: 'Lead Cloud & Backend Engineer',
      recommended_skills: ['Sequelize / SQL', 'JWT & OAuth2', 'Payment Gateway Integration', 'Docker & CI/CD'],
      roadmap_data: {
        current_level: 'Intermediate',
        milestones: [
          { step: 1, title: 'Database Relational Modeling', status: 'completed' },
          { step: 2, title: 'JWT Authentication & Security', status: 'completed' },
          { step: 3, title: 'Payment Split Mechanism (20/80)', status: 'in_progress' },
        ],
      },
      status: 'active',
    });

    // 11. Transactions (20% Platform Fee, 80% Tutor)
    const platformFee = coursePrice * 0.20; // 100,000
    const tutorEarning = coursePrice * 0.80; // 400,000

    const trx = await Transaction.create({
      transaction_code: 'TRX-SKILL-20260301-001',
      user_id: student.id,
      course_id: course.id,
      amount: coursePrice,
      platform_fee: platformFee,
      tutor_earning: tutorEarning,
      payment_method: 'qris',
      payment_status: 'settlement',
      paid_at: new Date(),
    });

    // 12. Wallet Transaction & Withdrawal Request
    await WalletTransaction.create({
      wallet_id: tutorWallet.id,
      transaction_type: 'credit',
      amount: tutorEarning,
      reference_id: trx.transaction_code,
      reference_type: 'sale',
      description: `Pendapatan 80% dari penjualan kursus: ${course.title}`,
    });

    await WithdrawalRequest.create({
      wallet_id: tutorWallet.id,
      tutor_id: tutor.id,
      amount: 500000.00,
      bank_name: 'Bank Mandiri',
      account_number: '1420019283746',
      account_holder_name: 'Arjuna Lanang Adiwarsana',
      status: 'pending',
    });

    console.log('🎉 Seeding successfully completed! All 19 tables populated with sample data.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
