import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ROUNDS = [
  { key: 'resume', title: 'Resume / HR Round', desc: 'Questions built from your actual projects and experience.', icon: '💬', path: '/round/resume' },
  { key: 'technical', title: 'Technical Coding Round', desc: 'Live editor, real hints, evaluated on process and correctness.', icon: '{ }', path: '/round/coding' },
  { key: 'cs_fundamentals', title: 'CS Fundamentals Round', desc: 'Quick-fire questions on your core technical skills.', icon: '⌘', path: '/round/cs-fundamentals' },
];

export default function RoundSelection() {
  const [completed, setCompleted] = useState([]);
  const navigate = useNavigate();
  const candidateId = localStorage.getItem('candidate_id');

  useEffect(() => {
    axios.get(`http://localhost:5000/api/candidate/${candidateId}/rounds-completed`)
      .then((res) => setCompleted(res.data.rounds_completed.map((r) => r.round_type)))
      .catch(() => setCompleted([]));
  }, [candidateId]);

  const isDone = (key) => completed.includes(key);
  const canViewCombined = completed.length >= 2;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-6 py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-[var(--color-text)]">Choose your round.</h1>
        <p className="text-[var(--color-muted)] mt-2">Complete any or all — your call.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-10">
          {ROUNDS.map((r) => (
            <div key={r.key} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6 flex flex-col">
              <span className="text-2xl font-mono text-[var(--color-accent)]">{r.icon}</span>
              <h3 className="font-semibold text-[var(--color-text)] mt-4">{r.title}</h3>
              <p className="text-sm text-[var(--color-muted)] mt-2 flex-1">{r.desc}</p>

              {isDone(r.key) ? (
                <span className="mt-4 inline-block w-fit text-xs px-2 py-1 rounded-full bg-[var(--color-accent-dim)] text-[var(--color-accent)] font-medium">
                  ✓ Completed
                </span>
              ) : (
                <span className="mt-4 inline-block w-fit text-xs px-2 py-1 rounded-full border border-[var(--color-border)] text-[var(--color-muted)]">
                  Not started
                </span>
              )}

              <button
                onClick={() => navigate(r.path)}
                className={`mt-4 w-full py-2 rounded-md text-sm font-semibold transition
                  ${isDone(r.key)
                    ? 'bg-[var(--color-surface-hover)] text-[var(--color-accent)] border border-[var(--color-accent)]'
                    : 'bg-[var(--color-accent)] text-[var(--color-bg)] hover:opacity-90'}`}
              >
                {isDone(r.key) ? 'View Report' : 'Start Round'}
              </button>
            </div>
          ))}
        </div>

        <div
          className={`mt-6 rounded-lg p-6 border flex items-center justify-between
            ${canViewCombined ? 'border-[var(--color-accent)] bg-[var(--color-surface)]' : 'border-[var(--color-border)] bg-[var(--color-surface)] opacity-60'}`}
        >
          <div>
            <h3 className="font-semibold text-[var(--color-text)]">Combined Report</h3>
            <p className="text-sm text-[var(--color-muted)]">
              {canViewCombined ? 'Your overall performance across all completed rounds.' : 'Complete at least 2 rounds to unlock.'}
            </p>
          </div>
          <button
            disabled={!canViewCombined}
            onClick={() => navigate('/report/combined')}
            className={`px-4 py-2 rounded-md text-sm font-semibold
              ${canViewCombined ? 'bg-[var(--color-accent)] text-[var(--color-bg)]' : 'bg-[var(--color-border)] text-[var(--color-muted)] cursor-not-allowed'}`}
          >
            {canViewCombined ? 'View →' : '🔒 Locked'}
          </button>
        </div>
      </div>
    </div>
  );
}