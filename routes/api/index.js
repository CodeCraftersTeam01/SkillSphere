const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const mediaRoutes = require('./media');
const materialRoutes = require('./materials');
const adminRoutes = require('./admin');
const courseRoutes = require('./courses');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'SkillSphere AI Core Backend',
    sprint: 'Sprint 1 & Sprint 2 - Foundation, Security & Content Delivery',
    engineers: {
      leadBackend: 'Arjuna Lanang Adiwarsana',
      aiIntegration: 'Tegar Mahardika',
      studentFrontend: 'Fadiyah Nurilwalid',
      tutorAdminFrontendQA: 'Akhmad Satrio Cahyo Pratama',
    },
    features: [
      'Multi-Format Media Storage Service (Video, PPT, PDF, DOC, Book, WebP Thumbnail)',
      'HTTP Range Video Streaming',
      'Course Material Lifecycle & Reordering Management',
      'Admin Tutor Verification Portal & Certification Validation',
      'Tutor Material Upload & Management Portal',
    ],
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/media', mediaRoutes);
router.use('/materials', materialRoutes);
router.use('/courses', courseRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
