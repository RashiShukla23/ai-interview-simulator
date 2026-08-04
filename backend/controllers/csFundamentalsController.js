const pool = require('../config/db');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CS_QUESTION_SYSTEM_PROMPT = `You are a senior technical interviewer designing quick-fire CS fundamentals questions for a candidate, based on the specific skills listed on their resume. Your goal is to distinguish candidates who have genuine, hands-on depth from those who only have surface-level, memorized familiarity with a technology.

Follow these principles when writing questions:
1. Prefer "why" and "when" questions over "what is" questions — definitions can be memorized without understanding, but explaining trade-offs and behavior requires real experience.
2. Reference realistic scenarios or comparisons the candidate would only know from actually using the tool.
3. Avoid generic textbook questions that have nothing to do with the candidate's specific stack.
4. Calibrate difficulty to what a strong 3rd/4th-year engineering student with project experience should reasonably know — not entry-level trivia, not PhD-level obscurity.

--- FEW-SHOT EXAMPLE 1 ---
Candidate skills: ["PostgreSQL", "Node.js", "React"]

BAD question: "What is a database?"
(Reason bad: too generic, doesn't test PostgreSQL-specific knowledge, any beginner could answer without ever touching PostgreSQL)

GOOD question: "You have a table with a UNIQUE constraint and a separate PRIMARY KEY on different columns — what's the practical difference in what each one guarantees, and why might you want both?"
(Reason good: requires the candidate to have actually reasoned about constraints while designing a schema, not just memorized a definition)

BAD question: "What is Node.js used for?"
(Reason bad: marketing-level knowledge, doesn't test depth)

GOOD question: "If you call a CPU-heavy synchronous function inside an Express route handler, what happens to other incoming requests while it runs, and why?"
(Reason good: tests real understanding of Node's single-threaded event loop, something only someone who has actually built and debugged a Node backend would reliably know)

--- FEW-SHOT EXAMPLE 2 ---
Candidate skills: ["LangChain", "Python", "OOP"]

BAD question: "What is object-oriented programming?"
(Reason bad: rote definition, zero signal about actual coding ability)

GOOD question: "You have a base class with a method other classes override. What's the risk of calling that method from inside the base class's own constructor?"
(Reason good: tests whether they understand a real, commonly-encountered OOP pitfall — premature virtual method calls during construction — not just terminology)

BAD question: "What is LangChain?"
(Reason bad: they wrote it on their resume, of course they can describe what it is — this proves nothing)

GOOD question: "When would a chain's output need to be parsed with a structured output parser instead of just reading the raw LLM text response, and what tends to go wrong if you skip that?"
(Reason good: only someone who has actually hit parsing failures in a real LangChain project would have a genuine answer here)

--- FEW-SHOT EXAMPLE 3 ---
Candidate skills: ["MySQL", "PHP"]

BAD question: "What does SQL stand for?"
(Reason bad: pure trivia, no engineering judgment involved)

GOOD question: "If a query using a WHERE clause on a column is running slowly on a large table, what's the first thing you'd check, and why might adding an index not always help?"
(Reason good: requires practical debugging intuition, not memorized facts — also naturally invites a follow-up conversation)
--- END EXAMPLES ---

Now apply this same "why/when, not what" discipline to write questions for the candidate's actual skills provided below.`;

// POST /api/cs-fundamentals/generate — generates questions based on candidate's skills
const generateCSQuestions = async (req, res) => {
  try {
    const { candidate_id } = req.body;
    if (!candidate_id) {
      return res.status(400).json({ success: false, error: 'candidate_id is required' });
    }

    const candidateResult = await pool.query(
      'SELECT skills FROM candidate_profile WHERE id = $1',
      [candidate_id]
    );
    if (candidateResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }
    const skills = candidateResult.rows[0].skills || [];
    if (skills.length === 0) {
      return res.status(400).json({ success: false, error: 'No skills found for this candidate' });
    }

    const userPrompt = `Candidate's actual skills: ${JSON.stringify(skills)}

Generate 5-6 quick-fire CS fundamentals questions following the "why/when, not what" principle demonstrated in the examples above. Prioritize their most prominent, project-relevant skills (languages, databases, frameworks they've clearly used hands-on) over generic CS theory. Only include general CS concepts (OS, DBMS internals, OOP, CN) if they connect directly to a skill the candidate actually listed.

Return ONLY valid JSON array (no markdown, no explanation) in exactly this format:
[
  { "question": "string", "topic": "string" }
]`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: CS_QUESTION_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
    });

    const raw = completion.choices[0].message.content.trim();
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    const questions = JSON.parse(cleaned);

    // Save questions to DB
    const savedQuestions = [];
    for (const q of questions) {
      const result = await pool.query(
        `INSERT INTO questions (candidate_id, round_type, question_text, topic)
         VALUES ($1, 'cs_fundamentals', $2, $3) RETURNING *`,
        [candidate_id, q.question, q.topic]
      );
      savedQuestions.push(result.rows[0]);
    }

    res.json({ success: true, questions: savedQuestions });
  } catch (err) {
    console.error('Error generating CS fundamentals questions:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { generateCSQuestions };