// Progreso guardado en GitHub: un progreso.json en un repo privado. Cada guardado es un commit.
const REPO = process.env.NT_DATA_REPO; // usuario/repo privado donde se guarda el progreso (variable en Vercel)
const FILE = 'progreso.json';
const GH = `https://api.github.com/repos/${REPO}/contents/${FILE}`;

function headers() {
  if (!REPO) throw Object.assign(new Error('Falta NT_DATA_REPO en Vercel'), { status: 503 });
  if (!process.env.GITHUB_TOKEN) throw Object.assign(new Error('Falta GITHUB_TOKEN en Vercel'), { status: 503 });
  return {
    authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'user-agent': 'neural-track',
  };
}

export async function read() {
  const r = await fetch(GH, { headers: headers() });
  if (r.status === 404) return { state: null, sha: null };
  if (!r.ok) throw Object.assign(new Error(`GitHub ${r.status}`), { status: 502 });
  const j = await r.json();
  return { state: JSON.parse(Buffer.from(j.content, 'base64').toString('utf8')), sha: j.sha };
}

// Devuelve { ok, sha } o { conflict: true } si alguien guardó entre medias.
export async function write(state, sha, message) {
  const body = { message, content: Buffer.from(JSON.stringify(state)).toString('base64'), branch: 'main' };
  if (sha) body.sha = sha;
  const r = await fetch(GH, { method: 'PUT', headers: { ...headers(), 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (r.status === 409 || r.status === 422) return { conflict: true };
  if (!r.ok) throw Object.assign(new Error(`GitHub ${r.status}`), { status: 502 });
  return { ok: true, sha: (await r.json()).content.sha };
}

// Clave propia de la app (NT_KEY): la usan la app y Hermes. Sin ella nadie lee ni escribe.
export function authorized(req) {
  const key = process.env.NT_KEY;
  if (!key) throw Object.assign(new Error('Falta NT_KEY en Vercel'), { status: 503 });
  const h = req.headers.authorization || '';
  return h === `Bearer ${key}` || req.headers['x-nt-key'] === key;
}

export function fail(res, e) {
  res.status(e.status || 500).json({ error: e.message });
}

export async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}
