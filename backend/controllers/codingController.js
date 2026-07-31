const pool = require('../config/db');
const { runCode } = require('../config/piston');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// GET /api/coding/problem/:id — fetch a single coding problem
const getProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, question_text, topic, difficulty, test_cases
       FROM questions WHERE id = $1 AND round_type = 'technical'`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Problem not found' });
    }
    res.json({ success: true, problem: result.rows[0] });
  } catch (err) {
    console.error('Error fetching problem:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/coding/hint — user is stuck, give a Socratic hint (not the answer)
const getHint = async (req, res) => {
  try {
    const { question_text, current_code } = req.body;
    if (!question_text) {
      return res.status(400).json({ success: false, error: 'question_text is required' });
    }

    const prompt = `
You are an interviewer watching a candidate solve a coding problem live.

Problem: "${question_text}"
Candidate's current code so far:
"""
${current_code || '(no code written yet)'}
"""

Give ONE short Socratic hint (1-2 sentences) that nudges them toward the right approach WITHOUT giving the answer or writing code for them. If they're already on the right track, encourage them to continue and mention one edge case to consider.

Return ONLY the hint text, no JSON, no markdown.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
    });

    res.json({ success: true, hint: completion.choices[0].message.content.trim() });
  } catch (err) {
    console.error('Error generating hint:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/coding/submit — run code against test cases + silent reasoning/follow-up scoring
const submitCode = async (req, res) => {
  try {
    const { candidate_id, question_id, code, language, approach_explanation, session_id } = req.body;

    if (!candidate_id || !question_id || !code || !language) {
      return res.status(400).json({
        success: false,
        error: 'candidate_id, question_id, code, and language are required',
      });
    }

    // Fetch the problem + test cases
    const problemResult = await pool.query(
      `SELECT question_text, test_cases FROM questions WHERE id = $1`,
      [question_id]
    );
    if (problemResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Problem not found' });
    }
    const problem = problemResult.rows[0];
    const testCases = problem.test_cases || [];

    // Run code against each test case via Piston
    const results = [];
    for (const tc of testCases) {
      try {
        const output = await runCode(code, language, tc.input);
        const passed = output.stdout === String(tc.expected_output).trim();
        results.push({
          input: tc.input,
          expected: tc.expected_output,
          actual: output.stdout,
          passed,
          stderr: output.stderr,
        });
      } catch (execErr) {
        results.push({ input: tc.input, passed: false, error: execErr.message });
      }
    }

    const passedCount = results.filter((r) => r.passed).length;
    const allPassed = passedCount === testCases.length && testCases.length > 0;

    // Ensure session exists
    let currentSessionId = session_id;
    if (!currentSessionId) {
      const sessionResult = await pool.query(
        `INSERT INTO sessions (candidate_id, round_type) VALUES ($1, 'technical') RETURNING id`,
        [candidate_id]
      );
      currentSessionId = sessionResult.rows[0].id;
    }

    // AI evaluates reasoning + generates a follow-up question (silent scoring, like resume round)
    const evalPrompt = `
You are evaluating a candidate's coding round submission.

Problem: "${problem.question_text}"
Candidate's pre-submission approach explanation: "${approach_explanation || 'not provided'}"
Test results: ${passedCount}/${testCases.length} test cases passed.

Return ONLY valid JSON (no markdown) in this format:
{
  "reasoning_score": <integer 0-10, based on how clear/correct their approach explanation was>,
  "feedback": "string - internal note, not shown to candidate yet",
  "follow_up_question": "string - ask about time complexity or an edge case, tailored to this problem"
}
`;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: evalPrompt }],
      temperature: 0.3,
    });
    const raw = completion.choices[0].message.content.trim();
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    const evaluation = JSON.parse(cleaned);

    // Save to responses table
    await pool.query(
      `INSERT INTO responses (session_id, question_id, submitted_code, language, judge0_result, reasoning_text, ai_score, ai_feedback)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        currentSessionId,
        question_id,
        code,
        language,
        JSON.stringify({ results, passedCount, total: testCases.length, allPassed }),
        approach_explanation || null,
        evaluation.reasoning_score,
        evaluation.feedback,
      ]
    );

    // Response to frontend: pass/fail is shown (like a real judge), but reasoning SCORE stays silent
    res.json({
      success: true,
      session_id: currentSessionId,
      passed_count: passedCount,
      total_test_cases: testCases.length,
      all_passed: allPassed,
      test_results: results,
      follow_up_question: evaluation.follow_up_question,
    });
  } catch (err) {
    console.error('Error submitting code:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getProblem, getHint, submitCode };