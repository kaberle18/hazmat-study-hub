// GET  /api/leaderboard?game=speed|all        -> { game, entries } or { boards }
// POST /api/leaderboard {game, name, score}   -> { game, entries, rank }
const { db, send, readBody } = require("./_db");

// low: true means a lower score is better (Match is a time in seconds)
const GAMES = {
  match: { low: true, min: 2, max: 900 },
  speed: { low: false, min: 0, max: 300 },
  tf: { low: false, min: 0, max: 300 },
  surv: { low: false, min: 0, max: 500 },
};
const KEEP = 100;

async function top(game) {
  const dir = GAMES[game].low ? "ASC" : "DESC";
  const rows = await db(`SELECT name, score FROM scores WHERE game = $1 ORDER BY score ${dir}, created ASC LIMIT 10`, [game]);
  return rows.map((r) => ({ name: r.name, score: Math.round(Number(r.score) * 10) / 10 }));
}

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") {
      const game = String(req.query.game || "");
      if (game === "all") {
        const boards = {};
        for (const k of Object.keys(GAMES)) boards[k] = await top(k);
        return send(res, 200, { boards });
      }
      if (!GAMES[game]) return send(res, 400, { error: "Unknown game" });
      return send(res, 200, { game, entries: await top(game) });
    }
    if (req.method === "POST") {
      const b = readBody(req);
      const game = String(b.game || "");
      const g = GAMES[game];
      if (!g) return send(res, 400, { error: "Unknown game" });
      const name = String(b.name || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 24);
      if (!name) return send(res, 400, { error: "Name required" });
      const score = Math.round(Number(b.score) * 10) / 10;
      if (!Number.isFinite(score) || score < g.min || score > g.max) return send(res, 400, { error: "Invalid score" });
      const created = Date.now();
      const [row] = await db("INSERT INTO scores (game, name, score, created) VALUES ($1, $2, $3, $4) RETURNING id", [game, name, score, created]);
      const better = g.low ? "score < $2 OR (score = $2 AND created < $3)" : "score > $2 OR (score = $2 AND created < $3)";
      const [r] = await db(`SELECT COUNT(*)::int AS n FROM scores WHERE game = $1 AND (${better})`, [game, score, created]);
      const dir = g.low ? "ASC" : "DESC";
      await db(`DELETE FROM scores WHERE game = $1 AND id NOT IN (SELECT id FROM scores WHERE game = $1 ORDER BY score ${dir}, created ASC LIMIT ${KEEP})`, [game]);
      return send(res, 200, { game, entries: await top(game), rank: Number(r.n) + 1, id: Number(row.id) });
    }
    res.setHeader("Allow", "GET, POST");
    return send(res, 405, { error: "Method not allowed" });
  } catch (e) {
    return send(res, e.status || 500, { error: e.status ? e.message : "Server error" });
  }
};
