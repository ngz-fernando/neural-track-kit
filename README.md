# 🧠 Neural Track

**Un registro de todo lo que estás aprendiendo y un agente que te dice cada día qué vídeo toca.**

Tienes varios cursos, un máster, una comunidad… y cada vez que te sientas a formarte, lo primero
es decidir qué ver. Neural Track te quita esa decisión:

- 📚 **Todos tus cursos en un sitio**, con checklist por lección, notas y progreso.
- 🔎 **Buscador** que encuentra el vídeo aunque lo escribas mal; **filtros por tema** (Claude Code,
  n8n, OpenClaw…) que mezclan cursos.
- 🌅 **Plan diario**: por la mañana N vídeos de tu prioridad, por la tarde otros N de otro tema.
  Sigue tu rastro: continúa desde el último vídeo que marcaste, no desde el principio.
- 🤖 **Tu agente (Hermes) te lo manda por Telegram**. Contestas «hecho» y se marca. Si le dices
  «he visto el de instalar Claude Code», lo busca y lo marca.
- ☁️ **Tu progreso en un repo privado de tu GitHub**: cada check es un commit (copia de
  seguridad gratis) y se sincroniza entre el ordenador y el móvil.

Sin n8n ni base de datos: una web estática en Vercel + 5 funciones + GitHub.

## Montarlo (10-20 min)

Necesitas [Claude Code](https://claude.com/claude-code), una cuenta de
[Vercel](https://vercel.com) y una de [GitHub](https://github.com) (gratis).

```bash
gh repo create neural-track --template ngz-fernando/neural-track-kit --private --clone
cd neural-track
claude
```

Y dentro de Claude Code:

```
/montar-neural-track
```

La skill te pregunta qué estás estudiando y cómo quieres repartirlo, mete tus temarios, publica
la app y te da el mensaje para Hermes. Las claves las pegas tú en Vercel: nunca pasan por el chat
ni por el código.

## Cómo está hecho

```
public/            la app (HTML + JS, sin build)
  config.mjs       ⚙️ tu horario: zona, horas, cuántos vídeos, qué curso cada día
  plan.mjs         plan del día y fusión entre dispositivos (lo usan la app y la API)
  seed.js          generado desde cursos/*.txt
cursos/*.txt       un archivo por curso (formato en scripts/build-seed.mjs)
api/               funciones de Vercel: hoy, hecho, buscar, resumen, state
docs/hermes.md     mensaje para tu agente y referencia de la API
```

Variables en Vercel: `GITHUB_TOKEN` (fine-grained, solo tu repo de datos, Contents read/write),
`NT_KEY` (tu clave) y `NT_DATA_REPO` (`usuario/neural-track-data`).

## Seguridad

- La app pública solo enseña tus cursos; el **progreso** exige tu clave.
- El token de GitHub solo puede tocar tu repo de datos.
- Si tus temarios son de cursos de pago, deja tu repo de código **privado**.

Hecho por [@ngz-fernando](https://github.com/ngz-fernando) con Claude Code. Licencia MIT.
