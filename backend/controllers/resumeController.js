const fs = require('fs');
const pdfParse = require('pdf-parse');
const pool = require('../config/db');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Sends raw resume text to OpenAI and gets back structured data
const parseResumeWithAI = async (rawText) => {
  const prompt = `
You are a resume parser. Extract structured information from the resume text below.
Return ONLY valid JSON (no markdown, no explanation, no code fences) in exactly this format:

{
  "name": "string or null",
  "email": "string or null",
  "skills": ["array", "of", "skills"],
  "projects": [
    { "title": "string", "description": "string", "tech_stack": ["array"] }
  ],
  "experience": [
    {
      "role": "string (e.g. 'Software Development Intern')",
      "company": "string",
      "duration": "string (e.g. 'Jun 2025 - Aug 2025')",
      "description": "string summarizing responsibilities/achievements"
    }
  ]
}

If the resume has no internships or work experience, return "experience": [].

Resume text:
"""
${rawText}
"""
`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
  });

  const raw = completion.choices[0].message.content.trim();
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/, '').trim();

  return JSON.parse(cleaned);
};

// Generates personalized interview questions based on parsed resume data
const generateQuestionsWithAI = async (parsed) => {
  const hasExperience = parsed.experience && parsed.experience.length > 0;

  const prompt = `
You are an interviewer preparing questions for a candidate based on their resume data below.

Candidate data:
${JSON.stringify(parsed, null, 2)}

Generate 5-8 personalized interview questions:
- If the candidate has work/internship experience, prioritize 2-3 questions specifically about their role, responsibilities, and what they learned/achieved there
- Ask 2-3 questions about their strongest/most complex project (tech choices, challenges faced)
- Ask 1-2 general questions about their listed skills

Return ONLY valid JSON array (no markdown, no explanation) in exactly this format:
[
  { "question": "string", "topic": "string", "based_on": "experience | project | skill" }
]
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

const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);

    const pdfData = await pdfParse(fileBuffer);
    const rawText = pdfData.text;

    console.log('✅ Extracted resume text, sending to OpenAI for parsing...');
    const parsed = await parseResumeWithAI(rawText);
    console.log('✅ OpenAI parsed result:', parsed);

    // Save candidate profile
    const result = await pool.query(
      `INSERT INTO candidate_profile (name, email, skills, projects, experience, raw_resume_text)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        parsed.name || null,
        parsed.email || null,
        parsed.skills || [],
        JSON.stringify(parsed.projects || []),
        JSON.stringify(parsed.experience || []),
        rawText,
      ]
    );

    const candidate = result.rows[0];

    // Generate personalized questions (including experience-based ones)
    console.log('✅ Generating personalized questions...');
    const questions = await generateQuestionsWithAI(parsed);
    console.log('✅ Generated questions:', questions);

    // Save questions to DB, linked to this candidate
    for (const q of questions) {
      await pool.query(
        `INSERT INTO questions (candidate_id, round_type, question_text, topic)
         VALUES ($1, $2, $3, $4)`,
        [candidate.id, 'resume', q.question, q.topic || q.based_on]
      );
    }

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'Resume uploaded, parsed, and questions generated successfully',
      candidate,
      questions,
    });
  } catch (err) {
    console.error('Error processing resume:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { uploadResume };