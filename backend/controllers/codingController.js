const pool = require('../config/db');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// GET /api/coding/problem/:id
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

// POST /api/coding/hint
const getHint = async (req, res) => {
  try {
    const { question_text, current_code } = req.body;
    if (!question_text) {
      return res.status(400).json({ success: false, error: 'question_text is required' });
    }

    const systemPrompt = `You are a senior software engineer conducting a live technical interview. You give short, Socratic hints — you NEVER write code for the candidate and NEVER state the final answer directly. Your hints nudge thinking, they don't solve the problem.

Example 1:
Problem: "Find the two numbers in an array that sum to a target value."
Candidate's code: an empty/blank editor.
Good hint: "Think about what you'd need to remember about numbers you've already seen as you scan through the array once."

Example 2:
Problem: "Reverse a linked list."
Candidate's code: a loop that only reassigns node.next without tracking the previous node.
Good hint: "You're overwriting node.next before you've saved a reference to it — what do you lose access to when you do that?"

Example 3:
Problem: "Check if a string is a palindrome."
Candidate's code: a correct two-pointer solution, no bugs.
Good hint: "This looks solid. One thing worth considering out loud: how should this handle spaces or capitalization?"

Follow this style: one short, specific, non-revealing nudge tied to what's actually in their code right now.`;

    const userPrompt = `Problem: "${question_text}"
Candidate's current code:
"""
${current_code || '(no code written yet)'}
"""

Give ONE hint following the style above. Return ONLY the hint text, no labels, no markdown.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
    });

    res.json({ success: true, hint: completion.choices[0].message.content.trim() });
  } catch (err) {
    console.error('Error generating hint:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Detailed system prompt + few-shot examples so the LLM traces code more like a real interpreter
const CODE_EVAL_SYSTEM_PROMPT = `You are a meticulous code execution simulator combined with a technical interviewer. Your job has two parts:

PART 1 — TRACE EXECUTION (be extremely literal, like a debugger):
For each test case, mentally execute the code LINE BY LINE with the given input as if you were a Python/JS/Java/C++ interpreter. Track variable values at each step. Do not assume the code is correct — actually simulate it. Common things to watch for:
- Off-by-one errors in loops (e.g. range(n) vs range(n+1))
- Integer vs float division
- Mutable default arguments
- Index out of bounds
- Wrong comparison operators (= vs ==, < vs <=)
- Missing return statements (function implicitly returns None/undefined)
- Type mismatches (comparing string "5" to int 5)
- Uninitialized variables used before assignment

PART 2 — EVALUATE REASONING:
Judge the candidate's stated approach for correctness and clarity, independent of whether the code itself has bugs (a candidate can explain the right approach but have a typo in code, or vice versa).

--- FEW-SHOT EXAMPLE 1 ---
Problem: "Read two integers and print their sum."
Code (python):
"""
a = input()
b = input()
print(a + b)
"""
Test case: input="2\\n3", expected="5"

Correct trace: input() returns STRINGS, not integers. "a + b" with a="2", b="3" performs STRING CONCATENATION, producing "23", not numeric addition "5".
predicted_output: "23"
passed: false
explanation: "input() returns strings; a+b concatenates instead of adding. Needs int(input()) conversion."

--- FEW-SHOT EXAMPLE 2 ---
Problem: "Return the factorial of n."
Code (python):
"""
def factorial(n):
    result = 1
    for i in range(1, n):
        result *= i
    return result
"""
Test case: input="5", expected="120"

Correct trace: range(1, 5) produces [1,2,3,4] — it EXCLUDES n itself. So result = 1*1*2*3*4 = 24, not 120 (5! = 120 requires multiplying up to and including 5).
predicted_output: "24"
passed: false
explanation: "range(1, n) excludes n; should be range(1, n+1) to include n in the product."

--- FEW-SHOT EXAMPLE 3 ---
Problem: "Check if a number is even."
Code (javascript):
"""
function isEven(n) { return n % 2 === 0; }
console.log(isEven(4));
"""
Test case: input="4", expected="true"

Correct trace: 4 % 2 = 0, 0 === 0 is true. console.log prints "true".
predicted_output: "true"
passed: true
explanation: ""
--- END EXAMPLES ---

Now apply this same literal, careful tracing discipline to the candidate's actual submission below. Do not give benefit of the doubt — if the code has a bug, catch it, the same way you caught the string-concatenation and off-by-one bugs above.`;

const evaluateCodeWithAI = async (questionText, code, language, testCases, approachExplanation) => {
  const userPrompt = `Problem: "${questionText}"
Language: ${language}
Candidate's code:
"""
${code}
"""
Candidate's stated approach: "${approachExplanation || 'not provided'}"

Test cases:
${JSON.stringify(testCases, null, 2)}

Trace through the code for EACH test case exactly like the few-shot examples showed. Then evaluate the approach explanation and generate one relevant follow-up question (about complexity or an edge case, specific to this problem).

Return ONLY valid JSON (no markdown, no code fences) in exactly this format:
{
  "test_results": [
    { "input": "string", "expected": "string", "predicted_output": "string", "passed": true/false, "explanation": "brief reason if failed, empty string if passed" }
  ],
  "passed_count": <integer>,
  "total_test_cases": <integer>,
  "all_passed": true/false,
  "reasoning_score": <integer 0-10>,
  "feedback": "string - internal note, not shown to candidate yet",
  "follow_up_question": "string"
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: CODE_EVAL_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0,
  });

  const raw = completion.choices[0].message.content.trim();
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleaned);
};

// POST /api/coding/submit
const submitCode = async (req, res) => {
  try {
    const { candidate_id, question_id, code, language, approach_explanation, session_id } = req.body;

    if (!candidate_id || !question_id || !code || !language) {
      return res.status(400).json({
        success: false,
        error: 'candidate_id, question_id, code, and language are required',
      });
    }

    const problemResult = await pool.query(
      `SELECT question_text, test_cases FROM questions WHERE id = $1`,
      [question_id]
    );
    if (problemResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Problem not found' });
    }
    const problem = problemResult.rows[0];
    const testCases = problem.test_cases || [];

    const evaluation = await evaluateCodeWithAI(
      problem.question_text,
      code,
      language,
      testCases,
      approach_explanation
    );

    let currentSessionId = session_id;
    if (!currentSessionId) {
      const sessionResult = await pool.query(
        `INSERT INTO sessions (candidate_id, round_type) VALUES ($1, 'technical') RETURNING id`,
        [candidate_id]
      );
      currentSessionId = sessionResult.rows[0].id;
    }

    await pool.query(
      `INSERT INTO responses (session_id, question_id, submitted_code, language, judge0_result, reasoning_text, ai_score, ai_feedback)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        currentSessionId,
        question_id,
        code,
        language,
        JSON.stringify(evaluation.test_results),
        approach_explanation || null,
        evaluation.reasoning_score,
        evaluation.feedback,
      ]
    );

    res.json({
      success: true,
      session_id: currentSessionId,
      passed_count: evaluation.passed_count,
      total_test_cases: evaluation.total_test_cases,
      all_passed: evaluation.all_passed,
      test_results: evaluation.test_results,
      follow_up_question: evaluation.follow_up_question,
    });
  } catch (err) {
    console.error('Error submitting code:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getProblem, getHint, submitCode };