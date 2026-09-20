const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'SkillSphere AI Core Backend',
    sprint: 'Sprint 1 - Foundation & Security',
    leadEngineer: 'Arjuna Lanang Adiwarsana',
  });
});

// Mount Auth routes
router.use('/auth', authRoutes);

module.exports = router;
