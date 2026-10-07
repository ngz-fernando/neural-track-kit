// GET  → { state, sha }            el progreso guardado
// PUT  { state, sha } → { sha }    guarda; 409 + { state, sha } si había una versión más nueva
import { read, write, authorized, fail, body } from './_store.js';

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  try {
    if (!authorized(req)) return res.status(401).json({ error: 'Clave incorrecta' });
    if (req.method === 'GET') return res.status(200).json(await read());
    if (req.method === 'PUT') {
      const { state, sha } = await body(req);
      if (!state || !Array.isArray(state.courses)) return res.status(400).json({ error: 'Estado no válido' });
      const r = await write(state, sha, 'Progreso actualizado desde la app');
      if (r.conflict) return res.status(409).json(await read());
      return res.status(200).json({ sha: r.sha });
    }
    res.status(405).json({ error: 'Método no permitido' });
  } catch (e) { fail(res, e); }
}
