const pool = require('../config/db');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// GET /api/candidate/:id/rounds-completed
// Returns which round types this candidate has at least one completed session for
const getRoundsCompleted = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT DISTINCT s.round_type, s.id AS session_id
       FROM sessions s
       WHERE s.candidate_id = $1
       ORDER BY s.round_type`,
      [id]
    );

    // Only count a round as "completed" if it already has a feedback_report generated
    const completed = [];
    for (const row of result.rows) {
      const reportCheck = await pool.query(
        `SELECT id FROM feedback_report WHERE session_id = $1`,
        [row.session_id]
      );
      if (reportCheck.rows.length > 0) {
        completed.push({ round_type: row.round_type, session_id: row.session_id });
      }
    }

    res.json({ success: true, rounds_completed: completed });
  } catch (err) {
    console.error('Error fetching rounds completed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/candidate/:id/combined-report
// Aggregates all completed round reports for this candidate into one final summary
const getCombinedReport = async (req, res) => {
  try {
    const { id } = req.params;

    // Get all sessions + their feedback reports for this candidate
    const result = await pool.query(
      `SELECT s.round_type, fr.*
       FROM sessions s
       JOIN feedback_report fr ON fr.session_id = s.id
       WHERE s.candidate_id = $1
       ORDER BY s.round_type`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No completed rounds found for this candidate yet',
      });
    }

    const roundReports = result.rows;
    const overallScores = roundReports.map((r) => r.overall_score).filter((s) => s !== null);
    const combinedOverallScore = overallScores.length
      ? Math.round(overallScores.reduce((a, b) => a + b, 0) / overallScores.length)
      : 0;

    // AI writes a holistic summary across all completed rounds
    const summaryPrompt = `
You are writing a final combined interview performance summary for a candidate who completed the following rounds:

${JSON.stringify(roundReports.map((r) => ({
  round: r.round_type,
  overall_score: r.overall_score,
  summary: r.summary_text,
})), null, 2)}

Write a concise, encouraging but honest overall summary (5-7 sentences) that:
- Synthesizes performance across all completed rounds (don't just repeat each round's summary separately)
- Highlights the candidate's strongest round and area needing the most improvement
- Gives one clear, actionable piece of advice for their next interview prep session

Return ONLY the summary text, no JSON, no markdown.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: summaryPrompt }],
      temperature: 0.4,
    });

    const combinedSummary = completion.choices[0].message.content.trim();

    res.json({
      success: true,
      candidate_id: id,
      rounds_included: roundReports.map((r) => r.round_type),
      combined_overall_score: combinedOverallScore,
      combined_summary: combinedSummary,
      per_round_reports: roundReports,
    });
  } catch (err) {
    console.error('Error generating combined report:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/candidate/:id/questions?round_type=resume
const getQuestionsByRound = async (req, res) => {
  try {
    const { id } = req.params;
    const { round_type } = req.query;
    if (!round_type) {
      return res.status(400).json({ success: false, error: 'round_type query param is required' });
    }
    const result = await pool.query(
      `SELECT * FROM questions WHERE candidate_id = $1 AND round_type = $2 ORDER BY id`,
      [id, round_type]
    );
    res.json({ success: true, questions: result.rows });
  } catch (err) {
    console.error('Error fetching questions by round:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getRoundsCompleted, getCombinedReport, getQuestionsByRound };