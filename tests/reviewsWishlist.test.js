const assert = require('assert');
const {
  sequelize,
  User,
  UserProfile,
  Course,
  Category,
  Enrollment,
} = require('../models');
const courseController = require('../controllers/courseController');

async function runReviewsWishlistTests() {
  console.log('🧪 Starting Rating, Reviews & Wishlist API Test Suite (Sprint 3 - Tegar)...\n');

  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: false });

    const timestamp = Date.now();

    // 1. Setup User Tutor, Student A, Student B, Category, Course
    const tutor = await User.create({
      name: `Tutor Reviews ${timestamp}`,
      email: `tutor_rev_${timestamp}@skillsphere.id`,
      password: 'hashed_password_123',
      role: 'tutor',
      is_verified: true,
    });

    const studentA = await User.create({
      name: `Student Alif ${timestamp}`,
      email: `student_alif_${timestamp}@skillsphere.id`,
      password: 'hashed_password_123',
      role: 'student',
      is_verified: true,
    });

    const studentB = await User.create({
      name: `Student Bima ${timestamp}`,
      email: `student_bima_${timestamp}@skillsphere.id`,
      password: 'hashed_password_123',
      role: 'student',
      is_verified: true,
    });

    let category = await Category.findOne();
    if (!category) {
      category = await Category.create({
        name: `Engineering ${timestamp}`,
        slug: `eng-${timestamp}`,
      });
    }

    const course = await Course.create({
      tutor_id: tutor.id,
      category_id: category.id,
      title: `Golang Microservices Architecture ${timestamp}`,
      slug: `golang-microservices-${timestamp}`,
      description: 'Panduan lengkap microservices.',
      price: 350000,
      status: 'published',
    });

    // 2. Test submitReview: Student B belum terdaftar (Harus 403 Forbidden)
    let reviewRes = null;
    let reviewCode = null;
    const mockRes = {
      status(code) {
        reviewCode = code;
        return this;
      },
      json(data) {
        reviewRes = data;
        return this;
      },
    };

    await courseController.submitReview(
      {
        user: { id: studentB.id },
        params: { id: course.id },
        body: { rating: 5, review: 'Materi sangat jelas!' },
      },
      mockRes
    );
    assert.strictEqual(reviewCode, 403, 'Unenrolled student must be rejected with 403 Forbidden');
    console.log('  ✔ Access Control: Unenrolled student blocked from submitting review (403).');

    // 3. Test submitReview: Student A terdaftar aktif
    await Enrollment.create({
      user_id: studentA.id,
      course_id: course.id,
      status: 'active',
    });

    // 3a. Invalid rating validation (> 5)
    await courseController.submitReview(
      {
        user: { id: studentA.id },
        params: { id: course.id },
        body: { rating: 6, review: 'Luar biasa!' },
      },
      mockRes
    );
    assert.strictEqual(reviewCode, 400, 'Rating > 5 must be rejected with 400 Bad Request');
    console.log('  ✔ Validation: Rating outside 1-5 rejected (400 Bad Request).');

    // 3b. Valid rating 5
    await courseController.submitReview(
      {
        user: { id: studentA.id },
        params: { id: course.id },
        body: { rating: 5, review: 'Penjelasan tutor sangat mendalam dan to-the-point!' },
      },
      mockRes
    );
    assert.strictEqual(reviewCode, 200);
    assert.strictEqual(reviewRes.data.rating, 5);
    assert.strictEqual(reviewRes.data.course_rating_avg, 5.0);
    assert.strictEqual(reviewRes.data.course_rating_count, 1);
    console.log('  ✔ submitReview: Successfully stored 5-star review and updated course average.');

    // 3c. Student B mendaftar dan memberikan rating 4
    await Enrollment.create({
      user_id: studentB.id,
      course_id: course.id,
      status: 'active',
    });

    await courseController.submitReview(
      {
        user: { id: studentB.id },
        params: { id: course.id },
        body: { rating: 4, review: 'Sangat bagus, ada sedikit kendala sound di modul 2.' },
      },
      mockRes
    );
    assert.strictEqual(reviewCode, 200);
    assert.strictEqual(reviewRes.data.course_rating_avg, 4.5, 'Average of 5 and 4 must be 4.5');
    assert.strictEqual(reviewRes.data.course_rating_count, 2);
    console.log('  ✔ Recalculate: Two reviews averaged correctly to 4.5 stars (count: 2).');

    // 4. Test getCourseReviews
    let getRevCode = null;
    let getRevData = null;
    await courseController.getCourseReviews(
      { params: { id: course.id } },
      {
        status(code) {
          getRevCode = code;
          return this;
        },
        json(data) {
          getRevData = data;
          return this;
        },
      }
    );
    assert.strictEqual(getRevCode, 200);
    assert.strictEqual(getRevData.data.reviews.length, 2);
    assert.strictEqual(getRevData.data.rating_avg, 4.5);
    console.log('  ✔ getCourseReviews: Returned list of 2 verified student reviews.');

    // 5. Test Wishlist Toggle (Add & Remove)
    let wishCode = null;
    let wishData = null;
    const mockWishRes = {
      status(code) {
        wishCode = code;
        return this;
      },
      json(data) {
        wishData = data;
        return this;
      },
    };

    // 5a. Tambahkan ke wishlist
    await courseController.toggleWishlist(
      {
        user: { id: studentA.id },
        body: { course_id: course.id },
      },
      mockWishRes
    );
    assert.strictEqual(wishCode, 200);
    assert.strictEqual(wishData.data.is_wishlisted, true);
    assert.strictEqual(wishData.data.wishlist_count, 1);
    console.log('  ✔ toggleWishlist: Added course to student wishlist.');

    // 5b. Ambil daftar wishlist
    let getWishCode = null;
    let getWishData = null;
    await courseController.getWishlist(
      { user: { id: studentA.id } },
      {
        status(code) {
          getWishCode = code;
          return this;
        },
        json(data) {
          getWishData = data;
          return this;
        },
      }
    );
    assert.strictEqual(getWishCode, 200);
    assert.strictEqual(getWishData.data.length, 1);
    assert.strictEqual(getWishData.data[0].id, course.id);
    console.log('  ✔ getWishlist: Successfully retrieved wishlisted course details.');

    // 5c. Hapus dari wishlist (toggle kembali)
    await courseController.toggleWishlist(
      {
        user: { id: studentA.id },
        body: { course_id: course.id },
      },
      mockWishRes
    );
    assert.strictEqual(wishCode, 200);
    assert.strictEqual(wishData.data.is_wishlisted, false);
    assert.strictEqual(wishData.data.wishlist_count, 0);
    console.log('  ✔ toggleWishlist: Removed course from wishlist upon re-toggle.');

    console.log('\n======================================================');
    console.log('🎉 ALL REVIEWS, RATINGS & WISHLIST TESTS PASSED (TEGAR)!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Reviews Wishlist Test Failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  runReviewsWishlistTests().then(() => process.exit(0));
}

module.exports = runReviewsWishlistTests;
