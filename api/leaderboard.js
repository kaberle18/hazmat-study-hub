// GET  /api/leaderboard?game=speed            -> { game, entries:[{name,score}] }
// POST /api/leaderboard {game, name, score}   -> { game, entries, rank }
const { redis, send } = require("./_redis");

// low: true means a lower score is better (Match is a time in seconds)
const GAMES = {
  match: { low: true, min: 2, max: 900 },
  speed: { low: false, min: 0, max: 300 },
  tf: { low: false, min: 0, max: 300 },
  surv: { low: false, min: 0, max: 500 },
};
const KEEP = 100;

async function top(game) {
  const g = GAMES[game];
  const [rows] = await redis([g.low ? ["ZRANGE", "lb:" + game, 0, 9, "WITHSCORES"] : ["ZRANGE", "lb:" + game, 0, 9, "REV", "WITHSCORES"]]);
  const out = [];
  for (let i = 0; i < (rows || []).length; i += 2) {
    let name = "Player";
    try { name = JSON.parse(rows[i]).n; } catch (_) {}
    out.push({ name, score: Number(rows[i + 1]) });
  }
  return out;
}

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") {
      const game = String(req.query.game || "");
      if (game === "all") {
        const all = {};
        for (const k of Object.keys(GAMES)) all[k] = await top(k);
        return send(res, 200, { boards: all });
      }
      if (!GAMES[game]) return send(res, 400, { error: "Unknown game" });
      return send(res, 200, { game, entries: await top(game) });
    }
    if (req.method === "POST") {
      const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const game = String(b.game || "");
      const g = GAMES[game];
      if (!g) return send(res, 400, { error: "Unknown game" });
      const name = String(b.name || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 24);
      if (!name) return send(res, 400, { error: "Name required" });
      const score = Math.round(Number(b.score) * 10) / 10;
      if (!Number.isFinite(score) || score < g.min || score > g.max) return send(res, 400, { error: "Invalid score" });
      const member = JSON.stringify({ n: name, t: Date.now(), r: Math.random().toString(36).slice(2, 8) });
      const key = "lb:" + game;
      const trim = g.low ? ["ZREMRANGEBYRANK", key, KEEP, -1] : ["ZREMRANGEBYRANK", key, 0, -(KEEP + 1)];
      const rankCmd = g.low ? ["ZRANK", key, member] : ["ZREVRANK", key, member];
      const [, , rank] = await redis([["ZADD", key, score, member], trim, rankCmd]);
      return send(res, 200, { game, entries: await top(game), rank: rank == null ? null : rank + 1 });
    }
    res.setHeader("Allow", "GET, POST");
    return send(res, 405, { error: "Method not allowed" });
  } catch (e) {
    return send(res, e.status || 500, { error: e.message });
  }
};
