import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-[var(--color-border)]">
        <div className="text-[var(--color-accent)] font-mono font-semibold text-lg">
          &lt;interview-sim/&gt;
        </div>
        <div className="hidden md:flex gap-8 text-sm text-[var(--color-muted)]">
          <span>Platform</span>
          <span>How it works</span>
          <span>About</span>
        </div>
        <button
          onClick={() => navigate('/upload')}
          className="bg-[var(--color-accent)] text-[var(--color-bg)] font-semibold px-4 py-2 rounded-md text-sm hover:opacity-90 transition"
        >
          Get Started
        </button>
      </nav>

      {/* Hero */}
      <div className="max-w-3xl mx-auto text-center pt-24 px-6">
        <h1 className="text-5xl font-bold leading-tight text-[var(--color-text)]">
          Practice interviews the way<br />
          <span className="text-[var(--color-accent)]">they actually happen.</span>
        </h1>
        <p className="mt-6 text-[var(--color-muted)] text-lg">
          Upload your resume. Get questions built from your real projects.
          Code live. Get scored like a real interview.
        </p>
        <button
          onClick={() => navigate('/upload')}
          className="mt-8 bg-[var(--color-accent)] text-[var(--color-bg)] font-semibold px-6 py-3 rounded-md hover:opacity-90 transition"
        >
          Start Practicing →
        </button>
      </div>

      {/* Live preview panel */}
      <div className="max-w-2xl mx-auto mt-16 px-6">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)]">
            <div className="w-3 h-3 rounded-full bg-[var(--color-danger)] opacity-60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-60" />
            <div className="w-3 h-3 rounded-full bg-[var(--color-accent)] opacity-60" />
            <span className="ml-2 text-xs text-[var(--color-muted)] font-mono">interview_session.tsx</span>
          </div>
          <div className="p-5 space-y-3 font-mono text-sm">
            <p className="text-[var(--color-text)]">
              <span className="text-[var(--color-accent)]">AI:</span> Can you walk me through your React
              project's state management? Specifically how you handled complex data flow in the cart.
            </p>
            <p className="text-[var(--color-muted)]">
              <span className="text-[var(--color-text)]">You:</span> const [cart, setCart] = useReducer(cartReducer, initialState);
              <br />
              <span className="ml-8">// I chose useReducer because the state logic was getting complex...</span>
            </p>
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5 mt-20 px-6 pb-24">
        {[
          { title: 'Resume-Aware Questions', desc: 'Questions generated from your actual projects and experience, not generic templates.' },
          { title: 'Live Coding Round', desc: 'Real editor, real hints, real follow-up questions — evaluated on process, not just output.' },
          { title: 'Instant Feedback Report', desc: 'Get scored on reasoning, communication, and correctness — with one clear thing to fix next.' },
        ].map((f) => (
          <div key={f.title} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-5">
            <h3 className="font-semibold text-[var(--color-text)] mb-2">{f.title}</h3>
            <p className="text-sm text-[var(--color-muted)]">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}