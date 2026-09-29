const express = require('express');
const router = express.Router();
const aiController = require('../../controllers/aiController');
const { authenticateJWT, optionalAuth } = require('../../middleware/auth');

// 1. AI Career Roadmap Endpoints (Sprint 2 - Tegar)
router.post('/career-roadmap/generate', authenticateJWT, aiController.generateCareerRoadmap);
router.get('/career-roadmap/my-roadmap', authenticateJWT, aiController.getMyCareerRoadmap);
router.patch('/career-roadmap/milestone/:step', authenticateJWT, aiController.updateMilestoneStatus);

// 2. AI Study Assistant & Chatbot (Sprint 2 - Tegar)
router.post('/study-assistant/chat', authenticateJWT, aiController.chatStudyAssistant);

// 3. AI Quiz Generator & Assessment (Sprint 2 - Tegar)
router.post('/quiz/generate', authenticateJWT, aiController.generateQuiz);

// 4. AI Material Explainer & Summarizer (Sprint 2 - Tegar)
router.post('/material/explain', authenticateJWT, aiController.explainMaterial);

module.exports = router;
