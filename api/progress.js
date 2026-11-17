// GET  /api/progress?email=...   -> { data, updated }
// POST /api/progress {email, data} -> { ok, updated }
const crypto = require("crypto");
const { redis, send } = require("./_redis");

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,100}\.[^\s@]{2,24}$/;
const norm = (e) => String(e || "").trim().toLowerCase();
const keyFor = (e) => "u:" + crypto.createHash("sha256").update(e).digest("hex");

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") {
      const email = norm(req.query.email);
      if (!EMAIL.test(email)) return send(res, 400, { error: "Invalid email" });
      const [raw] = await redis([["GET", keyFor(email)]]);
      if (!raw) return send(res, 200, { data: null, updated: 0 });
      const v = JSON.parse(raw);
      return send(res, 200, { data: v.data, updated: v.updated });
    }
    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const email = norm(body.email);
      if (!EMAIL.test(email)) return send(res, 400, { error: "Invalid email" });
      if (!body.data || typeof body.data !== "object") return send(res, 400, { error: "Missing data" });
      const json = JSON.stringify(body.data);
      if (json.length > 300000) return send(res, 413, { error: "Progress too large" });
      const updated = Date.now();
      await redis([
        ["SET", keyFor(email), JSON.stringify({ email, updated, data: body.data })],
        ["HSET", "users", email, String(updated)],
      ]);
      return send(res, 200, { ok: true, updated });
    }
    res.setHeader("Allow", "GET, POST");
    return send(res, 405, { error: "Method not allowed" });
  } catch (e) {
    return send(res, e.status || 500, { error: e.message });
  }
};
