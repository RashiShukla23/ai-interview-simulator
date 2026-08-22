import { useEffect, useState } from 'react';
import axios from 'axios';

export default function FinalReport() {
  const [report, setReport] = useState(null);
  const candidateId = localStorage.getItem('candidate_id');

  useEffect(() => {
    axios.post(`http://localhost:5000/api/candidate/${candidateId}/combined-report`)
      .then((res) => setReport(res.data))
      .catch(() => {});
  }, [candidateId]);

  if (!report) {
    return <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center text-[var(--color-muted)]">Loading report...</div>;
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-6 py-16">
      <div className="max-w-2xl mx-auto">
        {/* Score */}
        <div className="flex items-end justify-between border-b border-[var(--color-border)] pb-6">
          <div>
            <p className="text-[var(--color-muted)] text-sm">Overall Performance</p>
            <p className="text-6xl font-bold text-[var(--color-text)] mt-1">
              {report.combined_overall_score}
              <span className="text-2xl text-[var(--color-muted)]">/100</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--color-muted)]">Rounds completed</p>
            <p className="text-sm text-[var(--color-accent)] font-medium mt-1">
              {report.rounds_included.join(', ')}
            </p>
          </div>
        </div>

        {/* Per-round bars */}
        <div className="mt-8 space-y-4">
          {report.per_round_reports.map((r) => (
            <div key={r.round_type}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-[var(--color-text)] capitalize">{r.round_type.replace('_', ' ')}</span>
                <span className="text-[var(--color-muted)]">{r.overall_score}/100</span>
              </div>
              <div className="h-2 bg-[var(--color-surface)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--color-accent)] rounded-full transition-all"
                  style={{ width: `${r.overall_score}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* AI Summary */}
        <div className="mt-10 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
  <h3 className="font-semibold text-[var(--color-text)] mb-4">What we noticed</h3>

  <p className="text-xs font-medium text-[var(--color-accent)] mb-2">Strengths</p>
  <ul className="space-y-1.5 mb-5">
    {report.combined_summary.strengths.map((s, i) => (
      <li key={i} className="text-sm text-[var(--color-muted)] flex gap-2">
        <span className="text-[var(--color-accent)]">-</span>
        <span>{s}</span>
      </li>
    ))}
  </ul>

  <p className="text-xs font-medium text-[var(--color-accent)] mb-2">Areas to improve</p>
  <ul className="space-y-1.5 mb-5">
    {report.combined_summary.areas_to_improve.map((a, i) => (
      <li key={i} className="text-sm text-[var(--color-muted)] flex gap-2">
        <span className="text-[var(--color-accent)]">-</span>
        <span>{a}</span>
      </li>
    ))}
  </ul>

  <div className="border-l-2 border-[var(--color-accent)] pl-4">
    <p className="text-xs font-medium text-[var(--color-accent)] mb-1">Next step</p>
    <p className="text-sm text-[var(--color-text)]">{report.combined_summary.next_step}</p>
  </div>
</div>

        {/* Per-question breakdown */}
        <div className="mt-8">
          <h3 className="font-semibold text-[var(--color-text)] mb-4">Round-by-round breakdown</h3>
          {report.per_round_reports.map((r) => (
            <details key={r.round_type} className="mb-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
              <summary className="cursor-pointer text-sm font-medium text-[var(--color-text)] capitalize">
                {r.round_type.replace('_', ' ')} — {r.overall_score}/100
              </summary>
              <p className="mt-3 text-sm text-[var(--color-muted)] leading-relaxed">{r.summary_text}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}