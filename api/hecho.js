// POST /api/hecho  { ids: [...] }  → marca esas lecciones como vistas.
// Hermes lo llama cuando el usuario contesta «hecho» (todas) o «hecho 1 y 3» (solo esas).
import { read, write, authorized, fail, body } from './_store.js';

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  try {
    if (!authorized(req)) return res.status(401).json({ error: 'Clave incorrecta' });
    if (req.method !== 'POST') return res.status(405).json({ error: 'Usa POST' });
    const { ids } = await body(req);
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'Faltan ids' });
    for (let attempt = 0; attempt < 3; attempt++) {
      const { state, sha } = await read();
      if (!state) return res.status(409).json({ error: 'No hay progreso guardado' });
      const now = new Date().toISOString(), t = Date.now(), marked = [];
      for (const c of state.courses) for (const m of c.modules) for (const l of m.lessons) {
        if (ids.includes(l.id) && !l.done) { l.done = true; l.doneAt = now; l.t = t; marked.push(l.title); }
      }
      if (!marked.length) return res.status(200).json({ marked: [], message: 'Ya estaban marcadas' });
      const r = await write(state, sha, `Hermes: ${marked.length} lección(es) vista(s)`);
      if (r.ok) return res.status(200).json({ marked, message: `✅ Marcadas: ${marked.join(' · ')}` });
    }
    res.status(409).json({ error: 'Conflicto al guardar, inténtalo de nuevo' });
  } catch (e) { fail(res, e); }
}
