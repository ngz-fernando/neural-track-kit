# Mensaje para Hermes

Pégalo en tu chat con Hermes (Telegram) cambiando `https://TU-APP.vercel.app` por tu URL.
**No pongas tu clave en el mensaje**: Hermes te dirá cómo guardarla como secreto.

```
Hola Hermes. Ayúdame a cumplir mi plan de estudio.

Primero guarda mi clave de Neural Track como secreto en tu servidor con el nombre NEURAL_TRACK_KEY
y dime cómo te la paso sin dejarla en el chat. Úsala siempre en la cabecera
Authorization: Bearer $NEURAL_TRACK_KEY

Crea dos crons en mi zona horaria (<TU ZONA, ej. Europe/Madrid>):
1) A las <HORA MAÑANA>: GET https://TU-APP.vercel.app/api/hoy?bloque=manana
   Envíame el campo "text" tal cual y guarda "ids" como «último plan».
2) A las <HORA TARDE>: lo mismo con bloque=tarde.

Cuando te diga «hecho»: POST https://TU-APP.vercel.app/api/hecho con {"ids": [...]} del último plan.
Si digo «hecho 1 y 3», solo esas posiciones. Respóndeme con el campo "message".

Cuando te diga con mis palabras qué he visto («he visto el de instalar Claude Code»):
GET https://TU-APP.vercel.app/api/buscar?q=<lo que he dicho>
- Un resultado claro → márcalo con /api/hecho y dime cuál.
- Varios → enséñamelos numerados y pregúntame.
- Ninguno → dímelo y no marques nada.

Cuando te pregunte «¿por dónde voy?»: GET https://TU-APP.vercel.app/api/resumen y mándame "text".

Si algo devuelve error, dímelo tal cual. Si tu servidor está en otra zona horaria, ajusta los crons.
Antes de crear nada, prueba la URL de la mañana y enséñame lo que devuelve. Luego dime cómo se llaman los crons.
```

## API

Todas piden `Authorization: Bearer <NT_KEY>`.

| Ruta | Para qué |
|---|---|
| `GET /api/hoy?bloque=manana\|tarde` | El plan de ahora: `{ text, ids, items }` |
| `POST /api/hecho` `{ ids }` | Marca lecciones como vistas |
| `GET /api/buscar?q=` | Busca lecciones por lo que dices |
| `GET /api/resumen` | «¿Por dónde voy?» |
| `GET/PUT /api/state` | Lo usa la app para sincronizar |
