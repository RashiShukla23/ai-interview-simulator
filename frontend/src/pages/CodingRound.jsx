import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import axios from 'axios';

export default function CodingRound() {
  const [question, setQuestion] = useState(null);
  const [code, setCode] = useState('// Write your solution here\n');
  const [language, setLanguage] = useState('python');
  const [approach, setApproach] = useState('');
  const [hint, setHint] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [results, setResults] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const candidateId = localStorage.getItem('candidate_id');

  useEffect(() => {
    axios.get(`http://localhost:5000/api/candidate/${candidateId}/questions?round_type=technical`)
      .then((res) => {
        if (res.data.questions?.length > 0) setQuestion(res.data.questions[0]);
      })
      .catch(() => {});
  }, [candidateId]);

  const getHint = async () => {
    setShowHint(true);
    const res = await axios.post('http://localhost:5000/api/coding/hint', {
      question_text: question.question_text,
      current_code: code,
    });
    setHint(res.data.hint);
  };

  const handleSubmit = async () => {
    if (!approach.trim()) {
      alert('Please explain your approach before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await axios.post('http://localhost:5000/api/coding/submit', {
        candidate_id: candidateId,
        question_id: question.id,
        code,
        language,
        approach_explanation: approach,
      });
      setResults(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!question) {
    return <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center text-[var(--color-muted)]">Loading problem...</div>;
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <div className="border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
        <span className="font-mono text-sm text-[var(--color-muted)]">Technical Coding Round</span>
        <span className="text-xs px-2 py-1 rounded-full border border-[var(--color-border)] text-[var(--color-muted)]">
          {question.difficulty || 'medium'}
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: problem */}
        <div className="w-2/5 border-r border-[var(--color-border)] p-6 overflow-y-auto">
          <h2 className="text-xl font-bold text-[var(--color-text)]">{question.topic}</h2>
          <p className="mt-4 text-[var(--color-text)] leading-relaxed whitespace-pre-wrap">
            {question.question_text}
          </p>

          <button
            onClick={getHint}
            className="mt-6 text-sm text-[var(--color-accent)] flex items-center gap-2 hover:underline"
          >
            💡 Get a hint
          </button>
          {showHint && (
            <div className="mt-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md p-4 text-sm text-[var(--color-muted)] italic">
              {hint || 'Thinking...'}
            </div>
          )}
        </div>

        {/* Right: editor */}
        <div className="w-3/5 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)]">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-3 py-1.5 text-sm text-[var(--color-text)]"
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
            </select>
          </div>

          <div className="flex-1">
            <Editor
              height="100%"
              language={language === 'cpp' ? 'cpp' : language}
              theme="vs-dark"
              value={code}
              onChange={(v) => setCode(v)}
              options={{ fontFamily: 'JetBrains Mono', fontSize: 14, minimap: { enabled: false } }}
            />
          </div>

          <div className="border-t border-[var(--color-border)] p-4">
            <textarea
              value={approach}
              onChange={(e) => setApproach(e.target.value)}
              placeholder="Explain your approach before submitting..."
              rows={2}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-3 py-2 text-sm text-[var(--color-text)] resize-none focus:outline-none focus:border-[var(--color-accent)]"
            />
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="mt-3 w-full bg-[var(--color-accent)] text-[var(--color-bg)] font-semibold py-2.5 rounded-md disabled:opacity-50"
            >
              {submitting ? 'Evaluating...' : 'Submit Solution'}
            </button>

            {results && (
              <div className="mt-4">
                <div className="flex gap-2 flex-wrap">
                  {results.test_results.map((r, i) => (
                    <span
                      key={i}
                      className={`text-xs px-2 py-1 rounded-full font-mono ${
                        r.passed ? 'bg-[var(--color-accent-dim)] text-[var(--color-accent)]' : 'bg-red-950 text-[var(--color-danger)]'
                      }`}
                    >
                      {r.passed ? '✓' : '✗'} Test {i + 1}
                    </span>
                  ))}
                </div>
                {results.follow_up_question && (
                  <p className="mt-3 text-sm text-[var(--color-muted)] italic">
                    Follow-up: {results.follow_up_question}
                  </p>
                )}
                <button
                  onClick={() => navigate('/rounds')}
                  className="mt-4 text-sm text-[var(--color-accent)] hover:underline"
                >
                  Back to Rounds →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import axios from 'axios';

export default function CodingRound() {
  const [question, setQuestion] = useState(null);
  const [code, setCode] = useState('// Write your solution here\n');
  const [language, setLanguage] = useState('python');
  const [approach, setApproach] = useState('');
  const [hint, setHint] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [results, setResults] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const candidateId = localStorage.getItem('candidate_id');

  useEffect(() => {
    axios.get(`http://localhost:5000/api/candidate/${candidateId}/questions?round_type=technical`)
      .then((res) => {
        if (res.data.questions?.length > 0) setQuestion(res.data.questions[0]);
      })
      .catch(() => {});
  }, [candidateId]);

  const getHint = async () => {
    setShowHint(true);
    const res = await axios.post('http://localhost:5000/api/coding/hint', {
      question_text: question.question_text,
      current_code: code,
    });
    setHint(res.data.hint);
  };

  const handleSubmit = async () => {
    if (!approach.trim()) {
      alert('Please explain your approach before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await axios.post('http://localhost:5000/api/coding/submit', {
        candidate_id: candidateId,
        question_id: question.id,
        code,
        language,
        approach_explanation: approach,
      });
      setResults(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!question) {
    return <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center text-[var(--color-muted)]">Loading problem...</div>;
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <div className="border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
        <span className="font-mono text-sm text-[var(--color-muted)]">Technical Coding Round</span>
        <span className="text-xs px-2 py-1 rounded-full border border-[var(--color-border)] text-[var(--color-muted)]">
          {question.difficulty || 'medium'}
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: problem */}
        <div className="w-2/5 border-r border-[var(--color-border)] p-6 overflow-y-auto">
          <h2 className="text-xl font-bold text-[var(--color-text)]">{question.topic}</h2>
          <p className="mt-4 text-[var(--color-text)] leading-relaxed whitespace-pre-wrap">
            {question.question_text}
          </p>

          <button
            onClick={getHint}
            className="mt-6 text-sm text-[var(--color-accent)] flex items-center gap-2 hover:underline"
          >
            💡 Get a hint
          </button>
          {showHint && (
            <div className="mt-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md p-4 text-sm text-[var(--color-muted)] italic">
              {hint || 'Thinking...'}
            </div>
          )}
        </div>

        {/* Right: editor */}
        <div className="w-3/5 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)]">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-3 py-1.5 text-sm text-[var(--color-text)]"
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
            </select>
          </div>

          <div className="flex-1">
            <Editor
              height="100%"
              language={language === 'cpp' ? 'cpp' : language}
              theme="vs-dark"
              value={code}
              onChange={(v) => setCode(v)}
              options={{ fontFamily: 'JetBrains Mono', fontSize: 14, minimap: { enabled: false } }}
            />
          </div>

          <div className="border-t border-[var(--color-border)] p-4">
            <textarea
              value={approach}
              onChange={(e) => setApproach(e.target.value)}
              placeholder="Explain your approach before submitting..."
              rows={2}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-3 py-2 text-sm text-[var(--color-text)] resize-none focus:outline-none focus:border-[var(--color-accent)]"
            />
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="mt-3 w-full bg-[var(--color-accent)] text-[var(--color-bg)] font-semibold py-2.5 rounded-md disabled:opacity-50"
            >
              {submitting ? 'Evaluating...' : 'Submit Solution'}
            </button>

            {results && (
              <div className="mt-4">
                <div className="flex gap-2 flex-wrap">
                  {results.test_results.map((r, i) => (
                    <span
                      key={i}
                      className={`text-xs px-2 py-1 rounded-full font-mono ${
                        r.passed ? 'bg-[var(--color-accent-dim)] text-[var(--color-accent)]' : 'bg-red-950 text-[var(--color-danger)]'
                      }`}
                    >
                      {r.passed ? '✓' : '✗'} Test {i + 1}
                    </span>
                  ))}
                </div>
                {results.follow_up_question && (
                  <p className="mt-3 text-sm text-[var(--color-muted)] italic">
                    Follow-up: {results.follow_up_question}
                  </p>
                )}
                <button
                  onClick={() => navigate('/rounds')}
                  className="mt-4 text-sm text-[var(--color-accent)] hover:underline"
                >
                  Back to Rounds →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}s