const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./config/db');
const resumeRoutes = require('./routes/resume');
const interviewRoutes = require('./routes/interview');
const codingRoutes = require('./routes/coding');
const csFundamentalsRoutes = require('./routes/csFundamentals');
const candidateRoutes = require('./routes/candidate');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Test route — confirms server is running
app.get('/', (req, res) => {
  res.send('AI Interview Simulator backend is running 🚀');
});

// Test route — confirms DB connection works
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ success: true, time: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Resume routes
app.use('/api/resume', resumeRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/coding', codingRoutes);
app.use('/api/cs-fundamentals', csFundamentalsRoutes);
app.use('/api/candidate', candidateRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});