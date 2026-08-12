const express = require('express');
const router = express.Router();
const { submitAnswer, generateReport } = require('../controllers/interviewController');

// POST /api/interview/answer — submit an answer to a question (silent scoring)
router.post('/answer', submitAnswer);

// POST /api/interview/report — generate final aggregated report for a session
router.post('/report', generateReport);

router.get('/report/:session_id', getExistingReport);

module.exports = router;