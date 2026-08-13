const axios = require('axios');

const PISTON_URL = 'https://emkc.org/api/v2/piston/execute';

// Maps our simple language names to Piston's expected language + version
const LANGUAGE_MAP = {
  javascript: { language: 'javascript', version: '18.15.0' },
  python: { language: 'python', version: '3.10.0' },
  java: { language: 'java', version: '15.0.2' },
  cpp: { language: 'cpp', version: '10.2.0' },
};

/**
 * Runs code against a single input and returns the actual output.
 * @param {string} code - source code
 * @param {string} language - one of 'javascript' | 'python' | 'java' | 'cpp'
 * @param {string} stdin - input to feed the program
 */
const runCode = async (code, language, stdin = '') => {
  const langConfig = LANGUAGE_MAP[language];
  if (!langConfig) {
    
    throw new Error(`Unsupported language: ${language}`);
  }

  const response = await axios.post(PISTON_URL, {
    language: langConfig.language,
    version: langConfig.version,
    files: [{ content: code }],
    stdin: stdin,
  });

  const { run } = response.data;

  return {
    stdout: run.stdout?.trim() || '',
    stderr: run.stderr?.trim() || '',
    exit_code: run.code,
    runtime_ms: run.signal ? null : undefined, // Piston doesn't give exact ms, keep placeholder
  };
};

module.exports = { runCode };