const express = require('express');
const multer = require('multer');
const router = express.Router();
const { uploadResume } = require('../controllers/resumeController');

// Configure multer to store uploaded files in /uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// POST /api/resume/upload
router.post('/upload', upload.single('resume'), uploadResume);

module.exports = router;