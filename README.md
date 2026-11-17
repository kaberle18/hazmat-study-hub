# HazMat Ops Study Hub

Study site for HazMat Operations: 13-chapter Study Material (NFPA 470 operations core + mission-specific), Chapters 29–36 homework, Core Knowledge Review, Study Guide objectives 1–38 and recognition plates.

Features: email sign-in (no password) with progress saved per user, study material with chapter quizzes, quick study sheet, full searchable guide, flashcards, adaptive learn mode, custom practice exams, games with shared leaderboards, recognition plates, answer keys, and your own cards/questions.

## Structure
- `index.html` — the whole front end (no build step).
- `api/progress.js` — saves/loads each user's progress by email.
- `api/leaderboard.js` — shared game leaderboards (top 10 shown, 100 kept per game).
- `api/_db.js` — Neon Postgres helper; creates tables on first use.

## Storage (Neon Postgres)
The API needs a Neon Postgres database connected to the Vercel project (Vercel → Storage → Neon). It reads `DATABASE_URL` (or `POSTGRES_URL`) and creates its two tables automatically. Without it, the site still works and saves progress in the browser only.
