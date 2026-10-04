const KEY = 'powerapp_v1', AC = ['#e5484d', '#3e8bff', '#e08a00', '#30a46c'], LN = { s: 'Squat', b: 'Panca', d: 'Stacco' };
let S = {};
try { S = JSON.parse(localStorage.getItem(KEY)) || {} } catch (e) { }
S.max = S.max || { s: 210, b: 110, d: 265 }; S.done = S.done || {}; S.chk = S.chk || {}; S.wi = S.wi || 0; S.view = S.view || 'oggi'; S.time = S.time || '17:00'; S.pushOn = S.pushOn || false; S.weekLog = S.weekLog || {}; S.promptedDate = S.promptedDate || null; S.dayModal = S.dayModal || null; S.accLog = S.accLog || {}; S.liftHistory = S.liftHistory || {}; S.restByEx = S.restByEx || {}; S.restDefault = S.restDefault || 120; S.restPicker = S.restPicker || null; S.workoutLog = S.workoutLog || []; S.progCatalog = S.progCatalog || [];
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)) } catch (e) { } };
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = n => String(n).padStart(2, '0');
const dstr = (d = new Date()) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());

/** Meta scheda + catalogo (storico per scheda) */
function ensureProgMeta(prog, fileName) {
  if (!prog) return prog;
  if (fileName) {
    const raw = String(fileName).trim();
    let fn = raw;
    if (!/\.docx$/i.test(fn)) fn = fn + '.docx';
    prog.fileName = fn;
    prog.name = fn.replace(/\.docx$/i, '');
  }
  if (!prog.name) {
    const first = prog.weeks && prog.weeks[0] && prog.weeks[0].label;
    prog.name = first ? String(first).replace(/\s+/g, ' ').trim() : 'Scheda';
  }
  if (!prog.fileName) {
    prog.fileName = /\.docx$/i.test(prog.name) ? prog.name : (prog.name + '.docx');
  }
  // Riusa l'id se questa scheda (stesso file .docx) era già in catalogo/storico
  const fnKey = String(prog.fileName).toLowerCase();
  const nameKey = String(prog.name).toLowerCase();
  const catalog = S.progCatalog || [];
  let known = catalog.find(p => p.fileName && String(p.fileName).toLowerCase() === fnKey);
  if (!known) known = catalog.find(p => p.name && String(p.name).toLowerCase() === nameKey);
  // oppure già usata nello storico
  if (!known) {
    const fromLog = (S.workoutLog || []).find(w =>
      (w.progFileName && String(w.progFileName).toLowerCase() === fnKey) ||
      (w.progName && String(w.progName).toLowerCase() === nameKey)
    );
    if (fromLog && fromLog.progId) {
      known = { id: fromLog.progId, name: fromLog.progName, fileName: fromLog.progFileName || prog.fileName };
    }
  }
  if (known && known.id) {
    prog.id = known.id;
    if (known.name) prog.name = known.name;
    if (known.fileName) prog.fileName = known.fileName;
  } else if (!prog.id) {
    prog.id = 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  return prog;
}
function displayProgFileName(progLike) {
  if (!progLike) return 'Scheda.docx';
  if (progLike.fileName) return progLike.fileName;
  if (progLike.name) {
    return /\.docx$/i.test(progLike.name) ? progLike.name : (progLike.name + '.docx');
  }
  return 'Scheda.docx';
}
function snapshotProg(prog) {
  if (!prog) return null;
  ensureProgMeta(prog);
  return {
    id: prog.id,
    name: prog.name,
    fileName: prog.fileName || displayProgFileName(prog),
    weeks: (prog.weeks || []).map(w => ({
      label: w.label,
      days: Object.fromEntries(
        Object.keys(w.days || {}).map(d => [
          d,
          (w.days[d] || []).map(e => ({ name: e.name, warm: !!e.warm, text: e.text || '' }))
        ])
      )
    })),
    archivedAt: new Date().toISOString()
  };
}
function archiveProg(prog) {
  if (!prog) return;
  ensureProgMeta(prog);
  S.progCatalog = S.progCatalog || [];
  const snap = snapshotProg(prog);
  const i = S.progCatalog.findIndex(p => p.id === snap.id);
  if (i >= 0) S.progCatalog[i] = snap;
  else S.progCatalog.unshift(snap);
  if (S.progCatalog.length > 30) S.progCatalog.length = 30;
}
function allKnownProgs() {
  const out = [];
  const seen = new Set();
  if (S.prog) {
    ensureProgMeta(S.prog);
    const snap = snapshotProg(S.prog);
    out.push(snap);
    seen.add(snap.id);
  }
  (S.progCatalog || []).forEach(p => {
    if (p && p.id && !seen.has(p.id)) {
      out.push(p);
      seen.add(p.id);
    }
  });
  return out;
}
function findProgForWorkout(w) {
  const progs = allKnownProgs();
  for (const p of progs) {
    const weekObj = (p.weeks || []).find(x => x.label === w.week);
    if (!weekObj) continue;
    const dayN = w.day;
    const dayEx = (weekObj.days && (weekObj.days[dayN] || weekObj.days[String(dayN)])) || [];
    if (!dayEx.length && Number(dayN)) continue;
    const names = new Set(dayEx.map(e => liftKey(e.name || e)));
    const exercises = (w.exercises || []).filter(e => e.name && !e.warm);
    if (!exercises.length) return p;
    if (exercises.every(e => names.has(liftKey(e.name)))) return p;
  }
  return null;
}


const WD = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const WD_FULL = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
/** 0=Lun ... 6=Dom */
const weekdayMon0 = (d = new Date()) => (d.getDay() + 6) % 7;
const todayLabel = () => {
  const d = new Date();
  return WD_FULL[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
};
const logType = (entry) => {
  if (!entry) return null;
  if (typeof entry === 'string') return entry; // retrocompatibilità
  return entry.type || null;
};
const logDayNum = (entry) => {
  if (!entry || typeof entry === 'string') return null;
  return entry.day != null ? entry.day : null;
};
const logCal = (type, weekLabel, wd = weekdayMon0(), day = null) => {
  S.weekLog = S.weekLog || {};
  S.weekLog[weekLabel] = S.weekLog[weekLabel] || {};
  if (type === 'train') S.weekLog[weekLabel][wd] = { type: 'train', day };
  else S.weekLog[weekLabel][wd] = { type: 'rest' };
};
/** Tipo entry storico: train | rest */
function entryType(e) {
  if (!e) return null;
  if (e.type === 'rest' || e.rest) return 'rest';
  if (e.type === 'train' || e.exercises) return 'train';
  if (e.day != null) return 'train';
  return null;
}
/** Rimuove dallo storico per settimana + giorno scheda */
function removeWorkoutLogByWeekDay(weekLabel, day, progId) {
  if (day == null || day === 'comp') {
    // solo weekday-based removal handled elsewhere
  } else {
    const dayN = Number(day);
    S.workoutLog = (S.workoutLog || []).filter(w => {
      if (entryType(w) === 'rest') return true;
      if (String(w.week) !== String(weekLabel)) return true;
      if (Number(w.day) !== dayN && String(w.day) !== String(day)) return true;
      if (progId && w.progId && w.progId !== progId) return true;
      return false;
    });
    const k = weekLabel + '|' + day;
    if (S.chk) delete S.chk[k];
    if (S.accLog) delete S.accLog[k];
  }
}
/** Rimuove dallo storico per settimana + weekday calendario (Lun–Dom) */
function removeStoricoByWeekWeekday(weekLabel, wd, progId) {
  S.workoutLog = (S.workoutLog || []).filter(w => {
    if (String(w.week) !== String(weekLabel)) return true;
    const ewd = w.weekday != null ? Number(w.weekday)
      : (w.date ? weekdayMon0(new Date(w.date + 'T12:00:00')) : null);
    if (ewd !== Number(wd)) return true;
    if (progId && w.progId && w.progId !== progId) return true;
    return false;
  });
}
/**
 * FONTE DI VERITÀ = S.workoutLog (storico).
 * Ricostruisce S.done e S.weekLog del Piano per la scheda attuale.
 */
function rebuildPianoFromStorico() {
  if (!S.prog || !S.prog.weeks) return;
  ensureProgMeta(S.prog);
  const progId = S.prog.id;
  const fnKey = String(displayProgFileName(S.prog)).toLowerCase();
  const labels = new Set(S.prog.weeks.map(w => w.label));

  // Pulisci solo lo stato piano delle settimane di QUESTA scheda
  labels.forEach(label => {
    if (S.done) delete S.done[label];
    if (S.weekLog) delete S.weekLog[label];
  });
  S.done = S.done || {};
  S.weekLog = S.weekLog || {};

  (S.workoutLog || []).forEach(entry => {
    if (!entry || !entry.week) return;
    // Appartiene a questa scheda?
    const sameId = entry.progId && entry.progId === progId;
    const sameFile = entry.progFileName && String(entry.progFileName).toLowerCase() === fnKey;
    const sameName = entry.progName && S.prog.name &&
      String(entry.progName).toLowerCase() === String(S.prog.name).toLowerCase();
    // migrazione: log senza progId ma settimana presente nella scheda attuale
    const legacy = !entry.progId && !entry.progFileName && labels.has(String(entry.week));
    if (!sameId && !sameFile && !sameName && !legacy) return;
    if (!labels.has(String(entry.week))) return; // settimana non in questa scheda

    const t = entryType(entry);
    let wd = entry.weekday != null ? Number(entry.weekday) : null;
    if (wd == null && entry.date) {
      try { wd = weekdayMon0(new Date(entry.date + 'T12:00:00')); } catch (e) { wd = null; }
    }

    if (t === 'rest') {
      if (wd != null && wd >= 0 && wd <= 6) logCal('rest', entry.week, wd);
      return;
    }

    // train: day 1–4, complementari, ecc. sul weekday corretto
    const day = entry.day;
    if (day != null && day !== 'comp') {
      const d = Number(day);
      if (!Number.isNaN(d)) {
        const done = (S.done[entry.week] = S.done[entry.week] || []);
        if (!done.map(Number).includes(d)) done.push(d);
      }
    }
    if (wd != null && wd >= 0 && wd <= 6) {
      logCal('train', entry.week, wd, day != null ? day : null);
    }
  });
}
function addRestToStorico(week, wd) {
  if (S.prog) { ensureProgMeta(S.prog); archiveProg(S.prog); }
  const progId = S.prog && S.prog.id;
  removeStoricoByWeekWeekday(week, wd, progId);
  S.workoutLog = S.workoutLog || [];
  S.workoutLog.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    type: 'rest',
    date: dstr(),
    at: new Date().toISOString(),
    week: week,
    weekday: wd,
    day: null,
    title: 'Riposo',
    progId: progId || null,
    progName: S.prog ? S.prog.name : 'Scheda',
    progFileName: S.prog ? displayProgFileName(S.prog) : null,
    exercises: []
  });
  if (S.workoutLog.length > 200) S.workoutLog.length = 200;
}
/** Segna allenamento (anche da Piano senza sessione completa) */
function addTrainMarkToStorico(week, wd, dayNum) {
  if (S.prog) { ensureProgMeta(S.prog); archiveProg(S.prog); }
  const progId = S.prog && S.prog.id;
  removeStoricoByWeekWeekday(week, wd, progId);
  if (dayNum != null && dayNum !== 'comp') removeWorkoutLogByWeekDay(week, dayNum, progId);
  const wObj = S.prog && S.prog.weeks.find(x => x.label === week);
  const title = (dayNum === 'comp') ? 'Complementari' : (wObj && dayNum != null ? focus(wObj, dayNum) : 'Allenamento');
  S.workoutLog = S.workoutLog || [];
  S.workoutLog.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    type: 'train',
    date: dstr(),
    at: new Date().toISOString(),
    week: week,
    weekday: wd,
    day: dayNum,
    title: title,
    progId: progId || null,
    progName: S.prog ? S.prog.name : 'Scheda',
    progFileName: S.prog ? displayProgFileName(S.prog) : null,
    exercises: [],
    fromPiano: true
  });
  if (S.workoutLog.length > 200) S.workoutLog.length = 200;
}
const clearCal = (weekLabel, wd = weekdayMon0()) => {
  // elimina dallo storico tutto ciò che era su questo weekday, poi il piano si ricostruisce
  const progId = S.prog && S.prog.id;
  removeStoricoByWeekWeekday(weekLabel, wd, progId);
  if (S.weekLog && S.weekLog[weekLabel]) {
    const prev = S.weekLog[weekLabel][wd];
    const prevDay = logDayNum(prev);
    if (logType(prev) === 'train' && prevDay != null && prevDay !== 'comp') {
      removeWorkoutLogByWeekDay(weekLabel, prevDay, progId);
    }
    delete S.weekLog[weekLabel][wd];
    if (!Object.keys(S.weekLog[weekLabel]).length) delete S.weekLog[weekLabel];
  }
};
const weekDots = (w) => {
  const log = (S.weekLog && S.weekLog[w.label]) || {};
  const labelEsc = String(w.label).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `<div class="wdays">${[0,1,2,3,4,5,6].map(i => {
    const t = logType(log[i]);
    const cls = t === 'train' ? 'train' : t === 'rest' ? 'rest' : '';
    const dnum = logDayNum(log[i]);
    const mark = t === 'train' ? (dnum === 'comp' ? 'C' : (dnum != null ? String(dnum) : '✓')) : (t === 'rest' ? '–' : '');
    const isEdit = S.dayEdit && S.dayEdit.week === w.label && S.dayEdit.wd === i;
    return `<div class="wday ${isEdit ? 'editing' : ''}" onclick="editWday('${labelEsc}',${i},event)"><span class="wl">${WD[i]}</span><span class="dot ${cls}">${mark}</span></div>`;
  }).join('')}</div>`;
};
function editWday(weekLabel, wd, e) {
  e.stopPropagation();
  const i = S.prog.weeks.findIndex(w => w.label === weekLabel);
  if (i >= 0) S.wi = i;
  S.dayEdit = { week: weekLabel, wd, step: 'type' };
  save(); render();
}
function setWday(type) {
  if (!S.dayEdit) return;
  const { week, wd } = S.dayEdit;
  if (type === 'clear') {
    if (!confirm('Vuoi cancellare la registrazione di questo giorno?')) return;
    if (!confirm('Confermi? L\'operazione non si può annullare.')) return;
    clearCal(week, wd);
    rebuildPianoFromStorico();
    if (wd === weekdayMon0() && week === (W() && W().label)) S.today = null;
    S.dayEdit = null;
    save(); render();
    return;
  }
  if (type === 'rest') {
    clearCal(week, wd);
    addRestToStorico(week, wd);
    rebuildPianoFromStorico();
    if (wd === weekdayMon0() && week === (W() && W().label)) {
      S.today = { date: dstr(), type: 'rest' };
    }
    S.dayEdit = null;
    save(); render();
    return;
  }
  if (type === 'train') {
    // passo 2: scegli quale giorno della scheda
    S.dayEdit = { ...S.dayEdit, step: 'pickTrain' };
    save(); render();
    return;
  }
}
function setWdayTrain(dayNum) {
  if (!S.dayEdit) return;
  const { week, wd } = S.dayEdit;
  clearCal(week, wd);
  addTrainMarkToStorico(week, wd, dayNum);
  rebuildPianoFromStorico();
  const wObj = S.prog && S.prog.weeks.find(x => x.label === week);
  if (dayNum !== 'comp' && wObj && !remaining(wObj).length) {
    const idx = S.prog.weeks.findIndex(x => x.label === week);
    if (idx >= 0 && idx < S.prog.weeks.length - 1 && S.wi === idx) S.wi = idx + 1;
  }
  if (wd === weekdayMon0() && week === (W() && W().label)) {
    S.today = { date: dstr(), type: 'rest', finished: 1, week, day: dayNum };
  }
  S.dayEdit = null;
  save(); render();
}
function cancelDayEdit() { S.dayEdit = null; save(); render(); }


/** Nome normalizzato per storico */
function liftKey(name) {
  return String(name || '').toLowerCase().replace(/\s+/g, ' ').trim();
}
/** Fondamentali + varianti (panca paralimpica, squat con fermi, stacco sumo, ecc.) */
function isMainLift(e) {
  if (!e) return false;
  if (e.lift === 's' || e.lift === 'b' || e.lift === 'd') return true;
  const n = String(e.name || '').toLowerCase();
  if (/riscaldamento|\bpre\b/.test(n)) return false;
  // squat / panca / stacco e varianti comuni
  if (/\bsquat\b|\bacconsc|front squat|box squat/.test(n)) return true;
  if (/\bpanca\b|bench/.test(n)) return true;
  if (/\bstacco\b|deadlift|\bsumo\b|\bregular\b/.test(n)) return true;
  return false;
}
/** Complementari = non riscaldamento e non fondamentale */
function isAccessory(e) {
  return e && !e.warm && !isMainLift(e);
}
function getRestSec(name) {
  const k = liftKey(name);
  if (S.restByEx && S.restByEx[k] != null) return Number(S.restByEx[k]) || 90;
  return Number(S.restDefault) || 120;
}
function setRestSec(name, sec) {
  S.restByEx = S.restByEx || {};
  const n = Math.max(15, Math.min(600, parseInt(sec, 10) || 90));
  S.restByEx[liftKey(name)] = n;
  save();
}
/** Quante serie ha l'esercizio (dal testo scheda) */
function parseSets(text) {
  const t = String(text || '');
  // 10-8-6-4 o 5-5-5
  const seq = t.match(/\b(\d+(?:\s*-\s*\d+){1,})\b/);
  if (seq) {
    const parts = seq[1].split(/\s*-\s*/).map(n => parseInt(n, 10)).filter(n => n > 0);
    if (parts.length >= 2) return { count: parts.length, targets: parts };
  }
  // 3x8 / 3×8 / 5x3s → serie x rip
  let m = t.match(/(\d+)\s*[x×]\s*(\d+)\s*s\b/i);
  if (m) return { count: parseInt(m[2], 10) || 3, targets: null, reps: parseInt(m[1], 10) };
  m = t.match(/(\d+)\s*[x×]\s*(\d+)/i);
  if (m) return { count: parseInt(m[1], 10) || 3, targets: null, reps: parseInt(m[2], 10) };
  // "3 serie" / "4 sets"
  m = t.match(/(\d+)\s*(?:serie|sets?)\b/i);
  if (m) return { count: parseInt(m[1], 10) || 3, targets: null };
  return { count: 3, targets: null };
}
function prescribedKg(text, lift) {
  if (!lift || !S.max || !S.max[lift]) return null;
  const m = String(text || '').match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (!m) return null;
  const pct = parseFloat(m[1].replace(',', '.'));
  if (isNaN(pct)) return null;
  return Math.round(pct / 100 * S.max[lift] / 2.5) * 2.5;
}
function getExLog(week, day, i, setCount) {
  const k = week + '|' + day;
  S.accLog = S.accLog || {};
  S.accLog[k] = S.accLog[k] || {};
  let row = S.accLog[k][i];
  // migrazione vecchio formato {kg,reps}
  if (row && !Array.isArray(row.sets) && (row.kg != null || row.reps != null)) {
    row = { sets: [{ kg: row.kg || '', reps: row.reps || '' }] };
    S.accLog[k][i] = row;
  }
  if (!row || !Array.isArray(row.sets)) {
    row = { sets: [] };
    S.accLog[k][i] = row;
  }
  const n = Math.max(1, setCount || row.sets.length || 3);
  while (row.sets.length < n) row.sets.push({ kg: '', reps: '', done: false });
  if (row.sets.length > n) row.sets.length = n;
  row.sets.forEach(s => { if (s.done == null) s.done = false; });
  return row;
}
function setExSetLog(week, day, i, setIdx, field, value, skipSave) {
  const row = getExLog(week, day, i);
  if (!row.sets[setIdx]) row.sets[setIdx] = { kg: '', reps: '', done: false };
  // non modificare kg/rip se la serie è già fatta
  if (row.sets[setIdx].done && (field === 'kg' || field === 'reps')) return;
  // salva SOLO il campo corrente (niente cascade qui → altrimenti su mobile resta solo la 1ª cifra)
  row.sets[setIdx][field] = value;
  if (!skipSave) save();
}
/** Propaga i kg alle serie successive vuote — chiamare solo su blur/change, non su ogni tasto */
function cascadeKgFromSet(week, day, i, setIdx) {
  const row = getExLog(week, day, i);
  if (!row.sets[setIdx]) return;
  const value = row.sets[setIdx].kg;
  if (value === '' || value == null) return;
  const active = document.activeElement;
  let dirty = false;
  for (let j = setIdx + 1; j < row.sets.length; j++) {
    if (row.sets[j].done) continue;
    if (row.sets[j].kg !== '' && row.sets[j].kg != null) continue;
    row.sets[j].kg = value;
    dirty = true;
  }
  if (dirty) save();
  // aggiorna solo i campi DOM non attivi
  try {
    document.querySelectorAll('.set-card').forEach(c => {
      if (c.getAttribute('data-week') !== String(week)) return;
      if (Number(c.getAttribute('data-day')) !== Number(day)) return;
      if (Number(c.getAttribute('data-exi')) !== Number(i)) return;
      const seti = Number(c.getAttribute('data-set'));
      if (seti <= setIdx) return;
      if (row.sets[seti] && row.sets[seti].done) return;
      const inp = c.querySelector('input');
      if (inp && inp !== active && (inp.value === '' || inp.value == null)) {
        inp.value = value;
        inp.classList.add('kg-suggested');
      }
    });
  } catch (e) {}
}
function prevSetKg(log, setIdx) {
  if (!log || !log.sets) return '';
  for (let j = setIdx - 1; j >= 0; j--) {
    const k = log.sets[j] && log.sets[j].kg;
    if (k !== '' && k != null) return String(k);
  }
  return '';
}
/** Salva kg/rip dai campi input PRIMA di un re-render (altrimenti si perdono) */
function flushSetInputsFromDOM() {
  let dirty = false;
  document.querySelectorAll('.set-card').forEach(card => {
    const week = card.getAttribute('data-week');
    const day = Number(card.getAttribute('data-day'));
    const exi = Number(card.getAttribute('data-exi'));
    const seti = Number(card.getAttribute('data-set'));
    if (week == null || Number.isNaN(exi) || Number.isNaN(seti)) return;
    const inputs = card.querySelectorAll('input[type="number"], input:not([type])');
    const row = getExLog(week, day, exi);
    if (!row.sets[seti]) row.sets[seti] = { kg: '', reps: '', done: false };
    if (row.sets[seti].done) return; // serie fatta: non toccare kg/rip
    let n = 0;
    inputs.forEach(inp => {
      const val = inp.value;
      if (n === 0) {
        if (row.sets[seti].kg !== val) { row.sets[seti].kg = val; dirty = true; }
      } else if (n === 1) {
        if (row.sets[seti].reps !== val) { row.sets[seti].reps = val; dirty = true; }
      }
      n++;
    });
  });
  if (dirty) save();
}
function markSetDone(week, day, i, setIdx, done) {
  const row = getExLog(week, day, i);
  if (!row.sets[setIdx]) row.sets[setIdx] = { kg: '', reps: '', done: false };
  row.sets[setIdx].done = done !== false;
  // se tutte le serie sono fatte → completa automaticamente l'esercizio
  syncExerciseDoneFromSets(week, day, i);
  save();
}
/** Allinea S.chk con lo stato delle serie */
function syncExerciseDoneFromSets(week, day, i) {
  const wObj = (S.prog && S.prog.weeks.find(x => x.label === week)) || W();
  if (!wObj) return;
  const exs = dayExercises(wObj, day);
  if (!exs || !exs[i] || exs[i].warm) return;
  const info = parseSets(exs[i].text);
  const row = getExLog(week, day, i, info.count);
  const allDone = row.sets.length > 0 && row.sets.every(s => !!s.done);
  const k = week + '|' + day;
  S.chk[k] = S.chk[k] || [];
  const idx = S.chk[k].indexOf(i);
  if (allDone && idx < 0) S.chk[k].push(i);
  if (!allDone && idx >= 0) S.chk[k].splice(idx, 1);
}
/** Etichetta settimana precedente nel programma */
function prevWeekLabel(currentLabel) {
  if (!S.prog || !S.prog.weeks || !S.prog.weeks.length) return null;
  const i = S.prog.weeks.findIndex(w => w.label === currentLabel);
  if (i > 0) return S.prog.weeks[i - 1].label;
  return null;
}
/** Serie loggate per un esercizio (stesso giorno) nella settimana precedente o nello storico */
function findPrevAccessorySets(exerciseName, currentWeek, day) {
  if (!exerciseName) return null;
  const key = liftKey(exerciseName);
  const dayN = Number(day);

  // 1) stesso giorno nella settimana precedente del programma
  const prev = prevWeekLabel(currentWeek);
  if (prev) {
    const wPrev = S.prog.weeks.find(w => w.label === prev);
    if (wPrev) {
      const exs = dayExercises(wPrev, dayN);
      if (exs && exs.length) {
        const idx = exs.findIndex(e => !e.warm && liftKey(e.name) === key);
        if (idx >= 0) {
          const info = parseSets(exs[idx].text);
          const log = getExLog(prev, dayN, idx, info.count);
          const sets = (log.sets || []).filter(s =>
            (s.kg !== '' && s.kg != null) || (s.reps !== '' && s.reps != null)
          );
          if (sets.length) {
            return {
              week: prev,
              sets: log.sets.map(s => ({
                kg: s.kg !== '' && s.kg != null ? s.kg : '',
                reps: s.reps !== '' && s.reps != null ? s.reps : '',
              })),
            };
          }
        }
      }
    }
    // prova anche workoutLog della settimana precedente
    const fromLog = (S.workoutLog || []).find(w =>
      w.week === prev && Number(w.day) === dayN &&
      (w.exercises || []).some(e => liftKey(e.name) === key && e.sets && e.sets.some(x => x.kg != null || x.reps != null))
    );
    if (fromLog) {
      const ex = fromLog.exercises.find(e => liftKey(e.name) === key);
      if (ex && ex.sets && ex.sets.length) {
        return {
          week: prev,
          sets: ex.sets.map(s => ({
            kg: s.kg != null ? s.kg : '',
            reps: s.reps != null ? s.reps : '',
          })),
        };
      }
    }
  }

  // 2) fallback: liftHistory (stesso day se possibile)
  const hist = lastLiftHistory(exerciseName, 15);
  const entry = hist.find(h => h.week && h.week !== currentWeek && (h.day == null || Number(h.day) === dayN))
    || hist.find(h => h.week !== currentWeek)
    || hist[0];
  if (entry && entry.sets && entry.sets.length) {
    return {
      week: entry.week || entry.date || 'scorsa',
      sets: entry.sets.map(s => ({
        kg: s.kg != null ? s.kg : '',
        reps: s.reps != null ? s.reps : '',
      })),
    };
  }
  // vecchio formato storico senza sets
  if (entry && (entry.kg != null || entry.reps != null)) {
    return {
      week: entry.week || entry.date || 'scorsa',
      sets: [{ kg: entry.kg != null ? entry.kg : '', reps: entry.reps != null ? entry.reps : '' }],
    };
  }
  return null;
}
/**
 * Solo complementari: se i campi di questa settimana sono vuoti,
 * precompila con kg/rip della stessa giornata della settimana prima.
 * Non sovrascrive valori già inseriti.
 */
function prefillAccessoryFromPrev(weekLabel, day, exIndex, exercise) {
  if (!exercise || exercise.warm || isMainLift(exercise)) return null;
  const prev = findPrevAccessorySets(exercise.name, weekLabel, day);
  if (!prev || !prev.sets || !prev.sets.length) return null;
  const info = parseSets(exercise.text);
  const log = getExLog(weekLabel, day, exIndex, info.count);
  let changed = false;
  log.sets.forEach((s, si) => {
    const p = prev.sets[si] || prev.sets[Math.min(si, prev.sets.length - 1)];
    if (!p) return;
    if ((s.kg === '' || s.kg == null) && p.kg !== '' && p.kg != null) {
      s.kg = p.kg;
      changed = true;
    }
    if ((s.reps === '' || s.reps == null) && p.reps !== '' && p.reps != null) {
      s.reps = p.reps;
      changed = true;
    }
  });
  if (changed) save();
  return prev;
}
function pushLiftHistory(name, sets, week, day) {
  const clean = (sets || []).map(s => ({
    kg: parseFloat(String(s.kg).replace(',', '.')),
    reps: parseInt(s.reps, 10)
  })).filter(s => !isNaN(s.kg) && !isNaN(s.reps));
  if (!clean.length) return;
  const key = liftKey(name);
  S.liftHistory = S.liftHistory || {};
  S.liftHistory[key] = S.liftHistory[key] || [];
  S.liftHistory[key] = S.liftHistory[key].filter(h => h.date !== dstr());
  S.liftHistory[key].unshift({ date: dstr(), sets: clean, week: week || '', day: day });
  if (S.liftHistory[key].length > 40) S.liftHistory[key].length = 40;
}
function lastLiftHistory(name, n) {
  const list = (S.liftHistory && S.liftHistory[liftKey(name)]) || [];
  return list.slice(0, n || 5);
}
function historyHtml(name) {
  const rows = lastLiftHistory(name, 4);
  if (!rows.length) return '<p class="hist mut">Nessuno storico ancora</p>';
  return '<div class="hist">' + rows.map(h => {
    const sets = h.sets || (h.kg != null ? [{ kg: h.kg, reps: h.reps }] : []);
    const txt = sets.map(s => s.kg + '×' + s.reps).join(', ');
    return `<span class="hist-row"><b>${esc(txt)}</b> <i>${esc(String(h.date || '')).slice(5)}</i></span>`;
  }).join('') + '</div>';
}
function saveSessionLogs(week, day, exercises) {
  if (!exercises) return;
  exercises.forEach((e, i) => {
    if (e.warm) return;
    const info = parseSets(e.text);
    const log = getExLog(week, day, i, info.count);
    if (isMainLift(e)) {
      let lift = e.lift;
      if (!lift) {
        const n = String(e.name || '').toLowerCase();
        if (/squat|acconsc/.test(n)) lift = 's';
        else if (/panca|bench/.test(n)) lift = 'b';
        else if (/stacco|deadlift|sumo|regular/.test(n)) lift = 'd';
      }
      const kg = prescribedKg(e.text, lift);
      const sets = log.sets.map((s, si) => ({
        kg: kg != null ? kg : s.kg,
        reps: (info.targets ? info.targets[si] : info.reps) != null ? (info.targets ? info.targets[si] : info.reps) : s.reps,
        done: s.done,
      }));
      pushLiftHistory(e.name, sets, week, day);
    } else {
      pushLiftHistory(e.name, log.sets, week, day);
    }
  });
  save();
}
/** HTML card per ogni serie */
function setsLogHtml(weekLabel, day, exIndex, exercise) {
  const info = parseSets(exercise.text);
  // complementari: pesca kg/rip dalla stessa giornata della settimana precedente
  const prevInfo = (!exercise.warm && !isMainLift(exercise))
    ? prefillAccessoryFromPrev(weekLabel, day, exIndex, exercise)
    : null;
  const log = getExLog(weekLabel, day, exIndex, info.count);
  // per fondamentali usa sempre il lift taggato o ricavato
  let lift = exercise.lift;
  if (!lift && isMainLift(exercise)) {
    const n = String(exercise.name || '').toLowerCase();
    if (/squat|acconsc/.test(n)) lift = 's';
    else if (/panca|bench/.test(n)) lift = 'b';
    else if (/stacco|deadlift|sumo|regular/.test(n)) lift = 'd';
  }
  const sugKg = prescribedKg(exercise.text, lift);
  const main = isMainLift(exercise);
  const hasRpe = /\brpe\b/i.test(String(exercise.text || ''));
  // fondamentali: di default bloccati; se c'è RPE → kg modificabile, rip no
  const kgEditable = !main || hasRpe;
  const repsEditable = !main;
  const fullyLocked = main && !hasRpe;
  const wJs = JSON.stringify(weekLabel);
  const restSec = getRestSec(exercise.name);
  return `<div class="sets-wrap ${fullyLocked ? 'sets-locked' : ''}">
    ${log.sets.map((s, si) => {
      const target = info.targets ? info.targets[si] : info.reps;
      const isDone = !!s.done;
      const prescRep = target != null ? target : null;
      const prescKg = sugKg != null ? sugKg : null;
      let inputs = '';
      // serie fatta → solo lettura (sbarra); per modificare togli "fatta"
      if (isDone) {
        const kgShow = (s.kg !== '' && s.kg != null) ? String(s.kg).replace('.', ',') + ' kg'
          : (prescKg != null ? String(prescKg).replace('.', ',') + ' kg' : '— kg');
        const repShow = (s.reps !== '' && s.reps != null) ? String(s.reps) + ' rip'
          : (prescRep != null ? String(prescRep) + ' rip' : '— rip');
        inputs = `<div class="set-readonly set-done-ro">
             <span class="set-ro-kg">${esc(kgShow)}</span>
             <span class="set-x">×</span>
             <span class="set-ro-reps">${esc(repShow)}</span>
           </div>
           <p class="set-lock-hint">Serie fatta · tocca la card per sbloccare</p>`;
      } else if (fullyLocked) {
        const kgLabel = prescKg != null ? String(prescKg).replace('.', ',') + ' kg' : '— kg';
        const repLabel = prescRep != null ? String(prescRep) + ' rip' : '— rip';
        inputs = `<div class="set-readonly">
             <span class="set-ro-kg">${esc(kgLabel)}</span>
             <span class="set-x">×</span>
             <span class="set-ro-reps">${esc(repLabel)}</span>
           </div>
           <p class="set-lock-hint">Fisso dalla scheda (fondamentale)</p>`;
      } else if (main && hasRpe) {
        // kg editabile, rip fisse
        const repLabel = prescRep != null ? String(prescRep) + ' rip' : '— rip';
        const fromPrev = prevSetKg(log, si);
        const kgVal = s.kg != null && s.kg !== '' ? esc(String(s.kg)) : '';
        const kgPh = fromPrev ? String(fromPrev) : (prescKg != null ? String(prescKg) : 'kg');
        inputs = `<div class="set-inputs set-rpe">
             <input type="number" inputmode="decimal" step="0.5" placeholder="${esc(kgPh)}" value="${kgVal}"
               oninput="setExSetLog(${wJs},${day},${exIndex},${si},'kg',this.value)"
               onchange="setExSetLog(${wJs},${day},${exIndex},${si},'kg',this.value);cascadeKgFromSet(${wJs},${day},${exIndex},${si})">
             <span class="set-x">×</span>
             <span class="set-ro-reps set-ro-inline">${esc(repLabel)}</span>
           </div>
           <p class="set-lock-hint">RPE · puoi impostare i kg · rip fisse</p>`;
      } else {
        const pSet = prevInfo && prevInfo.sets ? (prevInfo.sets[si] || prevInfo.sets[prevInfo.sets.length - 1]) : null;
        const prevHint = pSet && ((pSet.kg !== '' && pSet.kg != null) || (pSet.reps !== '' && pSet.reps != null))
          ? `<p class="set-prev-hint">Scorsa (${esc(String(prevInfo.week))}): <b>${pSet.kg !== '' && pSet.kg != null ? esc(String(pSet.kg)) + ' kg' : '—'} × ${pSet.reps !== '' && pSet.reps != null ? esc(String(pSet.reps)) + ' rip' : '—'}</b> · cerca di migliorare</p>`
          : '';
        const fromPrev = prevSetKg(log, si);
        const kgVal = s.kg != null && s.kg !== '' ? esc(String(s.kg)) : '';
        const kgPh = fromPrev ? String(fromPrev) : 'kg';
        const suggestNote = fromPrev && (s.kg === '' || s.kg == null)
          ? `<p class="set-prev-hint">Suggerito serie prec.: <b>${esc(String(fromPrev))} kg</b> (placeholder)</p>`
          : '';
        inputs = `<div class="set-inputs">
             <input type="number" inputmode="decimal" step="0.5" placeholder="${esc(kgPh)}" value="${kgVal}"
               oninput="setExSetLog(${wJs},${day},${exIndex},${si},'kg',this.value)"
               onchange="setExSetLog(${wJs},${day},${exIndex},${si},'kg',this.value);cascadeKgFromSet(${wJs},${day},${exIndex},${si})">
             <span class="set-x">×</span>
             <input type="number" inputmode="numeric" step="1" placeholder="${prescRep != null ? prescRep : 'rip'}" value="${s.reps != null && s.reps !== '' ? esc(String(s.reps)) : ''}"
               oninput="setExSetLog(${wJs},${day},${exIndex},${si},'reps',this.value)" onchange="setExSetLog(${wJs},${day},${exIndex},${si},'reps',this.value)">
           </div>${suggestNote}${prevHint}`;
      }
      return `<div class="set-card ${isDone ? 'set-done' : ''} ${fullyLocked ? 'set-locked' : ''}"
        data-ex="${esc(exercise.name)}"
        data-week="${esc(weekLabel)}"
        data-day="${day}"
        data-exi="${exIndex}"
        data-set="${si}"
        role="button"
        title="${isDone ? 'Serie fatta · tocca per annullare' : 'Tocca: segna fatta + recupero ' + fmtRest(restSec)}">
        <div class="set-label">
          <span class="set-title">${isDone ? '✓ ' : ''}Serie ${si + 1}${target != null && repsEditable ? ' · obiettivo ' + target + ' rip' : ''}</span>
          <span class="set-rest-hint">${isDone ? 'fatta' : '⏱ ' + fmtRest(restSec)}</span>
        </div>
        ${inputs}
      </div>`;
    }).join('')}
  </div>`;
}
/** secondi → "HH:MM:SS" per input type=time */
function secToTimeValue(sec) {
  sec = Math.max(0, Math.min(600, parseInt(sec, 10) || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
function timeValueToSec(val) {
  if (!val) return 120;
  const p = String(val).split(':').map(Number);
  let sec = 0;
  if (p.length === 3) sec = (p[0] || 0) * 3600 + (p[1] || 0) * 60 + (p[2] || 0);
  else if (p.length === 2) sec = (p[0] || 0) * 60 + (p[1] || 0);
  return Math.max(15, Math.min(600, sec || 120));
}


function openRestPicker(name, ev) {
  if (ev) { ev.stopPropagation(); ev.preventDefault(); }
  S.restPicker = { name: String(name || ''), sec: getRestSec(name) };
  // non salvare subito: evita race; salviamo al confirm
  render();
}
function closeRestPicker(ev) {
  if (ev) { ev.stopPropagation(); ev.preventDefault(); }
  S.restPicker = null;
  render();
}
function adjustRestPicker(delta, ev) {
  if (ev) { ev.stopPropagation(); ev.preventDefault(); }
  if (!S.restPicker) return;
  S.restPicker.sec = Math.max(15, Math.min(600, (Number(S.restPicker.sec) || 120) + delta));
  const el = document.getElementById('rest-picker-sec');
  if (el) el.textContent = fmtRest(S.restPicker.sec);
}
function setRestPickerPreset(sec, ev) {
  if (ev) { ev.stopPropagation(); ev.preventDefault(); }
  if (!S.restPicker) return;
  S.restPicker.sec = sec;
  const el = document.getElementById('rest-picker-sec');
  if (el) el.textContent = fmtRest(sec);
}
function confirmRestPicker(ev) {
  if (ev) { ev.stopPropagation(); ev.preventDefault(); }
  if (!S.restPicker) return;
  setRestSec(S.restPicker.name, S.restPicker.sec);
  S.restPicker = null;
  save();
  render();
}
function restPickerHtml() {
  if (!S.restPicker) return '';
  const sec = S.restPicker.sec || 120;
  const name = S.restPicker.name;
  return `<div class="modal-backdrop rest-picker-backdrop" onclick="closeRestPicker(event)">
    <div class="modal-card rest-picker-card" onclick="event.stopPropagation()">
      <p class="big">Tempo di recupero</p>
      <p class="mut" style="margin-bottom:8px">${esc(name)}</p>
      <div class="rest-stepper">
        <button type="button" class="rest-step-btn" onclick="adjustRestPicker(-15,event)">−15s</button>
        <div id="rest-picker-sec" class="rest-picker-sec">${fmtRest(sec)}</div>
        <button type="button" class="rest-step-btn" onclick="adjustRestPicker(15,event)">+15s</button>
      </div>
      <div class="rest-stepper" style="margin-top:8px">
        <button type="button" class="rest-step-btn" onclick="adjustRestPicker(-60,event)">−1 min</button>
        <button type="button" class="rest-step-btn" onclick="adjustRestPicker(60,event)">+1 min</button>
      </div>
      <div class="rest-presets">
        <button type="button" onclick="setRestPickerPreset(60,event)">1:00</button>
        <button type="button" onclick="setRestPickerPreset(90,event)">1:30</button>
        <button type="button" onclick="setRestPickerPreset(120,event)">2:00</button>
        <button type="button" onclick="setRestPickerPreset(180,event)">3:00</button>
        <button type="button" onclick="setRestPickerPreset(240,event)">4:00</button>
        <button type="button" onclick="setRestPickerPreset(300,event)">5:00</button>
      </div>
      <button type="button" class="pri" onclick="confirmRestPicker(event)">Salva</button>
      <button type="button" onclick="closeRestPicker(event)">Annulla</button>
    </div>
  </div>`;
}

/* ---- Timer recupero + suono/notifica ---- */
let _restTimer = null;
function playRestBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [0, 0.22, 0.44].forEach((off, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = i === 2 ? 880 : 660;
      g.gain.setValueAtTime(0.0001, now + off);
      g.gain.exponentialRampToValueAtTime(0.25, now + off + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + off + 0.18);
      o.connect(g); g.connect(ctx.destination);
      o.start(now + off);
      o.stop(now + off + 0.2);
    });
    setTimeout(() => { try { ctx.close(); } catch (e) {} }, 1200);
  } catch (e) {}
}
async function notifyRestDone(name) {
  try {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch (e) {}
    }
    if (Notification.permission === 'granted') {
      const opts = {
        body: 'Recupero terminato · ' + (name || 'prossimo set'),
        icon: '/coach.jpg',
        badge: '/coach.jpg',
        tag: 'rest-timer',
        renotify: true,
      };
      try {
        const reg = ('serviceWorker' in navigator) ? await navigator.serviceWorker.ready : null;
        if (reg && reg.showNotification) reg.showNotification('⏱ Recupero finito', opts);
        else new Notification('⏱ Recupero finito', opts);
      } catch (e) {
        try { new Notification('⏱ Recupero finito', opts); } catch (e2) {}
      }
    }
  } catch (e) {}
}
function onRestFinished() {
  playRestBeep();
  try { if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]); } catch (e) {}
  notifyRestDone(_restTimer && _restTimer.name);
  const el = document.getElementById('rest-timer-display');
  if (el) { el.textContent = 'Fine!'; el.classList.add('done'); }
  const bar = document.querySelector('.rest-bar');
  if (bar) bar.classList.add('done');
  const btn = document.querySelector('.rest-stop');
  if (btn) btn.textContent = 'Chiudi';
}
function startRest(name, ev) {
  if (ev) { try { ev.stopPropagation(); ev.preventDefault(); } catch (e) {} }
  const sec = getRestSec(name) || 120;
  if (_restTimer && _restTimer._iv) {
    clearInterval(_restTimer._iv);
    _restTimer._iv = null;
  }
  _restTimer = { endsAt: Date.now() + sec * 1000, name: String(name || ''), left: sec };
  const tick = () => {
    if (!_restTimer) return;
    _restTimer.left = Math.max(0, Math.ceil((_restTimer.endsAt - Date.now()) / 1000));
    const el = document.getElementById('rest-timer-display');
    if (el) {
      if (_restTimer.left > 0) {
        const m = Math.floor(_restTimer.left / 60);
        const s = _restTimer.left % 60;
        el.textContent = m + ':' + String(s).padStart(2, '0');
        el.classList.remove('done');
      }
    }
    if (_restTimer.left <= 0) {
      if (_restTimer._iv) { clearInterval(_restTimer._iv); _restTimer._iv = null; }
      onRestFinished();
    }
  };
  _restTimer._iv = setInterval(tick, 200);
  render();
  tick();
}
function stopRest(ev) {
  if (ev) { try { ev.stopPropagation(); ev.preventDefault(); } catch (e) {} }
  if (_restTimer && _restTimer._iv) clearInterval(_restTimer._iv);
  _restTimer = null;
  render();
}
function restBarHtml() {
  if (!_restTimer) return '';
  const left = Math.max(0, _restTimer.left | 0);
  const m = Math.floor(left / 60);
  const s = left % 60;
  const done = left <= 0;
  return `<div class="rest-bar ${done ? 'done' : ''}" id="rest-bar">
    <div class="rest-bar-inner">
      <span class="rest-label">Recupero · ${esc(_restTimer.name)}</span>
      <span id="rest-timer-display" class="rest-time ${done ? 'done' : ''}">${done ? 'Fine!' : (m + ':' + String(s).padStart(2, '0'))}</span>
      <button type="button" class="rest-stop" onclick="stopRest(event)">${done ? 'Chiudi' : 'Stop'}</button>
    </div>
  </div>`;
}
function fmtRest(sec) {
  sec = Math.max(0, parseInt(sec, 10) || 0);
  const m = Math.floor(sec / 60), s = sec % 60;
  return m + ':' + String(s).padStart(2, '0');
}

function loggedToday() {
  if (!S.prog) return false;
  const w = W();
  if (!w) return false;
  return !!logType((S.weekLog[w.label] || {})[weekdayMon0()]);
}
function shouldOpenDayModal(force) {
  if (!S.prog || loggedToday()) return false;
  if (force) return true;
  // prima apertura della giornata
  return S.promptedDate !== dstr();
}
function openDayModal(force) {
  if (!shouldOpenDayModal(force)) return;
  S.promptedDate = dstr();
  S.view = 'oggi';
  S.dayModal = { step: 'ask' };
  S.today = { date: dstr(), type: 'ask' };
  save();
  render();
}
function closeDayModal() {
  S.dayModal = null;
  save();
  render();
}
function modalPick() {
  S.dayModal = { step: 'pick' };
  save();
  render();
}
function modalRest() {
  setToday('rest');
}
function modalTrain(day) {
  setToday('train', day);
}
function dayModalHtml() {
  if (!S.dayModal || !S.prog) return '';
  const w = W();
  if (!w) return '';
  const rem = remaining(w);
  let body = '';
  if (S.dayModal.step === 'pick') {
    const allD = days(w);
      const doneArr = (S.done[w.label] || []).map(Number);
      body = `<p class="big">Quale allenamento?</p>
      <p class="mut">${esc(w.label)} · tocca un giorno</p>
      ${allD.map(d => `<button type="button" style="border-left:8px solid ${AC[(d - 1) % 4]}" onclick="modalTrain(${d})">Giorno ${d} — ${focus(w, d)}${doneArr.includes(Number(d)) ? ' ✓' : ''}</button>`).join('') || '<p class="mut">Nessun giorno</p>'}
      <button type="button" style="border-left:8px solid #30a46c" onclick="modalTrain('comp')">🔧 Complementari</button>
      <button type="button" onclick="S.dayModal={step:'ask'};save();render()">← Indietro</button>`;
  } else {
    body = `<p class="date-line">${todayLabel()}</p>
      <p class="big">Che giorno è oggi?</p>
      <p class="mut" style="margin-bottom:12px">${esc(w.label)}</p>
      <div class="row">
        <button onclick="modalRest()">😴 Riposo</button>
        <button onclick="modalPick()">💪 Allenamento</button>
      </div>
      <button class="mut-btn" onclick="closeDayModal()">Più tardi</button>`;
  }
  return `<div class="modal-backdrop" id="day-modal">
    <div class="modal-card" onclick="event.stopPropagation()">
      ${body}
    </div>
  </div>`;
}


const W = () => S.prog && S.prog.weeks[Math.min(S.wi, S.prog.weeks.length - 1)];
const days = w => Object.keys(w.days).map(Number).sort((a, b) => a - b);
const remaining = w => {
  const done = (S.done[w.label] || []).map(Number);
  return days(w).filter(d => !done.includes(Number(d)));
};
function dayExercises(w, d) {
  if (!w || !w.days) return null;
  return w.days[d] || w.days[String(d)] || w.days[Number(d)] || null;
}
function focus(w, d) {
  const list = dayExercises(w, d);
  if (!list) return 'Accessori';
  const u = [];
  list.forEach(e => { if (e.lift && !e.warm && !u.includes(LN[e.lift])) u.push(LN[e.lift]); });
  return u.join(' · ') || 'Accessori';
}
function V(v) {
  S.view = v;
  // chiudi popup giorno se si cambia tab (evita schermata bloccata)
  if (v !== 'oggi' && S.dayModal) S.dayModal = null;
  if (S.restPicker) S.restPicker = null;
  save();
  render();
}
function fmt(text, lift) {
  const mav = /mav/i.test(text);
  return esc(text).replace(/(\d+)\s*x\s*(\d+)\s*s\b|(\d+(?:[.,]\d+)?)\s*%(\s+del\s+\S+)?|@(\d+(?:[.,]\d+)?)| (\d+(?:-\d+){2,})\b/gi, (m, a, b, p, rel, r, seq) => {
    if (a) return `<span class="sr"><span class="n-serie">${b}</span> serie × <span class="n-rip">${a}</span> rip</span>`;
    if (p) {
      if (rel || mav || !lift) return `<span class="rel">${p}%${rel || ''} ⚠ non del massimale</span>`;
      const kg = Math.round(parseFloat(p.replace(',', '.')) / 100 * S.max[lift] / 2.5) * 2.5;
      return `${p}% <span class="kg">${String(kg).replace('.', ',')} kg</span>`
    }
    if (r) return `<span class="rpe">RPE ${r}</span>`;
    if (seq) return `<span class="seq">${seq.split('-').length} serie: ${seq.split('-').join(' · ')} rip</span>`;
    return m
  });
}
async function parseDocx(file) {
  const z = await JSZip.loadAsync(await file.arrayBuffer());
  const doc = new DOMParser().parseFromString(await z.file('word/document.xml').async('string'), 'application/xml');
  const NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main', weeks = [];
  for (const tbl of doc.getElementsByTagNameNS(NS, 'tbl')) {
    if (tbl.parentNode.localName !== 'body') continue;
    let cols = null, day = null;
    for (const tr of [...tbl.childNodes].filter(n => n.localName === 'tr')) {
      const cells = [...tr.childNodes].filter(n => n.localName === 'tc').map(tc => ({ text: [...tc.getElementsByTagNameNS(NS, 'p')].map(p => [...p.getElementsByTagNameNS(NS, 't')].map(t => t.textContent).join('')).filter(x => x.trim()).join(' ').replace(/\s+/g, ' ').trim() }));
      const hd = cells.filter(c => /SETT\s*\d+\.\d+/i.test(c.text));
      if (hd.length >= 2) { cols = hd.map(c => { const l = c.text.match(/\d+\.(\d+)/); const w = { label: c.text.replace(/\s+/g, ' ').trim(), n: +l[1], days: {} }; weeks.push(w); return w }); continue }
      if (!cols || !cells.length) continue;
      const g = cells[0].text.match(/^GIORNO\s*(\d+)/i);
      if (g) { day = +g[1]; cols.forEach(w => w.days[day] = []); continue }
      if (!day || !cells[0].text) continue;
      const name = cells[0].text, rest = cells.slice(1);
      const mk = t => ({ name, text: t, warm: /riscaldamento|\bpre\b/i.test(name), lift: /riscaldamento|\bpre\b/i.test(name) ? null : /squat/i.test(name) ? 's' : /stacco|regular|sumo/i.test(name) ? 'd' : /^panca(?!.*inclinata)/i.test(name) ? 'b' : null });
      if (rest.length === 1 && cols.length > 1) { if (rest[0].text) cols.forEach(w => w.days[day].push(mk(rest[0].text))) }
      else rest.forEach((c, i) => { if (cols[i] && c.text) cols[i].days[day].push(mk(c.text)) });
    }
  }
  weeks.sort((a, b) => a.n - b.n);
  if (!weeks.length) throw new Error('Nessuna tabella con settimane trovata');
  return { weeks, id: null, name: null };
}
async function imp(inp) {
  try {
    const file = inp.files[0];
    if (!file) return;
    // archivia scheda attuale (lo storico allenamenti NON si cancella)
    if (S.prog) archiveProg(S.prog);
    const prog = await parseDocx(file);
    ensureProgMeta(prog, file.name);
    S.prog = prog;
    archiveProg(S.prog); // anche la nuova entra nel catalogo
    S.wi = 0;
    S.chk = {};
    S.today = null;
    // Piano ricostruito dallo storico (pallini allenamenti + rest)
    rebuildPianoFromStorico();
    save();
    render();
  } catch (e) {
    const err = $('err');
    if (err) err.textContent = 'Errore: ' + e.message;
    else alert('Errore: ' + e.message);
  }
}
const coachImg = () => `<div class="coach-wrap"><img src="coach.jpg" alt="Leggi bene – Disciplina oggi, risultati domani" class="coach-img" loading="lazy"></div>`;
const importCard = () => `<div class="card"><p class="big">Carica la scheda</p><p class="mut">Scegli il file .docx del coach. Viene letto sul tuo telefono.</p><label class="btn pri" style="margin-top:16px;cursor:pointer">Carica file .docx<input type="file" accept=".docx" style="display:none" onchange="imp(this)"></label><p id="err" class="mut"></p></div>${coachImg()}`;
function cambiaOggi() {
  const w = W();
  if (w) clearCal(w.label, weekdayMon0());
  S.today = { date: dstr(), type: 'ask' };
  save(); render();
}
function setToday(type, day) {
  // chiudi sempre i popup quando si sceglie una risposta
  S.dayModal = null;
  S.restPicker = null;

  if (type === 'train' && day === 'comp' && S.prog) {
    const w = W();
    if (w) logCal('train', w.label, weekdayMon0(), 'comp');
    S.today = { date: dstr(), type: 'rest', finished: 1, week: w ? w.label : null, day: 'comp' };
    save(); render();
    return;
  }

  if (type === 'train') {
    const w = W();
    if (day === 'comp') {
      if (w) logCal('train', w.label, weekdayMon0(), 'comp');
      S.today = { date: dstr(), type: 'rest', finished: 1, week: w ? w.label : null, day: 'comp' };
      S.view = 'oggi';
      save(); render();
      return;
    }
    const dayNum = Number(day);
    if (!w || Number.isNaN(dayNum)) {
      S.today = { date: dstr(), type: 'pick' };
      S.view = 'oggi';
      save(); render();
      return;
    }
    // se era già in done, toglilo così puoi rifare la sessione
    if (S.done[w.label]) {
      S.done[w.label] = S.done[w.label].filter(x => Number(x) !== dayNum);
      if (!S.done[w.label].length) delete S.done[w.label];
    }
    S.view = 'oggi';
    S.today = {
      date: dstr(),
      type: 'train',
      day: dayNum,
      week: w.label,
    };
    save();
    render();
    return;
  }

  S.today = { date: dstr(), type, day: day != null ? day : null };
  if (type === 'rest' && S.prog) {
    const w = W();
    if (w) {
      addRestToStorico(w.label, weekdayMon0());
      rebuildPianoFromStorico();
    }
  }
  save();
  render();
}
function askDay() {
  if (S.today && S.today.finished && S.today.week && S.today.day) {
    const wLabel = S.today.week, d = S.today.day;
    if (S.done[wLabel]) {
      S.done[wLabel] = S.done[wLabel].filter(x => x !== d);
      if (!S.done[wLabel].length) delete S.done[wLabel];
    }
    delete S.chk[wLabel + '|' + d];
    clearCal(wLabel);
    if (S.prog) {
      const i = S.prog.weeks.findIndex(w => w.label === wLabel);
      if (i >= 0) S.wi = i;
    }
  } else if (S.today && S.today.type === 'rest' && !S.today.finished && S.prog) {
    const w = W();
    if (w) clearCal(w.label);
  }
  S.today = { date: dstr(), type: 'ask' }; save(); render()
}
function markAllSetsDone(week, day, i, done) {
  const wObj = (S.prog && S.prog.weeks.find(x => x.label === week)) || W();
  if (!wObj) return;
  const exs = dayExercises(wObj, day);
  if (!exs || !exs[i] || exs[i].warm) return;
  const info = parseSets(exs[i].text);
  const row = getExLog(week, day, i, info.count);
  row.sets.forEach(s => { s.done = !!done; });
}
function tg(i) {
  try { flushSetInputsFromDOM(); } catch (e) {}
  const w = W();
  if (!w || !S.today || S.today.day == null) return;
  const d = S.today.day;
  const k = w.label + '|' + d;
  const a = S.chk[k] = S.chk[k] || [];
  const x = a.indexOf(i);
  if (x >= 0) {
    // togli completato esercizio (le serie restano come sono)
    a.splice(x, 1);
    save();
    render();
    return;
  }
  // segna completato: se ci sono serie non fatte → conferma, poi marca TUTTE le serie
  const exs = dayExercises(w, d);
  const e = exs && exs[i];
  if (e && !e.warm) {
    const info = parseSets(e.text);
    const row = getExLog(w.label, d, i, info.count);
    const allDone = row.sets.length > 0 && row.sets.every(s => !!s.done);
    if (!allDone) {
      if (!confirm('Non tutte le serie risultano fatte.\nVuoi davvero segnare l\'esercizio come completato?\n(Verranno segnate fatte anche tutte le serie.)')) return;
    }
    markAllSetsDone(w.label, d, i, true);
  }
  if (a.indexOf(i) < 0) a.push(i);
  save();
  render();
}
function logFinishedWorkout(weekLabel, day) {
  const w = S.prog && S.prog.weeks.find(x => x.label === weekLabel);
  if (!w || day == null || day === 'comp') return;
  const exs = dayExercises(w, day);
  if (!exs) return;
  const k = weekLabel + '|' + day;
  const ck = S.chk[k] || [];
  if (S.prog) { ensureProgMeta(S.prog); archiveProg(S.prog); }
  const wd = weekdayMon0();
  // sostituisci eventuale segno piano / vecchio log stesso giorno
  removeWorkoutLogByWeekDay(weekLabel, day, S.prog && S.prog.id);
  removeStoricoByWeekWeekday(weekLabel, wd, S.prog && S.prog.id);
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    type: 'train',
    date: dstr(),
    at: new Date().toISOString(),
    week: weekLabel,
    weekday: wd,
    day: day,
    title: focus(w, day),
    progId: S.prog ? S.prog.id : null,
    progName: S.prog ? S.prog.name : 'Scheda',
    progFileName: S.prog ? displayProgFileName(S.prog) : 'Scheda.docx',
    exercises: exs.map((e, i) => {
      let sets = null;
      if (!e.warm) {
        const info = parseSets(e.text);
        const log = getExLog(weekLabel, day, i, info.count);
        let lift = e.lift;
        if (!lift && isMainLift(e)) {
          const n = String(e.name || '').toLowerCase();
          if (/squat|acconsc/.test(n)) lift = 's';
          else if (/panca|bench/.test(n)) lift = 'b';
          else if (/stacco|deadlift|sumo|regular/.test(n)) lift = 'd';
        }
        const prescKg = isMainLift(e) ? prescribedKg(e.text, lift) : null;
        const hasRpe = /\brpe\b/i.test(String(e.text || ''));
        sets = (log.sets || []).map((s, si) => {
          const targetRep = info.targets ? info.targets[si] : info.reps;
          let kgN = null, repsN = null;
          if (isMainLift(e)) {
            // con RPE usa i kg inseriti; senza RPE i kg dalla %
            if (hasRpe && s.kg !== '' && s.kg != null) {
              kgN = parseFloat(String(s.kg).replace(',', '.'));
              if (isNaN(kgN)) kgN = prescKg;
            } else {
              kgN = prescKg;
            }
            repsN = targetRep != null ? Number(targetRep) : null;
          } else {
            const kgRaw = s.kg;
            const repsRaw = s.reps;
            kgN = kgRaw !== '' && kgRaw != null ? parseFloat(String(kgRaw).replace(',', '.')) : null;
            repsN = repsRaw !== '' && repsRaw != null ? parseInt(repsRaw, 10) : null;
            if (kgN != null && isNaN(kgN)) kgN = null;
            if (repsN != null && isNaN(repsN)) repsN = null;
          }
          return {
            n: si + 1,
            kg: kgN,
            reps: repsN,
            done: !!s.done,
          };
        });
      }
      return {
        name: e.name,
        warm: !!e.warm,
        main: isMainLift(e),
        text: e.text || '',
        done: ck.includes(i) || (sets && sets.some(x => x.done)),
        sets: sets,
      };
    }),
  };
  S.workoutLog = S.workoutLog || [];
  S.workoutLog.unshift(entry);
  if (S.workoutLog.length > 100) S.workoutLog.length = 100;
}
function deleteWorkoutLog(id) {
  if (!confirm('Eliminare questa voce dallo storico?\nIl Piano si aggiornerà di conseguenza.')) return;
  if (!confirm('Sei sicuro? Non si può annullare.')) return;
  const entry = (S.workoutLog || []).find(x => x.id === id);
  S.workoutLog = (S.workoutLog || []).filter(x => x.id !== id);
  if (entry && entry.week != null && entry.day != null && entry.day !== 'comp') {
    const k = entry.week + '|' + entry.day;
    if (S.chk) delete S.chk[k];
    if (S.accLog) delete S.accLog[k];
  }
  rebuildPianoFromStorico();
  save();
  render();
}
function finish() {
  try { flushSetInputsFromDOM(); } catch (e) {}
  const w = W();
  if (!w || !S.today) return;
  const d = Number(S.today.day);
  const weekLabel = w.label;
  const done = (S.done[weekLabel] = S.done[weekLabel] || []);
  if (!done.map(Number).includes(d)) done.push(d);
  const exs = dayExercises(w, d);
  if (exs) {
    saveSessionLogs(weekLabel, d, exs);
    logFinishedWorkout(weekLabel, d);
  }
  rebuildPianoFromStorico();
  if (!remaining(w).length && S.wi < S.prog.weeks.length - 1) S.wi++;
  S.today = { date: dstr(), type: 'rest', finished: 1, week: weekLabel, day: d };
  save();
  render();
}
function calLink(w, d) {
  const [h, m] = (S.time || '17:00').split(':').map(Number);
  const s0 = new Date(); s0.setHours(h || 17, m || 0, 0, 0);
  const e0 = new Date(s0.getTime() + 5400000);
  const f = x => x.getFullYear() + pad(x.getMonth() + 1) + pad(x.getDate()) + 'T' + pad(x.getHours()) + pad(x.getMinutes()) + '00';
  const list = dayExercises(w, d) || [];
  const det = list.filter(x => !x.warm).map(x => {
    let t = x.text || '';
    t = t.replace(/(\d+(?:[.,]\d+)?)\s*%/g, (mm, p) => {
      if (!x.lift) return mm;
      const kg = Math.round(parseFloat(String(p).replace(',', '.')) / 100 * S.max[x.lift] / 2.5) * 2.5;
      return p + '% (' + kg + 'kg)';
    });
    return x.name + ': ' + t;
  }).join('\n');
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent('🏋️ ' + focus(w, d) + ' – ' + w.label + ' G' + d) + '&dates=' + f(s0) + '/' + f(e0) + '&details=' + encodeURIComponent(det);
}
function oggi() {
  if (!S.prog) return importCard();
  const w = W();
  if (!w) return importCard();

  const t = S.today;
  if (t && t.week) {
    const idx = S.prog.weeks.findIndex(x => x.label === t.week);
    if (idx >= 0) S.wi = idx;
  }
  const week = W() || w;

  // Allenamento in corso: priorità massima
  if (t && t.date === dstr() && t.type === 'train' && t.day != null && t.day !== 'comp' && !Number.isNaN(Number(t.day))) {
    return renderTrainSession(week, Number(t.day));
  }

  // se c'è un modal giorno aperto, sotto mostriamo solo uno sfondo minimale
  if (S.dayModal) {
    return `<div class="card muted-card"><p class="mut" style="text-align:center;margin:0">Rispondi al popup per continuare</p></div>`;
  }

  const tot = days(week).length;
  const rem = remaining(week);
  const doneN = tot - rem.length;
  const pct = tot > 0 ? (doneN / tot) * 100 : 0;
  const progress = `<p class="mut">${esc(week.label)} · completati ${doneN} su ${tot}</p>
    <div class="bar"><i style="width:${pct}%"></i></div>`;

  // Home: non risposto / ask
  if (!t || t.date !== dstr() || t.type === 'ask') {
    const wd = weekdayMon0();
    const todayLog = (S.weekLog[week.label] || {})[wd];
    const todayKind = logType(todayLog);

    if (todayKind) {
      const isTrain = todayKind === 'train';
      const dayN = logDayNum(todayLog);
      let detail = 'Oggi è registrato come riposo.';
      if (isTrain) {
        if (dayN === 'comp') detail = 'Oggi: complementari (extra)';
        else if (dayN != null) detail = 'Oggi: allenamento · Giorno ' + dayN;
        else detail = 'Oggi: allenamento';
      }
      return `<div class="card home-card">
        ${progress}
        <p class="date-line">${todayLabel()}</p>
        <p class="big">${isTrain ? 'Allenamento fatto ✓' : 'Giorno di riposo 😴'}</p>
        <p class="mut">${detail}</p>
        <button type="button" onclick="cambiaOggi()">Cambia risposta</button>
      </div>${coachImg()}`;
    }

    return `<div class="card home-card">
      ${progress}
      <p class="date-line">${todayLabel()}</p>
      <p class="big">Che giorno è oggi?</p>
      <div class="row">
        <button type="button" onclick="setToday('rest')">😴 Riposo</button>
        <button type="button" class="pri" onclick="S.today={date:dstr(),type:'pick'};save();render()">💪 Allenamento</button>
      </div>
    </div>${coachImg()}`;
  }

  if (t.type === 'pick') {
    const allDays = days(week);
    const doneArr = (S.done[week.label] || []).map(Number);
    const btns = allDays.map(d => {
      const done = doneArr.includes(Number(d));
      return `<button type="button" style="border-left:8px solid ${AC[(d - 1) % 4]}" onclick="setToday('train',${d})">Giorno ${d} — ${focus(week, d)}${done ? ' ✓' : ''}</button>`;
    }).join('') || '<p class="mut">Nessun giorno in questa settimana</p>';
    return `<div class="card home-card">
      <p class="date-line">${todayLabel()}</p>
      <p class="big">Quale allenamento?</p>
      <p class="mut">${esc(week.label)} · tocca un giorno per aprire gli esercizi</p>
      ${btns}
      <button type="button" style="border-left:8px solid #30a46c" onclick="setToday('train','comp')">🔧 Complementari</button>
      <button type="button" onclick="askDay()">← Indietro</button>
      <button type="button" onclick="S.today=null;save();render()">🏠 Torna alla home</button>
    </div>`;
  }

  if (t.type === 'rest') {
    return `<div class="card home-card">
      <p class="date-line">${todayLabel()}</p>
      <p class="big">${t.finished ? 'Allenamento fatto ✓' : 'Giorno di riposo 😴'}</p>
      <p class="mut">Prossimo: ${esc(week.label)}${remaining(week).length ? ' · giorno ' + remaining(week)[0] : ''}</p>
      <div class="row">
        <button type="button" onclick="askDay()">Cambia risposta</button>
        <button type="button" class="pri" onclick="S.today=null;save();render()">🏠 Home</button>
      </div>
    </div>${coachImg()}`;
  }

  // fallback
  return `<div class="card home-card">
    <p class="date-line">${todayLabel()}</p>
    <p class="big">Scegli l'allenamento</p>
    <button type="button" class="pri" onclick="askDay()">Scegli il giorno</button>
  </div>`;
}

/** Schermata esercizi + timer durante l'allenamento */
function renderTrainSession(week, day) {
  if (!week) {
    return `<div class="card home-card"><p class="big">Scheda non trovata</p><button type="button" onclick="askDay()">Indietro</button></div>`;
  }
  const d = day;
  const ex = dayExercises(week, d);
  if (!ex || !Array.isArray(ex) || !ex.length) {
    return `<div class="card home-card">
      <p class="date-line">${todayLabel()}</p>
      <p class="big">Nessun esercizio</p>
      <p class="mut">${esc(week.label)} · giorno ${d}</p>
      <button type="button" class="pri" onclick="askDay()">Scegli un altro giorno</button>
    </div>`;
  }
  const k = week.label + '|' + d;
  const ck = S.chk[k] || [];
  const left = ex.length - ck.length;
  const ac = AC[(Number(d) - 1) % 4];
  const pctDone = ex.length ? (ck.length / ex.length * 100) : 0;

  const list = ex.map((e, i) => {
    const acc = isAccessory(e);
    const rest = !e.warm ? getRestSec(e.name) : 0;
    const hist = !e.warm ? historyHtml(e.name) : '';
    const nmJs = JSON.stringify(e.name);
    const timerBtn = !e.warm
      ? `<div class="rest-row">
          <button type="button" class="rest-start" data-ex="${esc(e.name)}" onclick='startRest(${nmJs}, event)'>⏱ Avvia ${fmtRest(rest)}</button>
          <button type="button" class="rest-set" data-ex="${esc(e.name)}" onclick='openRestPicker(${nmJs}, event)'>Tempo</button>
        </div>`
      : '';
    const setsBlock = !e.warm ? (setsLogHtml(week.label, d, i, e) + hist) : '';
    return `<div class="ex ${e.warm ? 'w' : ''} ${e.lift ? 'main' : ''} ${acc ? 'acc' : ''} ${ck.includes(i) ? 'ok' : ''}">
      <div class="n" onclick="tg(${i})" role="button">${ck.includes(i) ? '✓' : (i + 1)}</div>
      <div class="ex-body">
        <div class="ex-head" onclick="tg(${i})" role="button">
          <div class="nm">${esc(e.name)}</div>
          <div class="dt">${fmt(e.text, e.lift)}</div>
        </div>
        ${setsBlock}
        ${timerBtn}
      </div>
    </div>`;
  }).join('');

  return `${restBarHtml()}
  <div class="train-wrap" style="--ac:${ac}">
    <div class="hero">
      <div class="mut">${esc(week.label)} · GIORNO ${d}</div>
      <p class="big">${focus(week, d)}</p>
      <div class="mut">${ck.length}/${ex.length} esercizi fatti</div>
      <div class="bar"><i style="width:${pctDone}%"></i></div>
    </div>
    ${list}
    <div class="card card-time">
      <label>Orario allenamento</label>
      <input type="time" value="${S.time}" onchange="if(this.value){S.time=this.value;save();render()}else{this.value=S.time}">
      <a class="btn" target="_blank" rel="noopener" href="${calLink(week, d)}">📅 Aggiungi al calendario</a>
    </div>
    <button type="button" class="pri" style="background:${ac};color:#fff" ${left ? 'disabled' : ''} onclick="finish()">${left ? 'Mancano ' + left + ' esercizi' : 'Allenamento finito ✓'}</button>
    ${left ? `<button type="button" onclick="finish()">Segna finito comunque</button>` : ''}
    <button type="button" onclick="askDay()">Cambia giorno</button>
    <button type="button" onclick="S.today=null;save();render()">🏠 Torna alla home</button>
  </div>`;
}

// Funzione helper per l'aggiornamento
function updateMax(lift, inputElement) {
  let val = parseFloat(inputElement.value);
  if (isNaN(val) || val <= 0) {
    inputElement.value = S.max[lift];
    alert('Inserisci un valore numerico valido maggiore di 0.');
  } else {
    S.max[lift] = val;
    save();
  }
}



function csvEsc(v) {
  const t = v == null ? '' : String(v);
  if (/[",\n\r]/.test(t)) return '"' + t.replace(/"/g, '""') + '"';
  return t;
}
function csvParse(text) {
  const rows = [];
  let i = 0, field = '', row = [], inQ = false;
  const s = String(text).replace(/^\uFEFF/, '');
  while (i < s.length) {
    const c = s[i];
    if (inQ) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQ = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQ = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(x => x !== '')) rows.push(row);
      row = []; i++; continue;
    }
    field += c; i++;
  }
  row.push(field);
  if (row.some(x => x !== '')) rows.push(row);
  return rows;
}
function exportWorkoutCsv() {
  const list = S.workoutLog || [];
  if (!list.length) {
    alert('Nessun allenamento nello storico da esportare.');
    return;
  }
  const headers = ['workout_id','date','at','prog_id','prog_name','week','day','title','exercise','warm','main','exercise_done','set_n','kg','reps','set_done'];
  const lines = [headers.join(',')];
  list.forEach(w => {
    const exs = w.exercises && w.exercises.length ? w.exercises : [{ name: '', warm: 0, main: 0, done: 0, sets: [] }];
    exs.forEach(e => {
      const sets = (e.sets && e.sets.length)
        ? e.sets
        : [{ n: 1, kg: e.kg, reps: e.reps, done: e.done }];
      sets.forEach((st, si) => {
        lines.push([
          csvEsc(w.id),
          csvEsc(w.date),
          csvEsc(w.at || ''),
          csvEsc(w.progId || ''),
          csvEsc(w.progName || ''),
          csvEsc(w.week),
          csvEsc(w.day),
          csvEsc(w.title || ''),
          csvEsc(e.name || ''),
          e.warm ? 1 : 0,
          e.main ? 1 : 0,
          e.done ? 1 : 0,
          st.n != null ? st.n : (si + 1),
          st.kg != null && st.kg !== '' ? st.kg : '',
          st.reps != null && st.reps !== '' ? st.reps : '',
          st.done ? 1 : 0
        ].join(','));
      });
    });
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'storico-allenamenti-' + dstr() + '.csv';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
}
/** Controlla che i workout del CSV combacino con la scheda caricata */
function validateWorkoutsAgainstProg(workouts) {
  const progs = allKnownProgs();
  if (!progs.length) {
    return 'Carica prima almeno una scheda di allenamento (.docx) dal Piano, poi importa il CSV.';
  }
  for (const w of workouts) {
    if (!w.week) return 'CSV non valido: manca la colonna week / settimana.';
    const matched = findProgForWorkout(w);
    if (!matched) {
      const weeks = progs.flatMap(p => (p.weeks || []).map(x => x.label)).join(', ');
      return 'Errore: allenamento ' + w.week + ' giorno ' + w.day +
        ' non corrisponde a nessuna scheda presente in app.\n' +
        'Settimane note: ' + weeks;
    }
    w.progId = w.progId || matched.id;
    w.progName = w.progName || matched.name;
  }
  return null;
}
function workoutsFromCsvRows(rows) {
  if (!rows || rows.length < 2) throw new Error('File CSV vuoto o senza dati.');
  const header = rows[0].map(h => String(h).trim().toLowerCase());
  const need = ['week', 'day', 'exercise'];
  for (const n of need) {
    if (!header.includes(n) && !header.includes(n + '_id')) {
      // week required
    }
  }
  const col = (name) => {
    const alts = {
      workout_id: ['workout_id', 'id', 'workout'],
      date: ['date', 'data'],
      at: ['at', 'timestamp', 'iso'],
      week: ['week', 'settimana', 'week_label'],
      day: ['day', 'giorno'],
      title: ['title', 'titolo', 'focus'],
      exercise: ['exercise', 'esercizio', 'name', 'nome'],
      warm: ['warm', 'warmup', 'riscaldamento'],
      main: ['main', 'fondamentale'],
      exercise_done: ['exercise_done', 'ex_done', 'done_ex'],
      set_n: ['set_n', 'serie', 'set', 'n'],
      kg: ['kg', 'weight', 'peso'],
      reps: ['reps', 'rip', 'rep', 'ripetizioni'],
      set_done: ['set_done', 'done', 'fatta']
    };
    const list = alts[name] || [name];
    for (const a of list) {
      const i = header.indexOf(a);
      if (i >= 0) return i;
    }
    return -1;
  };
  const iWeek = col('week'), iDay = col('day'), iEx = col('exercise');
  if (iWeek < 0 || iDay < 0 || iEx < 0) {
    throw new Error('CSV non valido: servono almeno le colonne week, day, exercise.');
  }
  const iId = col('workout_id'), iDate = col('date'), iAt = col('at'), iTitle = col('title');
  const iProgId = header.indexOf('prog_id'), iProgName = header.indexOf('prog_name');
  const iWarm = col('warm'), iMain = col('main'), iExDone = col('exercise_done');
  const iSetN = col('set_n'), iKg = col('kg'), iReps = col('reps'), iSetDone = col('set_done');

  const map = new Map(); // key = id or date|week|day
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !row.length) continue;
    const week = String(row[iWeek] || '').trim();
    const day = String(row[iDay] || '').trim();
    const exName = String(row[iEx] || '').trim();
    if (!week && !day && !exName) continue;
    const id = iId >= 0 && row[iId] ? String(row[iId]).trim() : (week + '|' + day + '|' + (iDate >= 0 ? row[iDate] : r));
    if (!map.has(id)) {
      map.set(id, {
        id: id,
        date: iDate >= 0 ? String(row[iDate] || dstr()).trim() : dstr(),
        at: iAt >= 0 ? String(row[iAt] || '').trim() : new Date().toISOString(),
        week: week,
        day: /^\d+$/.test(day) ? Number(day) : day,
        title: iTitle >= 0 ? String(row[iTitle] || '').trim() : '',
        progId: iProgId >= 0 ? String(row[iProgId] || '').trim() : '',
        progName: iProgName >= 0 ? String(row[iProgName] || '').trim() : '',
        exercises: []
      });
    }
    const w = map.get(id);
    let ex = w.exercises.find(e => e.name === exName);
    if (!ex) {
      ex = {
        name: exName,
        warm: iWarm >= 0 ? (row[iWarm] === '1' || row[iWarm] === 'true') : false,
        main: iMain >= 0 ? (row[iMain] === '1' || row[iMain] === 'true') : false,
        done: iExDone >= 0 ? (row[iExDone] === '1' || row[iExDone] === 'true') : false,
        sets: []
      };
      w.exercises.push(ex);
    }
    const sn = iSetN >= 0 && row[iSetN] !== '' ? Number(row[iSetN]) : (ex.sets.length + 1);
    const kgRaw = iKg >= 0 ? row[iKg] : '';
    const repsRaw = iReps >= 0 ? row[iReps] : '';
    const kgN = kgRaw !== '' && kgRaw != null ? parseFloat(String(kgRaw).replace(',', '.')) : null;
    const repsN = repsRaw !== '' && repsRaw != null ? parseInt(repsRaw, 10) : null;
    ex.sets.push({
      n: Number.isNaN(sn) ? ex.sets.length + 1 : sn,
      kg: kgN != null && !isNaN(kgN) ? kgN : null,
      reps: repsN != null && !isNaN(repsN) ? repsN : null,
      done: iSetDone >= 0 ? (row[iSetDone] === '1' || row[iSetDone] === 'true') : false
    });
  }
  return [...map.values()];
}
function importWorkoutCsvFile(input) {
  const file = input && input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function () {
    try {
      const rows = csvParse(reader.result);
      const workouts = workoutsFromCsvRows(rows);
      if (!workouts.length) {
        alert('Nessun allenamento trovato nel CSV.');
        input.value = '';
        return;
      }
      const err = validateWorkoutsAgainstProg(workouts);
      if (err) {
        alert(err);
        input.value = '';
        return;
      }
      let replace = false;
      if ((S.workoutLog || []).length) {
        replace = confirm(
          'Trovati ' + workouts.length + ' allenamenti validi.\n\n' +
          'OK = SOSTITUISCI tutto lo storico\n' +
          'Annulla = AGGIUNGI a quelli esistenti'
        );
      } else if (!confirm('Importare ' + workouts.length + ' allenamenti nello storico?')) {
        input.value = '';
        return;
      }
      if (replace) {
        const histProgIds = new Set((S.workoutLog || []).map(x => x.progId).filter(Boolean));
        const csvProgIds = new Set(workouts.map(x => x.progId).filter(Boolean));
        const missing = [...histProgIds].filter(id => !csvProgIds.has(id));
        if (missing.length) {
          const names = missing.map(id => {
            const p = (S.progCatalog || []).find(x => x.id === id);
            const fromLog = (S.workoutLog || []).find(x => x.progId === id);
            return (p && p.name) || (fromLog && fromLog.progName) || id;
          });
          alert(
            'Impossibile sostituire: il CSV non contiene tutte le schede già presenti nello storico.\n' +
            'Schede mancanti: ' + names.join(', ') + '\n\n' +
            'Esporta prima lo storico completo, oppure scegli AGGIUNGI.'
          );
          input.value = '';
          return;
        }
        S.workoutLog = workouts;
      } else {
        const ids = new Set((S.workoutLog || []).map(w => w.id));
        const toAdd = workouts.filter(w => !ids.has(w.id));
        S.workoutLog = toAdd.concat(S.workoutLog || []);
        if (S.workoutLog.length > 200) S.workoutLog.length = 200;
      }
      rebuildPianoFromStorico();
      save();
      render();
      alert('Import completato: ' + workouts.length + ' allenamenti.');
    } catch (e) {
      alert('Errore lettura CSV: ' + (e && e.message ? e.message : e));
    }
    input.value = '';
  };
  reader.onerror = function () {
    alert('Impossibile leggere il file.');
    input.value = '';
  };
  reader.readAsText(file, 'UTF-8');
}

function formatSetLine(s, idx) {
  const n = s.n != null ? s.n : (idx + 1);
  const kg = s.kg != null && s.kg !== '' ? String(s.kg).replace('.', ',') + ' kg' : '— kg';
  const reps = s.reps != null && s.reps !== '' ? String(s.reps) + ' rip' : '— rip';
  const mark = s.done ? '✓' : '·';
  return `<div class="hist-set ${s.done ? 'done' : ''}"><span class="hist-set-n">${mark} Serie ${n}</span><span class="hist-set-val">${esc(kg)} × ${esc(reps)}</span></div>`;
}
function storico() {
  const list = S.workoutLog || [];
  const tools = `<div class="card hist-tools">
    <p class="big" style="font-size:16px;margin:0 0 8px">Esporta / Importa</p>
    <p class="mut" style="margin-bottom:10px">CSV con kg e rip di ogni serie. L'import deve corrispondere a una scheda presente in app (attuale o precedenti). Se sostituisci, il CSV deve includere tutte le schede già nello storico.</p>
    <button type="button" class="pri" onclick="exportWorkoutCsv()">⬇️ Esporta storico CSV</button>
    <label class="btn" style="margin-top:8px;cursor:pointer">⬆️ Importa CSV
      <input type="file" accept=".csv,text/csv" style="display:none" onchange="importWorkoutCsvFile(this)">
    </label>
  </div>`;
  if (!list.length) {
    return tools + `<div class="card"><p class="big">Storico allenamenti</p>
      <p class="mut">Quando termini un allenamento, qui vedrai ogni esercizio con kg e rip di ogni serie.</p>
    </div>`;
  }
  // migrazione: assegna scheda corrente agli allenamenti senza progId
  if (S.prog) {
    ensureProgMeta(S.prog);
    list.forEach(w => {
      if (!w.progId) {
        w.progId = S.prog.id;
        w.progName = w.progName || S.prog.name;
      }
    });
  }
  // raggruppa per scheda — titolo = nome file .docx
  const progsById = {};
  allKnownProgs().forEach(p => { progsById[p.id] = p; });
  const groups = new Map();
  list.forEach(w => {
    const key = w.progId || w.progName || 'unknown';
    if (!groups.has(key)) {
      const p = progsById[w.progId] || (S.prog && S.prog.id === w.progId ? S.prog : null);
      const fileLabel = p
        ? displayProgFileName(p)
        : displayProgFileName({ name: w.progName || w.progFileName || 'Scheda' });
      groups.set(key, { id: key, name: fileLabel, items: [] });
    }
    const g = groups.get(key);
    // preferisci sempre il nome file dal catalogo/scheda attuale
    const p = progsById[w.progId] || (S.prog && S.prog.id === w.progId ? S.prog : null);
    if (p) g.name = displayProgFileName(p);
    else if (w.progFileName) g.name = displayProgFileName({ fileName: w.progFileName, name: w.progName });
    g.items.push(w);
  });
  // ordine: scheda attuale prima, poi le altre
  const ordered = [...groups.values()].sort((a, b) => {
    if (S.prog && a.id === S.prog.id) return -1;
    if (S.prog && b.id === S.prog.id) return 1;
    return 0;
  });

  function renderWorkoutCard(w) {
    if (entryType(w) === 'rest') {
      const wdName = w.weekday != null ? WD[w.weekday] : '';
      return `<div class="card hist-workout hist-rest">
        <div class="wk-top"><b>${esc(w.date)}</b>
          <button class="res-btn" onclick="deleteWorkoutLog('${w.id}')">❌</button>
        </div>
        <p class="big" style="font-size:18px;margin:6px 0">😴 Riposo</p>
        <p class="mut">${esc(w.week)}${wdName ? ' · ' + wdName : ''}</p>
      </div>`;
    }
    const exList = (w.exercises || []).filter(e => !e.warm);
    const doneN = exList.filter(e => e.done || (e.sets && e.sets.some(s => s.done))).length;
    const tot = exList.length;
    const blocks = exList.map(e => {
      let setsHtml = '';
      if (e.sets && e.sets.length) {
        setsHtml = `<div class="hist-sets">${e.sets.map((s, si) => formatSetLine(s, si)).join('')}</div>`;
      } else if (e.kg != null || e.reps != null) {
        setsHtml = `<div class="hist-sets">${formatSetLine({ n: 1, kg: e.kg, reps: e.reps, done: e.done }, 0)}</div>`;
      } else if (w.fromPiano) {
        setsHtml = `<p class="mut hist-nosets">Segnato dal Piano (senza dettaglio serie)</p>`;
      } else {
        setsHtml = `<p class="mut hist-nosets">Nessun carico registrato</p>`;
      }
      return `<div class="hist-ex-block ${e.done ? 'ok' : ''}">
        <div class="hist-ex-name">${e.done ? '✓ ' : ''}${esc(e.name)}</div>
        ${setsHtml}
      </div>`;
    }).join('');
    const dayLabel = w.day === 'comp' ? 'Complementari' : ('Giorno ' + w.day);
    return `<div class="card hist-workout">
      <div class="wk-top"><b>${esc(w.date)}</b>
        <button class="res-btn" onclick="deleteWorkoutLog('${w.id}')">❌</button>
      </div>
      <p class="big" style="font-size:18px;margin:6px 0">${esc(w.week)} · ${esc(dayLabel)}</p>
      <p class="mut">${esc(w.title || '')}${tot ? ' · ' + doneN + '/' + tot + ' esercizi' : ''}</p>
      <div class="hist-ex-list">${blocks}</div>
    </div>`;
  }

  return tools + `<h1>Storico</h1>` + ordered.map(g => {
    const isCurrent = S.prog && g.id === S.prog.id;
    const fileLabel = /\.docx$/i.test(g.name) ? g.name : (g.name + '.docx');
    return `<div class="hist-prog-section">
      <h2 class="hist-prog-title">${isCurrent ? '📌' : '📁'} ${esc(fileLabel)}</h2>
      <p class="mut" style="margin:0 0 10px">${isCurrent ? 'Scheda attuale · ' : ''}${g.items.length} allenament${g.items.length === 1 ? 'o' : 'i'}</p>
      ${g.items.map(renderWorkoutCard).join('')}
    </div>`;
  }).join('');
}

function piano() {
  if (!S.prog) return importCard();
  const m = S.max;
  const pushBtn = S.pushOn
    ? `<button onclick="disablePush()">🔕 Disattiva notifiche</button><button onclick="testPush()">🔔 Invia notifica di prova</button>`
    : `<button class="pri" onclick="enablePush()">🔔 Attiva notifiche</button>`;
  const makeEditCard = (forWeek) => {
    if (!S.dayEdit || S.dayEdit.week !== forWeek) return '';
    const name = WD[S.dayEdit.wd];
    const cur = ((S.weekLog || {})[S.dayEdit.week] || {})[S.dayEdit.wd];
    const kind = logType(cur);
    const curTxt = kind === 'train' ? (logDayNum(cur) === 'comp' ? 'complementari' : ('allenamento' + (logDayNum(cur) != null ? ' G' + logDayNum(cur) : ''))) : kind === 'rest' ? 'riposo' : 'non registrato';
    const wObj = S.prog.weeks.find(x => x.label === S.dayEdit.week) || W();
    if (S.dayEdit.step === 'pickTrain' && wObj) {
      const ds = days(wObj);
      return `<div class="card edit-day" id="edit-day-panel"><p class="big">Quale allenamento?</p><p class="mut">${esc(S.dayEdit.week)} · ${name}</p>
        ${ds.map(d => `<button style="border-left:8px solid ${AC[(d - 1) % 4]}" onclick="setWdayTrain(${d})">Giorno ${d} — ${focus(wObj, d)}</button>`).join('') || '<p class="mut">Nessun giorno in questa settimana</p>'}
        <button style="border-left:8px solid #30a46c" onclick="setWdayTrain('comp')">🔧 Complementari <span class="mut" style="font-weight:600">(extra, fuori scheda)</span></button>
        <button onclick="S.dayEdit={...S.dayEdit,step:'type'};save();render()">← Indietro</button>
        <button onclick="cancelDayEdit()">Annulla</button>
      </div>`;
    }
    return `<div class="card edit-day" id="edit-day-panel"><p class="big">Modifica ${name}</p><p class="mut">${esc(S.dayEdit.week)} · ora: ${curTxt}</p>
      <button class="pri" style="background:#e5484d;color:#fff" onclick="setWday('train')">💪 Allenamento</button>
      <button class="pri" style="background:#3e8bff;color:#fff" onclick="setWday('rest')">😴 Riposo</button>
      <button onclick="setWday('clear')">Cancella</button>
      <button onclick="cancelDayEdit()">Annulla</button>
    </div>`;
  };
  return `<h1>Massimali (kg)</h1><div class="card"><div class="row">
  <div><label>Squat</label><input type="number" inputmode="decimal" min="1" step="0.5" value="${m.s}" onchange="updateMax('s', this)"></div>
  <div><label>Panca</label><input type="number" inputmode="decimal" min="1" step="0.5" value="${m.b}" onchange="updateMax('b', this)"></div>
  <div><label>Stacco</label><input type="number" inputmode="decimal" min="1" step="0.5" value="${m.d}" onchange="updateMax('d', this)"></div>
  </div></div>
  <h1>Notifiche</h1>
  <div class="card">
    <p class="mut" style="margin-bottom:12px">Promemoria ogni mattina alle ~7:00. Su iPhone: aggiungi l'app alla Home Screen da Safari, poi attiva qui.</p>
    ${pushBtn}
  </div>
  <h1>Settimane</h1>${S.prog.weeks.map((w, i) => `${makeEditCard(w.label)}<div class="wk ${i === S.wi ? 'cur' : ''} ${S.dayEdit && S.dayEdit.week === w.label ? 'wk-editing' : ''}" onclick="S.wi=${i};save();render()"><div class="wk-top"><b>${esc(w.label)}</b><button class="res-btn" onclick="resetWk('${w.label}', event)">❌</button></div>${weekDots(w)}</div>`).join('')}
  <p class="mut">Tocca un giorno (Lun–Dom) per impostare allenamento o riposo. Rosso = allenamento · blu = riposo · grigio = non registrato.</p>
  <h1>Nuova scheda</h1><div class="card"><label class="btn" style="margin:0;cursor:pointer">🔄 Cambia file della scheda<input type="file" accept=".docx" style="display:none" onchange="imp(this)"></label><p id="err" class="mut"></p></div>`;
}
function resetWk(label, e) {
  e.stopPropagation();
  if (confirm('Attenzione: Vuoi davvero resettare gli allenamenti per la settimana ' + label + '?')) {
    if (confirm('Sei ASSOLUTAMENTE sicuro? Questa operazione non può essere annullata e perderai i progressi della settimana.')) {
      S.workoutLog = (S.workoutLog || []).filter(w => String(w.week) !== String(label));
      Object.keys(S.chk || {}).forEach(k => { if (k.startsWith(label + '|')) delete S.chk[k] });
      Object.keys(S.accLog || {}).forEach(k => { if (k.startsWith(label + '|')) delete S.accLog[k] });
      rebuildPianoFromStorico();
      save();
      render();
    }
  }
}

/** Collegamento sicuro bottoni timer + tap sulle card serie */
function bindRestButtons() {
  document.querySelectorAll('.rest-start').forEach(btn => {
    btn.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      flushSetInputsFromDOM(); // non perdere kg/rip digitati
      startRest(btn.getAttribute('data-ex') || '', ev);
    };
  });
  document.querySelectorAll('.rest-set').forEach(btn => {
    btn.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      flushSetInputsFromDOM();
      openRestPicker(btn.getAttribute('data-ex') || '', ev);
    };
  });
  document.querySelectorAll('.set-card').forEach(card => {
    card.onclick = function (ev) {
      if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.closest('input'))) return;
      ev.preventDefault();
      ev.stopPropagation();
      const name = card.getAttribute('data-ex') || '';
      const week = card.getAttribute('data-week');
      const day = Number(card.getAttribute('data-day'));
      const exi = Number(card.getAttribute('data-exi'));
      const seti = Number(card.getAttribute('data-set'));
      if (!name || week == null || Number.isNaN(exi) || Number.isNaN(seti)) return;

      // salva prima i valori ancora solo nel DOM
      flushSetInputsFromDOM();

      const already = card.classList.contains('set-done');
      if (already) {
        markSetDone(week, day, exi, seti, false);
        render();
        return;
      }
      markSetDone(week, day, exi, seti, true);
      startRest(name, ev);
    };
  });
  document.querySelectorAll('.set-card input').forEach(inp => {
    inp.addEventListener('click', ev => ev.stopPropagation());
    inp.addEventListener('focus', ev => ev.stopPropagation());
    // niente secondo listener input: gli oninput inline bastano e non troncano le cifre
    inp.addEventListener('blur', function () {
      const card = inp.closest('.set-card');
      if (!card) return;
      const week = card.getAttribute('data-week');
      const day = Number(card.getAttribute('data-day'));
      const exi = Number(card.getAttribute('data-exi'));
      const seti = Number(card.getAttribute('data-set'));
      if (week == null || Number.isNaN(exi) || Number.isNaN(seti)) return;
      const inputs = [...card.querySelectorAll('input')];
      const idx = inputs.indexOf(inp);
      if (idx === 0) {
        setExSetLog(week, day, exi, seti, 'kg', inp.value);
        cascadeKgFromSet(week, day, exi, seti);
      } else if (idx === 1) {
        setExSetLog(week, day, exi, seti, 'reps', inp.value);
      }
    });
  });
}

function render() {
  try {
    const w = S.prog && W(), ac = S.view === 'oggi' && S.today && S.today.type === 'train' && S.today.day != null && S.today.day !== 'comp' ? AC[(S.today.day - 1) % 4] : '#3e8bff';
    document.documentElement.style.setProperty('--ac', ac);
    const t0 = $('t0'), t1 = $('t1'), t2 = $('t2');
    if (t0) t0.className = S.view === 'oggi' ? 'on' : '';
    if (t1) t1.className = S.view === 'piano' ? 'on' : '';
    if (t2) t2.className = S.view === 'storico' ? 'on' : '';
    let body = '';
    if (S.view === 'oggi') body = oggi();
    else if (S.view === 'storico') body = storico();
    else body = piano();
    $('app').innerHTML = body + dayModalHtml() + restPickerHtml();
    document.body.classList.toggle('modal-open', !!(S.dayModal || S.restPicker));
    bindRestButtons();
    if (S.dayEdit) {
      requestAnimationFrame(() => {
        const el = document.getElementById('edit-day-panel');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  } catch (err) {
    console.error('render error', err);
    try {
      $('app').innerHTML = `<div class="card"><p class="big">Errore di visualizzazione</p>
        <p class="mut">${esc(String(err && err.message || err))}</p>
        <button type="button" class="pri" onclick="S.dayModal=null;S.restPicker=null;S.today={date:dstr(),type:'ask'};save();render()">Torna alla home</button>
      </div>`;
    } catch (e2) {
      console.error(e2);
    }
  }
}

// Avvio: notifica (?prompt=1) o prima apertura del giorno
(function bootPrompt() {
  try {
    const q = new URLSearchParams(location.search);
    const fromNotif = q.get('prompt') === '1' || q.get('from') === 'notif';
    if (fromNotif) {
      history.replaceState({}, '', location.pathname);
      openDayModal(true);
      return;
    }
  } catch (e) {}
  // delay leggero così il DOM è pronto
  setTimeout(() => openDayModal(false), 120);
})();

rebuildPianoFromStorico();
render();
// Espone funzioni usate dagli onclick inline (iOS / strict)
window.startRest = startRest;
window.stopRest = stopRest;
window.openRestPicker = openRestPicker;
window.closeRestPicker = closeRestPicker;
window.adjustRestPicker = adjustRestPicker;
window.setRestPickerPreset = setRestPickerPreset;
window.confirmRestPicker = confirmRestPicker;
window.fmtRest = fmtRest;
window.tg = tg;
window.setExSetLog = setExSetLog;
window.cascadeKgFromSet = cascadeKgFromSet;
window.markSetDone = markSetDone;
window.exportWorkoutCsv = exportWorkoutCsv;
window.importWorkoutCsvFile = importWorkoutCsvFile;
/* ========== Push Notifications ========== */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function getVapidKey() {
  const r = await fetch('/api/vapid');
  if (!r.ok) throw new Error('VAPID non configurato sul server');
  const j = await r.json();
  return j.publicKey;
}

async function enablePush() {
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Questo browser non supporta le notifiche push. Usa Safari su iPhone (aggiungi l\'app alla Home) o Chrome su Android.');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      alert('Permesso notifiche negato. Abilitalo dalle impostazioni del telefono.');
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const key = await getVapidKey();
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key)
      });
    }
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON() })
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Errore server');
    S.pushOn = true;
    save();
    alert('✅ Notifiche attivate! Riceverai un promemoria ogni mattina.');
    render();
  } catch (e) {
    console.error(e);
    alert('Errore: ' + (e.message || e));
  }
}

async function disablePush() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), action: 'unsubscribe' })
      });
      await sub.unsubscribe();
    }
    S.pushOn = false;
    save();
    alert('Notifiche disattivate.');
    render();
  } catch (e) {
    alert('Errore: ' + e.message);
  }
}

async function testPush() {
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification('🏋️ Scheda Powerlifting', {
      body: 'Notifica di prova! Tutto funziona 💪',
      icon: '/coach.jpg',
      badge: '/coach.jpg',
      tag: 'test'
    });
  } catch (e) {
    alert('Errore test: ' + e.message);
  }
}
