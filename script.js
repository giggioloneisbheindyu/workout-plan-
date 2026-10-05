const KEY = 'powerapp_v1', AC = ['#e5484d', '#3e8bff', '#e08a00', '#30a46c'], LN = { s: 'Squat', b: 'Panca', d: 'Stacco' };
let S = {};
try { S = JSON.parse(localStorage.getItem(KEY)) || {} } catch (e) { }
S.max = S.max || { s: 210, b: 110, d: 265 }; S.done = S.done || {}; S.chk = S.chk || {}; S.wi = S.wi || 0; S.view = S.view || 'oggi'; S.time = S.time || '17:00'; S.pushOn = S.pushOn || false; S.weekLog = S.weekLog || {}; S.promptedDate = S.promptedDate || null; S.dayModal = S.dayModal || null; S.accLog = S.accLog || {}; S.liftHistory = S.liftHistory || {}; S.restByEx = S.restByEx || {}; S.restDefault = S.restDefault || 120; S.restPicker = S.restPicker || null; S.workoutLog = S.workoutLog || []; S.progCatalog = S.progCatalog || []; S.pianoSession = S.pianoSession || null;
S.compModal = S.compModal || null;
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
  S.progCatalog = S.progCatalog || []; S.pianoSession = S.pianoSession || null;
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
    if (String(w.day) === 'comp') return p;
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
  if (dayNum === 'comp') { openCompModal('piano', S.dayEdit.week, S.dayEdit.wd); return; }
  // passo: vuoto o con carichi?
  S.dayEdit = { ...S.dayEdit, step: 'saveChoice', dayNum: dayNum };
  save();
  render();
}
function pianoSaveEmpty() {
  if (!S.dayEdit || S.dayEdit.dayNum == null) return;
  const { week, wd, dayNum } = S.dayEdit;
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
  save();
  render();
}
function pianoSaveWithLoads() {
  if (!S.dayEdit || S.dayEdit.dayNum == null) return;
  const { week, wd, dayNum } = S.dayEdit;
  if (dayNum === 'comp') {
    // complementari: solo segno vuoto (niente scheda serie)
    pianoSaveEmpty();
    return;
  }
  S.pianoSession = { week, wd, day: dayNum };
  S.dayEdit = null;
  // contesto sessione per tg / set log
  S.today = { date: dstr(), type: 'train', day: dayNum, week, fromPiano: true };
  save();
  render();
}
function cancelPianoSession() {
  S.pianoSession = null;
  if (S.today && S.today.fromPiano) S.today = { date: dstr(), type: 'ask' };
  save();
  render();
}
function savePianoSession() {
  try { flushSetInputsFromDOM(); } catch (e) {}
  const ps = S.pianoSession;
  if (!ps) return;
  const week = (S.prog && S.prog.weeks.find(x => x.label === ps.week)) || W();
  if (!week) return;
  const d = ps.day;
  const exs = dayExercises(week, d);
  if (exs && exs.length) {
    const k = week.label + '|' + d;
    // tutti gli esercizi contrassegnati fatti (anche senza kg/rip)
    S.chk[k] = exs.map((_, i) => i);
    exs.forEach((e, i) => {
      if (!e.warm) markAllSetsDone(week.label, d, i, true);
    });
    logFinishedWorkout(week.label, d, ps.wd);
  } else {
    clearCal(ps.week, ps.wd);
    addTrainMarkToStorico(ps.week, ps.wd, d);
  }
  rebuildPianoFromStorico();
  S.pianoSession = null;
  S.today = { date: dstr(), type: 'rest', finished: 1, week: ps.week, day: d };
  save();
  render();
}
function pianoSessionHtml() {
  if (!S.pianoSession || !S.prog) return '';
  const ps = S.pianoSession;
  const week = S.prog.weeks.find(x => x.label === ps.week);
  if (!week) return '';
  const d = ps.day;
  const ex = dayExercises(week, d) || [];
  const k = week.label + '|' + d;
  const ck = S.chk[k] || [];
  const ac = AC[(Number(d) - 1) % 4];
  const list = ex.map((e, i) => {
    const acc = isAccessory(e);
    const setsBlock = !e.warm ? setsLogHtml(week.label, d, i, e) : '';
    return `<div class="ex ${e.warm ? 'w' : ''} ${e.lift ? 'main' : ''} ${acc ? 'acc' : ''} ${ck.includes(i) ? 'ok' : ''}">
      <div class="n" onclick="tg(${i})" role="button">${ck.includes(i) ? '✓' : (i + 1)}</div>
      <div class="ex-body">
        <div class="ex-head" onclick="tg(${i})" role="button">
          <div class="nm">${esc(e.name)}</div>
          <div class="dt">${fmt(e.text, e.lift)}</div>
          ${techBadgesHtml(e)}
        </div>
        ${setsBlock}
      </div>
    </div>`;
  }).join('') || '<p class="mut">Nessun esercizio</p>';
  return `<div class="modal-backdrop piano-session-backdrop" id="piano-session-modal">
    <div class="modal-card piano-session-card" onclick="event.stopPropagation()" style="--ac:${ac}">
      <p class="big" style="margin-bottom:4px">Log carichi</p>
      <p class="mut" style="margin-bottom:12px">${esc(week.label)} · Giorno ${d} · ${esc(focus(week, d))}</p>
      <p class="mut" style="margin-bottom:12px;font-size:13px">Inserisci kg/rip dove puoi. Gli esercizi senza valori saranno comunque segnati come fatti (serie vuote).</p>
      <div class="piano-session-list train-wrap">${list}</div>
      <button type="button" class="pri" onclick="savePianoSession()">Salva nello storico</button>
      <button type="button" onclick="cancelPianoSession()">Annulla</button>
    </div>
  </div>`;
}
/* ===== Complementari: popup tabella + CSV Hevy ===== */
let _compCsv = null; // allenamenti letti dal CSV (solo in memoria)
const compEmptyRow = () => ({ name: '', sets: '', reps: '', kg: '' });
function openCompModal(source, week, wd) {
  S.dayModal = null; S.dayEdit = null; S.restPicker = null; _compCsv = null;
  S.compModal = { source, week, wd, csvIdx: 0, rows: [compEmptyRow(), compEmptyRow(), compEmptyRow()] };
  save(); render();
}
function closeCompModal() { S.compModal = null; _compCsv = null; save(); render(); }
/** legge la tabella dal DOM prima di ogni re-render */
function compSync() {
  if (!S.compModal) return;
  const rows = [];
  document.querySelectorAll('#comp-modal tr.comp-row').forEach(tr => {
    const v = c => (tr.querySelector('[data-c="' + c + '"]') || {}).value || '';
    rows.push({ name: v('name'), sets: v('sets'), reps: v('reps'), kg: v('kg') });
  });
  if (rows.length) S.compModal.rows = rows;
}
function compAddRow() { compSync(); S.compModal.rows.push(compEmptyRow()); save(); render(); }
function compDelRow(i) {
  compSync();
  S.compModal.rows.splice(i, 1);
  if (!S.compModal.rows.length) S.compModal.rows.push(compEmptyRow());
  save(); render();
}
/** righe tabella → esercizi storico (righe consecutive con stesso nome = stesso esercizio) */
function compRowsToExercises(rows) {
  const out = [];
  rows.forEach(r => {
    const name = String(r.name || '').trim();
    if (!name) return;
    const n = Math.max(1, Math.min(20, parseInt(r.sets, 10) || 1));
    const kg = parseFloat(String(r.kg).replace(',', '.'));
    const reps = parseInt(r.reps, 10);
    const sets = Array.from({ length: n }, () => ({ kg: isNaN(kg) ? null : kg, reps: isNaN(reps) ? null : reps, done: true }));
    const last = out[out.length - 1];
    if (last && liftKey(last.name) === liftKey(name)) sets.forEach(s => last.sets.push(s));
    else out.push({ name, warm: false, main: false, text: '', done: true, sets });
  });
  out.forEach(e => e.sets.forEach((s, i) => { s.n = i + 1; }));
  return out;
}
function saveCompModal(empty) {
  compSync();
  const m = S.compModal;
  if (!m) return;
  const exs = empty ? [] : compRowsToExercises(m.rows);
  const { week, wd } = m;
  clearCal(week, wd);
  addTrainMarkToStorico(week, wd, 'comp');
  const entry = S.workoutLog[0];
  entry.exercises = exs;
  entry.fromPiano = !exs.length;
  exs.forEach(e => pushLiftHistory(e.name, e.sets, week, 'comp'));
  rebuildPianoFromStorico();
  if (wd === weekdayMon0() && W() && week === W().label) {
    S.today = { date: dstr(), type: 'rest', finished: 1, week, day: 'comp' };
  }
  S.compModal = null; _compCsv = null;
  save(); render();
}
/* --- CSV (Hevy "Export Workouts"; supporta anche Strong e l'export di questa app) --- */
function parseGymCsv(rows) {
  if (rows.length && rows[0].length === 1 && String(rows[0][0]).includes(';')) rows = rows.map(r => String(r[0]).split(';'));
  if (rows.length < 2) throw new Error('CSV vuoto o senza dati.');
  const h = rows[0].map(x => String(x).trim().toLowerCase());
  const ci = (...n) => { for (const a of n) { const i = h.indexOf(a); if (i >= 0) return i; } return -1; };
  const iEx = ci('exercise_title', 'exercise name', 'exercise', 'esercizio');
  if (iEx < 0) throw new Error('CSV non riconosciuto: manca la colonna dell\'esercizio.');
  const iDate = ci('start_time', 'date', 'data'), iTitle = ci('title', 'workout name', 'titolo');
  const iType = ci('set_type'), iSetN = ci('set_order', 'set_n');
  const iKg = ci('weight_kg', 'kg', 'weight', 'peso'), iLb = ci('weight_lbs'), iReps = ci('reps', 'rip');
  const iWarm = ci('warm');
  const map = new Map();
  rows.slice(1).forEach(r => {
    const name = String(r[iEx] || '').trim();
    if (!name) return;
    if (iType >= 0 && /warm/i.test(r[iType] || '')) return;
    if (iWarm >= 0 && (r[iWarm] === '1' || r[iWarm] === 'true')) return;
    if (iSetN >= 0 && /^(w|rest timer)$/i.test(String(r[iSetN]).trim())) return;
    const date = iDate >= 0 ? String(r[iDate] || '').trim() : '';
    const title = iTitle >= 0 ? String(r[iTitle] || '').trim() : '';
    const key = date + '|' + title;
    if (!map.has(key)) map.set(key, { date, title, ts: Date.parse(date.replace(' ', 'T')) || 0, exs: [] });
    const w = map.get(key);
    let ex = w.exs.find(e => e.name === name);
    if (!ex) { ex = { name, sets: [] }; w.exs.push(ex); }
    let kg = iKg >= 0 && r[iKg] !== '' ? parseFloat(String(r[iKg]).replace(',', '.')) : NaN;
    if (isNaN(kg) && iLb >= 0 && r[iLb] !== '') kg = Math.round(parseFloat(String(r[iLb]).replace(',', '.')) * 0.45359237 * 2) / 2;
    const reps = iReps >= 0 ? parseInt(r[iReps], 10) : NaN;
    ex.sets.push({ kg: isNaN(kg) ? null : kg, reps: isNaN(reps) ? null : reps });
  });
  return [...map.values()].sort((a, b) => b.ts - a.ts);
}
/** serie identiche consecutive → una riga (es. 3 × 10 × 20 kg) */
function csvWorkoutToRows(w) {
  const rows = [];
  w.exs.forEach(e => {
    let prev = null;
    e.sets.forEach(s => {
      if (prev && prev.kg === s.kg && prev.reps === s.reps) { prev.row.sets++; return; }
      const row = { name: e.name, sets: 1, reps: s.reps, kg: s.kg };
      rows.push(row); prev = { kg: s.kg, reps: s.reps, row };
    });
  });
  return rows.map(r => ({ name: r.name, sets: String(r.sets), reps: r.reps != null ? String(r.reps) : '', kg: r.kg != null ? String(r.kg) : '' }));
}
function compUseCsv(idx) {
  if (!_compCsv || !_compCsv[idx]) return;
  S.compModal.csvIdx = idx;
  S.compModal.rows = csvWorkoutToRows(_compCsv[idx]);
  if (!S.compModal.rows.length) S.compModal.rows = [compEmptyRow()];
  save(); render();
}
function compPickCsv(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const ws = parseGymCsv(csvParse(fr.result));
      if (!ws.length) throw new Error('Nessun allenamento trovato nel CSV.');
      _compCsv = ws;
      compUseCsv(0);
    } catch (e) { alert('Errore CSV: ' + (e && e.message || e)); }
    input.value = '';
  };
  fr.onerror = () => alert('Impossibile leggere il file.');
  fr.readAsText(file, 'UTF-8');
}
function compModalHtml() {
  const m = S.compModal;
  if (!m) return '';
  const names = [...new Set(((S.prog && S.prog.weeks) || []).flatMap(w => Object.values(w.days || {}).flat()).filter(isAccessory).map(e => e.name))];
  const rows = m.rows.map((r, i) => `<tr class="comp-row">
    <td><input type="text" data-c="name" list="comp-names" placeholder="Esercizio" value="${esc(r.name)}"></td>
    <td><input type="number" inputmode="numeric" data-c="sets" placeholder="Serie" value="${esc(r.sets)}"></td>
    <td><input type="number" inputmode="numeric" data-c="reps" placeholder="Rep" value="${esc(r.reps)}"></td>
    <td><input type="text" inputmode="decimal" data-c="kg" placeholder="Kg" value="${esc(r.kg)}"></td>
    <td><button type="button" class="comp-del" onclick="compDelRow(${i})" aria-label="Elimina riga">✕</button></td>
  </tr>`).join('');
  const picker = _compCsv && _compCsv.length > 1
    ? `<label class="mut" style="font-size:12px">Allenamento nel CSV</label>
       <select class="comp-sel" onchange="compUseCsv(+this.value)">${_compCsv.map((w, i) => `<option value="${i}" ${i === m.csvIdx ? 'selected' : ''}>${esc(w.date.slice(0, 16))} · ${esc(w.title || 'Allenamento')} (${w.exs.length} es.)</option>`).join('')}</select>`
    : '';
  return `<div class="modal-backdrop piano-session-backdrop" id="comp-modal">
    <div class="modal-card piano-session-card" onclick="event.stopPropagation()" style="--ac:#30a46c">
      <p class="big" style="margin-bottom:4px">Complementari</p>
      <p class="mut" style="margin-bottom:12px">${esc(m.week)} · ${WD[m.wd] || ''} · scrivi quello che hai fatto, carica un CSV o lascia vuoto</p>
      <datalist id="comp-names">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
      <table class="comp-table">
        <thead><tr><th>Esercizio</th><th>Serie</th><th>Rep</th><th>Kg</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <button type="button" onclick="compAddRow()">＋ Aggiungi esercizio</button>
      <label class="btn" style="cursor:pointer">Carica CSV da Hevy
        <input type="file" accept=".csv,text/csv" style="display:none" onchange="compPickCsv(this)">
      </label>
      ${picker}
      <button type="button" class="pri" onclick="saveCompModal(false)">Salva</button>
      <button type="button" onclick="saveCompModal(true)">Lascia vuoto</button>
      <button type="button" onclick="closeCompModal()">Annulla</button>
    </div>
  </div>`;
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
/** Esercizio monolaterale (braccio/gamba sx e dx separati) */
function isMonolateral(e) {
  if (!e) return false;
  const t = (String(e.name || '') + ' ' + String(e.text || '')).toLowerCase();
  return /monolaterale|mono\s*laterale|unilateral/.test(t);
}
function ensureMonoSides(setObj) {
  if (!setObj.L) setObj.L = { kg: '', reps: '', done: false };
  if (!setObj.R) setObj.R = { kg: '', reps: '', done: false };
  if (setObj.L.done == null) setObj.L.done = false;
  if (setObj.R.done == null) setObj.R.done = false;
  // serie completa se entrambi i lati fatti
  setObj.done = !!(setObj.L.done && setObj.R.done);
  return setObj;
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
/* ===== Varianti PL: riconoscimento dal testo della scheda ===== */
// Tabella RPE (Tuchscherer): ripetizioni massime → % del 1RM
const RPE_PCT = [null, 100, 95.5, 92.2, 89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7, 68];
function rpePct(effReps) {
  const n = Math.max(1, Math.min(12, effReps));
  const a = Math.floor(n), b = Math.ceil(n);
  return a === b ? RPE_PCT[a] : RPE_PCT[a] + (RPE_PCT[b] - RPE_PCT[a]) * (n - a);
}
const roundKg = x => Math.round(x / 2.5) * 2.5;
const _techCache = {};
function analyzeEx(e) {
  const t = (String((e && e.name) || '') + ' ' + String((e && e.text) || '')).toLowerCase().replace(/\s+/g, ' ');
  if (_techCache[t]) return _techCache[t];
  const N = '(\\d+(?:[.,]\\d+)?)', RG = '(?:\\s*[-–\\/]\\s*' + N + ')?';
  const f = x => parseFloat(String(x).replace(',', '.'));
  const T = { tags: [], rpe: null, mode: 'fixed', dynamic: false };
  const tag = (k, label, tip) => T.tags.push({ k, label, tip });
  // RIR: "RIR 2", "2 RIR", "@2RIR", "2-3 RIR", "2 rip in riserva"
  let m = t.match(new RegExp('\\brir\\s*[:=]?\\s*' + N + RG)) || t.match(new RegExp(N + RG + '\\s*rir\\b')) || t.match(new RegExp('(\\d+)()\\s*(?:rip|reps?|ripetizioni)\\s*(?:in|di)\\s*riserva'));
  if (m) {
    const a = f(m[1]), b = m[2] != null && m[2] !== '' ? f(m[2]) : a;
    const lo = 10 - Math.max(a, b), hi = 10 - Math.min(a, b);
    if (lo >= 4 && hi <= 10) T.rpe = { lo, hi, mid: (lo + hi) / 2, src: 'rir', txt: 'RIR ' + (a === b ? a : Math.min(a, b) + '-' + Math.max(a, b)) };
  }
  // RPE: "@7", "@ 8.5", "rpe 8", "rpe8", "@7-8", "RPE 7/8", "a rpe 9"
  if (!T.rpe) {
    m = t.match(new RegExp('(?:rpe\\s*[:=]?|@)\\s*' + N + RG + '(?![\\d.,]|\\s*%)')) ||
      t.match(new RegExp(N + RG + '\\s*(?:@\\s*)?rpe\\b'));
    if (m) {
      const a = f(m[1]), b = m[2] != null && m[2] !== '' ? f(m[2]) : a;
      const lo = Math.min(a, b), hi = Math.max(a, b);
      if (lo >= 4 && hi <= 10) T.rpe = { lo, hi, mid: (lo + hi) / 2, src: 'rpe', txt: 'RPE ' + (lo === hi ? lo : lo + '-' + hi) };
    }
  }
  const has = r => r.test(t);
  // Autoregolazione / metodi di carico: accetta abbreviazioni, italiano/inglese e scritture comuni.
  T.mav = has(/\bm\.?a\.?v\.?\b|maximum\s*acceptable\s*volume|volume\s*massimo\s*accettabile/);
  T.vbt = has(/\bv\.?b\.?t\.?\b|velocity[ -]?based|speed\s*(?:based|work)|velocit[aà]|\bm\/s\b|\bmetri\/secondo\b/);
  T.e1rm = has(/\be\.?1\.?rm\b|1\s*rm\s*stimato|massimale\s*stimato|estimated\s*1\s*rm/);
  T.instinct = has(/istintiv|a sensazione|\bfeeling\b|autoregol|a piacere|a piacimento|\binstinctive\b|carico\s*libero|ripetizioni\s*libere/);
  T.amrap = has(/\bamrap\b|as\s*many\s*reps|\bmax(?:imum)?\s*reps?\b|massime?\s*ripetizioni|al cedimento|to failure|a cedimento/);
  T.emom = has(/\bemom\b|every minute|ogni minuto/);
  const cl = t.match(/(\d+(?:\s*\+\s*\d+)+)/);
  T.cluster = has(/\bcluster\b/) || !!cl;
  if (cl) T.clusterParts = cl[1].split(/\s*\+\s*/).map(Number);
  T.restpause = has(/rest[\s-]*pause|\brp\b|myo[\s-]*reps?/);
  T.drop = has(/drop[\s-]*set|\bdrop\b|serie a scalare/);
  T.topset = has(/top[\s-]*set|serie top/);
  T.backoff = has(/back[\s-]*off|\bbo\b|serie di scarico/);
  if (T.backoff) { const bp = t.match(/(?:-|meno\s*)\s*(\d+(?:[.,]\d+)?)\s*%/); if (bp) T.backoffPct = f(bp[1]); }
  T.ramping = has(/ramping|\brampa\b|avvicinamento|salita\s*progressiva|progressive\s*loading/);
  T.wave = has(/\bwave\b|\bonda\b|a onde|ondulat|wave\s*loading/);
  T.dailyMax = has(/(?:singola|doppia|tripla)\s*(?:di|del)\s*(?:giornata|giorno)|daily max|max del giorno|massimale del giorno|heavy single|single of the day/);
  T.me = has(/\bme day\b|max effort|massimo sforzo|coniugat|conjugate/);
  T.de = has(/dynamic effort|\bde day\b|speed work|esplosiv/);
  T.chains = has(/catene|\bchains?\b/);
  T.bands = has(/elastic|\bbands?\b|banded|reverse[\s-]*band|\breverse\s*elastic/);
  T.reverseBand = has(/reverse[\s-]*band|reverse\s*banded/);
  T.sling = has(/sling[\s-]*shot/);
  T.board = has(/\bboards?\b|\bpins?\b|\bfermi\b|\bbox\b/);
  const tp = t.match(/tempo\s*:?\s*(\d(?:[-.\/]\d){2,3}|\d{4})/);
  T.tempo = tp ? tp[1].replace(/\s+/g, '') : (has(/\btempo\b|eccentric|negativ/) ? '' : null);
  T.pause = has(/pausat|paused|\bpause\s*(?:squat|bench|deadlift|rep)|(?:squat|panca|stacco)\s*(?:con\s*)?pausa|\bpausa\s*(?:di\s*)?\d+\s*(?:s|sec)\b|\bfermo\s*\d/);
  T.deficit = has(/deficit/);
  T.rom = has(/rom ridott|\brom\b|parzial|partial/);
  T.dup = has(/\bdup\b|daily\s*undulating|ondulat[ao]\s*(?:giornaliera|quotidiana)/);
  T.block = has(/periodizzazion[ei]\s*a\s*blocchi|\ba\s*blocchi\b|block\s*periodization|block\s*periodised/);
  T.linear = has(/periodizzazion[ei]\s*lineare|\blineare\b|linear\s*periodization|linear\s*periodised/);
  const em = t.match(/emom\s*(\d+)|(\d+)\s*(?:min|')\s*emom/);
  if (em) T.emomMin = parseInt(em[1] || em[2], 10);
  // etichette
  if (T.rpe) tag('rpe', T.rpe.txt, 'Autoregolazione: scegli il carico che dia questa fatica (RPE 10 = zero rip di riserva). Aggiungi serie finché lo raggiungi.');
  if (T.mav) tag('mav', 'MAV', 'Carico da trovare in rampa: aggiungi serie finché arrivi al carico giusto per la variante.');
  if (T.vbt) tag('vbt', 'VBT', 'Carico guidato dalla velocità del bilanciere.');
  if (T.e1rm) tag('e1rm', 'e1RM', 'Massimale stimato dalla serie (kg × rip × RPE).');
  if (T.instinct) tag('inst', 'Istintivo', 'Kg e rip liberi: scegli a sensazione.');
  if (T.topset) tag('top', 'Top set', 'Serie più pesante della giornata.');
  if (T.backoff) tag('bo', 'Back-off' + (T.backoffPct ? ' −' + T.backoffPct + '%' : ''), 'Serie di volume con carico ridotto dopo il top set.');
  if (T.ramping) tag('ramp', 'Rampa', 'Serie di avvicinamento progressive.');
  if (T.dailyMax) tag('dm', 'Max del giorno', 'Trova la singola/doppia/tripla più pesante della giornata.');
  if (T.amrap) tag('amrap', 'AMRAP', 'Più ripetizioni possibili con tecnica pulita.');
  if (T.emom) tag('emom', 'EMOM' + (T.emomMin ? ' ' + T.emomMin + "'" : ''), 'Una serie all\'inizio di ogni minuto.');
  if (T.cluster) tag('cl', 'Cluster' + (T.clusterParts ? ' ' + T.clusterParts.join('+') : ''), 'Serie spezzata in mini-blocchi con pause brevi.');
  if (T.restpause) tag('rp', 'Rest-pause', 'Serie al cedimento, pausa breve, altre ripetizioni (aggiungi mini-serie).');
  if (T.drop) tag('drop', 'Drop set', 'Riduci il carico e continua senza recupero (aggiungi serie).');
  if (T.wave) tag('wave', 'Wave', 'Carico a onde: serie progressive che si ripetono.');
  if (T.me) tag('me', 'Max effort', 'Conjugate: trova il massimale della variante.');
  if (T.de) tag('de', 'Dynamic effort', 'Carichi leggeri alla massima velocità.');
  if (T.chains) tag('ch', 'Catene', 'Il carico cresce salendo.');
  if (T.bands) tag('bd', T.reverseBand ? 'Reverse Band' : 'Elastici / Banded', 'Resistenza elastica: il carico cambia durante il movimento.');
  if (T.sling) tag('sl', 'Slingshot', 'Supporto che aiuta nel fondo della panca.');
  if (T.board) tag('bp', 'Board/Pin', 'ROM ridotto con board o fermi.');
  if (T.tempo != null) tag('tp', 'Tempo' + (T.tempo ? ' ' + T.tempo : ''), 'Cadenza controllata (discesa-pausa-salita-pausa).');
  if (T.pause) tag('pz', 'Pausa', 'Pausa ferma sul petto/fondo prima di risalire.');
  if (T.deficit) tag('df', 'Deficit', 'Parti da una posizione più bassa.');
  if (T.rom) tag('rom', 'ROM ridotto', 'Range di movimento ridotto.');
  if (T.dup) tag('dup', 'DUP', 'Periodizzazione ondulata giornaliera.');
  if (T.block) tag('block', 'A blocchi', 'Periodizzazione che concentra volume e intensità in blocchi successivi.');
  if (T.linear) tag('linear', 'Lineare', 'Progressione graduale del carico e/o riduzione del volume.');
  const ramp = !!(T.rpe || T.mav || T.vbt || T.e1rm || T.topset || T.ramping || T.dailyMax || T.me);
  T.mode = ramp ? 'ramp' : (T.instinct ? 'free' : 'fixed');
  T.dynamic = ramp || T.restpause || T.drop || T.amrap || T.backoff;
  return (_techCache[t] = T);
}
/** toglie dal testo RPE/RIR/%/tempo che altrimenti verrebbero scambiati per serie (es. "@7-8", "tempo 3-1-0") */
function stripNoise(text) {
  const N = '\\d+(?:[.,]\\d+)?', RG = '(?:\\s*[-–\\/]\\s*' + N + ')?';
  return String(text || '')
    .replace(new RegExp('\\brir\\s*[:=]?\\s*' + N + RG, 'gi'), ' ')
    .replace(new RegExp('@?\\s*' + N + RG + '\\s*rir\\b', 'gi'), ' ')
    .replace(new RegExp('(?:rpe|@)\\s*' + N + RG + '(?:\\s*%)?', 'gi'), ' ')
    .replace(new RegExp('(' + N + ')(' + RG + ')\\s*%', 'g'), (m, a, r, off, str) => (r && /[x×]\s*$/.test(str.slice(0, off))) ? a + ' ' : ' ')
    .replace(/tempo\s*:?\s*(?:\d(?:[-.\/]\d){2,3}|\d{4})/gi, ' ')
    .replace(new RegExp(N + '\\s*m\\/s', 'gi'), ' ');
}
/** kg stimati per RPE/RIR dal massimale (solo se c'è il massimale del fondamentale) */
function rpeTargetKg(tech, reps, lift) {
  if (!tech.rpe || !lift || !S.max || !S.max[lift]) return null;
  const r = Math.max(1, reps || 1);
  return roundKg(S.max[lift] * rpePct(r + (10 - tech.rpe.mid)) / 100);
}
function e1rmFromSets(sets) {
  let best = null;
  (sets || []).forEach(s => {
    const kg = parseFloat(String(s.kg).replace(',', '.')), r = parseInt(s.reps, 10), rp = parseFloat(String(s.rpe).replace(',', '.'));
    if (!(kg > 0) || !(r > 0) || !(rp >= 4 && rp <= 10)) return;
    const v = kg / rpePct(r + (10 - rp)) * 100;
    if (best == null || v > best) best = v;
  });
  return best == null ? null : Math.round(best * 2) / 2;
}
function rpeOf(s) {
  const v = parseFloat(String((s && s.rpe) == null ? '' : s.rpe).replace(',', '.'));
  return isNaN(v) ? null : v;
}
function techBadgesHtml(e) {
  if (!e || e.warm) return '';
  const T = analyzeEx(e);
  if (!T.tags.length) return '';
  const primaryKeys = ['rpe','mav','vbt','inst','e1rm','amrap','emom','cl','rp','top','bo','wave','ramp','dm','me','de'];
  const primary = T.tags.find(t => primaryKeys.includes(t.k)) || T.tags[0];
  const rest = T.tags.filter(t => t !== primary);
  const modeText = T.mode === 'free' ? 'SERIE LIBERA' : T.mode === 'ramp' ? 'SERIE AUTOREGOLATA' : 'VARIANTE TECNICA';
  return `<div class="variant-panel">
    <div class="variant-main tc-${primary.k}">
      <span class="variant-mode">${modeText}</span>
      <strong>${esc(primary.label)}</strong>
      <span class="variant-help">${esc(primary.tip)}</span>
    </div>
    ${rest.length ? `<div class="tech-badges">${rest.map(t => `<span class="tech-chip tc-${t.k}" title="${esc(t.tip)}">${esc(t.label)}</span>`).join('')}</div>` : ''}
  </div>`;
}
/** segnaposto kg per la serie si: rampa verso il carico target */
function rampPlaceholder(T, info, log, si, est) {
  const role = info.roles && info.roles[si];
  const prevKgs = log.sets.slice(0, si).map(s => parseFloat(String(s.kg).replace(',', '.'))).filter(v => v > 0);
  const last = prevKgs.length ? prevKgs[prevKgs.length - 1] : null;
  if (role === 'backoff' && T.backoffPct) {
    const tops = log.sets.filter((s, i) => (info.roles || [])[i] === 'top').map(s => parseFloat(String(s.kg).replace(',', '.'))).filter(v => v > 0);
    if (tops.length) return String(roundKg(Math.max(...tops) * (1 - T.backoffPct / 100)));
  }
  if (last != null) {
    if (role === 'backoff') return String(last);
    if (est != null && est - last > 0) return String(est - last <= 10 ? est : last + 10);
    return String(last + 5);
  }
  if (est != null) return String((info.roles ? info.roles.filter(r => r === 'top').length : info.count) > 1 ? est : roundKg(est * 0.95));
  return 'kg';
}
function rampHeaderHtml(T, info, log, est, lift) {
  const bits = [];
  if (T.rpe) {
    const reps = info.reps != null ? info.reps : (info.targets && info.targets[0]) || 1;
    const nTop = info.roles ? info.roles.filter(r => r === 'top').length : info.count;
    bits.push(`Target <b>${esc(T.rpe.txt)}</b>${nTop ? ' · ' + nTop + '×' + reps : ''}` + (est != null ? ` ≈ <b>${String(est).replace('.', ',')} kg</b> (stima dal massimale ${S.max[lift]} kg)` : ''));
    const hit = log.sets.some(s => { const r = rpeOf(s); return r != null && r >= T.rpe.lo; });
    if (hit) bits.push('✓ RPE raggiunto: puoi fermarti');
    else bits.push('Aggiungi una serie alla volta finché raggiungi il target');
  } else {
    bits.push('Aggiungi serie fino al carico giusto per la variante');
  }
  const e1 = e1rmFromSets(log.sets);
  if (e1 != null) bits.push(`e1RM stimato ≈ <b>${String(e1).replace('.', ',')} kg</b>`);
  return `<p class="ramp-info">${bits.join('<br>')}</p>`;
}
function addRampSet(week, day, i) {
  try { flushSetInputsFromDOM(); } catch (e) {}
  const row = getExLog(week, day, i);
  row.dyn = true;
  row.sets.push({ kg: '', reps: '', rpe: '', done: false });
  const k = week + '|' + day, a = S.chk[k];
  if (a && a.indexOf(i) >= 0) a.splice(a.indexOf(i), 1);
  save(); render();
}
function removeLastSet(week, day, i) {
  try { flushSetInputsFromDOM(); } catch (e) {}
  const row = getExLog(week, day, i);
  if (row.sets.length > 1) row.sets.pop();
  syncExerciseDoneFromSets(week, day, i);
  save(); render();
}

/** Quante serie ha l'esercizio (dal testo scheda) */
function parseSets(text) {
  const raw = String(text || '');
  const T = analyzeEx({ name: '', text: raw });
  const t = stripNoise(raw);
  let m;
  // EMOM N minuti → N serie
  if (T.emom && T.emomMin) {
    const r = t.match(/(\d+)\s*(?:rip|reps?)\b/i);
    return { count: Math.min(T.emomMin, 30), targets: null, reps: r ? parseInt(r[1], 10) : undefined };
  }
  // cluster: 3x(2+2+1) → 3 serie da 5 rip totali
  m = t.match(/(\d+)\s*[x×]\s*\(?\s*(\d+(?:\s*\+\s*\d+)+)\s*\)?/i);
  if (m) {
    const parts = m[2].split(/\s*\+\s*/).map(Number);
    return { count: parseInt(m[1], 10) || 3, targets: null, reps: parts.reduce((a, b) => a + b, 0), cluster: parts.join('+') };
  }
  // top set + back-off: "1x3 ... 3x5"
  if (T.topset && T.backoff) {
    const all = [...t.matchAll(/(\d+)\s*[x×]\s*(\d+)/g)];
    if (all.length >= 2) {
      const a = parseInt(all[0][1], 10) || 1, b = parseInt(all[1][1], 10) || 3;
      return {
        count: a + b,
        targets: [...Array(a).fill(parseInt(all[0][2], 10)), ...Array(b).fill(parseInt(all[1][2], 10))],
        roles: [...Array(a).fill('top'), ...Array(b).fill('backoff')]
      };
    }
  }
  // 10-8-6-4 o 5-5-5
  const seq = t.match(/\b(\d+(?:\s*-\s*\d+){1,})\b/);
  if (seq) {
    const parts = seq[1].split(/\s*-\s*/).map(n => parseInt(n, 10)).filter(n => n > 0);
    if (parts.length >= 2) return { count: parts.length, targets: parts };
  }
  // 5x3s → serie x rip
  m = t.match(/(\d+)\s*[x×]\s*(\d+)\s*s\b/i);
  if (m) return { count: parseInt(m[2], 10) || 3, targets: null, reps: parseInt(m[1], 10) };
  m = t.match(/(\d+)\s*[x×]\s*(\d+)/i);
  if (m) return { count: parseInt(m[1], 10) || 3, targets: null, reps: parseInt(m[2], 10) };
  m = t.match(/(\d+)\s*(?:serie|sets?)\b/i);
  if (m) return { count: parseInt(m[1], 10) || 3, targets: null };
  // singola / doppia / tripla
  m = t.match(/\b(singola|doppia|tripla)\b/i);
  if (m) return { count: 1, targets: null, reps: { singola: 1, doppia: 2, tripla: 3 }[m[1].toLowerCase()] };
  return { count: T.mode === 'ramp' ? 1 : 3, targets: null };
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
  if (row.sets.length > n && !row.dyn) row.sets.length = n;
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
function prevSetSideKg(log, setIdx, side) {
  if (!log || !log.sets) return '';
  for (let j = setIdx - 1; j >= 0; j--) {
    const st = log.sets[j];
    if (!st) continue;
    const sd = side === 'R' ? st.R : st.L;
    if (sd && sd.kg !== '' && sd.kg != null) return String(sd.kg);
    if (st.kg !== '' && st.kg != null) return String(st.kg);
  }
  return '';
}
function cascadeMonoKgFromSet(week, day, i, setIdx, side) {
  const row = getExLog(week, day, i);
  if (!row.sets[setIdx]) return;
  ensureMonoSides(row.sets[setIdx]);
  const value = (side === 'R' ? row.sets[setIdx].R : row.sets[setIdx].L).kg;
  if (value === '' || value == null) return;
  const active = document.activeElement;
  let dirty = false;
  for (let j = setIdx + 1; j < row.sets.length; j++) {
    ensureMonoSides(row.sets[j]);
    const sd = side === 'R' ? row.sets[j].R : row.sets[j].L;
    if (sd.done) continue;
    if (sd.kg !== '' && sd.kg != null) continue;
    sd.kg = value;
    dirty = true;
  }
  const other = side === 'R' ? row.sets[setIdx].L : row.sets[setIdx].R;
  if (!other.done && (other.kg === '' || other.kg == null)) {
    other.kg = value;
    dirty = true;
  }
  if (dirty) save();
  try {
    document.querySelectorAll('.set-card').forEach(c => {
      if (c.getAttribute('data-week') !== String(week)) return;
      if (Number(c.getAttribute('data-day')) !== Number(day)) return;
      if (Number(c.getAttribute('data-exi')) !== Number(i)) return;
      const seti = Number(c.getAttribute('data-set'));
      if (seti < setIdx) return;
      c.querySelectorAll('.mono-side').forEach(sideEl => {
        const sKey = sideEl.getAttribute('data-side');
        if (seti === setIdx && sKey === side) return;
        const sd = row.sets[seti] && (sKey === 'R' ? row.sets[seti].R : row.sets[seti].L);
        if (!sd || sd.done) return;
        const inp = sideEl.querySelector('input');
        if (inp && inp !== active && (inp.value === '' || inp.value == null) && sd.kg !== '' && sd.kg != null) {
          inp.value = sd.kg;
          inp.classList.add('kg-suggested');
        }
      });
    });
  } catch (e) {}
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
    const row = getExLog(week, day, exi);
    if (!row.sets[seti]) row.sets[seti] = { kg: '', reps: '', done: false };

    // monolaterale: input dentro .mono-side
    const monoSides = card.querySelectorAll('.mono-side');
    if (monoSides.length) {
      ensureMonoSides(row.sets[seti]);
      monoSides.forEach(sideEl => {
        const side = sideEl.getAttribute('data-side');
        if (!side || sideEl.classList.contains('mono-side-done')) return;
        const sideObj = side === 'R' ? row.sets[seti].R : row.sets[seti].L;
        const inputs = sideEl.querySelectorAll('input');
        if (inputs[0] && sideObj.kg !== inputs[0].value) { sideObj.kg = inputs[0].value; dirty = true; }
        if (inputs[1] && sideObj.reps !== inputs[1].value) { sideObj.reps = inputs[1].value; dirty = true; }
      });
      ensureMonoSides(row.sets[seti]);
      return;
    }

    if (row.sets[seti].done) return;
    const inputs = card.querySelectorAll('input[type="number"], input:not([type])');
    let n = 0;
    inputs.forEach(inp => {
      const val = inp.value;
      if (n === 0) {
        if (row.sets[seti].kg !== val) { row.sets[seti].kg = val; dirty = true; }
      } else if (n === 1) {
        if (row.sets[seti].reps !== val) { row.sets[seti].reps = val; dirty = true; }
      } else if (n === 2) {
        if (row.sets[seti].rpe !== val) { row.sets[seti].rpe = val; dirty = true; }
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
  // se mono, allinea entrambi i lati
  if (row.sets[setIdx].L || row.sets[setIdx].R) {
    ensureMonoSides(row.sets[setIdx]);
    row.sets[setIdx].L.done = done !== false;
    row.sets[setIdx].R.done = done !== false;
  }
  syncExerciseDoneFromSets(week, day, i);
  save();
}
function setExSideLog(week, day, i, setIdx, side, field, value) {
  const row = getExLog(week, day, i);
  if (!row.sets[setIdx]) row.sets[setIdx] = { kg: '', reps: '', done: false };
  ensureMonoSides(row.sets[setIdx]);
  const sideObj = side === 'R' ? row.sets[setIdx].R : row.sets[setIdx].L;
  if (sideObj.done && (field === 'kg' || field === 'reps')) return;
  sideObj[field] = value;
  save();
}
/** Segna fatto un lato (L/R) di una serie monolaterale → avvia recupero */
function markSideDone(week, day, i, setIdx, side, done) {
  const row = getExLog(week, day, i);
  if (!row.sets[setIdx]) row.sets[setIdx] = { kg: '', reps: '', done: false };
  ensureMonoSides(row.sets[setIdx]);
  const sideObj = side === 'R' ? row.sets[setIdx].R : row.sets[setIdx].L;
  sideObj.done = done !== false;
  ensureMonoSides(row.sets[setIdx]); // aggiorna set.done
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
      const autoM = analyzeEx(e).mode !== 'fixed';
      const sets = log.sets.map((s, si) => ({
        kg: (autoM && s.kg !== '' && s.kg != null) ? s.kg : (kg != null ? kg : s.kg),
        reps: (autoM && s.reps !== '' && s.reps != null) ? s.reps : ((info.targets ? info.targets[si] : info.reps) != null ? (info.targets ? info.targets[si] : info.reps) : s.reps),
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
  const T = analyzeEx(exercise);
  // complementari: pesca kg/rip dalla stessa giornata della settimana precedente
  const prevInfo = (!exercise.warm && !isMainLift(exercise))
    ? prefillAccessoryFromPrev(weekLabel, day, exIndex, exercise)
    : null;
  const log = getExLog(weekLabel, day, exIndex, info.count);
  if (T.dynamic) log.dyn = true;
  // per fondamentali usa sempre il lift taggato o ricavato
  let lift = exercise.lift;
  if (!lift && isMainLift(exercise)) {
    const n = String(exercise.name || '').toLowerCase();
    if (/squat|acconsc/.test(n)) lift = 's';
    else if (/panca|bench/.test(n)) lift = 'b';
    else if (/stacco|deadlift|sumo|regular/.test(n)) lift = 'd';
  }
  const sugKg = (T.backoffPct || T.mav) ? null : prescribedKg(exercise.text, lift);
  const est = sugKg != null ? sugKg : rpeTargetKg(T, info.reps != null ? info.reps : (info.targets && info.targets[0]), lift);
  const main = isMainLift(exercise);
  const hasRpe = T.mode === 'ramp';
  // fondamentali: di default bloccati; se c'è RPE → kg modificabile, rip no
  const repsEditable = !main || T.mode === 'free';
  const fullyLocked = main && T.mode === 'fixed';
  const wJs = JSON.stringify(weekLabel);
  const restSec = getRestSec(exercise.name);
  const mono = !main && isMonolateral(exercise);
  // assicura struttura L/R per mono
  if (mono) log.sets.forEach(st => ensureMonoSides(st));
  return `<div class="sets-wrap ${fullyLocked ? 'sets-locked' : ''} ${mono ? 'sets-mono' : ''}">
    ${T.mode === 'ramp' ? rampHeaderHtml(T, info, log, est, lift) : (T.mode === 'free' ? '<p class="ramp-info">Istintivo: kg e rip liberi, scegli a sensazione</p>' : '')}
    ${log.sets.map((s, si) => {
      const target = info.targets ? info.targets[si] : info.reps;
      const roleLbl = (info.roles && info.roles[si] === 'top' ? ' · Top set' : info.roles && info.roles[si] === 'backoff' ? ' · Back-off' : '')
        + (T.mode === 'ramp' && !info.roles && si >= info.count ? ' · extra' : '')
        + (T.mode === 'ramp' && T.rpe && rpeOf(s) != null && rpeOf(s) >= T.rpe.lo ? ' · target ✓' : '');
      const isDone = !!s.done;
      const prescRep = target != null ? target : null;
      const prescKg = sugKg != null ? sugKg : null;
      let inputs = '';
      // --- MONOLATERALE: sx + dx ---
      if (mono) {
        ensureMonoSides(s);
        const setDoneBar = `<button type="button" class="mono-set-toggle ${isDone ? 'on' : ''}" data-mono-set-toggle="1">
          ${isDone ? '✓ Serie ' + (si + 1) + ' completa (tocca per annullare)' : 'Segna serie ' + (si + 1) + ' fatta (Sx + Dx) · ' + fmtRest(restSec)}
        </button>`;
        const sides = [{ key: 'L', label: 'Sinistro' }, { key: 'R', label: 'Destro' }];
        const sidesHtml = sides.map(side => {
          const sd = s[side.key];
          const sideDone = !!sd.done;
          const fromPrev = prevSetSideKg(log, si, side.key);
          const kgV = sd.kg != null && sd.kg !== '' ? esc(String(sd.kg)) : '';
          const repV = sd.reps != null && sd.reps !== '' ? esc(String(sd.reps)) : '';
          const kgPh = fromPrev || 'kg';
          const suggestNote = fromPrev && (sd.kg === '' || sd.kg == null)
            ? `<p class="set-prev-hint">Suggerito serie prec.: <b>${esc(String(fromPrev))} kg</b></p>`
            : '';
          if (sideDone) {
            return `<div class="mono-side mono-side-done" data-side="${side.key}">
              <div class="mono-side-label">✓ ${side.label}</div>
              <div class="set-readonly set-done-ro">
                <span class="set-ro-kg">${kgV ? kgV + ' kg' : '— kg'}</span>
                <span class="set-x">×</span>
                <span class="set-ro-reps">${repV ? repV + ' rip' : '— rip'}</span>
              </div>
              <p class="set-lock-hint">Fatto · tocca per sbloccare</p>
            </div>`;
          }
          return `<div class="mono-side" data-side="${side.key}">
            <div class="mono-side-label">${side.label} · ${fmtRest(restSec)}</div>
            <div class="set-inputs">
              <input type="number" inputmode="decimal" step="0.5" placeholder="${esc(String(kgPh))}" value="${kgV}"
                oninput="setExSideLog(${wJs},${day},${exIndex},${si},'${side.key}','kg',this.value)"
                onchange="setExSideLog(${wJs},${day},${exIndex},${si},'${side.key}','kg',this.value);cascadeMonoKgFromSet(${wJs},${day},${exIndex},${si},'${side.key}')">
              <span class="set-x">×</span>
              <input type="number" inputmode="numeric" step="1" placeholder="${prescRep != null ? prescRep : 'rip'}" value="${repV}"
                oninput="setExSideLog(${wJs},${day},${exIndex},${si},'${side.key}','reps',this.value)"
                onchange="setExSideLog(${wJs},${day},${exIndex},${si},'${side.key}','reps',this.value)">
            </div>
            ${suggestNote}
            <p class="set-lock-hint">Tocca qui → ${side.label.toLowerCase()} fatto + recupero</p>
          </div>`;
        }).join('');
        inputs = setDoneBar + `<div class="mono-sides">${sidesHtml}</div>`;
      } else if (isDone) {
        const kgShow = (s.kg !== '' && s.kg != null) ? String(s.kg).replace('.', ',') + ' kg'
          : (prescKg != null ? String(prescKg).replace('.', ',') + ' kg' : '— kg');
        const repShow = (s.reps !== '' && s.reps != null) ? String(s.reps) + ' rip'
          : (prescRep != null ? String(prescRep) + ' rip' : '— rip');
        inputs = `<div class="set-readonly set-done-ro">
             <span class="set-ro-kg">${esc(kgShow)}</span>
             <span class="set-x">×</span>
             <span class="set-ro-reps">${esc(repShow + (rpeOf(s) != null ? ' @' + String(rpeOf(s)).replace('.', ',') : ''))}</span>
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
      } else if (T.mode === 'ramp') {
        const kgVal = s.kg != null && s.kg !== '' ? esc(String(s.kg)) : '';
        const repVal = s.reps != null && s.reps !== '' ? esc(String(s.reps)) : '';
        const rpeVal = s.rpe != null && s.rpe !== '' ? esc(String(s.rpe)) : '';
        const ph = rampPlaceholder(T, info, log, si, est);
        inputs = `<div class="set-inputs set-ramp">
             <input type="number" inputmode="decimal" step="0.5" placeholder="${esc(ph)}" value="${kgVal}"
               oninput="setExSetLog(${wJs},${day},${exIndex},${si},'kg',this.value)"
               onchange="setExSetLog(${wJs},${day},${exIndex},${si},'kg',this.value);cascadeKgFromSet(${wJs},${day},${exIndex},${si})">
             <span class="set-x">×</span>
             <input type="number" inputmode="numeric" step="1" placeholder="${prescRep != null ? prescRep : 'rip'}" value="${repVal}"
               oninput="setExSetLog(${wJs},${day},${exIndex},${si},'reps',this.value)" onchange="setExSetLog(${wJs},${day},${exIndex},${si},'reps',this.value)">
             <span class="set-at">@</span>
             <input type="number" inputmode="decimal" step="0.5" min="1" max="10" placeholder="${T.rpe ? esc(String(T.rpe.hi)) : 'RPE'}" value="${rpeVal}"
               oninput="setExSetLog(${wJs},${day},${exIndex},${si},'rpe',this.value)" onchange="setExSetLog(${wJs},${day},${exIndex},${si},'rpe',this.value)">
           </div>
           <p class="set-lock-hint">kg × rip @ RPE sentito · tocca la card quando hai finito</p>`;
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
          <span class="set-title">${isDone ? '✓ ' : ''}Serie ${si + 1}${roleLbl}${target != null && repsEditable ? ' · obiettivo ' + target + ' rip' : ''}</span>
          <span class="set-rest-hint">${isDone ? 'fatta' : fmtRest(restSec)}</span>
        </div>
        ${inputs}
      </div>`;
    }).join('')}
    ${T.dynamic && !mono ? `<div class="ramp-actions"><button type="button" onclick='addRampSet(${wJs},${day},${exIndex})'>＋ Aggiungi serie</button>${log.sets.length > 1 ? `<button type="button" onclick='removeLastSet(${wJs},${day},${exIndex})'>− Togli ultima</button>` : ''}</div>` : ''}
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
        if (reg && reg.showNotification) reg.showNotification('Recupero finito', opts);
        else new Notification('Recupero finito', opts);
      } catch (e) {
        try { new Notification('Recupero finito', opts); } catch (e2) {}
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
      <button type="button" style="border-left:8px solid #30a46c" onclick="modalTrain('comp')">Complementari</button>
      <button type="button" onclick="S.dayModal={step:'ask'};save();render()">← Indietro</button>`;
  } else {
    body = `<p class="date-line">${todayLabel()}</p>
      <p class="big">Che giorno è oggi?</p>
      <p class="mut" style="margin-bottom:12px">${esc(w.label)}</p>
      <div class="row">
        <button onclick="modalRest()">Riposo</button>
        <button onclick="modalPick()">Allenamento</button>
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
  if (S.compModal) { S.compModal = null; _compCsv = null; }
  if (S.restPicker) S.restPicker = null;
  save();
  render();
}
function fmt(text, lift) {
  const mav = /mav/i.test(text);
  return esc(text).replace(/(\d+)\s*x\s*(\d+)\s*s\b|(\d+(?:[.,]\d+)?)\s*%(\s+del\s+\S+)?|@(\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?)| (\d+(?:-\d+){2,})\b/gi, (m, a, b, p, rel, r, seq, off, str) => {
    if (a) return `<span class="sr"><span class="n-serie">${b}</span> serie × <span class="n-rip">${a}</span> rip</span>`;
    if (p) {
      if (rel || mav || !lift) return `<span class="rel">${p}%${rel || ''} non del massimale</span>`;
      const kg = Math.round(parseFloat(p.replace(',', '.')) / 100 * S.max[lift] / 2.5) * 2.5;
      return `${p}% <span class="kg">${String(kg).replace('.', ',')} kg</span>`
    }
    if (r) return `<span class="rpe">RPE ${r}</span>`;
    if (seq && /tempo\s*:?\s*$/i.test(str.slice(0, off))) return m;
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
    if (w) { openCompModal('oggi', w.label, weekdayMon0()); return; }
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
  const flag = done !== false;
  const mono = isMonolateral(exs[i]);
  row.sets.forEach(s => {
    s.done = flag;
    if (mono || s.L || s.R) {
      ensureMonoSides(s);
      s.L.done = flag;
      s.R.done = flag;
      s.done = flag;
    }
  });
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
    // togli completato esercizio → tutte le serie non più fatte
    a.splice(x, 1);
    markAllSetsDone(w.label, d, i, false);
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
function logFinishedWorkout(weekLabel, day, weekdayOverride) {
  const w = S.prog && S.prog.weeks.find(x => x.label === weekLabel);
  if (!w || day == null || day === 'comp') return;
  const exs = dayExercises(w, day);
  if (!exs) return;
  const k = weekLabel + '|' + day;
  const ck = S.chk[k] || [];
  if (S.prog) { ensureProgMeta(S.prog); archiveProg(S.prog); }
  const wd = weekdayOverride != null ? Number(weekdayOverride) : weekdayMon0();
  // sostituisci eventuale segno piano / vecchio log stesso giorno
  const _keepAcc = S.accLog && S.accLog[k] ? JSON.parse(JSON.stringify(S.accLog[k])) : null;
  removeWorkoutLogByWeekDay(weekLabel, day, S.prog && S.prog.id);
  removeStoricoByWeekWeekday(weekLabel, wd, S.prog && S.prog.id);
  if (_keepAcc) { S.accLog = S.accLog || {}; S.accLog[k] = _keepAcc; }
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
        const hasRpe = analyzeEx(e).mode !== 'fixed';
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
            if (hasRpe && s.reps !== '' && s.reps != null && !isNaN(parseInt(s.reps, 10))) repsN = parseInt(s.reps, 10);
          } else if (s.L || s.R) {
            ensureMonoSides(s);
            const parseSide = (sd) => {
              const kg = sd.kg !== '' && sd.kg != null ? parseFloat(String(sd.kg).replace(',', '.')) : null;
              const reps = sd.reps !== '' && sd.reps != null ? parseInt(sd.reps, 10) : null;
              return {
                kg: kg != null && !isNaN(kg) ? kg : null,
                reps: reps != null && !isNaN(reps) ? reps : null,
                done: !!sd.done
              };
            };
            return {
              n: si + 1,
              mono: true,
              L: parseSide(s.L),
              R: parseSide(s.R),
              done: !!s.done,
              kg: null,
              reps: null
            };
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
            ...(rpeOf(s) != null ? { rpe: rpeOf(s) } : {}),
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
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(focus(w, d) + ' – ' + w.label + ' G' + d) + '&dates=' + f(s0) + '/' + f(e0) + '&details=' + encodeURIComponent(det);
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
        <p class="big">${isTrain ? 'Allenamento fatto ✓' : 'Giorno di riposo'}</p>
        <p class="mut">${detail}</p>
        <button type="button" onclick="cambiaOggi()">Cambia risposta</button>
      </div>${coachImg()}`;
    }

    return `<div class="card home-card">
      ${progress}
      <p class="date-line">${todayLabel()}</p>
      <p class="big">Che giorno è oggi?</p>
      <div class="row">
        <button type="button" onclick="setToday('rest')">Riposo</button>
        <button type="button" class="pri" onclick="S.today={date:dstr(),type:'pick'};save();render()">Allenamento</button>
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
      <button type="button" style="border-left:8px solid #30a46c" onclick="setToday('train','comp')">Complementari</button>
      <button type="button" onclick="askDay()">← Indietro</button>
      <button type="button" onclick="S.today=null;save();render()">Torna alla home</button>
    </div>`;
  }

  if (t.type === 'rest') {
    return `<div class="card home-card">
      <p class="date-line">${todayLabel()}</p>
      <p class="big">${t.finished ? 'Allenamento fatto ✓' : 'Giorno di riposo'}</p>
      <p class="mut">Prossimo: ${esc(week.label)}${remaining(week).length ? ' · giorno ' + remaining(week)[0] : ''}</p>
      <div class="row">
        <button type="button" onclick="askDay()">Cambia risposta</button>
        <button type="button" class="pri" onclick="S.today=null;save();render()">Home</button>
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
          <button type="button" class="rest-start" data-ex="${esc(e.name)}" onclick='startRest(${nmJs}, event)'>Avvia ${fmtRest(rest)}</button>
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
          ${techBadgesHtml(e)}
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
      <a class="btn" target="_blank" rel="noopener" href="${calLink(week, d)}">Aggiungi al calendario</a>
    </div>
    <button type="button" class="pri" style="background:${ac};color:#fff" ${left ? 'disabled' : ''} onclick="finish()">${left ? 'Mancano ' + left + ' esercizi' : 'Allenamento finito ✓'}</button>
    ${left ? `<button type="button" onclick="finish()">Segna finito comunque</button>` : ''}
    <button type="button" onclick="askDay()">Cambia giorno</button>
    <button type="button" onclick="S.today=null;save();render()">Torna alla home</button>
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
  if (s.mono || s.L || s.R) {
    const L = s.L || {};
    const R = s.R || {};
    const fmt = (sd, lab) => {
      const kg = sd.kg != null && sd.kg !== '' ? String(sd.kg).replace('.', ',') + ' kg' : '— kg';
      const reps = sd.reps != null && sd.reps !== '' ? String(sd.reps) + ' rip' : '— rip';
      const mark = sd.done ? '✓' : '·';
      return `<div class="hist-set ${sd.done ? 'done' : ''}"><span class="hist-set-n">${mark} ${lab}</span><span class="hist-set-val">${esc(kg)} × ${esc(reps)}</span></div>`;
    };
    return `<div class="hist-mono-set"><div class="hist-set-n" style="font-weight:800;margin:4px 0">Serie ${n}</div>${fmt(L, 'Sx')}${fmt(R, 'Dx')}</div>`;
  }
  const kg = s.kg != null && s.kg !== '' ? String(s.kg).replace('.', ',') + ' kg' : '— kg';
  const reps = s.reps != null && s.reps !== '' ? String(s.reps) + ' rip' : '— rip';
  const mark = s.done ? '✓' : '·';
  return `<div class="hist-set ${s.done ? 'done' : ''}"><span class="hist-set-n">${mark} Serie ${n}</span><span class="hist-set-val">${esc(kg)} × ${esc(reps)}${s.rpe != null && s.rpe !== '' ? ' @' + esc(String(s.rpe).replace('.', ',')) : ''}</span></div>`;
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
        <p class="big" style="font-size:18px;margin:6px 0">Riposo</p>
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
    ? `<button onclick="disablePush()">Disattiva notifiche</button><button onclick="testPush()">Invia notifica di prova</button>`
    : `<button class="pri" onclick="enablePush()">Attiva notifiche</button>`;
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
        <button style="border-left:8px solid #30a46c" onclick="setWdayTrain('comp')">Complementari <span class="mut" style="font-weight:600">(extra, fuori scheda)</span></button>
        <button onclick="S.dayEdit={...S.dayEdit,step:'type'};save();render()">← Indietro</button>
        <button onclick="cancelDayEdit()">Annulla</button>
      </div>`;
    }
    if (S.dayEdit.step === 'saveChoice') {
      const dn = S.dayEdit.dayNum;
      const label = dn === 'comp' ? 'Complementari' : ('Giorno ' + dn + (wObj && dn != null && dn !== 'comp' ? ' — ' + focus(wObj, dn) : ''));
      return `<div class="card edit-day" id="edit-day-panel">
        <p class="big">Come vuoi salvarlo?</p>
        <p class="mut">${esc(S.dayEdit.week)} · ${name} · ${esc(label)}</p>
        <button type="button" class="pri" onclick="pianoSaveWithLoads()">Con carichi e rep</button>
        <p class="mut" style="font-size:12px;margin:4px 0 10px">Apri la scheda esercizi e inserisci kg/rip (opzionale)</p>
        <button type="button" onclick="pianoSaveEmpty()">Allenamento vuoto</button>
        <p class="mut" style="font-size:12px;margin:4px 0 10px">Solo segno fatto, senza dettaglio serie</p>
        <button type="button" onclick="S.dayEdit={...S.dayEdit,step:'pickTrain'};save();render()">← Indietro</button>
        <button type="button" onclick="cancelDayEdit()">Annulla</button>
      </div>`;
    }
    return `<div class="card edit-day" id="edit-day-panel"><p class="big">Modifica ${name}</p><p class="mut">${esc(S.dayEdit.week)} · ora: ${curTxt}</p>
      <button class="pri" style="background:#e5484d;color:#fff" onclick="setWday('train')">Allenamento</button>
      <button class="pri" style="background:#3e8bff;color:#fff" onclick="setWday('rest')">Riposo</button>
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
      // click su un lato mono → gestito dal handler mono-side
      if (ev.target && ev.target.closest('.mono-side')) return;
      ev.preventDefault();
      ev.stopPropagation();
      const name = card.getAttribute('data-ex') || '';
      const week = card.getAttribute('data-week');
      const day = Number(card.getAttribute('data-day'));
      const exi = Number(card.getAttribute('data-exi'));
      const seti = Number(card.getAttribute('data-set'));
      if (!name || week == null || Number.isNaN(exi) || Number.isNaN(seti)) return;

      flushSetInputsFromDOM();

      // mono: solo il bottone grande gestisce la serie intera
      if (card.querySelector('.mono-sides')) return;

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
  // Lati monolaterali: tap → fatto + recupero
  document.querySelectorAll('.mono-side').forEach(sideEl => {
    sideEl.onclick = function (ev) {
      if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.closest('input'))) return;
      ev.preventDefault();
      ev.stopPropagation();
      const card = sideEl.closest('.set-card');
      if (!card) return;
      const name = card.getAttribute('data-ex') || '';
      const week = card.getAttribute('data-week');
      const day = Number(card.getAttribute('data-day'));
      const exi = Number(card.getAttribute('data-exi'));
      const seti = Number(card.getAttribute('data-set'));
      const side = sideEl.getAttribute('data-side'); // L | R
      if (!name || week == null || Number.isNaN(exi) || Number.isNaN(seti) || !side) return;
      flushSetInputsFromDOM();
      const already = sideEl.classList.contains('mono-side-done');
      if (already) {
        markSideDone(week, day, exi, seti, side, false);
        render();
        return;
      }
      markSideDone(week, day, exi, seti, side, true);
      startRest(name, ev);
    };
  });
  document.querySelectorAll('[data-mono-set-toggle]').forEach(btn => {
    btn.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      const card = btn.closest('.set-card');
      if (!card) return;
      const name = card.getAttribute('data-ex') || '';
      const week = card.getAttribute('data-week');
      const day = Number(card.getAttribute('data-day'));
      const exi = Number(card.getAttribute('data-exi'));
      const seti = Number(card.getAttribute('data-set'));
      if (!name || week == null || Number.isNaN(exi) || Number.isNaN(seti)) return;
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
      } else if (idx === 2) {
        setExSetLog(week, day, exi, seti, 'rpe', inp.value);
      }
    });
  });
}

function render() {
  try {
    // preserva scroll (popup piano + pagina allenamento)
    const prevModal = document.querySelector('.piano-session-card');
    const prevModalScroll = prevModal ? prevModal.scrollTop : null;
    const prevWinScroll = window.scrollY || window.pageYOffset || 0;
    const prevApp = document.getElementById('app');
    const prevAppScroll = prevApp ? prevApp.scrollTop : 0;

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
    $('app').innerHTML = body + dayModalHtml() + pianoSessionHtml() + compModalHtml() + restPickerHtml();
    document.body.classList.toggle('modal-open', !!(S.dayModal || S.restPicker || S.pianoSession || S.compModal));
    bindRestButtons();

    // ripristina scroll senza far ripartire dall'alto
    const restore = () => {
      const modal = document.querySelector('.piano-session-card');
      if (modal && prevModalScroll != null) {
        modal.scrollTop = prevModalScroll;
      } else {
        window.scrollTo(0, prevWinScroll);
        const app = document.getElementById('app');
        if (app) app.scrollTop = prevAppScroll;
      }
    };
    restore();
    requestAnimationFrame(restore);

    if (S.dayEdit && !S.pianoSession) {
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
window.markSideDone = markSideDone;
window.setExSideLog = setExSideLog;
window.cascadeMonoKgFromSet = cascadeMonoKgFromSet;
window.exportWorkoutCsv = exportWorkoutCsv;
window.cancelPianoSession = cancelPianoSession;
window.savePianoSession = savePianoSession;
window.pianoSaveWithLoads = pianoSaveWithLoads;
window.pianoSaveEmpty = pianoSaveEmpty;
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
    alert('Notifiche attivate! Riceverai un promemoria ogni mattina.');
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
    await reg.showNotification('Scheda Powerlifting', {
      body: 'Notifica di prova! Tutto funziona',
      icon: '/coach.jpg',
      badge: '/coach.jpg',
      tag: 'test'
    });
  } catch (e) {
    alert('Errore test: ' + e.message);
  }
}