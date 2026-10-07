---
name: montar-neural-track
description: Monta la app de estudio Neural Track para esta persona, con lo que sea que esté estudiando - asignaturas de la universidad, cursos online, másters, academias, listas de YouTube, libros u oposiciones. La entrevista, le pide cada curso por enlace, PDF, capturas o a mano, lo mete todo con lo que ya ha visto, define su plan diario, publica la app en su Vercel con el progreso en un repo privado de su GitHub y, si quiere, conecta su agente Hermes para que le mande cada día por Telegram lo que le toca. Úsalo SIEMPRE que el usuario invoque "/montar-neural-track", o diga "monta mi app de estudio", "añade un curso", "mete esta asignatura", "quiero llevar el registro de lo que estudio", "conecta Hermes", aunque no diga el nombre.
---

# Montar Neural Track

Neural Track = la app de estudio de cada persona: todo lo que está aprendiendo (la uni, cursos
online, YouTube, libros…) con su checklist, buscador y un plan diario («hoy toca esto»).
Opcional: su agente Hermes le manda el plan por Telegram y al contestar «hecho» se marca.

Tu trabajo: **entrevistar a la persona y dejárselo funcionando**. Habla en su idioma, de tú,
con frases cortas. Una pregunta (o un bloque pequeño de preguntas) cada vez.

## Reglas de seguridad (no negociables)

- **Nunca escribas claves ni tokens en archivos, en el chat ni en commits.** El token de GitHub
  y la clave de la app los pega la persona en el comando `vercel env add`, que los guarda como
  *Sensitive*. Tú solo lanzas el comando.
- No pidas la contraseña de ningún campus. Si hay que leer un temario de una web con login, se
  hace desde **su** navegador con su sesión abierta (Claude in Chrome), o la persona copia y pega.
- El repo de **datos** es siempre **privado**. Antes de cualquier `git push` de este repo,
  comprueba con `git grep -nE "github_pat_|gho_|ghp_|sk-|NT_KEY=|GITHUB_TOKEN="` que no hay secretos.
- Los temarios de cursos de pago son de sus escuelas: se quedan en el repo de la persona; si su
  repo de código es público, recomiéndale hacerlo privado (`gh repo edit --visibility private`).

## Paso 0 · Comprobar herramientas

`node -v` (≥ 20), `gh auth status`, `vercel whoami`. Si falta algo, explica cómo instalarlo
(`npm i -g vercel`, `brew install gh`) y que haga login (`gh auth login`, `vercel login`).
El login lo hace la persona.

## Paso 1 · Entrevista: qué estás aprendiendo

Empieza así: «Vamos a montar tu app de estudio. Cuéntame qué estás estudiando ahora: puede ser
la uni, cursos online, un máster, una academia, listas de YouTube, libros… lo que sea».
Luego, en este orden:
1. **La lista de cosas** que estudia. Para cada una: nombre y de dónde sale (universidad,
   plataforma, canal, libro).
2. **Prioridad**: qué va primero (por la mañana) y qué deja para la tarde o para un día suelto.
3. **Zona horaria** (pregunta la ciudad) y **horas** de estudio (propón 07:30 y 18:00).
4. **Cuánto por bloque** (propón 3 lecciones por la mañana y 2 por la tarde: mejor poco y todos
   los días) y **qué día descansa** (propón el domingo).

## Paso 2 · Meter cada curso (por enlace, PDF, capturas o a mano)

Por cada curso pregúntale: «¿Cómo me lo pasas? Un **enlace**, un **PDF** o foto del temario,
**capturas** o me lo **escribes/pegas** tal cual». Y **qué ha visto ya** de ese curso.
Según lo que dé:
- **Enlace público** (página del curso, programa de la asignatura, índice de un libro): ábrelo
  con WebFetch y saca módulos y lecciones. WebFetch resume: si solo te da el índice (temas sin
  clases), entra en cada subpágina o descarga el HTML con `curl` y saca los títulos de ahí.
  Revisa que ningún título salga cortado (pasa con fórmulas y símbolos).
- **Lista de YouTube**: pídele la URL de la lista. WebFetch no ve los títulos (YouTube carga
  por JavaScript), así que usa directamente `yt-dlp --flat-playlist --print "%(title)s" <url>`.
  Si no está instalado, propón `brew install yt-dlp` (o `pip install yt-dlp`); si no quiere,
  que pegue los títulos.
- **Campus con login** (Moodle, Udemy, Skool, Thinkific, Hotmart…): **nunca pidas su
  contraseña**. Si tienes Claude in Chrome y tiene la sesión abierta, léelo desde su navegador
  (muchos campus marcan lo visto: cópialo como `[x] `). Si no, que copie y pegue la lista.
- **PDF, foto o capturas** del temario: léelos y transcribe.
- **A mano**: que te dicte o pegue la lista; tú la ordenas en módulos.
- **Universidad**: los «módulos» son los temas; las «lecciones», clases, prácticas, ejercicios
  y exámenes. Pregunta las fechas de examen y añádelas como lección con la fecha completa
  («Examen parcial · 12/11/2026»): el plan avisa «📅 Faltan N días» las dos semanas anteriores.
- Un módulo necesita al menos una lección: si un capítulo no tiene apartados, pon el propio
  capítulo como lección.

Escribe un archivo `cursos/<id>.txt` por curso con el formato de `scripts/build-seed.mjs`
(`@id`, `@nombre`, `@plataforma`, `@tipo`, `@color`, `## sección`, `# módulo`, una lección por
línea, `[x] ` delante de lo ya visto). **Borra los `cursos/ejemplo-*.txt`.**

Comprueba siempre el total: «He contado N lecciones y M vistas, ¿cuadra?». Si algo no se pudo
leer, dilo; no inventes lecciones. Luego `node scripts/build-seed.mjs` y enséñale el resumen.

Si después quiere **añadir otro curso**, repite este paso (o que use «+ Curso» en la app, que
acepta el mismo formato pegado).

## Paso 3 · Su plan

Rellena `public/config.mjs` (sustituye los valores de ejemplo): `TZ`, `TIMES`, `COUNTS`,
`SCHEDULE` (qué `@id` toca cada día; si pones dos, cuando se acaba el primero pasa al segundo),
`LABEL` (nombre corto de cada curso), `NEWEST_FIRST` si algún curso tiene una sección de
directos que conviene ver de más reciente a más antiguo, y `TAGS`: 3-8 temas de SUS estudios
para los filtros (p. ej. `['Derivadas', 'derivad|derivative', '#4f8bff']`).
Enséñale la semana en una tabla y que la confirme.

El plan **sigue su rastro**: cada curso continúa después del último vídeo que marque (no en
orden desde el principio); lo que se salte sale al final con aviso. Con 📍 en un módulo puede
decir «quiero empezar aquí».

## Paso 4 · Publicar

1. Repo de código en su GitHub. El clon todavía apunta a la plantilla y sus cursos no están
   en ningún commit, así que primero:
   `git remote remove origin && git add -A && git commit -m "Mis cursos"`
   y después `gh repo create <usuario>/neural-track --private --source=. --push`.
2. Repo de datos, **privado**: `gh repo create <usuario>/neural-track-data --private --add-readme`.
3. App en Vercel: `vercel deploy --prod --yes`. Anota la URL y ponla en `APP_URL` de
   `config.mjs`; vuelve a publicar.
4. Variables en Vercel. `vercel env add` es interactivo y **no funciona desde tu Bash**: dile
   que lo escriba él en el prompt de Claude Code con `!` delante (por ejemplo
   `! vercel env add NT_KEY production`) o en una terminal dentro de la carpeta, y que pegue el
   valor cuando se lo pida:
   - `vercel env add NT_DATA_REPO production` → `<usuario>/neural-track-data` (esto sí puedes
     decirle qué escribir).
   - `vercel env add GITHUB_TOKEN production` → token *fine-grained* que crea él:
     GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token ·
     Repository access: «Only select repositories» → `neural-track-data` ·
     Permissions → «+ Add permissions» → **Contents** → cambia «Read-only» a **Read and write** ·
     **Expiration: 1 año o sin caducidad** (por defecto caduca a los 30 días y la app dejaría de
     guardar sin avisar; que apunte la fecha).
   - `vercel env add NT_KEY production` → una contraseña que se invente él (será la clave de
     la app y de su agente). Que no te la diga.
5. `vercel deploy --prod --yes` otra vez para que coja las variables. Comprueba:
   `curl -s <URL>/api/state` debe responder `Clave incorrecta` (401). Si dice «Falta …», falta
   esa variable.
6. Que abra la app, pulse **☁** y escriba su clave: el botón debe quedar en verde «guardado».
   Comprueba con `gh api repos/<usuario>/neural-track-data/commits` que llegó el primer commit.

## Paso 5 · (Opcional) Conectar Hermes

Pregúntale: «¿Quieres que tu agente Hermes te mande por Telegram lo que toca cada mañana y
cada tarde?». Si no tiene Hermes o no quiere, sáltate este paso: la pestaña **Hoy** de la app ya
le dice qué toca. Si quiere:

Dale el mensaje de `docs/hermes.md` con todo rellenado: su URL (`APP_URL`), su zona (`TZ`) y
sus horas (`TIMES`) de config.mjs. Si algún día cambia las horas, hay que decírselo a Hermes:
los crons no se actualizan solos. Hermes debe buscar con las palabras del temario (si el curso
está en inglés y el usuario habla en español, que traduzca la búsqueda). Explícale que **la clave no la pegue
en ese mensaje**: que Hermes la guarde como secreto `NEURAL_TRACK_KEY` en su servidor (Hermes le
dirá cómo). Hermes prueba la URL, le enseña el plan de hoy y crea los dos crons.
Prueba final: que le pida «mándame ya el plan de la tarde» y conteste «hecho 1».

## Paso 6 · Cierre

Resume en 4 líneas: URL de la app (que la guarde en el móvil como acceso directo), su semana,
cómo marcar (en la app o, con Hermes, contestando «hecho») y cómo añadir un curso nuevo
(`/montar-neural-track` otra vez o «+ Curso» en la app).
