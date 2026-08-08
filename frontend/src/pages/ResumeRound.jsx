import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function ResumeRound() {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [messages, setMessages] = useState([]); // { role: 'ai' | 'user', text }
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef(null);
  const navigate = useNavigate();
  const candidateId = localStorage.getItem('candidate_id');

  useEffect(() => {
    axios.get(`http://localhost:5000/api/candidate/${candidateId}/questions?round_type=resume`)
      .then((res) => {
        const qs = res.data.questions || [];
        setQuestions(qs);
        if (qs.length > 0) {
          setMessages([{ role: 'ai', text: qs[0].question_text }]);
        }
      })
      .catch(() => {});
  }, [candidateId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const currentQuestion = questions[currentIndex];
    setMessages((prev) => [...prev, { role: 'user', text: input }]);
    setSending(true);
    const answerText = input;
    setInput('');

    try {
      const res = await axios.post('http://localhost:5000/api/interview/answer', {
        candidate_id: candidateId,
        question_id: currentQuestion.id,
        session_id: sessionId,
        answer_text: answerText,
      });
      if (!sessionId) setSessionId(res.data.session_id);

      if (res.data.follow_up_question) {
        setMessages((prev) => [...prev, { role: 'ai', text: res.data.follow_up_question }]);
      } else if (currentIndex + 1 < questions.length) {
        const next = currentIndex + 1;
        setCurrentIndex(next);
        setMessages((prev) => [...prev, { role: 'ai', text: questions[next].question_text }]);
      } else {
        setMessages((prev) => [...prev, { role: 'ai', text: "That's all the questions I have — nice work. Ready to see your report?" }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const isLastDone = currentIndex + 1 >= questions.length && messages[messages.length - 1]?.role === 'ai' && messages.length > questions.length;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <div className="border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
        <span className="font-mono text-sm text-[var(--color-muted)]">Resume / HR Round</span>
        <span className="text-xs text-[var(--color-muted)]">
          Question {Math.min(currentIndex + 1, questions.length)} of {questions.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 max-w-2xl mx-auto w-full">
        <div className="space-y-1">
          {messages.map((m, i) => (
            <div key={i} className={`py-2 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
              <span className={`text-xs font-mono block mb-1 ${m.role === 'ai' ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}`}>
                {m.role === 'ai' ? 'AI' : 'You'}
              </span>
              <p className="text-[var(--color-text)] leading-relaxed inline-block max-w-[85%] text-left">
                {m.text}
              </p>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </div>

      <div className="border-t border-[var(--color-border)] px-6 py-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          {isLastDone ? (
            <button
              onClick={() => navigate('/rounds')}
              className="w-full bg-[var(--color-accent)] text-[var(--color-bg)] font-semibold py-3 rounded-md"
            >
              Back to Rounds →
            </button>
          ) : (
            <>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Type your answer..."
                rows={2}
                className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-4 py-3 text-[var(--color-text)] resize-none focus:outline-none focus:border-[var(--color-accent)]"
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="bg-[var(--color-accent)] text-[var(--color-bg)] font-semibold px-5 rounded-md disabled:opacity-40"
              >
                Send
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}