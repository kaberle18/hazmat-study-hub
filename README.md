# HazMat Ops Study Hub

Study site for HazMat Operations: 13-chapter Study Material (NFPA 470 operations core + mission-specific), Chapters 29–36 homework, Core Knowledge Review, Study Guide objectives 1–38 and recognition plates.

Features: email sign-in (no password) with progress saved per user, study material with chapter quizzes, quick study sheet, full searchable guide, flashcards, adaptive learn mode, custom practice exams, games with shared leaderboards, recognition plates, answer keys, and your own cards/questions.

## Structure
- `index.html` — the whole front end (no build step).
- `api/progress.js` — saves/loads each user's progress by email.
- `api/leaderboard.js` — shared game leaderboards (top 10 shown, 100 kept per game).
- `api/_redis.js` — tiny Upstash Redis REST client.

## Storage
The API needs an Upstash Redis database connected to the Vercel project (Vercel → Storage → Upstash for Redis). It reads `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`). Without it, the site still works and saves progress in the browser only.
