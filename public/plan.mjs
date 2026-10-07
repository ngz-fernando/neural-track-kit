// Plan del día y fusión de progreso. El horario está en config.mjs.
// Lo usan la app (navegador) y las funciones de /api (Hermes),
// así los dos calculan exactamente lo mismo.

import { TZ, COUNTS, SCHEDULE, LABEL, NEWEST_FIRST, APP_URL, TIMES, TAGS } from './config.mjs';
export { TZ, COUNTS, TIMES, SCHEDULE, LABEL, TAGS };
const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function localDay(date = new Date()) {
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(date);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(wd);
}

// Fecha escrita en el título (13/03/26, 31-07-2026…) → número para ordenar; 0 si no hay.
function titleDate(t) {
  const m = t.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (!m) return 0;
  const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
  return y * 10000 + +m[2] * 100 + +m[1];
}

const stamp0 = l => l?.t || (l?.doneAt ? Date.parse(l.doneAt) : 0) || 0;

// Qué toca en un curso. No va en orden desde el principio: sigue tu rastro.
// · Si has marcado 📍 en un módulo después de tu último vídeo, empieza ahí.
// · Si no, sigue justo después del ÚLTIMO vídeo que marcaste (aunque te saltaras otros).
// · Lo que dejaste atrás no se pierde: sale al final y se avisa con `behind`.
export function nextInfo(state, courseId, n) {
  const c = state.courses.find(x => x.id === courseId);
  const empty = { items: [], behind: 0, module: null, moduleDone: 0, moduleTotal: 0 };
  if (!c) return empty;
  const removed = new Set(state.removed || []);
  const mods = c.modules.filter(m => !m.skipped && !removed.has(m.id));
  const modInfo = m => m ? { module: m.title, moduleDone: m.lessons.filter(l => l.done).length, moduleTotal: m.lessons.length } : {};
  const liveSection = NEWEST_FIRST[courseId];
  if (liveSection) {
    // Primero lo que falta del curso; después los directos, los más recientes primero.
    const course = mods.filter(m => m.section !== liveSection);
    const lives = mods.filter(m => m.section === liveSection)
      .flatMap(m => m.lessons.map(l => ({ m, l })))
      .filter(x => !x.l.done && !removed.has(x.l.id))
      .sort((a, b) => titleDate(b.l.title) - titleDate(a.l.title));
    const first = course.flatMap(m => m.lessons.filter(l => !l.done && !removed.has(l.id)).map(l => ({ m, l })));
    const list = [...first, ...lives].slice(0, n);
    return { items: list.map(x => item(c, x.m, x.l)), behind: 0, ...modInfo(list[0]?.m) };
  }
  const flat = mods.flatMap(m => m.lessons.filter(l => !removed.has(l.id)).map(l => ({ m, l })));
  let last = -1, lastStamp = 0;
  flat.forEach((x, i) => { const s = x.l.done ? stamp0(x.l) : 0; if (s > lastStamp) { lastStamp = s; last = i; } });
  const pinIdx = flat.findIndex(x => x.m.id === c.currentModuleId);
  let start = 0;
  if (pinIdx >= 0 && (c.pinnedAt || 0) >= lastStamp) start = pinIdx;
  else if (last >= 0) start = last + 1;
  const order = [...flat.slice(start), ...flat.slice(0, start)].filter(x => !x.l.done);
  const list = order.slice(0, n);
  const m0 = list[0]?.m;
  const behind = m0 ? flat.slice(0, start).filter(x => x.m === m0 && !x.l.done).length : 0;
  return { items: list.map(x => item(c, x.m, x.l)), behind, ...modInfo(m0) };
}
export const pending = (state, courseId, n) => nextInfo(state, courseId, n).items;
const item = (c, m, l) => ({ id: l.id, title: l.title, module: m.title, section: m.section, course: c.name, courseId: c.id });

// Exámenes con fecha en el título («Examen parcial · 12/11/2026») en las próximas 2 semanas.
export function upcomingExams(state, date = new Date()) {
  const today = new Date(date.toLocaleString('en-US', { timeZone: TZ })); today.setHours(0, 0, 0, 0);
  const out = [];
  for (const c of state.courses) for (const m of c.modules) for (const l of m.lessons) {
    if (l.done || !/examen|\bexam\b|parcial|\bfinal\b|quiz/i.test(l.title)) continue;
    const d = l.title.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/);
    if (!d) continue;
    let y = d[3] ? (d[3].length === 2 ? 2000 + +d[3] : +d[3]) : today.getFullYear();
    let when = new Date(y, +d[2] - 1, +d[1]);
    if (!d[3] && when < today) when = new Date(y + 1, +d[2] - 1, +d[1]);
    const days = Math.round((when - today) / 864e5);
    if (days >= 0 && days <= 14) out.push({ days, title: l.title, course: LABEL[c.id] || c.name });
  }
  return out.sort((a, b) => a.days - b.days);
}

export function planFor(state, bloque, date = new Date(), counts = COUNTS) {
  const day = localDay(date);
  const sources = SCHEDULE[bloque]?.[day];
  const emoji = bloque === 'manana' ? '🌅' : '🌙';
  const nombre = bloque === 'manana' ? 'Mañana' : 'Tarde';
  if (!sources) {
    return { bloque, day: DAYS[day], label: 'Descanso', items: [], ids: [],
      text: `${emoji} ${nombre} del ${DAYS[day]}: descanso. Hoy no toca nada 🙌` };
  }
  // Si el primer curso del bloque ya está terminado, pasa al siguiente.
  let courseId = sources[0], info = { items: [] };
  for (const id of sources) { info = nextInfo(state, id, counts[bloque]); courseId = id; if (info.items.length) break; }
  const items = info.items;
  const label = LABEL[courseId] || courseId;
  if (!items.length) {
    return { bloque, day: DAYS[day], label, items, ids: [], text: `${emoji} ${nombre} · ${label}: no queda nada pendiente 🎉` };
  }
  const sameModule = items.every(x => x.module === items[0].module);
  const lines = items.map((x, i) => `${i + 1}. ${x.title}${sameModule ? '' : ` — ${x.module}`}`);
  const text = [
    `${emoji} ${nombre} · ${label}`,
    sameModule ? `📍 ${items[0].module} · ${info.moduleDone}/${info.moduleTotal}` : null,
    info.behind ? `↩️ Te dejaste ${info.behind} sin ver en este módulo (quedan para el final)` : null,
    '',
    ...lines,
    '',
    ...upcomingExams(state, date).map(e => `📅 ${e.days === 0 ? 'HOY' : `Faltan ${e.days} día${e.days === 1 ? '' : 's'}`}: ${e.title} (${e.course})`),
    '✅ Cuando acabes dime «hecho» (o «hecho 1 y 3»).',
    `📲 ${APP_URL}/?v=hoy`,
  ].filter(l => l !== null).join('\n');
  return { bloque, day: DAYS[day], label, courseId, items, ids: items.map(x => x.id), text };
}

// ---------- «¿Por dónde voy?» ----------
export function summary(state) {
  const lines = ['📊 Por dónde vas', ''];
  for (const c of state.courses) {
    const removed = new Set(state.removed || []);
    const ls = c.modules.filter(m => !m.skipped && !removed.has(m.id)).flatMap(m => m.lessons.filter(l => !removed.has(l.id)));
    const done = ls.filter(l => l.done).length;
    const info = nextInfo(state, c.id, 1);
    const pct = ls.length ? Math.round(done / ls.length * 100) : 0;
    lines.push(`• ${c.name}: ${pct}% (${done}/${ls.length})`);
    if (info.items[0]) lines.push(`   📍 ${info.module} · siguiente: ${info.items[0].title}`);
  }
  return lines.join('\n');
}

// ---------- Buscar una lección por lo que diga Fernando («he visto el de derivadas») ----------
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const words = s => norm(s).replace(/[^a-z0-9ñ]+/g, ' ').trim().split(' ').filter(w => w.length > 1 || /\d/.test(w));
const STOP = new Set(['de', 'el', 'la', 'los', 'las', 'en', 'con', 'que', 'un', 'una', 'del', 'por', 'para', 'he', 'visto', 'vi', 'video', 'videos', 'leccion', 'clase', 'acabo', 'ver']);
export function searchLessons(state, query, limit = 5) {
  const qs = words(query).filter(w => !STOP.has(w));
  if (!qs.length) return [];
  const removed = new Set(state.removed || []);
  const hit = (q, ws) => ws.some(w => w.includes(q) || (q.length >= 5 && w.startsWith(q.slice(0, Math.max(4, q.length - 2)))));
  const out = [];
  for (const c of state.courses) for (const m of c.modules) for (const l of m.lessons) {
    if (removed.has(l.id)) continue;
    const title = words(l.title), ctx = words(`${m.title} ${m.section} ${c.name}`);
    let score = 0, ok = true;
    for (const q of qs) {
      if (/^\d+$/.test(q)) { if (title.includes(q)) score += 4; else if (ctx.includes(q)) score += 1; else { ok = false; break; } continue; }
      if (hit(q, title)) score += 3; else if (hit(q, ctx)) score += 1; else { ok = false; break; }
    }
    if (ok) out.push({ score, id: l.id, title: l.title, module: m.title, course: c.name, done: !!l.done });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

// ---------- Fusión entre dispositivos ----------
// Cada lección, módulo y curso lleva `t` (última modificación). Gana el más reciente;
// lo que existe en un solo lado se conserva; lo borrado (state.removed) no vuelve.
const stamp = x => x?.t || (x?.doneAt ? Date.parse(x.doneAt) : 0) || 0;
const newer = (a, b) => (stamp(b) > stamp(a) ? b : a);

function mergeList(a = [], b = [], mergeItem, removed) {
  const byId = new Map(b.map(x => [x.id, x]));
  const out = [];
  for (const x of a) {
    if (removed.has(x.id)) continue;
    out.push(byId.has(x.id) ? mergeItem(x, byId.get(x.id)) : x);
    byId.delete(x.id);
  }
  for (const x of byId.values()) if (!removed.has(x.id)) out.push(x);
  return out;
}

export function mergeStates(local, remote) {
  if (!remote) return local;
  if (!local) return remote;
  const removed = new Set([...(local.removed || []), ...(remote.removed || [])]);
  const lesson = (a, b) => ({ ...newer(a, b) });
  const mod = (a, b) => ({ ...newer(a, b), lessons: mergeList(a.lessons, b.lessons, lesson, removed) });
  const course = (a, b) => ({ ...newer(a, b), modules: mergeList(a.modules, b.modules, mod, removed) });
  return {
    ...local,
    seedVersion: local.seedVersion,
    removed: [...removed],
    courses: mergeList(local.courses, remote.courses, course, removed),
  };
}

// Lo que se guarda en GitHub: todo menos la interfaz (filtros, pestaña abierta…).
export const syncable = s => ({ version: s.version, seedVersion: s.seedVersion, removed: s.removed || [], courses: s.courses });
