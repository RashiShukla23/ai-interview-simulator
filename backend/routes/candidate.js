const express = require('express');
const router = express.Router();
const { getRoundsCompleted, getCombinedReport, getQuestionsByRound } = require('../controllers/candidateController');

// GET /api/candidate/:id/rounds-completed
router.get('/:id/rounds-completed', getRoundsCompleted);

// GET /api/candidate/:id/questions?round_type=resume
router.get('/:id/questions', getQuestionsByRound);

// POST /api/candidate/:id/combined-report
router.post('/:id/combined-report', getCombinedReport);

module.exports = router;