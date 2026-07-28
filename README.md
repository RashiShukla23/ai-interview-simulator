# AI Pair-Programming Interview Simulator
### CEP-III Mini Project — Semester V, Computer Engineering, DBIT

---

## 1. Problem Statement

Students preparing for placements have no single tool that combines resume-based questioning, live coding evaluation, and reasoning feedback across multiple interview rounds. Existing coding judges (LeetCode, HackerRank) only check pass/fail correctness, and mock-interview apps ask generic questions unrelated to the candidate's actual projects or skills. There is no tool that verifies whether a candidate can *explain* what they claim on their resume, while also evaluating their live coding process — not just the final output.

---

## 2. Proposed Solution

An AI-powered interview simulator that:
- Parses a candidate's resume and generates **personalized** interview questions
- Runs a **live coding round** with a Monaco-based editor, real code execution, and AI-driven hints
- Evaluates **reasoning and communication**, not just correctness
- Combines results into a single **unified feedback report**

---

## 3. Interview Rounds

### Round 1 — Resume / HR Round
- AI parses uploaded resume (skills, projects, experience)
- Generates personalized questions based on actual resume content
- Detects vague answers and asks deeper follow-ups
- Flags inconsistency between resume claims and live answers

### Round 2 — Technical / Coding Round
- Live coding problem shown alongside Monaco Editor
- User writes code; AI observes progress (on pause/hint request) and gives Socratic hints — not answers
- User explains approach before submitting (reasoning check)
- Code executed via **Judge0 API** against real test cases
- AI asks a post-submission follow-up (time complexity, edge cases)

### Round 3 — CS Fundamentals Round
- Quick-fire conceptual questions generated from skills listed on the resume (OS, DBMS, OOP, CN)
- Scored for depth vs. surface-level understanding

### Final — Unified Feedback Report
- Aggregates correctness, reasoning quality, hints used, and communication into one dashboard

---

## 4. Key Innovation / Differentiators

- **Resume-aware personalization** — questions generated from the candidate's actual projects, not templates
- **Process-based scoring** — evaluates *how* a candidate thinks, not just final pass/fail
- **Hybrid AI + real execution** — uses Judge0 for objective code correctness (AI alone cannot reliably judge code correctness) and LLM for subjective reasoning/communication evaluation
- **Resume-consistency verification** — flags gaps between resume claims and live explanations

---

## 5. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Monaco Editor |
| Backend | Node.js + Express |
| AI / LLM | OpenAI API (via LangChain) |
| Code Execution | Judge0 API |
| Database | PostgreSQL |
| Resume Parsing | pdf-parse (text extraction) + OpenAI API (structuring) |

---

## 6. Where APIs Are Used

| API | Purpose | Trigger Point |
|---|---|---|
| OpenAI API | Resume parsing → structured skills/projects extraction | Immediately after resume upload |
| OpenAI API | Personalized question generation | After resume parsing completes |
| OpenAI API | Live hint generation (Socratic, not direct answers) | When user pauses too long or requests a hint during coding |
| OpenAI API | Reasoning/approach evaluation | Before code submission (user explains approach) |
| OpenAI API | Post-submission follow-up question + scoring | After Judge0 returns results |
| OpenAI API | CS Fundamentals answer scoring | During Round 3 |
| Judge0 API | Actual code execution & test case validation | When user clicks "Run" / "Submit" in the coding round |

---

## 7. System Architecture

```
User → React Frontend (Monaco Editor) → Node/Express Backend
                                              │
                        ┌─────────────────────┼─────────────────────┐
                        ▼                     ▼                     ▼
                  OpenAI API            Judge0 API            PostgreSQL DB
              (questions, hints,      (code execution,      (profiles, questions,
               reasoning, scoring)     pass/fail, runtime)   sessions, responses,
                                                              feedback reports)
                        │                     │                     │
                        └─────────────────────┴─────────────────────┘
                                              ▼
                                   Unified Feedback Report
                                     (shown to user)
```

### Detailed Flow

**Step 1 — Resume Upload**
```
User uploads resume (PDF)
  → Backend extracts text (pdf-parse)
  → Sends text to OpenAI API
  → OpenAI extracts skills, projects, tech stack
  → Stored in PostgreSQL (candidate_profile table)
  → OpenAI generates personalized question set
  → Stored in DB (questions table)
```

**Step 2 — Round Selection**
```
User picks round: Resume/HR → Technical → CS Fundamentals
  → Backend fetches relevant questions from DB
  → Session created (session_id, round_type, start_time)
```

**Step 3a — Resume/HR Round**
```
Backend sends question → Frontend displays
User answers → Backend sends answer + question to OpenAI API
  → OpenAI generates follow-up (if vague) OR scores answer
  → Score + feedback stored in DB (responses table)
```

**Step 3b — Technical/Coding Round**
```
Backend fetches problem → Frontend renders in Monaco Editor
User codes → (on pause/hint request)
  → Backend sends code + problem to OpenAI API
  → OpenAI returns Socratic hint → shown in chat panel

User writes approach explanation → stored in DB

User clicks Submit
  → Backend sends code to Judge0 API
  → Judge0 runs it in sandbox, returns pass/fail + runtime per test case
  → Backend sends code + results to OpenAI API for follow-up question
  → User answers → OpenAI scores → stored in DB
```

**Step 3c — CS Fundamentals Round**
```
Backend fetches conceptual questions (based on resume skills)
  → Frontend displays quick-fire Q&A
  → OpenAI scores each answer for depth → stored in DB
```

**Step 4 — Unified Feedback Report**
```
Backend aggregates all round scores from DB
  → Computes final report: correctness, reasoning, communication, hints used
  → Sent to Frontend → rendered as dashboard
```

---

## 8. Database Schema (Simplified)

| Table | Purpose |
|---|---|
| `candidate_profile` | Resume data, extracted skills/projects |
| `questions` | Question bank (resume-based + static DSA/CS) |
| `sessions` | Round type, timestamps |
| `responses` | User answers, code submissions, scores per round |
| `feedback_report` | Aggregated final scores |

---

## 9. Trending Technologies Used

- **LLM APIs (OpenAI)** — core of the entire personalization and evaluation layer
- **LangChain** — orchestration framework for structured prompting and chaining LLM calls
- **Agentic AI Systems** — the interviewer, hint-giver, and evaluator function as reasoning agents rather than static scripts
- **Prompt Engineering** — structured, role-specific prompting for consistent evaluation quality

---

## 10. Build Order & Timeline (8–10 Weeks)

| Week | Phase | Task |
|---|---|---|
| 1–1.5 | Phase 1 | Backend setup: Express server, PostgreSQL schema, resume upload + parsing (OpenAI integration) |
| 2–2.5 | Phase 2 | Frontend shell: upload page, question display, editor page, report page (structure only) |
| 3–4.5 | Phase 3 | Monaco Editor + Judge0 integration: run/submit code, pass/fail display |
| 5–6.5 | Phase 4 | AI layer: live hints, pre-submission reasoning check, post-submission follow-up questions |
| 7 | Phase 5 | Feedback report / dashboard aggregation |
| 8 | Phase 6 | Testing, bug fixing, UI polish |
| 9–10 | Buffer | Exam/lab overlap buffer, final touches before submission |

### Milestone Checkpoints
- **End of Week 2:** Resume upload → question generation working end-to-end
- **End of Week 4:** Coding editor + Judge0 execution working (AI not yet involved)
- **End of Week 6:** AI hints + reasoning check integrated
- **End of Week 8:** Full unified feedback report working
- **Weeks 9–10:** Buffer + final polish before submission

---

## 11. Scope Notes (What's In vs. Out for Mini-Project)

**In scope:**
- Resume/HR Round + Technical/Coding Round fully built
- CS Fundamentals Round as a lighter, functional add-on
- Text-based interaction (no voice in Phase 1)

**Out of scope (future scope, not this project):**
- Real-time multi-user collaboration (Yjs/CRDTs)
- Voice-based interview (Phase 2 candidate — Web Speech API, HR round only) FUTURE SCOPE FOR NOW
- Smart glasses / hardware integration (not applicable to this project)

---

## 12. Literature Survey — Research Gap Summary

Existing research splits into two clusters:
1. Resume-personalized conversational mock-interview systems focused on emotion, confidence, and behavioral scoring (no coding component)
2. Code-assessment research confirming LLMs alone cannot reliably verify code correctness without real execution

**No reviewed system combines** resume-aware personalized questioning **with** a live coding round, real code execution (Judge0), Socratic hint-giving, and process-based reasoning scoring in one unified platform. This is the gap this project addresses.