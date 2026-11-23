const express = require('express');
const router = express.Router();
const studentAnalyticsController = require('../../controllers/studentAnalyticsController');
const { authenticateJWT } = require('../../middleware/auth');

router.get('/learning-radar', authenticateJWT, studentAnalyticsController.getLearningRadar);

module.exports = router;
