const express = require('express');
const router = express.Router();
const courseController = require('../../controllers/courseController');
const { authenticateJWT, authorizeRoles } = require('../../middleware/auth');

// Public / General categories list
router.get('/categories/list', courseController.getCategories);

// Public / General courses list
router.get('/', courseController.getAllCourses);

// Tutor courses list
router.get('/tutor/my-courses', authenticateJWT, authorizeRoles('tutor', 'admin'), courseController.getMyCourses);

// Student learning activities list
router.get('/student/my-learning', authenticateJWT, courseController.getMyLearning);

// Course enrollment
router.post('/:id/enroll', authenticateJWT, courseController.enrollCourse);

// Course details
router.get('/:id', courseController.getCourseById);


// Course creation & modification (Tutor & Admin)
router.post('/', authenticateJWT, authorizeRoles('tutor', 'admin'), courseController.createCourse);
router.put('/:id', authenticateJWT, authorizeRoles('tutor', 'admin'), courseController.updateCourse);

// Course Sections Management
router.post('/:courseId/sections', authenticateJWT, authorizeRoles('tutor', 'admin'), courseController.createSection);
router.put('/sections/:sectionId', authenticateJWT, authorizeRoles('tutor', 'admin'), courseController.updateSection);
router.delete('/sections/:sectionId', authenticateJWT, authorizeRoles('tutor', 'admin'), courseController.deleteSection);

module.exports = router;
