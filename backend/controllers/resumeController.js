const fs = require('fs');
const pdfParse = require('pdf-parse').default || require('pdf-parse');
const pool = require('../config/db');

const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Step 1: Read the uploaded PDF file
    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);

    // Step 2: Extract raw text from PDF
    const pdfData = await pdfParse(fileBuffer);
    const rawText = pdfData.text;

    console.log('✅ Extracted resume text (first 300 chars):');
    console.log(rawText.substring(0, 300));

    // Step 3: [TODO - once OpenAI key is ready]
    // Send rawText to OpenAI API to extract structured skills/projects
    // const parsedData = await parseResumeWithAI(rawText);
    // For now, we just save the raw text and leave skills/projects empty

    // Step 4: Save to database
    const result = await pool.query(
      `INSERT INTO candidate_profile (name, email, skills, projects, raw_resume_text)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        null,              // name - will be filled by AI parsing later
        null,              // email - will be filled by AI parsing later
        [],                // skills - empty array for now
        JSON.stringify({}), // projects - empty object for now
        rawText,
      ]
    );

    // Step 5: Clean up - delete the uploaded file after processing (optional)
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'Resume uploaded and text extracted successfully',
      candidate: result.rows[0],
    });
  } catch (err) {
    console.error('Error processing resume:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { uploadResume };