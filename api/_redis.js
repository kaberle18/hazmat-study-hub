// Minimal Upstash Redis REST client (works with Vercel's Upstash/KV integration env vars).
const BASE = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(commands) {
  if (!BASE || !TOKEN) { const e = new Error("Storage is not configured"); e.status = 503; throw e; }
  const r = await fetch(BASE.replace(/\/$/, "") + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!r.ok) { const e = new Error("Storage error " + r.status); e.status = 502; throw e; }
  const out = await r.json();
  return out.map((x) => { if (x.error) throw new Error(x.error); return x.result; });
}

function send(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
}

module.exports = { redis, send };
