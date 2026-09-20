const sequelize = require('../config/database');

const User = require('./User');
const UserProfile = require('./UserProfile');
const TutorApplication = require('./TutorApplication');
const TutorCertification = require('./TutorCertification');
const Category = require('./Category');
const Course = require('./Course');
const CourseSection = require('./CourseSection');
const CourseMaterial = require('./CourseMaterial');
const AICareerRoadmap = require('./AICareerRoadmap');
const Enrollment = require('./Enrollment');
const CourseMilestone = require('./CourseMilestone');
const Exam = require('./Exam');
const ExamResult = require('./ExamResult');
const DiscountEarned = require('./DiscountEarned');
const Certificate = require('./Certificate');
const Transaction = require('./Transaction');
const TutorWallet = require('./TutorWallet');
const WalletTransaction = require('./WalletTransaction');
const WithdrawalRequest = require('./WithdrawalRequest');

// 1. User <-> UserProfile (1:1)
User.hasOne(UserProfile, { foreignKey: 'user_id', as: 'profile', onDelete: 'CASCADE' });
UserProfile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// 2. User <-> TutorApplication (1:N)
User.hasMany(TutorApplication, { foreignKey: 'user_id', as: 'tutor_applications', onDelete: 'CASCADE' });
TutorApplication.belongsTo(User, { foreignKey: 'user_id', as: 'applicant' });

// 3. User <-> TutorCertification (1:N)
User.hasMany(TutorCertification, { foreignKey: 'tutor_id', as: 'tutor_certifications', onDelete: 'CASCADE' });
TutorCertification.belongsTo(User, { foreignKey: 'tutor_id', as: 'tutor' });
TutorCertification.belongsTo(User, { foreignKey: 'verified_by', as: 'admin_verifier' });

// 4. Category <-> Course (1:N)
Category.hasMany(Course, { foreignKey: 'category_id', as: 'courses' });
Course.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// 5. User (Tutor) <-> Course (1:N)
User.hasMany(Course, { foreignKey: 'tutor_id', as: 'taught_courses' });
Course.belongsTo(User, { foreignKey: 'tutor_id', as: 'tutor' });

// 6. Course <-> CourseSection (1:N)
Course.hasMany(CourseSection, { foreignKey: 'course_id', as: 'sections', onDelete: 'CASCADE' });
CourseSection.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });

// 7. CourseSection <-> CourseMaterial (1:N)
CourseSection.hasMany(CourseMaterial, { foreignKey: 'section_id', as: 'materials', onDelete: 'CASCADE' });
CourseMaterial.belongsTo(CourseSection, { foreignKey: 'section_id', as: 'section' });

// 8. User <-> AICareerRoadmap (1:N)
User.hasMany(AICareerRoadmap, { foreignKey: 'user_id', as: 'ai_roadmaps', onDelete: 'CASCADE' });
AICareerRoadmap.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// 9. User <-> Course via Enrollment (N:M & 1:N)
User.hasMany(Enrollment, { foreignKey: 'user_id', as: 'enrollments', onDelete: 'CASCADE' });
Enrollment.belongsTo(User, { foreignKey: 'user_id', as: 'student' });
Course.hasMany(Enrollment, { foreignKey: 'course_id', as: 'enrollments', onDelete: 'CASCADE' });
Enrollment.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });

// 10. Course <-> CourseMilestone (1:N)
Course.hasMany(CourseMilestone, { foreignKey: 'course_id', as: 'milestones', onDelete: 'CASCADE' });
CourseMilestone.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });
CourseSection.hasMany(CourseMilestone, { foreignKey: 'section_id', as: 'milestones' });
CourseMilestone.belongsTo(CourseSection, { foreignKey: 'section_id', as: 'section' });

// 11. Course <-> Exam (1:N)
Course.hasMany(Exam, { foreignKey: 'course_id', as: 'exams', onDelete: 'CASCADE' });
Exam.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });

// 12. Exam <-> ExamResult (1:N)
Exam.hasMany(ExamResult, { foreignKey: 'exam_id', as: 'results', onDelete: 'CASCADE' });
ExamResult.belongsTo(Exam, { foreignKey: 'exam_id', as: 'exam' });
User.hasMany(ExamResult, { foreignKey: 'user_id', as: 'exam_results', onDelete: 'CASCADE' });
ExamResult.belongsTo(User, { foreignKey: 'user_id', as: 'student' });
Enrollment.hasMany(ExamResult, { foreignKey: 'enrollment_id', as: 'exam_results' });
ExamResult.belongsTo(Enrollment, { foreignKey: 'enrollment_id', as: 'enrollment' });

// 13. User <-> DiscountEarned (1:N)
User.hasMany(DiscountEarned, { foreignKey: 'user_id', as: 'discounts_earned', onDelete: 'CASCADE' });
DiscountEarned.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
CourseMilestone.hasMany(DiscountEarned, { foreignKey: 'milestone_id', as: 'discounts_granted' });
DiscountEarned.belongsTo(CourseMilestone, { foreignKey: 'milestone_id', as: 'milestone' });

// 14. User & Course <-> Certificate (1:N)
User.hasMany(Certificate, { foreignKey: 'user_id', as: 'certificates', onDelete: 'CASCADE' });
Certificate.belongsTo(User, { foreignKey: 'user_id', as: 'recipient' });
Course.hasMany(Certificate, { foreignKey: 'course_id', as: 'certificates' });
Certificate.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });
ExamResult.hasOne(Certificate, { foreignKey: 'exam_result_id', as: 'certificate' });
Certificate.belongsTo(ExamResult, { foreignKey: 'exam_result_id', as: 'exam_result' });

// 15. User & Course <-> Transaction (1:N)
User.hasMany(Transaction, { foreignKey: 'user_id', as: 'transactions' });
Transaction.belongsTo(User, { foreignKey: 'user_id', as: 'buyer' });
Course.hasMany(Transaction, { foreignKey: 'course_id', as: 'transactions' });
Transaction.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });

// 16. User (Tutor) <-> TutorWallet (1:1)
User.hasOne(TutorWallet, { foreignKey: 'tutor_id', as: 'wallet', onDelete: 'CASCADE' });
TutorWallet.belongsTo(User, { foreignKey: 'tutor_id', as: 'tutor' });

// 17. TutorWallet <-> WalletTransaction (1:N)
TutorWallet.hasMany(WalletTransaction, { foreignKey: 'wallet_id', as: 'transactions', onDelete: 'CASCADE' });
WalletTransaction.belongsTo(TutorWallet, { foreignKey: 'wallet_id', as: 'wallet' });

// 18. TutorWallet & User <-> WithdrawalRequest (1:N)
TutorWallet.hasMany(WithdrawalRequest, { foreignKey: 'wallet_id', as: 'withdrawals', onDelete: 'CASCADE' });
WithdrawalRequest.belongsTo(TutorWallet, { foreignKey: 'wallet_id', as: 'wallet' });
User.hasMany(WithdrawalRequest, { foreignKey: 'tutor_id', as: 'withdrawal_requests', onDelete: 'CASCADE' });
WithdrawalRequest.belongsTo(User, { foreignKey: 'tutor_id', as: 'tutor' });

module.exports = {
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
};
