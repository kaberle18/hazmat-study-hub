// Database helper for Neon Postgres (Vercel Storage integration).
// Uses the Neon serverless HTTP driver in production. For local testing, set LOCAL_PG_URL to use node-postgres.
let runner = null;

function getRunner() {
  if (runner) return runner;
  if (process.env.LOCAL_PG_URL) {
    const { Pool } = require("pg");
    const pool = new Pool({ connectionString: process.env.LOCAL_PG_URL });
    runner = async (text, params) => (await pool.query(text, params)).rows;
    return runner;
  }
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;
  if (!url) { const e = new Error("Storage is not configured"); e.status = 503; throw e; }
  const { neon } = require("@neondatabase/serverless");
  const sql = neon(url);
  runner = (text, params) => sql.query(text, params || []);
  return runner;
}

let ready = null;
function ensureSchema(q) {
  if (!ready) {
    ready = (async () => {
      await q(`CREATE TABLE IF NOT EXISTS progress (
        email_hash TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        data JSONB NOT NULL,
        updated BIGINT NOT NULL)`);
      await q(`CREATE TABLE IF NOT EXISTS scores (
        id BIGSERIAL PRIMARY KEY,
        game TEXT NOT NULL,
        name TEXT NOT NULL,
        score REAL NOT NULL,
        created BIGINT NOT NULL)`);
      await q(`CREATE INDEX IF NOT EXISTS scores_game_score ON scores (game, score)`);
    })().catch((e) => { ready = null; throw e; });
  }
  return ready;
}

async function db(text, params) {
  const q = getRunner();
  await ensureSchema(q);
  return q(text, params);
}

function send(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
}

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try { return JSON.parse(req.body || "{}"); } catch (_) { return {}; }
}

module.exports = { db, send, readBody };
