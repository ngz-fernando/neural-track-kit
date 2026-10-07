/* NEURAL_TRACK — registro de aprendizaje de IA. Todo se guarda en este navegador. */
(() => {
  'use strict';

  const STORE_KEY = 'neuraltrack:v1';
  const $ = (s, el = document) => el.querySelector(s);

  // ---------- Etiquetas automáticas ----------
  // [nombre, regex, color]. Se aplican a sección, módulo y lección; se heredan hacia abajo.
  const TAG_RULES = [
    ['Claude', /\bclaude\b(?!\s*code)|anthropic/i, '#ff8a4c'],
    ['Claude Code', /claude\s*code/i, '#ff6a2b'],
    ['ChatGPT', /chat\s?gpt|openai|\bgpts?\b|\bgpt-?\d/i, '#39ff88'],
    ['Codex', /\bcodex\b/i, '#7cffcb'],
    ['OpenClaw', /openclaw|claw hub/i, '#ff5c7a'],
    ['Gemini', /gemini|notebook\s?lm|google ai studio|\bgems\b|google workspace/i, '#4f8bff'],
    ['Copilot', /copilot|microsoft|power automate|sharepoint/i, '#2ec8ff'],
    ['n8n', /\bn8n\b/i, '#ff6d5a'],
    ['Make', /\bmake\b/i, '#c56bff'],
    ['Lovable', /lovable|\bsites\b/i, '#ff4fa8'],
    ['Cursor', /\bcursor\b/i, '#d0d7e2'],
    ['Replit', /replit/i, '#f26207'],
    ['Antigravity', /antigravity/i, '#9effa0'],
    ['Genspark', /genspark/i, '#ffd84f'],
    ['Perplexity', /perplexity|comet/i, '#20c4b5'],
    ['Grok', /grok/i, '#bfc8d6'],
    ['Botpress', /botpress/i, '#6c8cff'],
    ['ComfyUI', /comfy|flux|\blora\b|wan 2/i, '#ffb547'],
    ['Magnific', /magnific|higgsfield|nano banana|kling|seedance/i, '#ff9ef0'],
    ['HeyGen', /heygen|avatar/i, '#8a7dff'],
    ['Voz', /\bvoz\b|voces|doblaje|elevenlabs|whisper|lipsync/i, '#6ee7ff'],
    ['Hermes', /hermes/i, '#ffd0a8'],
    ['GoHighLevel', /\bghl\b|high ?level/i, '#3ddc84'],
    ['Airtable', /airtable/i, '#ffbf00'],
    ['Obsidian', /obsidian|segundo cerebro/i, '#9a7bff'],
    ['Supabase', /supabase/i, '#3ecf8e'],
    ['WhatsApp', /whats ?app/i, '#25d366'],
    ['GitHub', /github|\bgit\b/i, '#c9d1d9'],
    ['YouTube', /youtube|faceless|nichos?\b|miniaturas?|adsense|nexlev|vidiq|\bcanal(es)?\b|\bctr\b|\brpm\b|guion|guión/i, '#ff3d3d'],
    ['Python', /python|fastapi/i, '#4b8bbe'],
    ['JavaScript', /javascript|\bdom\b|jest/i, '#f7df1e'],
    ['Java', /\bjava\b(?!script)|\bpoo\b|intellij|jvm/i, '#e76f00'],
    ['SQL', /\bsql\b|bases? de datos|postgres|mongodb/i, '#00a7e1'],
    ['Bash', /\bbash\b|terminal|shell|\bzsh\b|cron jobs/i, '#89e051'],
    ['MCP', /\bmcps?\b/i, '#00e5ff'],
    ['Skills', /\bskills?\b/i, '#ffe066'],
    ['Agentes', /agente|agentic|agéntic|\bagents?\b/i, '#a78bfa'],
    ['Automatización', /automatiz|cron|webhook|mailhook|workflow|rutina/i, '#ff8fb1'],
    ['Vibe Coding', /vibe coding/i, '#ff4fa8'],
    ['Prompting', /prompt/i, '#b6f36b'],
    ['Marketing', /marketing|\bseo\b|\bsem\b|paid|email marketing|redes sociales|\bads\b/i, '#ffcf5c'],
    ['Audiovisual', /audiovisual|imagen|imágenes|v[ií]deo/i, '#ff9ef0'],
    ['Ventas', /\bvend|\bventas?\b|propuestas? (comercial|personaliz)|prospec|\bcierre\b|embudo|\bleads?\b|conseguir clientes|primer cliente/i, '#ffa94d'],
    ['Fundamentos', /fundamentos|historia de la ia|\bllms?\b/i, '#9fb3c8'],
  ];
  const TAG_COLOR = Object.fromEntries(TAG_RULES.map(([n, , c]) => [n, c]));
  const tagColor = name => TAG_COLOR[name] || `hsl(${[...name].reduce((a, ch) => a + ch.charCodeAt(0) * 7, 0) % 360} 85% 65%)`;
  const autoTags = text => TAG_RULES.filter(([, re]) => re.test(text || '')).map(([n]) => n);
  // Los temas transversales; el resto son herramientas concretas (Claude, n8n, OpenClaw…)
  const CONCEPTS = new Set(['MCP', 'Skills', 'Agentes', 'Automatización', 'Vibe Coding', 'Prompting', 'Marketing', 'Audiovisual', 'Fundamentos', 'Ventas', 'Voz']);
  // Etiquetas de un módulo. Una sección que junta varias herramientas («n8n y Make») no
  // reparte sus herramientas a un módulo que ya nombra la suya.
  function moduleTags(m) {
    const own = [...autoTags(m.title), ...(m.tags || [])];
    const hasTool = own.some(t => !CONCEPTS.has(t));
    const sec = autoTags(m.section).filter(t => !hasTool || CONCEPTS.has(t));
    return [...new Set([...sec, ...own])];
  }

  const COURSE_TYPES = { master: 'Máster', curso: 'Curso', comunidad: 'Comunidad', bootcamp: 'Bootcamp', libro: 'Libro', otro: 'Otro' };
  const PALETTE = ['#00e5ff', '#a78bfa', '#39ff88', '#ffb547', '#ff5c7a', '#4f8bff', '#ff4fa8', '#7cffcb'];

  // ---------- Estado ----------
  const uid = () => Math.random().toString(36).slice(2, 10);

  const SEED_VERSION = window.SEED_VERSION || '1';
  const RETIRED_MODULES = []; // módulos de versiones antiguas del temario que hay que quitar
  const seedCourses = () => (window.SEED_COURSES || []).map(c => structuredClone(c));

  // Trae los temarios nuevos sin tocar lo que ya hay marcado (ni resucitar lo que se borró): añade módulos y lecciones
  // que falten (por id), respeta el orden del temario y deja al final los módulos propios.
  function migrate(s) {
    if (s.seedVersion === SEED_VERSION) return s;
    const removed = new Set(s.removed || []);
    const keep = x => !removed.has(x.id);
    for (const seed of seedCourses()) {
      seed.modules = seed.modules.filter(keep);
      seed.modules.forEach(m => { m.lessons = m.lessons.filter(keep); });
      const cur = s.courses.find(c => c.id === seed.id);
      if (!cur) { if (keep(seed)) s.courses.push(seed); continue; }
      cur.modules = cur.modules.filter(m => !RETIRED_MODULES.includes(m.id));
      const retiredLessons = new Set(window.SEED_RETIRED || []);
      cur.modules.forEach(m => { m.lessons = m.lessons.filter(l => !retiredLessons.has(l.id)); });
      const existing = new Map(cur.modules.map(m => [m.id, m]));
      const seedIds = new Set(seed.modules.map(m => m.id));
      const merged = seed.modules.map(sm => {
        const em = existing.get(sm.id);
        if (!em) return sm;
        const have = new Set(em.lessons.map(l => l.id));
        em.lessons.push(...sm.lessons.filter(l => !have.has(l.id)));
        return em;
      });
      cur.modules = [...merged, ...cur.modules.filter(m => !seedIds.has(m.id))];
      if (cur.currentModuleId && !cur.modules.some(m => m.id === cur.currentModuleId)) cur.currentModuleId = null;
    }
    s.seedVersion = SEED_VERSION;
    return s;
  }

  const defaultUI = () => ({
    view: 'hoy', courses: [], tags: [], tagMode: 'or', status: 'all', kinds: [],
    search: '', hideSkipped: true, open: {}, showAllTags: false,
  });

  let loadFailed = false;
  function load() {
    let raw = null;
    try { raw = localStorage.getItem(STORE_KEY); } catch (e) { /* almacenamiento bloqueado */ }
    if (raw) {
      try {
        const s = JSON.parse(raw);
        s.ui = Object.assign(defaultUI(), s.ui || {});
        try { return migrate(s); } catch (e) { console.error('migración', e); return s; }
      } catch (e) {
        // datos ilegibles: se guardan aparte y no se pisan sin que el usuario actúe
        loadFailed = true;
        try { localStorage.setItem(STORE_KEY + ':backup', raw); } catch (_) {}
      }
    }
    return { version: 1, seedVersion: SEED_VERSION, courses: seedCourses(), ui: defaultUI() };
  }

  let state = load();
  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {} window.__ntSchedulePush?.(); };
  if (!loadFailed) save(); // deja persistida la migración aunque no se toque nada

  // ---------- Consultas ----------
  const allLessons = () => {
    const out = [];
    for (const c of state.courses) for (const m of c.modules) for (const l of m.lessons) out.push({ c, m, l });
    return out;
  };
  function lessonTags(c, m, l) {
    const set = new Set([...moduleTags(m), ...autoTags(l.title), ...(l.tags || [])]);
    return [...set];
  }
  const tagCache = new Map();
  const tagsOf = (c, m, l) => {
    const key = l.id + '|' + m.title + '|' + (m.tags || []).join() + '|' + l.title + '|' + (l.tags || []).join();
    if (!tagCache.has(key)) tagCache.set(key, lessonTags(c, m, l));
    return tagCache.get(key);
  };
  const findCourse = id => state.courses.find(c => c.id === id);
  function findModule(id) { for (const c of state.courses) { const m = c.modules.find(x => x.id === id); if (m) return { c, m }; } return {}; }
  function findLesson(id) { for (const c of state.courses) for (const m of c.modules) { const l = m.lessons.find(x => x.id === id); if (l) return { c, m, l }; } return {}; }

  const counted = (m) => !m.skipped;
  function courseProgress(c) {
    let done = 0, total = 0;
    for (const m of c.modules) if (counted(m)) for (const l of m.lessons) { total++; if (l.done) done++; }
    return { done, total, pct: total ? Math.round(done / total * 100) : 0 };
  }
  const modProgress = m => ({ done: m.lessons.filter(l => l.done).length, total: m.lessons.length });

  function matches({ c, m, l }, { ignoreStatus = false } = {}) {
    const u = state.ui;
    if (u.courses.length && !u.courses.includes(c.id)) return false;
    if (u.hideSkipped && m.skipped) return false;
    if (u.kinds.length && !u.kinds.includes(m.kind)) return false;
    if (!ignoreStatus && u.status === 'todo' && l.done) return false;
    if (!ignoreStatus && u.status === 'done' && !l.done) return false;
    if (u.tags.length) {
      const t = tagsOf(c, m, l);
      if (u.tagMode === 'and' ? !u.tags.every(x => t.includes(x)) : !u.tags.some(x => t.includes(x))) return false;
    }
    if (u.search && !searchScore({ c, m, l }, u.search)) return false;
    return true;
  }

  // ---------- Buscador ----------
  // Palabras en cualquier orden, sin tildes, sin emojis ni signos; admite una errata por palabra.
  const words = s => norm(s).replace(/[^a-z0-9ñ]+/g, ' ').trim().split(' ').filter(Boolean);
  function near(a, b) { // una errata: letra de más, de menos, cambiada o dos letras intercambiadas
    if (a === b) return true;
    if (Math.abs(a.length - b.length) > 1) return false;
    if (a.length === b.length) {
      const d = [...a].map((ch, i) => ch !== b[i] ? i : -1).filter(i => i >= 0);
      return d.length === 1 || (d.length === 2 && d[1] === d[0] + 1 && a[d[0]] === b[d[1]] && a[d[1]] === b[d[0]]);
    }
    const [lo, sh] = a.length > b.length ? [a, b] : [b, a];
    for (let i = 0; i < lo.length; i++) if (lo.slice(0, i) + lo.slice(i + 1) === sh) return true;
    return false;
  }
  // misma raíz: «instalar» ↔ «instalación», «automatizar» ↔ «automatizaciones»
  const stem = (q, w) => { const n = Math.max(4, q.length - 2); return q.length >= 5 && w.length >= n && w.slice(0, n) === q.slice(0, n); };
  const hit = (q, hay) => hay.some(w => w.includes(q) || stem(q, w)) ||
    (q.length > 3 && hay.some(w => w[0] === q[0] && (near(q, w) || near(q, w.slice(0, q.length)))));
  // 0 = no coincide. Más alto = mejor: coincidencias en el título pesan más que en módulo/curso/notas.
  function searchScore({ c, m, l }, query) {
    const qs = words(query); if (!qs.length) return 1;
    const title = words(l.title);
    const rest = words(`${m.title} ${m.section} ${c.name} ${l.note || ''} ${(l.tags || []).join(' ')}`);
    let score = 0;
    for (const q of qs) {
      if (title.some(w => w.startsWith(q))) score += 3;
      else if (hit(q, title)) score += 2;
      else if (hit(q, rest)) score += 1;
      else return 0;
    }
    if (norm(l.title).includes(norm(query.trim()))) score += 5; // frase exacta
    return score;
  }
  function searchResults() {
    const u = state.ui;
    return allLessons()
      .filter(x => !u.courses.length || u.courses.includes(x.c.id))
      .map(x => ({ x, s: searchScore(x, u.search) }))
      .filter(r => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .map(r => r.x);
  }
  function resultsHTML() {
    const res = searchResults();
    const shown = res.slice(0, 60);
    return `<div class="panel"><div class="panel-h"><h3>Resultados para «${esc(state.ui.search)}»</h3>
      <span class="mono" style="font-size:12px;color:var(--muted)">${res.length} lecciones${res.length > 60 ? ' · mostrando 60' : ''}</span></div>
      <div class="panel-b">${shown.map(x => `<div class="result">${lessonHTML(x, { ctx: 'full' })}<button class="btn small ghost goto" data-action="goto" data-id="${x.l.id}">Ver en temario →</button></div>`).join('')
        || '<div class="empty">No encuentro ninguna lección con esas palabras. Prueba con menos palabras o quita el filtro de curso.</div>'}</div></div>`;
  }
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const filtersActive = () => { const u = state.ui; return !!(u.tags.length || u.search.trim() || u.status !== 'all' || u.kinds.length); };

  // Lo siguiente que toca en un curso: primero el módulo marcado "estoy aquí", luego en orden.
  function nextUp(c, n = 3) {
    if (!filtersActive() && window.NTPlan) return window.NTPlan.nextInfo(state, c.id, n).items.map(it => findLesson(it.id)).filter(x => x.l);
    const pending = [];
    const order = [...c.modules];
    const cur = c.modules.findIndex(m => m.id === c.currentModuleId);
    if (cur > 0) order.unshift(...order.splice(cur, 1));
    for (const m of order) {
      if (m.skipped) continue;
      for (const l of m.lessons) {
        if (!l.done && matches({ c, m, l }, { ignoreStatus: true })) pending.push({ c, m, l });
        if (pending.length >= n) return pending;
      }
    }
    return pending;
  }
  function currentModule(c) {
    const pinned = c.modules.find(m => m.id === c.currentModuleId);
    if (filtersActive()) {
      const first = nextUp(c, 1)[0];
      if (first && first.m !== pinned) return first.m;
    }
    if (window.NTPlan && !filtersActive()) { const f = nextUp(c, 1)[0]; if (f) return f.m; }
    if (pinned) return pinned;
    return c.modules.find(m => !m.skipped && m.lessons.some(l => !l.done)) || null;
  }

  // ---------- Utilidades de render ----------
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const tagHTML = t => `<span class="tag" style="--t:${tagColor(t)}" data-action="filter-tag" data-tag="${esc(t)}">${esc(t)}</span>`;
  const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '';
  const dayKey = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };

  function ring(pct, color) {
    const r = 25, C = 2 * Math.PI * r;
    return `<div class="ring"><svg width="58" height="58" viewBox="0 0 58 58">
      <circle cx="29" cy="29" r="${r}" fill="none" stroke="#1b2330" stroke-width="5"/>
      <circle cx="29" cy="29" r="${r}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"
        stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct / 100)}" style="filter:drop-shadow(0 0 4px ${color})"/>
    </svg><b>${pct}%</b></div>`;
  }

  // ctx: false | 'module' | 'full' — qué contexto se muestra bajo el título
  function lessonHTML({ c, m, l }, { ctx = false } = {}) {
    const inherited = ctx ? [] : moduleTags(m);
    const tags = tagsOf(c, m, l).filter(t => !inherited.includes(t));
    const open = state.ui.open['note:' + l.id];
    const ctxLine = ctx === 'full' ? `${esc(c.name)} › ${esc(m.title)}` : ctx === 'module' ? esc(m.title) : '';
    return `<div class="lesson ${l.done ? 'done' : ''}" data-lesson="${l.id}">
      <input type="checkbox" class="check" data-action="toggle" data-id="${l.id}" ${l.done ? 'checked' : ''} aria-label="Marcar ${esc(l.title)}">
      <div class="l-main">
        <span class="l-title" data-action="toggle-note" data-id="${l.id}">${esc(l.title)}</span>
        <span class="l-tags">${tags.slice(0, ctx ? 4 : 6).map(tagHTML).join('')}</span>
        ${ctxLine ? `<div class="l-ctx">${ctxLine}</div>` : ''}
      </div>
      ${l.done ? `<span class="l-date">${fmtDate(l.doneAt)}</span>` : ''}
      <div class="l-actions">
        <button class="icon-btn ${l.note ? 'has-note' : ''}" data-action="toggle-note" data-id="${l.id}" title="Notas">✎</button>
        <button class="icon-btn" data-action="edit-lesson" data-id="${l.id}" title="Editar">⋯</button>
      </div>
    </div>
    ${open ? `<div class="note-box"><textarea data-note="${l.id}" placeholder="Qué he aprendido, enlaces, ideas para aplicarlo…">${esc(l.note)}</textarea></div>` : ''}`;
  }

  // ---------- Render ----------
  function render() {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === state.ui.view));
    renderSidebar();
    renderFilters();
    renderView();
  }
  function renderView() {
    const u = state.ui;
    if (u.search.trim() && u.view !== 'syllabus') { $('#view').innerHTML = resultsHTML(); return; }
    ({ hoy: renderHoy, today: renderToday, syllabus: renderSyllabus, log: renderLog })[u.view]();
  }

  function renderSidebar() {
    $('#courseList').innerHTML = state.courses.map(c => {
      const p = courseProgress(c);
      const active = state.ui.courses.includes(c.id);
      return `<button class="course-item ${active ? 'active' : ''}" style="--c:${c.color}" data-action="filter-course" data-id="${c.id}" title="Filtrar por este curso">
        <div class="ci-top"><span class="ci-name">${esc(c.name)}</span><span class="ci-pct">${p.pct}%</span></div>
        <div class="ci-sub">${esc(c.provider || COURSE_TYPES[c.type])} · ${p.done}/${p.total}</div>
        <div class="bar"><i style="width:${p.pct}%"></i></div>
      </button>`;
    }).join('') || '<div class="empty">Aún no hay cursos.</div>';
  }

  function tagCounts() {
    const counts = new Map();
    const u = state.ui;
    for (const x of allLessons()) {
      if (u.courses.length && !u.courses.includes(x.c.id)) continue;
      if (u.hideSkipped && x.m.skipped) continue;
      for (const t of tagsOf(x.c, x.m, x.l)) {
        const v = counts.get(t) || { done: 0, total: 0 };
        v.total++; if (x.l.done) v.done++;
        counts.set(t, v);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1].total - a[1].total);
  }

  function renderFilters() {
    const u = state.ui;
    const searchBox = `<input class="search" type="search" placeholder="🔎 Busca el vídeo que has visto… ( / )" value="${esc(u.search)}" data-input="search" autocomplete="off">`;
    if (u.view === 'log' || u.view === 'hoy') { $('#filters').innerHTML = `<div class="filters"><div class="f-row">${searchBox}</div></div>`; return; }
    const tags = tagCounts();
    for (const t of u.tags) if (!tags.find(([n]) => n === t)) tags.unshift([t, { done: 0, total: 0 }]);
    const shown = u.showAllTags ? tags : tags.slice(0, 18);
    for (const t of u.tags) if (!shown.find(([n]) => n === t)) shown.push(tags.find(([n]) => n === t));
    const hasKinds = state.courses.some(c => c.modules.some(m => m.kind));
    $('#filters').innerHTML = `<div class="filters">
      <div class="f-row">
        ${searchBox}
        <div class="seg" role="group" aria-label="Estado">
          ${[['all', 'Todas'], ['todo', 'Pendientes'], ['done', 'Hechas']].map(([k, t]) => `<button class="${u.status === k ? 'on' : ''}" data-action="status" data-v="${k}">${t}</button>`).join('')}
        </div>
      </div>
      <div class="f-row">
        <span class="f-label">CURSOS</span>
        ${state.courses.map(c => `<button class="chip ${u.courses.includes(c.id) ? 'on' : ''}" style="--t:${c.color}" data-action="filter-course" data-id="${c.id}">${esc(c.name)}</button>`).join('')}
      </div>
      <div class="f-row">
        <span class="f-label">TEMAS</span>
        ${shown.map(([t, v]) => `<button class="chip ${u.tags.includes(t) ? 'on' : ''}" style="--t:${tagColor(t)}" data-action="filter-tag" data-tag="${esc(t)}">${esc(t)} <span class="n">${v.done}/${v.total}</span></button>`).join('')}
        ${tags.length > 18 ? `<button class="tags-more" data-action="more-tags">${u.showAllTags ? '− menos' : `+${tags.length - 18} más`}</button>` : ''}
      </div>
      <div class="f-row">
        ${u.tags.length > 1 ? `<span class="f-label">MEZCLA</span><div class="seg"><button class="${u.tagMode === 'or' ? 'on' : ''}" data-action="tagmode" data-v="or">Cualquiera</button><button class="${u.tagMode === 'and' ? 'on' : ''}" data-action="tagmode" data-v="and">Todas a la vez</button></div>` : ''}
        ${hasKinds ? `<span class="f-label">TIPO</span>${['troncal', 'optativa', 'info'].map(k => `<button class="chip plain ${u.kinds.includes(k) ? 'on' : ''}" data-action="kind" data-v="${k}">${k}</button>`).join('')}` : ''}
        <button class="chip plain ${u.hideSkipped ? 'on' : ''}" data-action="hide-skipped" title="Los módulos omitidos no cuentan en el progreso">ocultar omitidos</button>
        ${filtersActive() || u.courses.length ? `<button class="clear-link" data-action="clear">✕ limpiar filtros</button>` : ''}
      </div>
    </div>`;
  }

  function streak() {
    const days = new Set(allLessons().filter(x => x.l.doneAt).map(x => dayKey(x.l.doneAt)));
    let n = 0; const d = new Date();
    if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
    while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  // ---------- Hoy: lo mismo que Hermes manda por Telegram ----------
  function renderHoy() {
    const P = window.NTPlan;
    const blocks = ['manana', 'tarde'].map(b => {
      const plan = P.planFor(state, b);
      const items = plan.items.map(it => findLesson(it.id)).filter(x => x.l);
      return `<article class="card hoy-card">
        <div class="card-top"><div style="flex:1">
          <div class="side-title mono" style="padding:0">${b === 'manana' ? `🌅 MAÑANA · ${P.TIMES.manana}` : `🌙 TARDE · ${P.TIMES.tarde}`}</div>
          <div class="card-title" style="margin-top:4px">${esc(plan.label)}</div>
          <div class="card-sub">${esc(plan.day)}</div></div></div>
        <div class="next-list">${items.length ? items.map(x => lessonHTML(x, { ctx: 'module' })).join('') : `<div class="empty">${esc(plan.text)}</div>`}</div>
      </article>`;
    }).join('');
    const week = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
    const dayOf = (b, i) => { const ids = P.SCHEDULE[b]?.[(i + 1) % 7]; return ids ? (P.LABEL[ids[0]] || ids[0]) : 'descanso'; };
    const morning = week.map((_, i) => dayOf('manana', i));
    const evening = week.map((_, i) => dayOf('tarde', i));
    $('#view').innerHTML = `
      ${syncKey() ? '' : `<div class="panel"><div class="panel-b" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <span style="flex:1;min-width:220px">☁ Conecta la app con tu clave para que el progreso se guarde en GitHub y Hermes sepa qué te toca.</span>
        <button class="btn primary" data-action="sync-settings">Poner clave</button></div></div>`}
      <div class="cards">${blocks}</div>
      <div class="panel"><div class="panel-h"><h3>La semana</h3><span class="mono" style="font-size:11px;color:var(--dim)">${esc(P.TZ)}</span></div>
        <div class="panel-b" style="overflow-x:auto"><table class="week">
          <tr><th></th>${week.map(d => `<th>${d}</th>`).join('')}</tr>
          <tr><td>🌅 ${P.TIMES.manana}</td>${morning.map(x => `<td>${x}</td>`).join('')}</tr>
          <tr><td>🌙 ${P.TIMES.tarde}</td>${evening.map(x => `<td>${x}</td>`).join('')}</tr>
        </table><div class="empty">Por la mañana, ${P.COUNTS.manana} vídeos; por la tarde, ${P.COUNTS.tarde}. Marca 📍 «Estoy aquí» en un módulo y el plan seguirá desde ahí.</div></div></div>`;
  }

  function renderToday() {
    const all = allLessons();
    const done = all.filter(x => x.l.done);
    const weekAgo = Date.now() - 7 * 864e5;
    const week = done.filter(x => x.l.doneAt && new Date(x.l.doneAt) >= weekAgo).length;
    const visible = state.courses.filter(c => !state.ui.courses.length || state.ui.courses.includes(c.id));
    const tagLabel = state.ui.tags.length ? ` <span class="mono" style="color:var(--cyan);font-size:12px">· filtrado por ${state.ui.tags.map(esc).join(state.ui.tagMode === 'and' ? ' + ' : ' / ')}</span>` : '';

    const cards = visible.map(c => {
      const p = courseProgress(c);
      const cm = currentModule(c);
      const mp = cm ? modProgress(cm) : null;
      const next = nextUp(c, 4);
      return `<article class="card" style="--c:${c.color}">
        <div class="card-top">
          ${ring(p.pct, c.color)}
          <div style="flex:1;min-width:0">
            <div class="card-title">${esc(c.name)}</div>
            <div class="card-sub">${esc(c.provider)} · ${p.done}/${p.total} lecciones</div>
          </div>
          <span class="type-badge">${COURSE_TYPES[c.type] || c.type}</span>
        </div>
        ${cm ? `<div class="here">
          <div class="lbl">${c.currentModuleId === cm.id ? '📍 ESTÁS AQUÍ' : filtersActive() ? '▸ LO PRIMERO DE ESTE FILTRO' : '▸ MÓDULO EN CURSO'}</div>
          <div class="mod">${esc(cm.title)}</div>
          <div class="meta"><span>${esc(cm.section)}</span><span class="mono">${mp.done}/${mp.total}</span></div>
          <div class="bar"><i style="width:${mp.total ? mp.done / mp.total * 100 : 0}%"></i></div>
        </div>` : ''}
        <div>
          <div class="side-title mono" style="padding:0 0 6px">SIGUIENTE${tagLabel}</div>
          <div class="next-list">
            ${next.length ? next.map(x => lessonHTML(x, { ctx: 'module' })).join('') : `<div class="empty">${c.modules.length ? (state.ui.tags.length ? 'Nada pendiente con estos temas aquí.' : '🎉 Todo completado.') : 'Este curso aún no tiene temario. Añade módulos y lecciones.'}</div>`}
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:auto">
          <button class="btn small" data-action="open-course" data-id="${c.id}">Ver temario →</button>
          <button class="btn small ghost" data-action="add-module" data-id="${c.id}">+ módulo</button>
          <button class="btn small ghost" data-action="edit-course" data-id="${c.id}" style="margin-left:auto">⚙</button>
        </div>
      </article>`;
    }).join('');

    const tags = tagCounts().slice(0, 14);
    $('#view').innerHTML = `
      <div class="stats">
        <div class="stat"><div class="k">LECCIONES HECHAS</div><div class="v">${done.length}<small> / ${all.length}</small></div></div>
        <div class="stat" style="--glow:rgba(57,255,136,.2)"><div class="k">ÚLTIMOS 7 DÍAS</div><div class="v">${week}</div></div>
        <div class="stat" style="--glow:rgba(255,181,71,.22)"><div class="k">RACHA</div><div class="v">${streak()}<small> días</small></div></div>
        <div class="stat" style="--glow:rgba(167,139,250,.22)"><div class="k">CURSOS ACTIVOS</div><div class="v">${state.courses.length}</div></div>
      </div>
      ${visible.length ? `<div class="cards">${cards}</div>` : `<div class="empty big">No hay cursos. Pulsa <b>+ Curso</b> para empezar.</div>`}
      <div class="two-col">
        <div class="panel"><div class="panel-h"><h3>Radar por tema</h3><span class="mono" style="font-size:11px;color:var(--dim)">clic = filtrar</span></div>
          <div class="panel-b radar">${tags.map(([t, v]) => `<div class="radar-row" style="--t:${tagColor(t)};--c:${tagColor(t)}" data-action="filter-tag" data-tag="${esc(t)}">
            <div class="rr-top"><span>${esc(t)}</span><span>${v.done}/${v.total}</span></div>
            <div class="bar"><i style="width:${v.total ? v.done / v.total * 100 : 0}%"></i></div></div>`).join('')}</div>
        </div>
        <div class="panel"><div class="panel-h"><h3>Actividad · 20 semanas</h3></div><div class="panel-b">${heatmap()}</div></div>
      </div>`;
  }

  function heatmap() {
    const counts = {};
    for (const x of allLessons()) if (x.l.doneAt) { const k = dayKey(x.l.doneAt); counts[k] = (counts[k] || 0) + 1; }
    const end = new Date(); const start = new Date(); start.setDate(end.getDate() - 20 * 7 + 1);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // empieza en lunes
    let cells = '';
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const n = counts[dayKey(d)] || 0;
      const lv = n === 0 ? 0 : n < 2 ? 1 : n < 4 ? 2 : n < 7 ? 3 : 4;
      cells += `<i data-l="${lv}" title="${d.toLocaleDateString('es-ES')} · ${n} lecciones"></i>`;
    }
    return `<div class="heat">${cells}</div>
      <div class="heat-legend">menos <i style="background:#1b2330"></i><i style="background:rgba(57,255,136,.25)"></i><i style="background:rgba(57,255,136,.5)"></i><i style="background:rgba(57,255,136,.75)"></i><i style="background:#39ff88"></i> más</div>`;
  }

  function renderSyllabus() {
    const u = state.ui;
    const active = filtersActive();
    const courses = state.courses.filter(c => !u.courses.length || u.courses.includes(c.id));
    let html = '';
    let any = false;
    for (const c of courses) {
      const p = courseProgress(c);
      let body = ''; let lastSection = null;
      for (const m of c.modules) {
        if (u.hideSkipped && m.skipped) continue;
        if (u.kinds.length && !u.kinds.includes(m.kind)) continue;
        const items = m.lessons.map(l => ({ c, m, l })).filter(x => matches(x));
        if (active && !items.length) continue;
        if (m.section !== lastSection) { body += `<div class="section-label">${esc(m.section || 'General')}</div>`; lastSection = m.section; }
        body += moduleHTML(c, m, active ? items : m.lessons.map(l => ({ c, m, l })), active);
      }
      if (!body && active) continue;
      any = true;
      html += `<section class="course-block" style="--c:${c.color}">
        <div class="course-head"><span class="dot"></span><h2>${esc(c.name)}</h2>
          <span class="mono" style="color:var(--muted);font-size:12px">${p.done}/${p.total} · ${p.pct}%</span>
          <span class="spacer"></span>
          <button class="btn small ghost" data-action="collapse-all" data-id="${c.id}">Plegar</button>
          <button class="btn small" data-action="add-module" data-id="${c.id}">+ Módulo</button>
          <button class="icon-btn" data-action="edit-course" data-id="${c.id}" title="Editar curso">⚙</button>
        </div>
        ${body || `<div class="empty big">Sin módulos todavía. Pulsa <b>+ Módulo</b> o pega un temario desde ⚙.</div>`}
      </section>`;
    }
    $('#view').innerHTML = any ? html : `<div class="empty big">Nada coincide con estos filtros.</div>`;
  }

  function moduleHTML(c, m, items, forceOpen) {
    const mp = modProgress(m);
    const open = forceOpen || state.ui.open[m.id];
    const isCurrent = c.currentModuleId === m.id;
    const mtags = moduleTags(m);
    return `<div class="module ${open ? 'open' : ''} ${isCurrent ? 'current' : ''} ${m.skipped ? 'skipped' : ''} ${mp.total && mp.done === mp.total ? 'complete' : ''}" style="--c:${c.color}">
      <div class="m-head" data-action="toggle-module" data-id="${m.id}">
        <span class="chev">▶</span>
        <div class="m-info">
          <div class="m-title">${isCurrent ? '📍 ' : ''}${esc(m.title)}</div>
          <div class="m-meta">
            ${m.kind ? `<span class="kind ${m.kind}">${m.kind}</span>` : ''}
            ${m.badge ? `<span class="kind info">${esc(m.badge)}</span>` : ''}
            ${m.skipped ? '<span class="kind" style="color:var(--dim)">omitido</span>' : ''}
            ${mtags.slice(0, 5).map(tagHTML).join('')}
          </div>
        </div>
        <div class="m-prog"><span class="num">${mp.done}/${mp.total}</span><div class="bar"><i style="width:${mp.total ? mp.done / mp.total * 100 : 0}%"></i></div></div>
        <div class="m-actions">
          <button class="icon-btn ${isCurrent ? 'on' : ''}" data-action="pin" data-id="${m.id}" title="Estoy aquí">📍</button>
          <button class="icon-btn" data-action="edit-module" data-id="${m.id}" title="Editar módulo">⋯</button>
        </div>
      </div>
      ${open ? `<div class="m-body">
        ${items.map(x => lessonHTML(x)).join('') || '<div class="empty" style="padding-left:38px">Sin lecciones.</div>'}
        <div class="add-lesson"><input placeholder="+ añadir lección (Enter)" data-add-lesson="${m.id}"></div>
      </div>` : ''}
    </div>`;
  }

  function renderLog() {
    const done = allLessons().filter(x => x.l.done).sort((a, b) => new Date(b.l.doneAt || 0) - new Date(a.l.doneAt || 0));
    const groups = new Map();
    for (const x of done) { const k = x.l.doneAt ? dayKey(x.l.doneAt) : 'sin fecha'; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(x); }
    const notes = allLessons().filter(x => x.l.note);
    $('#view').innerHTML = `<div class="two-col">
      <div class="panel"><div class="panel-h"><h3>Completado</h3><span class="mono" style="font-size:12px;color:var(--muted)">${done.length} lecciones</span></div>
        <div class="panel-b">${[...groups].map(([k, xs]) => `<div class="log-day"><h4>${k === 'sin fecha' ? k : new Date(k + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} · ${xs.length}</h4>${xs.map(x => lessonHTML(x, { ctx: 'full' })).join('')}</div>`).join('') || '<div class="empty">Aún no has marcado nada. Ve a «Qué toca» y empieza.</div>'}</div>
      </div>
      <div class="panel"><div class="panel-h"><h3>Mis notas</h3><span class="mono" style="font-size:12px;color:var(--muted)">${notes.length}</span></div>
        <div class="panel-b">${notes.map(x => `<div class="here" style="margin-bottom:10px"><div class="lbl">${esc(x.c.name)} › ${esc(x.m.title)}</div><div class="mod">${esc(x.l.title)}</div><div style="white-space:pre-wrap;color:var(--muted);margin-top:6px;font-size:13px">${esc(x.l.note)}</div></div>`).join('') || '<div class="empty">Pulsa ✎ en cualquier lección para apuntar lo que aprendes.</div>'}</div>
      </div>
    </div>`;
  }

  // ---------- Modales ----------
  function modal(title, inner, onSubmit, { extra = '' } = {}) {
    const el = $('#modal');
    el.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true"><header><h3>${title}</h3><button class="icon-btn" data-close>✕</button></header>
      <form>${inner}<div class="modal-actions">${extra}<button type="button" class="btn ghost" data-close>Cancelar</button><button class="btn primary" type="submit">Guardar</button></div></form></div>`;
    el.hidden = false;
    const form = $('form', el);
    form.onsubmit = e => { e.preventDefault(); if (onSubmit(new FormData(form), form) !== false) closeModal(); };
    el.onclick = e => { if (e.target === el || e.target.closest('[data-close]')) closeModal(); };
    setTimeout(() => $('input,textarea', form)?.focus(), 30);
    return el;
  }
  const closeModal = () => { $('#modal').hidden = true; $('#modal').innerHTML = ''; };

  // Formato del temario: "## Sección", "# Módulo", y cada otra línea es una lección.
  function parseSyllabus(text, prefix) {
    const modules = []; let section = ''; let cur = null;
    for (const raw of text.split('\n')) {
      const line = raw.trim(); if (!line) continue;
      if (line.startsWith('## ')) { section = line.slice(3).trim(); continue; }
      if (line.startsWith('# ')) { cur = { id: `${prefix}-${uid()}`, section, title: line.slice(2).trim(), kind: '', badge: '', tags: [], skipped: false, lessons: [] }; modules.push(cur); continue; }
      if (!cur) { cur = { id: `${prefix}-${uid()}`, section, title: 'General', kind: '', badge: '', tags: [], skipped: false, lessons: [] }; modules.push(cur); }
      cur.lessons.push({ id: `${prefix}-${uid()}`, title: line.replace(/^[-*•]\s*/, ''), tags: [], done: false, doneAt: null, note: '' });
    }
    return modules;
  }
  const SYLLABUS_HINT = `<span class="hint">Una línea por lección. <b>## Sección</b> agrupa, <b># Módulo</b> abre un módulo nuevo. Las etiquetas (Claude, n8n, MCP…) se ponen solas.</span>`;

  function courseModal(c) {
    const isNew = !c;
    c = c || { name: '', provider: '', type: 'curso', color: PALETTE[state.courses.length % PALETTE.length], url: '' };
    modal(isNew ? 'Nuevo curso, máster o comunidad' : 'Editar curso', `
      <label class="field"><span>Nombre</span><input name="name" required value="${esc(c.name)}" placeholder="p. ej. Curso de agentes con n8n"></label>
      <div class="row2">
        <label class="field"><span>Plataforma / escuela</span><input name="provider" value="${esc(c.provider)}" placeholder="Skool, Udemy, YouTube…"></label>
        <label class="field"><span>Tipo</span><select name="type">${Object.entries(COURSE_TYPES).map(([k, v]) => `<option value="${k}" ${c.type === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      </div>
      <div class="row2">
        <label class="field"><span>Enlace</span><input name="url" value="${esc(c.url)}" placeholder="https://…"></label>
        <label class="field"><span>Color</span><input type="color" name="color" value="${esc(c.color)}"></label>
      </div>
      <label class="field"><span>${isNew ? 'Temario (opcional)' : 'Añadir más temario (opcional)'}</span>
        <textarea name="syllabus" placeholder="## Fundamentos&#10;# Módulo 1 — Introducción&#10;Qué es un agente&#10;Instalar Claude Code&#10;# Módulo 2 — MCP&#10;Conectar Gmail por MCP"></textarea>${SYLLABUS_HINT}</label>
    `, fd => {
      const data = { name: fd.get('name').trim(), provider: fd.get('provider').trim(), type: fd.get('type'), url: fd.get('url').trim(), color: fd.get('color') };
      const mods = parseSyllabus(fd.get('syllabus') || '', 'm');
      if (isNew) {
        const nc = { id: `c-${uid()}`, ...data, currentModuleId: null, modules: mods, t: Date.now() };
        state.courses.push(nc);
        toast(`✔ ${nc.name} añadido`);
      } else {
        Object.assign(c, data, { t: Date.now() }); c.modules.push(...mods);
      }
      commit();
    }, { extra: isNew ? '' : `<button type="button" class="btn danger left" data-action="delete-course" data-id="${c.id}">Eliminar curso</button>` });
  }

  function moduleModal(courseId, m) {
    const isNew = !m; const c = findCourse(courseId);
    m = m || { section: c.modules.at(-1)?.section || '', title: '', tags: [], kind: '' };
    modal(isNew ? `Nuevo módulo · ${esc(c.name)}` : 'Editar módulo', `
      <div class="row2">
        <label class="field"><span>Nombre del módulo</span><input name="title" required value="${esc(m.title)}"></label>
        <label class="field"><span>Sección</span><input name="section" value="${esc(m.section)}" placeholder="opcional"></label>
      </div>
      <label class="field"><span>Etiquetas extra</span><input name="tags" value="${esc((m.tags || []).join(', '))}" placeholder="Claude, MCP, Ventas…">
        <span class="hint">Automáticas: ${[...new Set([...autoTags(m.section), ...autoTags(m.title)])].join(', ') || '—'}. Separa con comas.</span></label>
      ${isNew ? `<label class="field"><span>Lecciones</span><textarea name="lessons" placeholder="Una lección por línea"></textarea></label>` : ''}
      ${!isNew ? `<label class="field" style="flex-direction:row;align-items:center;gap:10px"><input type="checkbox" name="skipped" ${m.skipped ? 'checked' : ''} style="width:auto"> <span style="text-transform:none;letter-spacing:0;font-family:var(--sans);font-size:13px;color:var(--text)">Omitir este módulo (no lo voy a hacer; no cuenta en el progreso)</span></label>` : ''}
    `, fd => {
      const tags = fd.get('tags').split(',').map(s => s.trim()).filter(Boolean);
      if (isNew) {
        const nm = { id: `m-${uid()}`, section: fd.get('section').trim(), title: fd.get('title').trim(), kind: '', badge: '', tags, skipped: false, lessons: [], t: Date.now() };
        nm.lessons = (fd.get('lessons') || '').split('\n').map(s => s.trim()).filter(Boolean).map(t => ({ id: `l-${uid()}`, title: t, tags: [], done: false, doneAt: null, note: '' }));
        c.modules.push(nm); state.ui.open[nm.id] = true;
      } else {
        Object.assign(m, { title: fd.get('title').trim(), section: fd.get('section').trim(), tags, skipped: !!fd.get('skipped'), t: Date.now() });
      }
      commit();
    }, { extra: isNew ? '' : `<button type="button" class="btn danger left" data-action="delete-module" data-id="${m.id}">Eliminar</button><button type="button" class="btn ghost" data-action="all-done" data-id="${m.id}">✓ Marcar todo</button>` });
  }

  function lessonModal(l, m) {
    modal('Editar lección', `
      <label class="field"><span>Título</span><input name="title" required value="${esc(l.title)}"></label>
      <label class="field"><span>Etiquetas extra</span><input name="tags" value="${esc((l.tags || []).join(', '))}" placeholder="Claude, MCP…">
        <span class="hint">Heredadas y automáticas: ${[...new Set([...autoTags(m.section), ...autoTags(m.title), ...(m.tags || []), ...autoTags(l.title)])].join(', ') || '—'}</span></label>
      <div class="row2">
        <label class="field" style="flex-direction:row;align-items:center;gap:10px"><input type="checkbox" name="done" ${l.done ? 'checked' : ''} style="width:auto"> <span style="text-transform:none;letter-spacing:0;font-family:var(--sans);font-size:13px;color:var(--text)">Hecha</span></label>
        <label class="field"><span>Fecha (opcional)</span><input type="date" name="doneAt" value="${l.doneAt ? dayKey(l.doneAt) : ''}"></label>
      </div>
    `, fd => {
      l.title = fd.get('title').trim(); l.t = Date.now();
      l.tags = fd.get('tags').split(',').map(s => s.trim()).filter(Boolean);
      const d = fd.get('doneAt');
      l.done = !!fd.get('done') || !!d;
      l.doneAt = !l.done ? null : d ? new Date(d + 'T12:00').toISOString() : l.doneAt;
      commit();
    }, { extra: `<button type="button" class="btn danger left" data-action="delete-lesson" data-id="${l.id}">Eliminar</button>` });
  }

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 2200);
  }
  function commit() { tagCache.clear(); save(); render(); }

  // ---------- Eventos ----------
  const toggleIn = (arr, v) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

  document.addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (tab) { state.ui.view = tab.dataset.view; save(); render(); window.scrollTo({ top: 0 }); return; }
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const { action, id } = el.dataset;
    const u = state.ui;
    switch (action) {
      case 'toggle': {
        const { l } = findLesson(id);
        l.done = el.checked; l.doneAt = l.done ? new Date().toISOString() : null; l.t = Date.now();
        save(); setTimeout(render, l.done ? 220 : 0);
        return;
      }
      case 'toggle-note': u.open['note:' + id] = !u.open['note:' + id]; save(); render(); if (u.open['note:' + id]) $(`[data-note="${id}"]`)?.focus(); return;
      case 'filter-tag': e.stopPropagation(); u.tags = toggleIn(u.tags, el.dataset.tag); break;
      case 'filter-course': u.courses = toggleIn(u.courses, id); break;
      case 'status': u.status = el.dataset.v; break;
      case 'tagmode': u.tagMode = el.dataset.v; break;
      case 'kind': u.kinds = toggleIn(u.kinds, el.dataset.v); break;
      case 'hide-skipped': u.hideSkipped = !u.hideSkipped; break;
      case 'more-tags': u.showAllTags = !u.showAllTags; break;
      case 'clear': Object.assign(u, { courses: [], tags: [], status: 'all', kinds: [], search: '' }); break;
      case 'toggle-module': if (e.target.closest('.m-actions, .tag')) return; u.open[id] = !u.open[id]; break;
      case 'collapse-all': findCourse(id).modules.forEach(m => delete u.open[m.id]); break;
      case 'open-course': window.scrollTo({ top: 0 }); u.view = 'syllabus'; u.courses = [id]; { const cm = currentModule(findCourse(id)); if (cm) u.open[cm.id] = true; } break;
      case 'pin': { e.stopPropagation(); const { c, m } = findModule(id); c.currentModuleId = c.currentModuleId === m.id ? null : m.id; c.t = Date.now(); c.pinnedAt = c.currentModuleId ? Date.now() : 0; if (c.currentModuleId) toast(`📍 Estás en: ${m.title}`); break; }
      case 'add-course': courseModal(); return;
      case 'edit-course': courseModal(findCourse(id)); return;
      case 'add-module': moduleModal(id); return;
      case 'edit-module': { e.stopPropagation(); const { c, m } = findModule(id); moduleModal(c.id, m); return; }
      case 'edit-lesson': { const { m, l } = findLesson(id); lessonModal(l, m); return; }
      case 'all-done': { const { m } = findModule(id); const now = new Date().toISOString(); m.lessons.forEach(l => { if (!l.done) { l.done = true; l.doneAt = now; l.t = Date.now(); } }); closeModal(); break; }
      case 'delete-course': { const c = findCourse(id); if (!confirm(`¿Eliminar «${c.name}» y todo su progreso?`)) return; state.removed = [...(state.removed || []), c.id]; state.courses = state.courses.filter(x => x !== c); u.courses = u.courses.filter(x => x !== id); closeModal(); break; }
      case 'delete-module': { const { c, m } = findModule(id); if (!confirm(`¿Eliminar el módulo «${m.title}»?`)) return; state.removed = [...(state.removed || []), m.id]; c.modules = c.modules.filter(x => x !== m); closeModal(); break; }
      case 'delete-lesson': { const { m, l } = findLesson(id); if (!confirm(`¿Eliminar «${l.title}»?`)) return; state.removed = [...(state.removed || []), l.id]; m.lessons = m.lessons.filter(x => x !== l); closeModal(); break; }
      case 'export': exportData(); return;
      case 'goto': {
        const { c, m } = findLesson(id);
        Object.assign(u, { view: 'syllabus', search: '', courses: [c.id], tags: [], status: 'all', kinds: [] });
        if (m.skipped) u.hideSkipped = false;
        u.open[m.id] = true; save(); render();
        const el = document.querySelector(`[data-lesson="${id}"]`);
        if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('flash'); }
        return;
      }
      default: return;
    }
    commit();
  });

  let searchT;
  document.addEventListener('input', e => {
    if (e.target.dataset.input === 'search') {
      clearTimeout(searchT);
      const v = e.target.value;
      searchT = setTimeout(() => {
        state.ui.search = v; save(); tagCache.size > 5000 && tagCache.clear();
        renderView();
        renderSidebar();
      }, 160);
    }
    if (e.target.dataset.note) { const { l } = findLesson(e.target.dataset.note); l.note = e.target.value; l.t = Date.now(); save(); }
  });
  document.addEventListener('change', e => {
    if (e.target.dataset.note) render();
  });
  document.addEventListener('keydown', e => {
    const add = e.target.dataset?.addLesson;
    if (add && e.key === 'Enter' && e.target.value.trim()) {
      const { m } = findModule(add);
      m.lessons.push({ id: `l-${uid()}`, title: e.target.value.trim(), tags: [], done: false, doneAt: null, note: '', t: Date.now() });
      commit(); $(`[data-add-lesson="${add}"]`)?.focus();
    }
    if (e.key === 'Escape' && !$('#modal').hidden) closeModal();
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); $('.search')?.focus(); }
  });

  // ---------- Copias de seguridad ----------
  function exportData() {
    const blob = new Blob([JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `neural-track-${dayKey(new Date())}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  $('#importFile').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!Array.isArray(data.courses)) throw new Error('formato');
      if (!confirm('Esto sustituye todo lo que hay ahora por la copia. ¿Seguimos?')) return;
      state = migrate({ version: 1, seedVersion: data.seedVersion || 1, removed: data.removed || [], courses: data.courses, ui: Object.assign(defaultUI(), data.ui || {}) });
      commit(); toast('✔ Copia restaurada');
    } catch { alert('Ese archivo no es una copia válida de Neural Track.'); }
    e.target.value = '';
  });

  // ---------- Sincronización: el progreso vive en GitHub (repo privado) a través de /api ----------
  const KEY_STORE = 'neuraltrack:key';
  const syncKey = () => { try { return localStorage.getItem(KEY_STORE) || ''; } catch { return ''; } };
  let remoteSha = null, pushTimer = null, pushing = false, pendingPush = false;
  function pill(text, cls = '') { const p = $('#syncPill'); if (p) { p.textContent = text; p.className = `sync-pill ${cls}`; } }
  async function api(path, opts = {}) {
    const r = await fetch(path, { ...opts, headers: { 'content-type': 'application/json', authorization: `Bearer ${syncKey()}`, ...(opts.headers || {}) } });
    let data = null; try { data = await r.json(); } catch {}
    return { status: r.status, data };
  }
  function applyRemote(remote) {
    const merged = window.NTPlan.mergeStates(window.NTPlan.syncable(state), remote);
    state.courses = merged.courses; state.removed = merged.removed;
    tagCache.clear();
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {}
    return merged;
  }
  function explain(status, data) {
    if (status === 401) return pill('☁ clave incorrecta', 'bad');
    if (status === 503) return pill('☁ falta configurar el servidor', 'bad'), console.warn(data?.error);
    pill('☁ sin conexión', 'bad');
  }
  async function pull() {
    if (!syncKey()) return pill('☁ sin conectar', 'off');
    pill('☁ sincronizando…');
    try {
      const { status, data } = await api('/api/state');
      if (status !== 200) return explain(status, data);
      remoteSha = data.sha;
      if (!data.state) return push(); // primera vez: sube lo que hay aquí
      const merged = applyRemote(data.state);
      render();
      if (JSON.stringify(window.NTPlan.syncable(merged)) !== JSON.stringify(data.state)) return push();
      pill(`☁ al día ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`, 'ok');
    } catch { pill('☁ sin conexión', 'bad'); }
  }
  async function push() {
    if (!syncKey()) return;
    if (pushing) { pendingPush = true; return; }
    pushing = true; pill('☁ guardando…');
    try {
      for (let i = 0; i < 3; i++) {
        const { status, data } = await api('/api/state', { method: 'PUT', body: JSON.stringify({ state: window.NTPlan.syncable(state), sha: remoteSha }) });
        if (status === 200) { remoteSha = data.sha; pill(`☁ guardado ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`, 'ok'); break; }
        if (status === 409 && data) { remoteSha = data.sha; applyRemote(data.state); render(); continue; } // otro dispositivo guardó antes: mezclar y reintentar
        explain(status, data); break;
      }
    } catch { pill('☁ sin conexión', 'bad'); }
    pushing = false;
    if (pendingPush) { pendingPush = false; push(); }
  }
  window.__ntSchedulePush = () => { if (!syncKey()) return; clearTimeout(pushTimer); pill('☁ cambios sin guardar…'); pushTimer = setTimeout(push, 1500); };
  function syncSettings() {
    modal('Sincronizar con GitHub', `
      <p style="margin:0;color:var(--muted)">Con la clave, tu progreso se guarda en tu repo privado de datos de GitHub: lo ves igual en el Mac y en el móvil, y Hermes sabe qué te toca cada día. Es la misma clave <b>NT_KEY</b> que pusiste en Vercel.</p>
      <label class="field"><span>Clave</span><input name="key" type="password" autocomplete="current-password" value="${esc(syncKey())}" placeholder="Tu NT_KEY"></label>
    `, fd => {
      try { localStorage.setItem(KEY_STORE, (fd.get('key') || '').trim()); } catch {}
      pull();
    });
  }
  document.addEventListener('click', e => { if (e.target.closest('[data-action="sync-settings"]')) { e.stopPropagation(); syncSettings(); } }, true);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pull(); });

  { const v = new URLSearchParams(location.search).get('v'); if (['hoy', 'today', 'syllabus', 'log'].includes(v)) state.ui.view = v; }
  render();
  pull();
})();
