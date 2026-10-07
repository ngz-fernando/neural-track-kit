// GET /api/buscar?q=instalar openclaw vps → lecciones que encajan. Hermes lo usa cuando el usuario
// dice con sus palabras qué ha visto, para marcarla con /api/hecho.
import { read, authorized, fail } from './_store.js';
import { searchLessons } from '../public/plan.mjs';

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  try {
    if (!authorized(req)) return res.status(401).json({ error: 'Clave incorrecta' });
    const q = new URL(req.url, 'http://x').searchParams.get('q') || '';
    const { state } = await read();
    if (!state) return res.status(409).json({ error: 'No hay progreso guardado' });
    res.status(200).json({ results: searchLessons(state, q) });
  } catch (e) { fail(res, e); }
}
