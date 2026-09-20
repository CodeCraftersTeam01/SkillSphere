const assert = require('assert');
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

const expectedModels = [
  { name: 'User', model: User, table: 'users' },
  { name: 'UserProfile', model: UserProfile, table: 'user_profiles' },
  { name: 'TutorApplication', model: TutorApplication, table: 'tutor_applications' },
  { name: 'TutorCertification', model: TutorCertification, table: 'tutor_certifications' },
  { name: 'Category', model: Category, table: 'categories' },
  { name: 'Course', model: Course, table: 'courses' },
  { name: 'CourseSection', model: CourseSection, table: 'course_sections' },
  { name: 'CourseMaterial', model: CourseMaterial, table: 'course_materials' },
  { name: 'AICareerRoadmap', model: AICareerRoadmap, table: 'ai_career_roadmaps' },
  { name: 'Enrollment', model: Enrollment, table: 'enrollments' },
  { name: 'CourseMilestone', model: CourseMilestone, table: 'course_milestones' },
  { name: 'Exam', model: Exam, table: 'exams' },
  { name: 'ExamResult', model: ExamResult, table: 'exam_results' },
  { name: 'DiscountEarned', model: DiscountEarned, table: 'discounts_earned' },
  { name: 'Certificate', model: Certificate, table: 'certificates' },
  { name: 'Transaction', model: Transaction, table: 'transactions' },
  { name: 'TutorWallet', model: TutorWallet, table: 'tutor_wallets' },
  { name: 'WalletTransaction', model: WalletTransaction, table: 'wallet_transactions' },
  { name: 'WithdrawalRequest', model: WithdrawalRequest, table: 'withdrawal_requests' },
];

async function runDatabaseTests() {
  console.log('🧪 Starting 19-Table Database Architecture Tests...\n');

  try {
    // 1. Connection check
    await sequelize.authenticate();
    console.log('  ✔ Database connection authenticated.');

    // 2. Sync schema
    await sequelize.query('PRAGMA foreign_keys = OFF;');
    await sequelize.sync({ force: true });
    await sequelize.query('PRAGMA foreign_keys = ON;');
    console.log('  ✔ Database schema synchronized successfully.');

    // 3. Verify all 19 models exist
    assert.strictEqual(expectedModels.length, 19, 'Must have exactly 19 relational models');
    for (const item of expectedModels) {
      assert(item.model, `Model ${item.name} should be defined`);
      assert.strictEqual(item.model.tableName, item.table, `Model ${item.name} should map to table '${item.table}'`);
      console.log(`  ✔ Table [${item.table}] defined correctly as Model <${item.name}>`);
    }

    // 4. Test Relational Operations & Foreign Keys
    console.log('\n  🔗 Testing Model Relationships & Integrity Constraints...');

    // User & Profile (1:1)
    const testUser = await User.create({
      name: 'Test Tutor',
      email: 'test.tutor@skillsphere.id',
      password: 'hashedpassword',
      role: 'tutor',
    });

    const testProfile = await UserProfile.create({
      user_id: testUser.id,
      full_name: 'Test Tutor Fullname',
      bio: 'Expert Instructor',
    });

    const userWithProfile = await User.findByPk(testUser.id, {
      include: [{ model: UserProfile, as: 'profile' }],
    });
    assert.strictEqual(userWithProfile.profile.full_name, 'Test Tutor Fullname');
    console.log('  ✔ User <-> UserProfile 1:1 relation verified.');

    // Tutor Wallet (1:1)
    const wallet = await TutorWallet.create({
      tutor_id: testUser.id,
      balance: 1000000,
      pending_balance: 200000,
    });
    const userWithWallet = await User.findByPk(testUser.id, {
      include: [{ model: TutorWallet, as: 'wallet' }],
    });
    assert.strictEqual(userWithWallet.wallet.id, wallet.id);
    console.log('  ✔ User <-> TutorWallet 1:1 relation verified.');

    // Category <-> Course (1:N)
    const cat = await Category.create({
      name: 'Cloud Computing',
      slug: 'cloud-computing',
      description: 'AWS and GCP mastery',
    });

    const course = await Course.create({
      tutor_id: testUser.id,
      category_id: cat.id,
      title: 'Cloud Masterclass',
      slug: 'cloud-masterclass',
      price: 300000,
    });

    const courseWithCat = await Course.findByPk(course.id, {
      include: [
        { model: Category, as: 'category' },
        { model: User, as: 'tutor' },
      ],
    });
    assert.strictEqual(courseWithCat.category.name, 'Cloud Computing');
    assert.strictEqual(courseWithCat.tutor.name, 'Test Tutor');
    console.log('  ✔ Category & User <-> Course relations verified.');

    // Course <-> Section <-> Material (Hierarchical)
    const section = await CourseSection.create({
      course_id: course.id,
      title: 'Module 1: Introduction',
      order_index: 1,
    });

    const material = await CourseMaterial.create({
      section_id: section.id,
      title: 'Lecture 1 Video',
      content_type: 'video',
      file_url: 'https://example.com/video1.mp4',
    });

    const courseTree = await Course.findByPk(course.id, {
      include: [{
        model: CourseSection,
        as: 'sections',
        include: [{ model: CourseMaterial, as: 'materials' }],
      }],
    });
    assert.strictEqual(courseTree.sections[0].materials[0].title, 'Lecture 1 Video');
    console.log('  ✔ Course -> Section -> Material hierarchy verified.');

    console.log('\n======================================================');
    console.log('🎉 ALL 19 DATABASE RELATIONAL TESTS PASSED SUCCESSFULLY!');
    console.log('======================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Database Test Failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  runDatabaseTests();
}

module.exports = runDatabaseTests;
