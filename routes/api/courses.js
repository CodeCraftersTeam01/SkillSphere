const express = require('express');
const router = express.Router();
const courseController = require('../../controllers/courseController');
const { authenticateJWT, authorizeRoles } = require('../../middleware/auth');
const { cacheMiddleware, invalidateCacheMiddleware } = require('../../middleware/cache');

// Public / General categories list (Cache for 10 minutes)
router.get('/categories', cacheMiddleware(600), courseController.getCategories);
router.get('/categories/list', cacheMiddleware(600), courseController.getCategories);

// Public / General courses list (Cache for 5 minutes)
router.get('/', cacheMiddleware(300), courseController.getAllCourses);

// Tutor courses list
router.get('/tutor/my-courses', authenticateJWT, authorizeRoles('tutor', 'admin'), courseController.getMyCourses);

// Student learning activities list
router.get('/student/my-learning', authenticateJWT, courseController.getMyLearning);

// Course enrollment
router.post('/:id/enroll', authenticateJWT, invalidateCacheMiddleware(['cache:/api/courses*', 'cache:/api/admin*']), courseController.enrollCourse);

// Course details (Cache for 5 minutes)
router.get('/:id', cacheMiddleware(300), courseController.getCourseById);

// Course creation & modification (Tutor & Admin) -> Invalidate courses cache
router.post('/', authenticateJWT, authorizeRoles('tutor', 'admin'), invalidateCacheMiddleware(['cache:/api/courses*', 'cache:/api/admin*']), courseController.createCourse);
router.put('/:id', authenticateJWT, authorizeRoles('tutor', 'admin'), invalidateCacheMiddleware(['cache:/api/courses*', 'cache:/api/admin*']), courseController.updateCourse);

// Course Sections Management
router.post('/:courseId/sections', authenticateJWT, authorizeRoles('tutor', 'admin'), invalidateCacheMiddleware(['cache:/api/courses*']), courseController.createSection);
router.put('/sections/:sectionId', authenticateJWT, authorizeRoles('tutor', 'admin'), invalidateCacheMiddleware(['cache:/api/courses*']), courseController.updateSection);
router.delete('/sections/:sectionId', authenticateJWT, authorizeRoles('tutor', 'admin'), invalidateCacheMiddleware(['cache:/api/courses*']), courseController.deleteSection);

module.exports = router;
