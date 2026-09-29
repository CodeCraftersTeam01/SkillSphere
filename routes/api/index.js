const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const mediaRoutes = require('./media');
const materialRoutes = require('./materials');
const adminRoutes = require('./admin');
const courseRoutes = require('./courses');
const tutorRoutes = require('./tutor');
const aiRoutes = require('./ai');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'SkillSphere AI Core Backend',
    sprint: 'Sprint 1 & Sprint 2 - Foundation, Security, Tutor Verification & AI Integration',
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
      'Admin Tutor Verification Portal & Certification Validation (Tegar / Satrio)',
      'Tutor Application & Certification Submission API (Sprint 1 - Tegar)',
      'AI Gemini Career Roadmap Generation & Adaptive Learning (Sprint 2 - Tegar)',
      'AI Study Assistant & Pedagogical Tutor Chatbot (Sprint 2 - Tegar)',
      'AI Practice Quiz & Material Explainer Generator (Sprint 2 - Tegar)',
      'Tutor Material Upload & Management Portal',
    ],
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/media', mediaRoutes);
router.use('/materials', materialRoutes);
router.use('/admin', adminRoutes);
router.use('/courses', courseRoutes);
router.use('/tutor', tutorRoutes);
router.use('/ai', aiRoutes);

module.exports = router;
