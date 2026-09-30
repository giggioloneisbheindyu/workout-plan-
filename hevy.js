/**
 * POST /api/hevy
 * Body: { title, start_time, end_time, exercises: [{ name, notes, sets: [{ weight_kg, reps, rpe, type }] }] }
 * Requires env HEVY_API_KEY (Hevy Pro → hevy.com/settings?developer)
 */
const HEVY = 'https://api.hevyapp.com/v1';

async function hevyFetch(path, { method = 'GET', body, apiKey } = {}) {
  const res = await fetch(HEVY + path, {
    method,
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error((data && (data.error || data.message)) || text || res.statusText);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/** Scarica template esercizi (paginati) e costruisce indice nome → id */
async function loadTemplates(apiKey) {
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const data = await hevyFetch(`/exercise_templates?page=${page}&pageSize=100`, { apiKey });
    const list = data.exercise_templates || data.templates || data || [];
    if (!Array.isArray(list) || !list.length) break;
    all.push(...list);
    if (list.length < 100) break;
  }
  return all;
}

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Mapping parole chiave IT/EN → preferenza su titolo template Hevy */
const HINTS = [
  { keys: ['squat', 'back squat'], prefer: ['barbell squat', 'squat (barbell)', 'squat'] },
  { keys: ['panca paralimpica', 'paralimpica'], prefer: ['bench press', 'pause bench'] },
  { keys: ['panca', 'bench'], prefer: ['bench press (barbell)', 'barbell bench press', 'bench press'] },
  { keys: ['stacco sumo', 'sumo'], prefer: ['sumo deadlift'] },
  { keys: ['stacco', 'deadlift', 'regular'], prefer: ['deadlift (barbell)', 'conventional deadlift', 'deadlift'] },
  { keys: ['rdl', 'romanian'], prefer: ['romanian deadlift', 'barbell romanian deadlift'] },
  { keys: ['hip thrust'], prefer: ['hip thrust'] },
  { keys: ['affondi bulgari', 'bulgarian'], prefer: ['bulgarian split squat'] },
  { keys: ['affondi', 'lunge'], prefer: ['lunge', 'walking lunge'] },
  { keys: ['military', 'overhead press', 'lento avanti'], prefer: ['overhead press', 'military press'] },
  { keys: ['lat machine', 'lat pulldown'], prefer: ['lat pulldown'] },
  { keys: ['rematore', 'row'], prefer: ['barbell row', 'bent over row'] },
  { keys: ['curl', 'bicipiti'], prefer: ['bicep curl', 'barbell curl', 'dumbbell curl'] },
  { keys: ['tricipiti', 'pushdown', 'vulken'], prefer: ['triceps pushdown', 'cable pushdown'] },
  { keys: ['alzate laterali', 'lateral'], prefer: ['lateral raise'] },
  { keys: ['alzate frontali', 'front raise'], prefer: ['front raise'] },
  { keys: ['alzate posteriori', 'rear delt'], prefer: ['rear delt', 'reverse fly'] },
  { keys: ['polpacci', 'calf'], prefer: ['calf raise'] },
  { keys: ['leg curl', 'curl gamba'], prefer: ['leg curl', 'lying leg curl', 'seated leg curl'] },
  { keys: ['leg extension', 'leg ext'], prefer: ['leg extension'] },
  { keys: ['plank', 'copenaghen'], prefer: ['plank'] },
  { keys: ['leg raises', 'alzate gambe'], prefer: ['hanging leg raise', 'leg raise'] },
  { keys: ['chest press'], prefer: ['chest press', 'machine chest press'] },
  { keys: ['hammer'], prefer: ['hammer curl'] },
];

function findTemplateId(name, templates) {
  const n = norm(name);
  if (!n) return null;

  // 1) match esatto
  for (const t of templates) {
    if (norm(t.title) === n) return t.id;
  }

  // 2) hints
  for (const h of HINTS) {
    if (h.keys.some(k => n.includes(k))) {
      for (const pref of h.prefer) {
        const hit = templates.find(t => norm(t.title).includes(pref));
        if (hit) return hit.id;
      }
    }
  }

  // 3) ogni parola significativa del nome compare nel titolo
  const words = n.split(' ').filter(w => w.length > 3);
  if (words.length) {
    let best = null, bestScore = 0;
    for (const t of templates) {
      const tn = norm(t.title);
      let score = 0;
      for (const w of words) if (tn.includes(w)) score++;
      if (score > bestScore) { bestScore = score; best = t; }
    }
    if (best && bestScore >= Math.min(2, words.length)) return best.id;
  }

  // 4) fallback: primo template che contiene la prima parola lunga
  if (words[0]) {
    const hit = templates.find(t => norm(t.title).includes(words[0]));
    if (hit) return hit.id;
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.HEVY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'HEVY_API_KEY non configurata. Aggiungila in Vercel → Settings → Environment Variables (Hevy Pro → hevy.com/settings?developer).',
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { title, start_time, end_time, exercises } = body || {};
    if (!title || !start_time || !end_time || !Array.isArray(exercises) || !exercises.length) {
      return res.status(400).json({ error: 'Payload incompleto: title, start_time, end_time, exercises[]' });
    }

    const templates = await loadTemplates(apiKey);
    const hevyExercises = [];
    const unmatched = [];

    for (const ex of exercises) {
      const id = findTemplateId(ex.name, templates);
      if (!id) {
        unmatched.push(ex.name);
        continue;
      }
      const sets = (ex.sets && ex.sets.length)
        ? ex.sets.map(s => ({
            type: s.type || 'normal',
            weight_kg: s.weight_kg != null && s.weight_kg !== '' ? Number(s.weight_kg) : null,
            reps: s.reps != null && s.reps !== '' ? Number(s.reps) : null,
            rpe: s.rpe != null && s.rpe !== '' ? Number(s.rpe) : null,
          }))
        : [{ type: 'normal', weight_kg: null, reps: null, rpe: null }];

      hevyExercises.push({
        exercise_template_id: id,
        notes: ex.notes || null,
        sets,
      });
    }

    if (!hevyExercises.length) {
      return res.status(400).json({
        error: 'Nessun esercizio mappato su Hevy. Controlla i nomi o aggiungi esercizi custom su Hevy.',
        unmatched,
      });
    }

    const workout = await hevyFetch('/workouts', {
      method: 'POST',
      apiKey,
      body: {
        workout: {
          title: String(title).slice(0, 120),
          description: unmatched.length
            ? 'Non mappati: ' + unmatched.join(', ')
            : null,
          start_time,
          end_time,
          is_private: false,
          exercises: hevyExercises,
        },
      },
    });

    return res.status(200).json({
      ok: true,
      workout_id: workout.id || workout.workout?.id,
      sent: hevyExercises.length,
      unmatched,
    });
  } catch (err) {
    console.error('hevy error', err.status, err.message, err.data);
    return res.status(err.status || 500).json({
      error: err.message || 'Errore Hevy',
      details: err.data || null,
    });
  }
}
