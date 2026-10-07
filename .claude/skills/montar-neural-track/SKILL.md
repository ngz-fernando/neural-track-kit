---
name: montar-neural-track
description: Monta Neural Track para esta persona - entrevista qué está estudiando (cursos, másters, comunidades, YouTube, libros), mete sus temarios y lo que ya ha visto, define su plan diario (qué curso cada mañana y cada tarde, cuántos vídeos, zona horaria), publica la app en su Vercel con el progreso guardado en un repo privado de su GitHub y le da el mensaje para que su agente Hermes le mande cada día por Telegram lo que le toca. Úsalo SIEMPRE que el usuario invoque "/montar-neural-track", o diga "monta mi neural track", "quiero mi registro de estudio", "añade mis cursos", "configura el plan diario", "conecta Hermes", aunque no diga el nombre.
---

# Montar Neural Track

Neural Track = un registro de todo lo que la persona está aprendiendo + un plan diario que su
agente (Hermes) le manda por Telegram: «hoy toca este vídeo». Contesta «hecho» y se marca.

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

Pregunta, en este orden:
1. **Qué está estudiando ahora**: cursos, másters, comunidades (Skool…), canales de YouTube,
   libros. Para cada uno: nombre, plataforma y tipo.
2. **Cuál es su prioridad** (lo que va primero por la mañana) y qué deja para la tarde o para
   un día suelto.
3. **Su zona horaria** (ciudad) y **a qué horas** quiere los avisos (propón 07:30 y 18:00).
4. **Cuántos vídeos por bloque** (propón 3 por la mañana y 2 por la tarde: mejor pocos y todos
   los días). Qué día descansa (propón domingo).

## Paso 2 · Meter los temarios

Por cada curso, un archivo `cursos/<id>.txt` con el formato que explica
`scripts/build-seed.mjs` (`@id`, `@nombre`, `@plataforma`, `@tipo`, `@color`, `## sección`,
`# módulo`, una lección por línea, `[x] ` delante de lo ya visto). Borra `cursos/ejemplo.txt`.

Formas de conseguir el temario, de más fácil a más trabajosa:
- **Lo pega**: que copie la lista de lecciones del campus. Tú la ordenas en módulos.
- **Desde su navegador** (si tienes Claude in Chrome y él tiene la sesión iniciada): abre el
  campus, lee la lista de lecciones y, si el campus marca lo visto, cópialo como `[x] `.
  Muchos campus (Thinkific, por ejemplo) tienen una API interna que da el temario y lo
  completado con fecha: úsala si está, siempre desde su sesión.
- **Capturas**: si manda capturas, transcríbelas.

Comprueba siempre el total: «He contado N lecciones y M vistas, ¿cuadra con tu campus?».
Si el campus da un número distinto, dilo y pregunta, no inventes.

Luego: `node scripts/build-seed.mjs`.

## Paso 3 · Su plan

Rellena `public/config.mjs`: `TZ`, `TIMES`, `COUNTS`, `SCHEDULE` (qué `@id` toca cada día; si
pones dos, cuando se acaba el primero pasa al segundo), `LABEL` y `NEWEST_FIRST` si algún curso
tiene una sección de directos que conviene ver de más reciente a más antiguo.
Enséñale la semana en una tabla y que la confirme.

El plan **sigue su rastro**: cada curso continúa después del último vídeo que marque (no en
orden desde el principio); lo que se salte sale al final con aviso. Con 📍 en un módulo puede
decir «quiero empezar aquí».

## Paso 4 · Publicar

1. Repo de código en su GitHub: `gh repo create <usuario>/neural-track --private --source=. --push`.
2. Repo de datos, **privado**: `gh repo create <usuario>/neural-track-data --private --add-readme`.
3. App en Vercel: `vercel deploy --prod --yes`. Anota la URL y ponla en `APP_URL` de
   `config.mjs`; vuelve a publicar.
4. Variables en Vercel (lánzale cada comando en su terminal; **él** pega el valor):
   - `vercel env add NT_DATA_REPO production` → `<usuario>/neural-track-data` (esto sí puedes
     decirle qué escribir).
   - `vercel env add GITHUB_TOKEN production` → token *fine-grained* que crea él:
     GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token ·
     Repository access: «Only select repositories» → `neural-track-data` ·
     Permissions → «+ Add permissions» → **Contents** → cambia «Read-only» a **Read and write**.
   - `vercel env add NT_KEY production` → una contraseña que se invente él (será la clave de
     la app y de su agente). Que no te la diga.
5. `vercel deploy --prod --yes` otra vez para que coja las variables. Comprueba:
   `curl -s <URL>/api/state` debe responder `Clave incorrecta` (401). Si dice «Falta …», falta
   esa variable.
6. Que abra la app, pulse **☁** y escriba su clave: el botón debe quedar en verde «guardado».
   Comprueba con `gh api repos/<usuario>/neural-track-data/commits` que llegó el primer commit.

## Paso 5 · Conectar Hermes

Dale el mensaje de `docs/hermes.md` con su URL ya puesta. Explícale que **la clave no la pegue
en ese mensaje**: que Hermes la guarde como secreto `NEURAL_TRACK_KEY` en su servidor (Hermes le
dirá cómo). Hermes prueba la URL, le enseña el plan de hoy y crea los dos crons.
Prueba final: que le pida «mándame ya el plan de la tarde» y conteste «hecho 1».

## Paso 6 · Cierre

Resume en 4 líneas: URL de la app, su semana, cómo marcar («hecho», contárselo con sus
palabras, o en la app) y cómo añadir un curso nuevo (`/montar-neural-track` otra vez o
«+ Curso» en la app).
