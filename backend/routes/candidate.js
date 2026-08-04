const express = require('express');
const router = express.Router();
const { getRoundsCompleted, getCombinedReport } = require('../controllers/candidateController');

// GET /api/candidate/:id/rounds-completed
router.get('/:id/rounds-completed', getRoundsCompleted);

// POST /api/candidate/:id/combined-report
router.post('/:id/combined-report', getCombinedReport);

module.exports = router;