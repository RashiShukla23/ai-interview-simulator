import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function RoundReport() {
  const { sessionId } = useParams();
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`http://localhost:5000/api/interview/report/${sessionId}`)
      .then((res) => setData(res.data))
      .catch(() => {});
  }, [sessionId]);

  if (!data) {
    return <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center text-[var(--color-muted)]">Loading report...</div>;
  }

  const { report, per_question_breakdown } = data;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate('/rounds')} className="text-sm text-[var(--color-accent)] hover:underline">
          Back to Rounds
        </button>

        <div className="mt-6">
          <p className="text-[var(--color-muted)] text-sm">Overall Score</p>
          <p className="text-6xl font-bold text-[var(--color-text)] mt-1">
            {report.overall_score}<span className="text-2xl text-[var(--color-muted)]">/100</span>
          </p>
        </div>

        <div className="mt-8 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
          <h3 className="font-semibold text-[var(--color-text)] mb-3">Summary</h3>
          <p className="text-sm text-[var(--color-muted)] leading-relaxed">{report.summary_text}</p>
        </div>

        <div className="mt-8">
          <h3 className="font-semibold text-[var(--color-text)] mb-4">Question breakdown</h3>
          {per_question_breakdown.map((q, i) => (
            <details key={i} className="mb-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
              <summary className="cursor-pointer text-sm font-medium text-[var(--color-text)]">
                {q.question}
              </summary>
              <p className="mt-3 text-sm text-[var(--color-muted)]">{q.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}