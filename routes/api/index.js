const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const mediaRoutes = require('./media');
const materialRoutes = require('./materials');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'SkillSphere AI Core Backend',
    sprint: 'Sprint 2 - Content Delivery & Media Storage Service',
    leadEngineer: 'Arjuna Lanang Adiwarsana',
    features: [
      'Multi-Format Media Storage Service (Video, PPT, PDF, DOC, Book, WebP Thumbnail)',
      'HTTP Range Video Streaming',
      'Course Material Lifecycle Management',
    ],
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/media', mediaRoutes);
router.use('/materials', materialRoutes);

module.exports = router;
