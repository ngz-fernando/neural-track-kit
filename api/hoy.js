// GET /api/hoy?bloque=manana|tarde[&formato=texto]
// Lo que toca ahora. Tu agente lo pide a las horas de config.mjs y reenvía `text` por Telegram.
import { read, authorized, fail } from './_store.js';
import { planFor } from '../public/plan.mjs';

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  try {
    if (!authorized(req)) return res.status(401).json({ error: 'Clave incorrecta' });
    const url = new URL(req.url, 'http://x');
    const bloque = url.searchParams.get('bloque') === 'tarde' ? 'tarde' : 'manana';
    const { state } = await read();
    if (!state) return res.status(409).json({ error: 'Todavía no hay progreso guardado: abre la app una vez con la clave puesta.' });
    const plan = planFor(state, bloque);
    if (url.searchParams.get('formato') === 'texto') {
      res.setHeader('content-type', 'text/plain; charset=utf-8');
      return res.status(200).send(plan.text);
    }
    res.status(200).json(plan);
  } catch (e) { fail(res, e); }
}
