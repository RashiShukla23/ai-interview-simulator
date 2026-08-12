const pool = require('../config/db');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

//giving feedback to the user
// Scores an answer silently and optionally generates a follow-up question
const scoreAnswerWithAI = async (questionText, answerText, candidateContext) => {
  const prompt = `
You are an interviewer evaluating a candidate's spoken/written answer during a mock interview.

Question asked: "${questionText}"
Candidate's answer: "${answerText}"

Candidate's resume context (for consistency checking): ${candidateContext}

Evaluate the answer and return ONLY valid JSON (no markdown, no explanation) in exactly this format:
{
  "score": <integer 0-10>,
  "feedback": "string - brief internal note on clarity, depth, and resume-consistency (not shown to candidate yet)",
  "follow_up_question": "string or null - ONLY if the answer is vague, incomplete, or invites a natural deeper question. Otherwise null."
}
`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  });

  const raw = completion.choices[0].message.content.trim();
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleaned);
};

// POST /api/interview/answer
const submitAnswer = async (req, res) => {
  try {
    const { candidate_id, question_id, answer_text, session_id } = req.body;

    if (!candidate_id || !question_id || !answer_text) {
      return res.status(400).json({
        success: false,
        error: 'candidate_id, question_id, and answer_text are required',
      });
    }

    // Get the question text
    const questionResult = await pool.query(
      'SELECT question_text, round_type FROM questions WHERE id = $1',
      [question_id]
    );
    if (questionResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }
    const question = questionResult.rows[0];

    // Get lightweight candidate context for consistency checking
    const candidateResult = await pool.query(
      'SELECT skills, projects, experience FROM candidate_profile WHERE id = $1',
      [candidate_id]
    );
    const candidate = candidateResult.rows[0];
    const candidateContext = JSON.stringify({
      skills: candidate?.skills,
      projects: candidate?.projects,
      experience: candidate?.experience,
    });

    // Ensure we have a session — create one if not passed
    let currentSessionId = session_id;
    if (!currentSessionId) {
      const sessionResult = await pool.query(
        `INSERT INTO sessions (candidate_id, round_type) VALUES ($1, $2) RETURNING id`,
        [candidate_id, question.round_type]
      );
      currentSessionId = sessionResult.rows[0].id;
    }

    // Silently score the answer via AI
    const evaluation = await scoreAnswerWithAI(question.question_text, answer_text, candidateContext);

    // Save response — score/feedback stored but NOT returned in full to frontend yet
    await pool.query(
      `INSERT INTO responses (session_id, question_id, answer_text, ai_score, ai_feedback)
       VALUES ($1, $2, $3, $4, $5)`,
      [currentSessionId, question_id, answer_text, evaluation.score, evaluation.feedback]
    );

    // Response to frontend: NO score shown, just confirmation + optional follow-up
    res.json({
      success: true,
      session_id: currentSessionId,
      message: 'Answer submitted',
      follow_up_question: evaluation.follow_up_question || null,
    });
  } catch (err) {
    console.error('Error submitting answer:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/interview/report
const generateReport = async (req, res) => {
  try {
    const { session_id } = req.body;
    if (!session_id) {
      return res.status(400).json({ success: false, error: 'session_id is required' });
    }

    // Fetch all responses for this session
    const responses = await pool.query(
      `SELECT r.*, q.question_text, q.topic
       FROM responses r
       JOIN questions q ON r.question_id = q.id
       WHERE r.session_id = $1`,
      [session_id]
    );

    if (responses.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No responses found for this session' });
    }

    const rows = responses.rows;
    const scores = rows.map((r) => r.ai_score).filter((s) => s !== null);
    const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // Ask AI to write a human-readable summary based on all Q&A + scores
    const summaryPrompt = `
You are summarizing a candidate's mock interview performance for a feedback report.

Here are all the questions, answers, and internal scores/feedback:
${JSON.stringify(rows.map((r) => ({
  question: r.question_text,
  answer: r.answer_text,
  score: r.ai_score,
  internal_feedback: r.ai_feedback,
})), null, 2)}

Write a concise, encouraging but honest summary (4-6 sentences) covering:
- Overall strengths shown
- Key areas to improve
- Whether resume claims were backed up well in answers

Return ONLY the summary text, no JSON, no markdown.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: summaryPrompt }],
      temperature: 0.4,
    });

    const summaryText = completion.choices[0].message.content.trim();
    const overallScore = Math.round(avgScore * 10); // scale to /100

    // Save the report
    const reportResult = await pool.query(
      `INSERT INTO feedback_report (session_id, correctness_score, reasoning_score, communication_score, hints_used_count, overall_score, summary_text)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        session_id,
        null, // correctness_score — used later for coding round
        Math.round(avgScore),
        Math.round(avgScore),
        0,
        overallScore,
        summaryText,
      ]
    );

    res.json({
      success: true,
      report: reportResult.rows[0],
      per_question_breakdown: rows.map((r) => ({
        question: r.question_text,
        answer: r.answer_text,
        score: r.ai_score,
      })),
    });
  } catch (err) {
    console.error('Error generating report:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/interview/report/:session_id — fetch an already-generated report
const getExistingReport = async (req, res) => {
  try {
    const { session_id } = req.params;
    const reportResult = await pool.query(
      `SELECT * FROM feedback_report WHERE session_id = $1`,
      [session_id]
    );
    if (reportResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No report found for this session' });
    }

    const responses = await pool.query(
      `SELECT r.*, q.question_text FROM responses r
       JOIN questions q ON r.question_id = q.id
       WHERE r.session_id = $1`,
      [session_id]
    );

    res.json({
      success: true,
      report: reportResult.rows[0],
      per_question_breakdown: responses.rows.map((r) => ({
        question: r.question_text,
        answer: r.answer_text,
        score: r.ai_score,
      })),
    });
  } catch (err) {
    console.error('Error fetching report:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
module.exports = { submitAnswer, generateReport, getExistingReport };