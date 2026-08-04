const express = require('express');
const router = express.Router();
const { generateCSQuestions } = require('../controllers/csFundamentalsController');

// POST /api/cs-fundamentals/generate — generate quick-fire questions from candidate's skills
router.post('/generate', generateCSQuestions);

// NOTE: Answering these questions and generating the report reuses the
// existing generic routes from the Resume/HR round:
//   POST /api/interview/answer   (works for any question_id, any round_type)
//   POST /api/interview/report   (aggregates by session_id, round-agnostic)

module.exports = router;