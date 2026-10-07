// ⚙️ Tu horario. Es lo único que tienes que tocar para adaptar el plan a ti
// (la skill /montar-neural-track lo rellena contigo).

// Zona horaria donde vives: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
export const TZ = 'Europe/Madrid';

// Hora a la que te llega cada aviso (solo informativa en la app; los crons los crea tu agente).
export const TIMES = { manana: '07:30', tarde: '18:00' };

// Cuántos vídeos por bloque. Mejor pocos y todos los días que muchos y saltárselo.
export const COUNTS = { manana: 3, tarde: 2 };

// Qué curso toca cada día (0 = domingo … 6 = sábado). Usa el id de tus cursos (el @id de cursos/*.txt).
// Si pones varios, cuando el primero se acaba pasa al siguiente. Sin entrada = descanso.
export const SCHEDULE = {
  manana: { 1: ['ejemplo'], 2: ['ejemplo'], 3: ['ejemplo'], 4: ['ejemplo'], 5: ['ejemplo'], 6: ['ejemplo'] },
  tarde: {},
};

// Nombre corto que sale en el aviso para cada curso.
export const LABEL = { ejemplo: 'Curso de ejemplo' };

// Cursos con directos/sesiones que conviene ver de más reciente a más antiguo
// (id del curso → nombre de la sección donde están). Opcional.
export const NEWEST_FIRST = {};

// URL pública de tu app (para el enlace del aviso). La skill la rellena al publicar.
export const APP_URL = 'https://TU-APP.vercel.app';
