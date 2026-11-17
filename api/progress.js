// GET  /api/progress?email=...      -> { data, updated }
// POST /api/progress {email, data}  -> { ok, updated }
const crypto = require("crypto");
const { db, send, readBody } = require("./_db");

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,100}\.[^\s@]{2,24}$/;
const norm = (e) => String(e || "").trim().toLowerCase();
const hash = (e) => crypto.createHash("sha256").update(e).digest("hex");

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") {
      const email = norm(req.query.email);
      if (!EMAIL.test(email)) return send(res, 400, { error: "Invalid email" });
      const rows = await db("SELECT data, updated FROM progress WHERE email_hash = $1", [hash(email)]);
      if (!rows.length) return send(res, 200, { data: null, updated: 0 });
      return send(res, 200, { data: rows[0].data, updated: Number(rows[0].updated) });
    }
    if (req.method === "POST") {
      const body = readBody(req);
      const email = norm(body.email);
      if (!EMAIL.test(email)) return send(res, 400, { error: "Invalid email" });
      if (!body.data || typeof body.data !== "object" || Array.isArray(body.data)) return send(res, 400, { error: "Missing data" });
      const json = JSON.stringify(body.data);
      if (json.length > 300000) return send(res, 413, { error: "Progress too large" });
      const updated = Date.now();
      await db(
        `INSERT INTO progress (email_hash, email, data, updated) VALUES ($1, $2, $3::jsonb, $4)
         ON CONFLICT (email_hash) DO UPDATE SET data = EXCLUDED.data, updated = EXCLUDED.updated, email = EXCLUDED.email`,
        [hash(email), email, json, updated]
      );
      return send(res, 200, { ok: true, updated });
    }
    res.setHeader("Allow", "GET, POST");
    return send(res, 405, { error: "Method not allowed" });
  } catch (e) {
    return send(res, e.status || 500, { error: e.status ? e.message : "Server error" });
  }
};
