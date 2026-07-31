const express = require('express');
const router = express.Router();
const { getProblem, getHint, submitCode } = require('../controllers/codingController');

// GET /api/coding/problem/:id — fetch a coding problem
router.get('/problem/:id', getProblem);

// POST /api/coding/hint — get a Socratic hint while stuck
router.post('/hint', getHint);

// POST /api/coding/submit — submit code, run against test cases
router.post('/submit', submitCode);

module.exports = router;