// Convierte cursos/*.txt en public/seed.js. Uso: node scripts/build-seed.mjs
//
// Formato de cada archivo (uno por curso):
//   @id ia-master            ← identificador corto, sin espacios (se usa en config.mjs)
//   @nombre Máster de IA
//   @plataforma Mi escuela
//   @tipo master             ← master · curso · comunidad · bootcamp · libro · otro
//   @color #00e5ff
//   @url https://…
//   ## Sección               ← opcional, agrupa módulos
//   # Módulo
//   Lección
//   [x] Lección ya vista
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40);

const dir = new URL('../cursos/', import.meta.url);
const courses = [];
for (const file of readdirSync(dir).filter(f => f.endsWith('.txt')).sort()) {
  const c = { id: slug(file.replace(/\.txt$/, '')), name: file.replace(/\.txt$/, ''), provider: '', type: 'curso', color: '#00e5ff', url: '', currentModuleId: null, modules: [] };
  const ids = new Set();
  const once = id => { let k = id, n = 2; while (ids.has(k)) k = `${id}-${n++}`; ids.add(k); return k; };
  let sec = '', mod = null;
  for (const raw of readFileSync(new URL(file, dir), 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('//')) continue;
    const meta = line.match(/^@(\w+)\s+(.*)$/);
    if (meta) {
      const [, k, v] = meta;
      const map = { id: 'id', nombre: 'name', plataforma: 'provider', tipo: 'type', color: 'color', url: 'url' };
      if (map[k]) c[map[k]] = k === 'id' ? slug(v) : v.trim();
      continue;
    }
    if (line.startsWith('## ')) { sec = line.slice(3).trim(); continue; }
    if (line.startsWith('# ')) {
      const title = line.slice(2).trim();
      mod = { id: once(`${c.id}--${slug(sec)}--${slug(title)}`), section: sec, title, kind: '', badge: '', tags: [], skipped: false, lessons: [] };
      c.modules.push(mod); continue;
    }
    if (!mod) { mod = { id: once(`${c.id}--general`), section: sec, title: 'General', kind: '', badge: '', tags: [], skipped: false, lessons: [] }; c.modules.push(mod); }
    const done = line.startsWith('[x] ');
    const title = done ? line.slice(4).trim() : line.replace(/^[-*•]\s*/, '');
    mod.lessons.push({ id: once(`${mod.id}--${slug(title) || 'leccion'}`), title, tags: [], done, doneAt: null, note: '' });
  }
  const n = c.modules.reduce((a, m) => a + m.lessons.length, 0);
  console.log(`✔ ${c.name} (${c.id}): ${c.modules.length} módulos · ${n} lecciones · ${c.modules.reduce((a, m) => a + m.lessons.filter(l => l.done).length, 0)} vistas`);
  courses.push(c);
}
const version = createHash('sha1').update(JSON.stringify(courses)).digest('hex').slice(0, 10);
writeFileSync(new URL('../public/seed.js', import.meta.url),
  `// Generado por scripts/build-seed.mjs a partir de cursos/*.txt — no editar a mano\n` +
  `window.SEED_VERSION = '${version}';\nwindow.SEED_RETIRED = [];\nwindow.SEED_COURSES = ${JSON.stringify(courses)};\n`);
