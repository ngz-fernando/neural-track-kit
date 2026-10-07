// GET /api/resumen → «¿por dónde voy?»: % de cada curso, módulo en el que vas y siguiente vídeo.
import { read, authorized, fail } from './_store.js';
import { summary } from '../public/plan.mjs';

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  try {
    if (!authorized(req)) return res.status(401).json({ error: 'Clave incorrecta' });
    const { state } = await read();
    if (!state) return res.status(409).json({ error: 'No hay progreso guardado' });
    res.status(200).json({ text: summary(state) });
  } catch (e) { fail(res, e); }
}
