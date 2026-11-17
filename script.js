const KEY = 'powerapp_v1', AC = ['#e5484d', '#3e8bff', '#e08a00', '#30a46c'], LN = { s: 'Squat', b: 'Panca', d: 'Stacco' };
let S = {};
try { S = JSON.parse(localStorage.getItem(KEY)) || {} } catch (e) { }
S.max = S.max || { s: 210, b: 110, d: 265 }; S.done = S.done || {}; S.chk = S.chk || {}; S.wi = S.wi || 0; S.view = S.view || 'oggi'; S.time = S.time || '17:00'; S.pushOn = S.pushOn || false; S.weekLog = S.weekLog || {}; S.promptedDate = S.promptedDate || null; S.dayModal = S.dayModal || null; S.accLog = S.accLog || {}; S.liftHistory = S.liftHistory || {}; S.restByEx = S.restByEx || {}; S.restDefault = S.restDefault || 120; S.restPicker = S.restPicker || null; S.workoutLog = S.workoutLog || []; S.progCatalog = S.progCatalog || []; S.pianoSession = S.pianoSession || null;
S.compModal = S.compModal || null; S.restSystemTimer = S.restSystemTimer !== false;
// popup solo-UI: non si ripristinano all'avvio (si riaprono da soli se servono). compModal e pianoSession restano: contengono dati inseriti a mano
S.dayModal = null; S.dayEdit = null; S.restPicker = null;
S.exNotes = S.exNotes || {}; S.nextLoad = S.nextLoad || {};
let _saveWarned = false;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)) } catch (e) { if (!_saveWarned) { _saveWarned = true; try { alert('Attenzione: impossibile salvare i dati (memoria del browser piena?). Scarica subito un backup dalla scheda Piano.'); } catch (e2) { } } } };
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Valore JS (JSON) sicuro dentro un attributo HTML (onclick="..." o onclick='...'): codifica & < > " ' come entità numeriche
const jq = v => JSON.stringify(v).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
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
  // L'identità (id) viene decisa all'import da matchKnownProg(); qui si ri-aggancia solo se manca
  if (prog.id) return prog;
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
          (w.days[d] || []).map(e => ({ name: e.name, warm: !!e.warm, text: e.text || '', lift: e.lift || null }))
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
    if (S.accLog) delete S.accLog[accKeyFor(progId || exCurProgId(), weekLabel, day)];
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
    const sameFile = !entry.progId && entry.progFileName && String(entry.progFileName).toLowerCase() === fnKey;
    const sameName = !entry.progId && entry.progName && S.prog.name &&
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
  // Keep the complete workout history.
}
/** Segna allenamento (anche da Piano senza sessione completa) */
function addTrainMarkToStorico(week, wd, dayNum) {
  if (S.prog) { ensureProgMeta(S.prog); archiveProg(S.prog); }
  const progId = S.prog && S.prog.id;
  removeStoricoByWeekWeekday(week, wd, progId);
  if (dayNum != null && dayNum !== 'comp') removeWorkoutLogByWeekDay(week, dayNum, progId);
  const wObj = S.prog && S.prog.weeks.find(x => x.label === week);
  const title = (dayNum === 'comp') ? 'Complementari' : (wObj && dayNum != null ? dayFocus(wObj, dayNum) : 'Allenamento');
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
  // Keep the complete workout history.
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
  return `<div class="wdays">${[0, 1, 2, 3, 4, 5, 6].map(i => {
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
  S.pianoPreviousToday = S.today ? JSON.parse(JSON.stringify(S.today)) : null;
  S.pianoSession = { week, wd, day: dayNum };
  cancelRestTimer();
  S.dayEdit = null;
  // contesto sessione per tg / set log
  S.today = { date: dstr(), type: 'train', day: dayNum, week, fromPiano: true, startedAt: Date.now() };
  save();
  render();
}
function cancelPianoSession() {
  S.pianoSession = null;
  if (S.today && S.today.fromPiano) S.today = S.pianoPreviousToday || { date: dstr(), type: 'ask' };
  delete S.pianoPreviousToday;
  save();
  render();
}
function savePianoSession() {
  try { flushSetInputsFromDOM(); } catch (e) { }
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
    saveSessionLogs(week.label, d, exs);
    logFinishedWorkout(week.label, d, ps.wd);
  } else {
    clearCal(ps.week, ps.wd);
    addTrainMarkToStorico(ps.week, ps.wd, d);
  }
  rebuildPianoFromStorico();
  S.pianoSession = null;
  advanceCompletedWeek(ps.week);
  S.today = S.pianoPreviousToday || { date: dstr(), type: 'rest', finished: 1, week: ps.week, day: d };
  delete S.pianoPreviousToday;
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
    const hist = !e.warm ? historyHtml(e.name, week.label, d) : '';
    const noteBlock = exNoteAndNextLoadHtml(week.label, d, i, e);
    const setsBlock = !e.warm ? (setsLogHtml(week.label, d, i, e) + hist + noteBlock) : '';
    return `<div class="ex ${e.warm ? 'w' : ''} ${e.lift ? 'main' : ''} ${acc ? 'acc' : ''} ${ck.includes(i) ? 'ok' : ''}">
      <div class="n" onclick="tg(${i})" role="button">${ck.includes(i) ? '✓' : (i + 1)}</div>
      <div class="ex-body">
        <div class="ex-head" onclick="tg(${i})" role="button">
          <div class="nm">${esc(e.name)}</div>
          <div class="dt">${fmt(e.text, e.lift)}</div>
          ${techBadgesHtml(e)}${exProgNoteHtml(e)}
        </div>
        ${setsBlock}
      </div>
    </div>`;
  }).join('') || '<p class="mut">Nessun esercizio</p>';
  return `<div class="modal-backdrop piano-session-backdrop" id="piano-session-modal">
    <div class="modal-card piano-session-card" onclick="event.stopPropagation()" style="--ac:${ac}">
      <p class="big" style="margin-bottom:4px">Log carichi</p>
      <p class="mut" style="margin-bottom:12px">${esc(week.label)} · Giorno ${d} · ${esc(dayFocus(week, d))}</p>
      <p class="mut" style="margin-bottom:12px;font-size:13px">Inserisci kg/rip dove puoi. Gli esercizi senza valori saranno comunque segnati come fatti (serie vuote).</p>
      <div class="piano-session-list train-wrap">${list}</div>
      <button type="button" class="pri" onclick="savePianoSession()">Salva nello storico</button>
      <button type="button" onclick="cancelPianoSession()">Annulla</button>
    </div>
  </div>`;
}
/* ===== Complementari: popup tabella + CSV Hevy ===== */
let _compCsv = null; // allenamenti letti dal CSV (solo in memoria)
const compEmptyRow = () => ({ name: '', sets: '', reps: '', kg: '', note: '', incNext: false, nextKg: '', nextNote: '' });
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
    const noteTr = tr.nextElementSibling;
    const noteV = c => (noteTr && noteTr.querySelector('[data-c="' + c + '"]') ? noteTr.querySelector('[data-c="' + c + '"]').value : '');
    const incNext = noteTr && noteTr.querySelector('[data-c="incNext"]') ? noteTr.querySelector('[data-c="incNext"]').checked : false;
    rows.push({
      name: v('name'),
      sets: v('sets'),
      reps: v('reps'),
      kg: v('kg'),
      note: noteV('note'),
      incNext: incNext,
      nextKg: noteV('nextKg'),
      nextNote: noteV('nextNote')
    });
  });
  if (rows.length) S.compModal.rows = rows;
}
function compOnNameChange(i, name) {
  compSync();
  if (!S.compModal || !S.compModal.rows[i]) return;
  const r = S.compModal.rows[i];
  r.name = name;
  const planned = name ? getPlannedLoad(name, S.compModal.week, 'comp') : null;
  if (planned && planned.kg != null && (r.kg === '' || r.kg == null)) {
    r.kg = String(planned.kg);
  }
  save(); render();
}
function compApplyPlannedKg(i, kg) {
  compSync();
  if (!S.compModal || !S.compModal.rows[i]) return;
  S.compModal.rows[i].kg = String(kg);
  save(); render();
}
function compToggleNext(i, checkbox) {
  const checked = typeof checkbox === 'boolean' ? checkbox : checkbox.checked;
  if (!S.compModal || !S.compModal.rows[i]) return;
  S.compModal.rows[i].incNext = checked;
  const el = document.getElementById('comp-next-inputs-' + i);
  if (el) {
    el.classList.toggle('hidden', !checked);
    if (checked) {
      const kgInp = el.querySelector('input[data-c="nextKg"]');
      if (kgInp) setTimeout(() => kgInp.focus(), 50);
    }
  }
  if (checkbox && checkbox.closest) {
    checkbox.closest('.comp-inc-label')?.classList.toggle('active', checked);
  }
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
    const nextKg = (r.incNext && r.nextKg !== '') ? parseFloat(String(r.nextKg).replace(',', '.')) : null;
    if (last && liftKey(last.name) === liftKey(name)) {
      sets.forEach(s => last.sets.push(s));
    } else {
      out.push({
        name,
        warm: false,
        main: false,
        text: '',
        done: true,
        sets,
        note: String(r.note || '').trim(),
        nextKg: !isNaN(nextKg) ? nextKg : null,
        nextNote: String(r.nextNote || '').trim()
      });
    }
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
  exs.forEach(e => {
    pushLiftHistory(e.name, e.sets, week, 'comp', e.nextKg, e.nextNote, e.note);
  });
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
  const rows = m.rows.map((r, i) => {
    const planned = r.name ? getPlannedLoad(r.name, m.week, 'comp') : null;
    let plannedHint = '';
    if (planned && planned.kg != null) {
      plannedHint = `<div class="comp-planned-hint">📌 Programmato: <b>${esc(String(planned.kg))} kg</b>${planned.note ? ' — ' + esc(planned.note) : ''} <button type="button" class="comp-apply-btn" onclick="compApplyPlannedKg(${i}, ${planned.kg})">Usa</button></div>`;
    }
    const nextChecked = r.incNext ? 'checked' : '';
    const nextHidden = r.incNext ? '' : 'hidden';
    return `<tr class="comp-row">
    <td>
      <input type="text" data-c="name" list="comp-names" placeholder="Esercizio" value="${esc(r.name)}" onchange="compOnNameChange(${i}, this.value)">
      ${plannedHint}
    </td>
    <td><input type="number" inputmode="numeric" data-c="sets" placeholder="Serie" value="${esc(r.sets)}"></td>
    <td><input type="number" inputmode="numeric" data-c="reps" placeholder="Rep" value="${esc(r.reps)}"></td>
    <td><input type="text" inputmode="decimal" data-c="kg" placeholder="${planned ? esc(String(planned.kg)) : 'Kg'}" value="${esc(r.kg)}"></td>
    <td><button type="button" class="comp-del" onclick="compDelRow(${i})" aria-label="Elimina riga">✕</button></td>
  </tr>
  <tr class="comp-note-row">
    <td colspan="5">
      <input type="text" class="comp-note-input" data-c="note" placeholder="Note su ${esc(r.name || 'questo esercizio')}…" value="${esc(r.note || '')}">
      <div class="comp-next-wrap">
        <label class="comp-inc-label ${nextChecked ? 'active' : ''}">
          <input type="checkbox" data-c="incNext" ${nextChecked} onchange="compToggleNext(${i}, this)">
          <span>Modificare il carico la prossima volta?</span>
        </label>
        <div class="comp-next-inputs ${nextHidden}" id="comp-next-inputs-${i}">
          <input type="number" step="0.5" inputmode="decimal" data-c="nextKg" placeholder="Nuovo kg (es. 25)" value="${esc(String(r.nextKg != null ? r.nextKg : ''))}">
          <input type="text" data-c="nextNote" placeholder="Nota per la prossima volta (facoltativa)" value="${esc(r.nextNote || '')}">
        </div>
      </div>
    </td>
  </tr>`;
  }).join('');
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
/* =====================================================================
 * REGISTRO ESERCIZI (v2)
 * - exId: identità stabile di un esercizio, indipendente dal nome esatto
 * - S.exLog[exId]: log per esercizio, indipendente dalla scheda caricata
 * - chiavi di sessione (accLog / exNotes / nextLoad) legate a progId + exId
 * - riconoscimento scheda (nome file + esercizi in comune)
 * ===================================================================== */
S.exLog = S.exLog || {};     // exId -> { name, mono, aliases:[], entries:[...] }
S.exAlias = S.exAlias || {}; // chiave normalizzata -> exId
S.exReg = S.exReg || {};     // exId -> { name, tokens:[], pending? }

const EX_STOP = new Set(['con', 'di', 'del', 'della', 'dei', 'delle', 'il', 'la', 'lo', 'le', 'i', 'gli', 'un', 'una', 'a', 'al', 'alla', 'in', 'da', 'per', 'e', 'ed', 'su', 'the', 'of', 'and', 'x']);
const EX_SYN = {
  db: 'manubri', dumbbell: 'manubri', dumbbells: 'manubri', manubrio: 'manubri', manubri: 'manubri',
  bb: 'bilanciere', barbell: 'bilanciere',
  cable: 'cavi', cables: 'cavi', cavo: 'cavi',
  machine: 'macchina', kb: 'kettlebell',
  bench: 'panca', deadlift: 'stacco',
  incline: 'inclinata', inclined: 'inclinata', inclinato: 'inclinata', decline: 'declinata', declinato: 'declinata',
  pause: 'pausa', paused: 'pausa', pauses: 'pausa', pausato: 'pausa', pausata: 'pausa',
  close: 'stretta', stretto: 'stretta', wide: 'larga', largo: 'larga',
  seated: 'seduto', standing: 'piedi', lateral: 'laterale', laterals: 'laterale', rear: 'posteriore'
};
function exStem(t) {
  if (/\d/.test(t) || t.length < 5) return t;
  t = t.replace(/[aeio]$/, '');
  t = t.replace(/(ch|gh)$/, m => m[0]);
  return t;
}
// attrezzo: se due nomi hanno attrezzi diversi sono esercizi diversi (carichi non confrontabili)
const EX_EQUIP = new Set(['manubri', 'bilanciere', 'cavi', 'macchina', 'kettlebell', 'elastico', 'smith', 'multipower', 'trap'].map(exStem));
// modificatori che cambiano davvero l'esercizio
const EX_MODS = new Set(['presa', 'stretta', 'larga', 'inclinata', 'declinata', 'pausa', 'fermi', 'fermo', 'front', 'sumo', 'box', 'deficit', 'rialzo', 'rialzi',
  'tecnica', 'hammer', 'neutra', 'supina', 'prona', 'rovescia', 'rumeno', 'rdl', 'bulgara', 'bulgaro', 'hack', 'goblet', 'zercher', 'laterale', 'frontale', 'posteriore', 'alta', 'bassa', 'alto', 'basso', 'militare', 'push', 'jerk', 'spinta', 'tirata'].map(exStem));
const _exNormCache = new Map();
function exNorm(name) {
  const raw = String(name || '');
  if (_exNormCache.has(raw)) return _exNormCache.get(raw);
  let s = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  s = s.replace(/\([^)]*\)/g, ' ');                       // note tra parentesi
  const mono = /mono\s*-?\s*laterali?|unilaterali?|unilateral|\bmono\b|\bsx\b|\bdx\b|\bsingolo\b/.test(s);
  s = s.replace(/mono\s*-?\s*laterali?|unilaterali?|unilateral|\bmono\b|\bsx\b|\bdx\b|\bsingolo\b/g, ' ');
  const toks = s.replace(/[^a-z0-9]+/g, ' ').split(' ').filter(Boolean)
    .filter(t => !EX_STOP.has(t)).map(t => EX_SYN[t] || t).map(exStem);
  const uniq = [...new Set(toks)].sort();
  const out = { tokens: uniq, key: uniq.join('-'), mono };
  _exNormCache.set(raw, out);
  return out;
}
/** Somiglianza 0..1 tra due insiemi di token (Jaccard + contenimento, con vincoli su attrezzo e modificatori) */
function exSim(a, b) {
  if (!a.length || !b.length) return 0;
  const A = new Set(a), B = new Set(b);
  let inter = 0; A.forEach(t => { if (B.has(t)) inter++; });
  let score = inter / (A.size + B.size - inter);
  const diff = [...A].filter(t => !B.has(t)).concat([...B].filter(t => !A.has(t)));
  if (diff.some(t => EX_MODS.has(t))) return Math.min(score, 0.4);
  const ea = [...A].filter(t => EX_EQUIP.has(t)), eb = [...B].filter(t => EX_EQUIP.has(t));
  if (ea.length && eb.length && ea.some(t => !B.has(t)) && eb.some(t => !A.has(t))) return Math.min(score, 0.4);
  const equipDiff = diff.some(t => EX_EQUIP.has(t));
  const small = A.size <= B.size ? A : B, big = A.size <= B.size ? B : A;
  if (!equipDiff && small.size >= 2 && [...small].every(t => big.has(t))) score = Math.max(score, 0.85);
  return score;
}
function exBestMatch(tokens, skipId) {
  let best = null, bestScore = 0;
  Object.keys(S.exReg).forEach(rid => {
    if (rid === skipId) return;
    const sc = exSim(tokens, S.exReg[rid].tokens || []);
    if (sc > bestScore) { bestScore = sc; best = rid; }
  });
  return { id: best, score: bestScore };
}
/** Solo lettura: id esistente (alias o match automatico >= 0.8), mai creazioni. */
function exLookupId(name) {
  const n = exNorm(name);
  if (!n.key) return null;
  const a = S.exAlias[n.key];
  if (a && S.exReg[a]) return a;
  const m = exBestMatch(n.tokens);
  return (m.id && m.score >= 0.8) ? m.id : null;
}
/** Id esercizio; crea la voce se nuova. Match >= 0.8 automatico; 0.5-0.8 resta "pending" e viene chiesto all'import scheda. */
function getExId(name) {
  const n = exNorm(name);
  if (!n.key) return '';
  const a = S.exAlias[n.key];
  if (a && S.exReg[a]) return a;
  const m = exBestMatch(n.tokens);
  if (m.id && m.score >= 0.8) { S.exAlias[n.key] = m.id; return m.id; }
  const id = n.key;
  if (!S.exReg[id]) {
    S.exReg[id] = { name: String(name).trim(), tokens: n.tokens };
    if (m.id && m.score >= 0.5) S.exReg[id].pending = m.id;
  }
  S.exAlias[n.key] = id;
  return id;
}
/** Chiede (una volta) se gli esercizi di questa scheda con somiglianza media sono lo stesso esercizio già noto. */
function resolvePendingExercises(prog) {
  if (!prog || !prog.weeks) return;
  const ids = new Set();
  prog.weeks.forEach(w => Object.values(w.days || {}).forEach(list => (list || []).forEach(e => {
    if (e && !e.warm && e.name) { const id = getExId(e.name); if (id) ids.add(id); }
  })));
  ids.forEach(id => {
    const reg = S.exReg[id];
    if (!reg || !reg.pending) return;
    const cand = reg.pending;
    delete reg.pending;
    if (!S.exReg[cand] || cand === id) return;
    let same = false;
    try {
      same = confirm('Esercizio "' + reg.name + '": è lo stesso di "' + S.exReg[cand].name + '"?\n\nOK = stesso esercizio (storico condiviso)\nAnnulla = esercizio diverso');
    } catch (e) { }
    if (same) mergeExercises(id, cand);
  });
}
/** Unisce l'esercizio fromId dentro toId (storico, alias, log di sessione, note, recuperi). */
function mergeExercises(fromId, toId) {
  if (!fromId || !toId || fromId === toId || !S.exReg[fromId] || !S.exReg[toId]) return;
  const from = S.exLog[fromId];
  if (from) {
    const to = S.exLog[toId] = S.exLog[toId] || { name: S.exReg[toId].name, mono: false, aliases: [], entries: [] };
    from.entries.forEach(en => {
      if (!to.entries.some(x => exSameSession(x, en) && x.date === en.date)) to.entries.push(en);
    });
    to.entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    if (to.entries.length > 50) to.entries.length = 50;
    to.mono = to.mono || from.mono;
    [from.name].concat(from.aliases || []).forEach(a => { if (a && a !== to.name && !to.aliases.includes(a) && to.aliases.length < 8) to.aliases.push(a); });
    delete S.exLog[fromId];
  }
  Object.keys(S.exAlias).forEach(k => { if (S.exAlias[k] === fromId) S.exAlias[k] = toId; });
  delete S.exReg[fromId];
  Object.keys(S.exReg).forEach(r => { if (S.exReg[r].pending === fromId) delete S.exReg[r].pending; });
  // log di sessione: slot fromId / fromId#n
  Object.keys(S.accLog || {}).forEach(k => {
    const row = S.accLog[k];
    Object.keys(row).forEach(slot => {
      const base = slot.split('#')[0];
      if (base !== fromId) return;
      let ns = toId + slot.slice(fromId.length);
      if (!row[ns]) row[ns] = row[slot];
      delete row[slot];
    });
  });
  const renameKeys = (obj, endsWithId) => {
    Object.keys(obj || {}).forEach(k => {
      const i = k.lastIndexOf('|');
      const last = i >= 0 ? k.slice(i + 1) : k;
      if (last.split('#')[0] !== fromId) return;
      const nk = (i >= 0 ? k.slice(0, i + 1) : '') + toId + last.slice(fromId.length);
      if (obj[nk] === undefined) obj[nk] = obj[k];
      delete obj[k];
    });
  };
  renameKeys(S.exNotes); renameKeys(S.nextLoad);
  if (S.restByEx && S.restByEx[fromId] != null) {
    if (S.restByEx[toId] == null) S.restByEx[toId] = S.restByEx[fromId];
    delete S.restByEx[fromId];
  }
  save();
}

/* ----- helper numerici e formattazione ----- */
const exNum = v => { if (v === '' || v == null) return null; const x = parseFloat(String(v).replace(',', '.')); return isNaN(x) ? null : x; };
const exInt = v => { if (v === '' || v == null) return null; const x = parseInt(v, 10); return isNaN(x) ? null : x; };
const exFmtNum = v => String(v).replace('.', ',');
function exFmtDate(d) {
  const m = String(d || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? (m[3] + '/' + m[2]) : String(d || '');
}
/** Normalizza le serie per lo storico: bilaterali {kg,reps,rpe?} oppure mono {L:{kg,reps},R:{kg,reps}} */
function exCleanSets(sets) {
  const out = [];
  (sets || []).forEach(s => {
    if (!s) return;
    if (s.L || s.R) {
      const side = sd => sd ? { kg: exNum(sd.kg), reps: exInt(sd.reps) } : { kg: null, reps: null };
      const L = side(s.L), R = side(s.R);
      if (L.kg == null && L.reps == null && R.kg == null && R.reps == null && s.n == null && s.blockIdx == null) return;
      out.push({ L: { ...L, done: !!(s.L && s.L.done) }, R: { ...R, done: !!(s.R && s.R.done) }, ...setHistoryMeta(s) });
    } else {
      const kg = exNum(s.kg), reps = exInt(s.reps);
      if (kg == null && reps == null && s.n == null && s.blockIdx == null) return;
      const o = { kg, reps, ...setHistoryMeta(s) };
      const r = rpeOf(s);
      if (r != null) o.rpe = r;
      out.push(o);
    }
  });
  return out;
}
/** Serie di una entry convertite per l'esercizio corrente (mono o bilaterale). Valori '' se mancanti. */
function exConvertSets(sets, mono) {
  const v = x => (x == null ? '' : x);
  return (sets || []).map(s => {
    if (mono) {
      if (s.L || s.R) {
        return { L: { kg: v(s.L && s.L.kg), reps: v(s.L && s.L.reps) }, R: { kg: v(s.R && s.R.kg), reps: v(s.R && s.R.reps) } };
      }
      return { L: { kg: v(s.kg), reps: v(s.reps) }, R: { kg: v(s.kg), reps: v(s.reps) } };
    }
    if (s.L || s.R) {
      const kgs = [s.L && s.L.kg, s.R && s.R.kg].filter(x => x != null);
      const reps = [s.L && s.L.reps, s.R && s.R.reps].filter(x => x != null);
      return { kg: kgs.length ? Math.min.apply(null, kgs) : '', reps: reps.length ? Math.min.apply(null, reps) : '' };
    }
    const o = { kg: v(s.kg), reps: v(s.reps) };
    if (s.rpe != null) o.rpe = s.rpe;
    return o;
  });
}
/** "3×10 @ 20 kg" (raggruppa serie uguali consecutive); mono: "3× sx 18 kg × 10 / dx 20 kg × 10" */
function exFmtSets(sets) {
  const fmt = s => (s && s.kg != null ? exFmtNum(s.kg) + ' kg' : '— kg') + ' × ' + (s && s.reps != null ? s.reps : '—');
  return (sets || []).map((s, i) => (s.blockIdx != null ? 'B' + (s.blockIdx + 1) + ' · ' : '') + 'S' + (s.blockSet || s.n || i + 1) + ': ' + (s.L || s.R ? 'Sx ' + fmt(s.L) + ' / Dx ' + fmt(s.R) : fmt(s))).join(' · ');
}

/* ----- sessioni ed entries ----- */
const exCurProgId = () => (S.prog && S.prog.id) || '';
function exCur(week, day) { return { progId: exCurProgId(), week: week, day: day, date: dstr() }; }
/** stessa sessione = stessa scheda + settimana + giorno (i complementari 'comp' anche stessa data) */
function exSameSession(a, b) {
  if (String(a.progId || '') !== String(b.progId || '')) return false;
  if (String(a.week) !== String(b.week)) return false;
  if (String(a.day) !== String(b.day)) return false;
  if (String(a.day) === 'comp') return a.date === b.date;
  return true;
}
function exUpsertEntry(id, name, entry, opts) {
  opts = opts || {};
  if (!id) return;
  const raw = String(name || '').trim();
  const rec = S.exLog[id] = S.exLog[id] || { name: (S.exReg[id] && S.exReg[id].name) || raw || id, mono: false, aliases: [], entries: [] };
  if (raw && !opts.keepName) rec.name = raw;
  if (raw && raw !== rec.name && !rec.aliases.includes(raw) && rec.aliases.length < 8) rec.aliases.push(raw);
  if (entry.sets.some(s => s.L || s.R)) rec.mono = true;
  const idx = rec.entries.findIndex(en => exSameSession(en, entry)
    || (!entry.progId && String(en.week) === String(entry.week) && String(en.day) === String(entry.day) && en.date === entry.date));
  if (idx >= 0) {
    if (opts.keepExisting) return;
    rec.entries.splice(idx, 1);
  }
  rec.entries.unshift(entry);
  rec.entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  if (rec.entries.length > 50) rec.entries.length = 50;
}
function exEntriesFor(name) {
  const id = exLookupId(name);
  return (id && S.exLog[id] && S.exLog[id].entries) || [];
}
/** Ultima volta che l'esercizio è stato fatto (qualunque scheda), esclusa la sessione corrente */
function lastExEntry(name, week, day) {
  const cur = exCur(week, day);
  return exEntriesFor(name).find(en => !exSameSession(en, cur)) || null;
}
function exRemoveSession(progId, week, day) {
  Object.keys(S.exLog).forEach(id => {
    const rec = S.exLog[id];
    rec.entries = rec.entries.filter(en => !(String(en.progId || '') === String(progId || '') && String(en.week) === String(week) && String(en.day) === String(day)));
  });
}
function exRemoveWeek(progId, week) {
  Object.keys(S.exLog).forEach(id => {
    const rec = S.exLog[id];
    rec.entries = rec.entries.filter(en => !(String(en.progId || '') === String(progId || '') && String(en.week) === String(week)));
  });
}
function exIngestWorkout(w) {
  if (!w || entryType(w) !== 'train' || !Array.isArray(w.exercises)) return;
  w.exercises.forEach(e => {
    if (!e || e.warm || !e.name) return;
    const sets = exCleanSets(e.sets);
    if (!sets.length) return;
    const id = getExId(e.name);
    if (!id) return;
    const en = { date: w.date || dstr(), progId: w.progId || '', week: w.week || '', day: w.day, sets };
    if (e.note) en.note = e.note;
    if (e.nextKg != null) { en.nextKg = e.nextKg; en.nextNote = e.nextNote || ''; if(e.nextSides)en.nextSides=e.nextSides; }
    exUpsertEntry(id, e.name, en, { keepExisting: true });
  });
}

/* ----- chiavi di sessione: progId + settimana + giorno, slot = exId (non più l'indice) ----- */
const accKeyFor = (progId, week, day) => (progId || '') + '|' + week + '|' + day;
const accKey = (week, day) => accKeyFor(exCurProgId(), week, day);
/** slot dell'esercizio i-esimo di quel giorno: exId (+ #n se lo stesso esercizio compare più volte) */
function accSlot(week, day, i) {
  try {
    const wObj = S.prog && S.prog.weeks && S.prog.weeks.find(x => x.label === week);
    const list = wObj && dayExercises(wObj, day);
    const ex = list && list[i];
    if (ex && ex.name) {
      const id = getExId(ex.name);
      if (id) {
        let occ = 0;
        for (let j = 0; j < i; j++) if (list[j] && list[j].name && getExId(list[j].name) === id) occ++;
        return occ ? id + '#' + occ : id;
      }
    }
  } catch (e) { }
  return 'i' + i;
}

/* ----- riconoscimento scheda ----- */
function normFileName(fn) {
  let s = String(fn || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  s = s.replace(/\.docx?$/i, '').replace(/_+/g, ' ');
  s = s.replace(/\(\s*\d+\s*\)/g, ' ');
  s = s.replace(/\b(copia|copy|final|finale|nuovo|nuova|new|aggiornat[oa]|agg|rev|revisione)\b/g, ' ');
  s = s.replace(/\b(v|ver|versione)\s*\.?\s*\d+(\.\d+)*\b/g, ' ');
  s = s.replace(/\b\d{4}[-_.\/]\d{1,2}[-_.\/]\d{1,2}\b/g, ' ');
  s = s.replace(/\b\d{1,2}[-_.\/]\d{1,2}[-_.\/]\d{2,4}\b/g, ' ');
  return s.replace(/[^a-z0-9]+/g, ' ').trim();
}
function jaccardSets(a, b) {
  const A = new Set(a), B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0; A.forEach(x => { if (B.has(x)) inter++; });
  return inter / (A.size + B.size - inter);
}
function progFingerprint(prog) {
  const ids = new Set();
  ((prog && prog.weeks) || []).forEach(w => Object.values(w.days || {}).forEach(list => (list || []).forEach(e => {
    if (e && e.name && !e.warm) { const id = getExId(e.name); if (id) ids.add(id); }
  })));
  return [...ids];
}
/** Cerca tra le schede note quella che somiglia a `prog`. Restituisce {p, nameSim, fpSim, auto} oppure null. */
function matchKnownProg(prog) {
  const fp = progFingerprint(prog);
  const nameTok = normFileName(prog.fileName || prog.name).split(' ').filter(Boolean);
  let best = null;
  allKnownProgs().forEach(p => {
    if (!p || !p.id) return;
    const exact = String(p.fileName || '').toLowerCase() === String(prog.fileName || '').toLowerCase();
    const nameSim = exact ? 1 : jaccardSets(nameTok, normFileName(p.fileName || p.name).split(' ').filter(Boolean));
    const fpSim = jaccardSets(fp, progFingerprint(p));
    const nameOk = nameSim >= 0.8, fpOk = fpSim >= 0.7;
    if (!nameOk && !fpOk) return;
    const cand = { p, nameSim, fpSim, auto: nameOk && fpOk, score: (nameOk && fpOk ? 10 : 0) + nameSim + fpSim };
    if (!best || cand.score > best.score) best = cand;
  });
  return best;
}
const newProgId = () => 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ----- backup e salvataggio ----- */
async function exportBackupJson() {
  try {
    const snapshot=JSON.parse(JSON.stringify(S));
    const refs=Object.values(snapshot.noteImages || {}).flat();
    const media=[];
    for (const id of [...new Set(refs.map(r=>r.id))]) { const rec=await mediaGet(id); if (!rec) throw new Error('Manca una foto: '+id); media.push(rec); }
    snapshot._media=media; snapshot.backupVersion=3;
    downloadData(JSON.stringify(snapshot),'application/json','powerlifting-backup-'+dstr()+'.json');
  } catch(e) { alert('Backup non riuscito: '+e.message); }
}

function reloadApp() { location.reload(); }
/** Ripristina un backup .json scaricato con exportBackupJson(); sostituisce tutti i dati e ricarica l'app */
async function importBackupJson(input) {
  const file=input && input.files && input.files[0]; if (!file) return;
  try {
    const data=JSON.parse(await file.text());
    if (!data || Array.isArray(data) || typeof data!=='object' || !(data.prog || Array.isArray(data.workoutLog) || data.exLog)) throw new Error('File di backup non valido');
    if (!confirm('Ripristinare il backup e sostituire i dati attuali?')) return;
    const old=localStorage.getItem(KEY);
    const media=data._media || []; if (!Array.isArray(media)) throw new Error('Archivio foto non valido');
    // Use fresh image identifiers: a failed restore cannot overwrite the current photos.
    const ids=new Map();
    for (const rec of media) {
      if (!rec || typeof rec.id!=='string' || typeof rec.data!=='string' || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(rec.data)) throw new Error('Foto del backup non valida');
      const id='restore_'+Date.now().toString(36)+Math.random().toString(36).slice(2); ids.set(rec.id,id);
      await mediaPut({...rec,id});
    }
    Object.values(data.noteImages || {}).forEach(refs=>refs.forEach(ref=>{ if (ids.has(ref.id)) ref.id=ids.get(ref.id); }));
    delete data._media;
    data.dayModal=null; data.dayEdit=null; data.restPicker=null; data.compModal=null; data.pianoSession=null;
    try { localStorage.setItem(KEY,JSON.stringify(data)); } catch(e) { if (old!=null) localStorage.setItem(KEY,old); throw e; }
    cancelRestTimer(); localStorage.setItem(KEY,JSON.stringify(data)); reloadApp();
  } catch(e) { alert('Ripristino non riuscito: '+e.message); }
  finally { input.value=''; }
}

/* ----- migrazione a schemaV 2 (idempotente) ----- */
function migrateSessionKeys() {
  const p = S.prog;
  if (!p || !p.weeks) return;
  ensureProgMeta(p);
  const pid = p.id || '';
  const labels = new Set(p.weeks.map(w => w.label));
  const loggedByOther = (week, day) => {
    const wl = S.workoutLog || [];
    const mine = wl.some(w => String(w.week) === String(week) && String(w.day) === String(day) && w.progId === pid);
    const other = wl.some(w => String(w.week) === String(week) && String(w.day) === String(day) && w.progId && w.progId !== pid);
    return other && !mine;
  };
  Object.keys(S.accLog || {}).forEach(k => {
    const parts = k.split('|');
    if (parts.length !== 2 || !labels.has(parts[0])) return;   // già nuovo formato o altra scheda
    const week = parts[0], day = parts[1];
    if (!loggedByOther(week, day)) {
      const nk = accKeyFor(pid, week, day);
      const dest = S.accLog[nk] = S.accLog[nk] || {};
      Object.keys(S.accLog[k] || {}).forEach(ii => {
        const slot = accSlot(week, day, Number(ii));
        if (!dest[slot]) dest[slot] = S.accLog[k][ii];
      });
    }
    delete S.accLog[k];
  });
  Object.keys(S.exNotes || {}).forEach(k => {
    const parts = k.split('|');
    if (parts.length !== 3 || !labels.has(parts[0])) return;
    if (!loggedByOther(parts[0], parts[1])) {
      const nk = pid + '|' + parts[0] + '|' + parts[1] + '|' + accSlot(parts[0], parts[1], Number(parts[2]));
      if (S.exNotes[nk] === undefined) S.exNotes[nk] = S.exNotes[k];
    }
    delete S.exNotes[k];
  });
  Object.keys(S.nextLoad || {}).forEach(k => {
    const parts = k.split('|');
    if (parts.length === 1) { delete S.nextLoad[k]; return; }   // vecchia chiave generale: il piano ora vive nelle entry
    if (parts.length !== 3 || !labels.has(parts[0])) return;
    if (!loggedByOther(parts[0], parts[1])) {
      const nk = pid + '|' + parts[0] + '|' + parts[1] + '|' + getExId(parts[2]);
      if (S.nextLoad[nk] === undefined) S.nextLoad[nk] = S.nextLoad[k];
    }
    delete S.nextLoad[k];
  });
}
function migrateToV2() {
  if ((S.schemaV || 0) >= 2) return;
  let backup = null;
  try { backup = JSON.stringify(S); } catch (e) { return; }
  try {
    const hasData = (S.workoutLog || []).length || Object.keys(S.liftHistory || {}).length || Object.keys(S.accLog || {}).length;
    if (hasData && typeof confirm === 'function' && confirm('Aggiornamento del registro esercizi.\n\nVuoi scaricare prima un backup (.json) dei tuoi dati?\n\nOK = scarica il backup, Annulla = continua senza')) {
      exportBackupJson();
    }
    // 1) storico allenamenti -> log per esercizio (dal più vecchio, così l'ordine finale è corretto)
    (S.workoutLog || []).slice().reverse().forEach(w => exIngestWorkout(w));
    // 2) vecchio liftHistory (solo ciò che non è già coperto)
    Object.keys(S.liftHistory || {}).forEach(key => {
      const id = getExId(key);
      if (!id) return;
      (S.liftHistory[key] || []).slice().reverse().forEach(h => {
        const sets = exCleanSets(h.sets || ((h.kg != null || h.reps != null) ? [{ kg: h.kg, reps: h.reps }] : []));
        if (!sets.length) return;
        const wl = (S.workoutLog || []).find(w => String(w.week) === String(h.week) && String(w.day) === String(h.day) && w.date === h.date);
        const en = { date: h.date || dstr(), progId: (wl && wl.progId) || '', week: h.week || '', day: h.day, sets };
        if (h.note) en.note = h.note;
        if (h.nextKg != null) { en.nextKg = h.nextKg; en.nextNote = h.nextNote || ''; }
        exUpsertEntry(id, '', en, { keepExisting: true, keepName: true });
      });
    });
    // 3) chiavi di sessione della scheda attuale
    migrateSessionKeys();
    // 4) tempi di recupero per exId
    Object.keys(S.restByEx || {}).forEach(k => {
      const id = getExId(k);
      if (id && id !== k) { if (S.restByEx[id] == null) S.restByEx[id] = S.restByEx[k]; delete S.restByEx[k]; }
    });
    S.schemaV = 2;
    save();
  } catch (e) {
    console.error('Migrazione v2 fallita, ripristino', e);
    try { S = JSON.parse(backup); } catch (e2) { }
  }
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
  return /monolaterale|mono\s*laterale|unilateral|\bmono\b/.test(t);
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
  const k = exLookupId(name) || liftKey(name);
  if (S.restByEx && S.restByEx[k] != null) return Number(S.restByEx[k]) || 90;
  return Number(S.restDefault) || 120;
}
function setRestSec(name, sec) {
  S.restByEx = S.restByEx || {};
  const n = Math.max(15, Math.min(600, parseInt(sec, 10) || 90));
  S.restByEx[getExId(name) || liftKey(name)] = n;
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

  // mav / mav5 / m.a.v. 5 / MAV5
  const mavM = t.match(/\bm\.?a\.?v\.?\s*(\d+(?:[.,]\d+)?)?\b|maximum\s*acceptable\s*volume|volume\s*massimo\s*accettabile/);
  T.mav = !!mavM;
  if (mavM && mavM[1]) T.mavReps = parseInt(String(mavM[1]).replace(',', '.'), 10);
  // 100% del mav / 90% del MAV
  const pctMav = t.match(/(\d+(?:[.,]\d+)?)\s*%\s*(?:del\s*)?m\.?a\.?v\.?\b/);
  if (pctMav) {
    T.pctOfMav = parseFloat(String(pctMav[1]).replace(',', '.'));
    T.mav = true; // blocchi che dipendono dal MAV
  }
  T.vbt = has(/\bv\.?b\.?t\.?\b|velocity[ -]?based|speed\s*(?:based|work)|velocit[aà]|\bm\/s\b|\bmetri\/secondo\b/);
  T.e1rm = has(/\be\.?1\.?rm\b|1\s*rm\s*stimato|massimale\s*stimato|estimated\s*1\s*rm/);

  // Modificato per NON attivarsi se preceduto da "no" (es. "no var istintiva")
  T.instinct = has(/(?<!no\s*(?:var\s*)?)(?:istintiv|a sensazione|\bfeeling\b|autoregol|a piacere|a piacimento|\binstinctive\b|carico\s*libero|ripetizioni\s*libere)/);

  T.amrap = has(/\bamrap\b|as\s*many\s*reps|\bmax(?:imum)?\s*reps?\b|massime?\s*ripetizioni|al cedimento|to failure|a cedimento/);
  T.emom = has(/\bemom\b|every minute|ogni minuto/);
  // cluster: solo parola "cluster" o forma 3x(2+2+1) / (2+2+1)
  const clParen = t.match(/\(\s*(\d+(?:\s*\+\s*\d+){1,})\s*\)/);
  T.cluster = has(/\bcluster\b/) || !!clParen;
  if (clParen) T.clusterParts = clParen[1].split(/\s*\+\s*/).map(Number);
  else if (T.cluster) {
    const cl2 = t.match(/(\d+(?:\s*\+\s*\d+){1,})/);
    if (cl2) T.clusterParts = cl2[1].split(/\s*\+\s*/).map(Number);
  }
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

  if (T.rpe) tag('rpe', T.rpe.txt, 'Autoregolazione: scegli il carico che dia questa fatica (RPE 10 = zero rip di riserva). Aggiungi serie finché lo raggiungi.');
  if (T.mav && !T.pctOfMav) tag('mav', 'MAV' + (T.mavReps ? ' ' + T.mavReps : ''), 'Serie MAV: imposta il carico, ripetizioni fisse' + (T.mavReps ? ' a ' + T.mavReps : '') + '.');
  if (T.pctOfMav) tag('mav', T.pctOfMav + '% del MAV', 'Carico fisso = ' + T.pctOfMav + '% del MAV appena trovato (non modificabile).');
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

  // % del MAV = serie fisse (carico bloccato), non rampa
  const ramp = !!(T.rpe || (T.mav && !T.pctOfMav) || T.vbt || T.e1rm || T.topset || T.ramping || T.dailyMax || T.me);
  T.mode = T.pctOfMav ? 'fixed' : (ramp ? 'ramp' : (T.instinct ? 'free' : 'fixed'));
  T.dynamic = (ramp && !T.pctOfMav) || T.restpause || T.drop || T.amrap || T.backoff;
  return (_techCache[t] = T);
}

/** Divide una prescrizione in blocchi sui simboli "+" (e ";"), nell'ordine originale.
 *  Non spezza i cluster "3x(2+2+1)" / "cluster 2+2+1" né "+" dentro parentesi. */
function splitPrescriptionBlocks(raw) {
  const text = String(raw || '');
  const parts = [];
  let depth = 0, cur = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    let sep = false;
    if (depth === 0 && ch === ';') sep = true;
    else if (depth === 0 && ch === '+') {
      const prev = text[i - 1], next = text[i + 1];
      const spaced = /\s/.test(prev || '') || /\s/.test(next || '');
      const prevCh = text.slice(0, i).trimEnd().slice(-1), nextCh = text.slice(i + 1).trimStart()[0];
      const digitDigit = /\d/.test(prevCh) && /\d/.test(nextCh || '');
      // "2+2+1" senza spazi e senza @ / % nel blocco corrente → cluster, non separatore
      if (!digitDigit || spaced || /[@%]|rpe|rir/i.test(cur)) sep = true;
    }
    if (sep) { parts.push(cur); cur = ''; } else cur += ch;
  }
  parts.push(cur);
  let out = parts.map(x => x.trim()).filter(Boolean);
  // cluster scritto "2 + 2 + 1" con parola cluster: tutti numeri → un solo blocco
  if (out.length > 1 && /\bcluster\b/i.test(text) && out.every(x => /^\d+$/.test(x))) out = [out.join('+')];
  return out;
}
/** Analizza stringhe miste ("2x2s 70% + 5@7 + istintiva") separandole in configurazioni per serie */
function parseComplexSets(text, lift) {
  const raw = String(text || '');
  // split: "mav5 + 3x3s 100% del mav" → due blocchi
  const parts = splitPrescriptionBlocks(raw);
  if (!parts.length) parts.push(raw);

  let configs = [];
  let hasDynamic = false;

  parts.forEach((part, bIdx) => {
    const T = analyzeEx({ name: '', text: part });
    const info = parseSets(part);
    const kgP = prescribedKg(part, lift);

    // --- MAV puro (mav5): 1 serie, kg editabili, rip fisse ---
    if (T.mav && !T.pctOfMav) {
      const reps = T.mavReps != null ? T.mavReps : (info.reps != null ? info.reps : null);
      configs.push({
        blockIdx: bIdx,
        partText: part,
        mode: 'ramp',
        dynamic: true,
        role: 'mav',
        reps: reps,
        kg: null,
        kgLocked: false,
        rpe: T.rpe,
        T: T,
        info: { count: 1, reps: reps, mode: 'mav' }
      });
      hasDynamic = true; // bottoni +/− sotto al MAV
      return;
    }

    // --- % del MAV (es. 3x3s 100% del mav): serie fisse, kg bloccati = % del MAV ---
    if (T.pctOfMav != null) {
      let count = info.count || 1;
      // se "3 serie x 3" senza x classico
      const sm = part.match(/(\d+)\s*(?:serie|sets?)\s*[x×]?\s*(\d+)?/i);
      if (sm && !/(\d+)\s*[x×]\s*(\d+)/i.test(part)) {
        count = parseInt(sm[1], 10) || count;
        if (sm[2] && info.reps == null) info.reps = parseInt(sm[2], 10);
      }
      const reps = info.targets ? null : (info.reps != null ? info.reps : null);
      for (let i = 0; i < count; i++) {
        configs.push({
          blockIdx: bIdx,
          partText: part,
          mode: 'fixed',
          dynamic: false,
          role: 'mavBackoff',
          reps: info.targets ? info.targets[i] : reps,
          kg: null,
          kgLocked: true,
          pctOfMav: T.pctOfMav,
          rpe: T.rpe,
          T: T,
          info: info
        });
      }
      return;
    }

    let count = info.count || 1;
    const explicitSets = /(\d+)\s*[x×]\s*(\d+)/i.test(part) || /(\d+)\s*(?:serie|sets?)\b/i.test(part);
    // rampa senza numero serie esplicito → parti da 1
    if (T.dynamic && count === 3 && !info.roles && !explicitSets) count = 1;

    // RPE (non MAV): ruolo rpe, serie con rip fisse + kg modificabili
    if (T.rpe && !T.mav && !T.pctOfMav) {
      const reps = info.targets ? null : (info.reps != null ? info.reps : null);
      for (let i = 0; i < count; i++) {
        configs.push({
          blockIdx: bIdx,
          partText: part,
          mode: 'ramp',
          dynamic: true,
          role: 'rpe',
          reps: info.targets ? info.targets[i] : reps,
          kg: kgP,
          kgLocked: false,
          rpe: T.rpe,
          T: T,
          info: info
        });
      }
      hasDynamic = true;
      return;
    }

    // istintiva: sezione libera (kg e rip modificabili, serie aggiungibili)
    if (T.instinct && !T.mav && !T.rpe && !T.pctOfMav && T.mode === 'free') {
      const nInst = explicitSets ? count : (parts.length > 1 ? 1 : count);
      for (let i = 0; i < nInst; i++) {
        configs.push({ blockIdx: bIdx, partText: part, mode: 'free', dynamic: false, role: 'inst', reps: null, kg: null, kgLocked: false, rpe: T.rpe, T: T, info: info });
      }
      return;
    }

    for (let i = 0; i < count; i++) {
      configs.push({
        blockIdx: bIdx,
        partText: part,
        mode: T.mode,
        dynamic: T.dynamic,
        role: (info.roles && info.roles[i]) || null,
        reps: info.targets ? info.targets[i] : info.reps,
        kg: kgP,
        kgLocked: false,
        rpe: T.rpe,
        T: T,
        info: info
      });
    }
    if (T.dynamic) hasDynamic = true;
  });

  let sourceTop = false;
  configs.forEach(c => {
    if (c.T && c.T.topset && !c.T.backoff) { c.role='top'; sourceTop=true; }
    if ((sourceTop || configs.some(x => x.role === 'top')) && c.T && c.T.backoff && c.T.backoffPct != null && c.role !== 'top') {
      c.role='backoff'; c.kgLocked=true; c.dynamic=false; c.mode='fixed';
    }
  });
  return { configs, hasDynamic };
}

/** kg del set MAV (prima serie con ruolo mav o prima con kg > 0 del blocco mav) */
function getMavKgFromLog(log, configs, beforeIndex) {
  if (!log || !log.sets) return null;
  let sourceBlock = null;
  const end = beforeIndex == null ? configs.length : beforeIndex;
  for (let i = end - 1; i >= 0; i--) {
    if (configs[i] && configs[i].role === 'mav') { sourceBlock = configs[i].blockIdx; break; }
  }
  if (sourceBlock == null) return null;
  let last = null;
  for (let i = 0; i < end; i++) {
    if (!configs[i] || configs[i].blockIdx !== sourceBlock || configs[i].role !== 'mav') continue;
    const st = log.sets[i];
    const value = st && exNum(st.kg);
    if (value > 0 && (st.done || value > 0)) last = value;
  }
  return last;
}
/** Tipologia del blocco (in base alla prima configurazione) */
function blockKindOf(cfg) {
  if (!cfg) return 'fixed';
  if (cfg.role === 'mav') return 'mav';
  if (cfg.role === 'rpe') return 'rpe';
  if (cfg.role === 'mavBackoff' || (cfg.role === 'backoff' && cfg.T && cfg.T.backoffPct != null)) return 'pctmav';
  if (cfg.role === 'inst') return 'inst';
  if (cfg.mode === 'ramp' || cfg.dynamic) return 'ramp';
  if (cfg.T && cfg.T.pct != null) return 'pct';
  if (/%/.test(cfg.partText || '')) return 'pct';
  return 'fixed';
}
const BLOCK_EXPANDABLE = { mav: true, rpe: true, inst: true, ramp: true };
const BLOCK_LABEL = { mav: 'MAV', rpe: 'RPE', pctmav: '% del MAV', inst: 'Istintiva', ramp: 'Autoregolata', pct: 'Percentuale fissa', fixed: 'Serie fisse' };
/** Raggruppa le configurazioni base per blocco, nell'ordine originale */
function groupBlocks(complex) {
  const blocks = [];
  ((complex && complex.configs) || []).forEach(c => {
    let b = blocks[blocks.length - 1];
    if (!b || b.idx !== c.blockIdx) { b = { idx: c.blockIdx, text: c.partText, base: [] }; blocks.push(b); }
    b.base.push(c);
  });
  blocks.forEach(b => { b.kind = blockKindOf(b.base[0]); b.expandable = !!BLOCK_EXPANDABLE[b.kind]; });
  return blocks;
}
/** Vecchio formato (serie MAV/RPE per prime, poi le altre, poi i back-off): riordina nel layout a blocchi */
function migrateRowToBlocks(row, complex) {
  if (row.extra) return;
  const cfgs = (complex && complex.configs) || [];
  const blocks = groupBlocks(complex);
  row.extra = {};
  if (!cfgs.length || !Array.isArray(row.sets)) return;
  const total = row.sets.length;
  const mavT = cfgs.find(c => c.role === 'mav'), rpeT = cfgs.find(c => c.role === 'rpe');
  const expRole = mavT ? 'mav' : (rpeT ? 'rpe' : null);
  const nBo = cfgs.filter(c => c.role === 'mavBackoff').length;
  const other = cfgs.filter(c => c.role !== 'mav' && c.role !== 'rpe' && c.role !== 'mavBackoff');
  const nBase = expRole ? cfgs.filter(c => c.role === expRole).length : 0;
  if (expRole) {
    const nExp = Math.max(nBase, total - nBo - other.length);
    const legacy = [];
    for (let i = 0; i < nExp; i++) legacy.push(Object.assign({}, mavT || rpeT));
    other.forEach(c => legacy.push(c));
    cfgs.filter(c => c.role === 'mavBackoff').forEach(c => legacy.push(c));
    if (legacy.length === total) {
      const tagged = row.sets.map((st, i) => ({ st, bi: legacy[i].blockIdx, i }));
      const order = blocks.map(b => b.idx);
      tagged.sort((x, y) => (order.indexOf(x.bi) - order.indexOf(y.bi)) || (x.i - y.i));
      row.sets = tagged.map(t => t.st);
      const firstExp = blocks.find(b => b.base[0].role === expRole);
      if (firstExp && nExp > nBase) row.extra[firstExp.idx] = nExp - nBase;
    }
  } else if (total > cfgs.length) {
    const last = blocks[blocks.length - 1];
    if (last && last.expandable) row.extra[last.idx] = total - cfgs.length;
  }
}
/** Elenco ordinato delle configurazioni effettive (una per serie), blocco per blocco */
function buildEffectiveConfigs(complex, log) {
  const blocks = groupBlocks(complex);
  if (!blocks.length) return (complex && complex.configs) || [];
  if (log && Array.isArray(log.sets)) migrateRowToBlocks(log, complex);
  const extra = (log && log.extra) || {};
  const out = [];
  blocks.forEach(b => {
    const n = b.expandable ? Math.max(1, b.base.length + (extra[b.idx] || 0)) : b.base.length;
    for (let k = 0; k < n; k++) {
      const src = b.base[Math.min(k, b.base.length - 1)];
      out.push(Object.assign({}, src, { blockKind: b.kind, bpos: k, bsize: n, blockIdx: b.idx }));
    }
  });
  return out;
}
function blockExLift(e) {
  let lift = e.lift;
  if (!lift && isMainLift(e)) {
    const n = String(e.name || '').toLowerCase();
    if (/squat|acconsc/.test(n)) lift = 's';
    else if (/panca|bench/.test(n)) lift = 'b';
    else if (/stacco|deadlift|sumo|regular/.test(n)) lift = 'd';
  }
  return lift;
}
/** Aggiunge (delta=+1) o toglie (delta=-1) una serie al SOLO blocco indicato */
function changeBlockSets(week, day, i, blockIdx, delta) {
  try { flushSetInputsFromDOM(); } catch (e) { }
  const wObj = (S.prog && S.prog.weeks.find(x => x.label === week)) || W();
  if (!wObj) return;
  const exs = dayExercises(wObj, day);
  const e = exs && exs[i];
  if (!e) return;
  const complex = parseComplexSets(e.text, blockExLift(e));
  const blocks = groupBlocks(complex);
  const blk = blocks.find(b => b.idx === blockIdx) || (blockIdx == null ? blocks.find(b => b.expandable) : null);
  if (!blk || !blk.expandable) return; // blocchi a serie fisse: nessuna aggiunta/rimozione
  const row = getExLog(week, day, i, complex.configs.length);
  const before = buildEffectiveConfigs(complex, row);
  const start = before.findIndex(c => c.blockIdx === blk.idx);
  const cnt = before.filter(c => c.blockIdx === blk.idx).length;
  if (start < 0) return;
  if (delta > 0) {
    const t = blk.base[0];
    const nw = { kg: '', reps: (t.reps != null && blk.kind !== 'inst') ? String(t.reps) : '', done: false };
    if (blk.kind === 'rpe' || blk.kind === 'ramp') nw.rpe = '';
    row.sets.splice(start + cnt, 0, nw);
    row.extra[blk.idx] = (row.extra[blk.idx] || 0) + 1;
  } else {
    if (cnt <= 1) return;
    row.sets.splice(start + cnt - 1, 1);
    row.extra[blk.idx] = (row.extra[blk.idx] || 0) - 1;
  }
  row.dyn = true;
  const k = week + '|' + day, a = S.chk[k];
  if (delta > 0 && a && a.indexOf(i) >= 0) a.splice(a.indexOf(i), 1);
  if (delta < 0) syncExerciseDoneFromSets(week, day, i);
  save();
  render();
}
function addBlockSet(week, day, i, blockIdx) { changeBlockSets(week, day, i, blockIdx, 1); }
function removeBlockSet(week, day, i, blockIdx) { changeBlockSets(week, day, i, blockIdx, -1); }
function addMavSet(week, day, i) { changeBlockSets(week, day, i, firstBlockOfRole(week, day, i, 'mav'), 1); }
function removeMavSet(week, day, i) { changeBlockSets(week, day, i, firstBlockOfRole(week, day, i, 'mav'), -1); }
function addRpeSet(week, day, i) { changeBlockSets(week, day, i, firstBlockOfRole(week, day, i, 'rpe'), 1); }
function removeRpeSet(week, day, i) { changeBlockSets(week, day, i, firstBlockOfRole(week, day, i, 'rpe'), -1); }
function firstBlockOfRole(week, day, i, role) {
  const wObj = (S.prog && S.prog.weeks.find(x => x.label === week)) || W();
  const e = wObj && dayExercises(wObj, day) && dayExercises(wObj, day)[i];
  if (!e) return null;
  const b = groupBlocks(parseComplexSets(e.text, blockExLift(e))).find(x => x.kind === role);
  return b ? b.idx : null;
}
/** toglie dal testo RPE/RIR/%/tempo che altrimenti verrebbero scambiati per serie (es. "@7-8", "tempo 3-1-0") */
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
  const primaryKeys = ['rpe', 'mav', 'vbt', 'inst', 'e1rm', 'amrap', 'emom', 'cl', 'rp', 'top', 'bo', 'wave', 'ramp', 'dm', 'me', 'de'];
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
function addRampSet(week, day, i) { changeBlockSets(week, day, i, null, 1); }
function removeLastSet(week, day, i) {
  const wObj = (S.prog && S.prog.weeks.find(x => x.label === week)) || W();
  const e = wObj && dayExercises(wObj, day) && dayExercises(wObj, day)[i];
  if (!e) return;
  const bl = groupBlocks(parseComplexSets(e.text, blockExLift(e))).filter(b => b.expandable);
  if (bl.length) changeBlockSets(week, day, i, bl[bl.length - 1].idx, -1);
}

/** Quante serie ha l'esercizio (dal testo scheda) */
function parseSets(text) {
  const raw = String(text || '');
  const T = analyzeEx({ name: '', text: raw });
  const t = stripNoise(raw);
  let m;
  // MAV5 / mav 5: 1 serie, rip fisse
  if (T.mav && !T.pctOfMav) {
    const reps = T.mavReps != null ? T.mavReps : null;
    return { count: 1, targets: null, reps: reps, mode: 'mav' };
  }
  // 3x3 100% del mav → conta le serie dal pattern x
  if (T.pctOfMav != null) {
    m = t.match(/(\d+)\s*[x×]\s*(\d+)\s*s\b/i);
    if (m) return { count: parseInt(m[2], 10) || 3, targets: null, reps: parseInt(m[1], 10) };
    m = t.match(/(\d+)\s*[x×]\s*(\d+)/i);
    if (m) return { count: parseInt(m[1], 10) || 3, targets: null, reps: parseInt(m[2], 10) };
    m = t.match(/(\d+)\s*(?:serie|sets?)\b/i);
    if (m) return { count: parseInt(m[1], 10) || 3, targets: null, reps: T.mavReps || null };
    return { count: 3, targets: null };
  }
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
  // rip@RPE: "5@7" → 1 serie da 5 rip
  m = raw.match(/(?:^|[\s+])(\d+)\s*@\s*\d/);
  if (m) return { count: 1, targets: null, reps: parseInt(m[1], 10) };
  // singola / doppia / tripla
  m = t.match(/\b(singola|doppia|tripla)\b/i);
  if (m) return { count: 1, targets: null, reps: { singola: 1, doppia: 2, tripla: 3 }[m[1].toLowerCase()] };
  return { count: T.mode === 'ramp' ? 1 : 3, targets: null };
}
function prescribedKg(text, lift) {
  const raw = String(text || '');
  // MAV / % del MAV: non usare il massimale
  if (/\bm\.?a\.?v\.?\b/i.test(raw)) return null;
  if (!lift || !S.max || !S.max[lift]) return null;
  const m = raw.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (!m) return null;
  const pct = parseFloat(m[1].replace(',', '.'));
  if (isNaN(pct)) return null;
  return Math.round(pct / 100 * S.max[lift] / 2.5) * 2.5;
}
function getExLog(week, day, i, setCount) {
  const k = accKey(week, day);
  const slot = accSlot(week, day, i);
  S.accLog = S.accLog || {};
  S.accLog[k] = S.accLog[k] || {};
  let row = S.accLog[k][slot];
  // migrazione vecchio formato {kg,reps}
  if (row && !Array.isArray(row.sets) && (row.kg != null || row.reps != null)) {
    row = { sets: [{ kg: row.kg || '', reps: row.reps || '' }] };
    S.accLog[k][slot] = row;
  }
  if (!row || !Array.isArray(row.sets)) {
    row = { sets: [] };
    S.accLog[k][slot] = row;
  }
  const ex = sessionExercise(week, day, i);
  const fallback = ex ? parseComplexSets(ex.text, blockExLift(ex)).configs.length : 1;
  const n = Math.max(1, setCount || row.sets.length || fallback);
  while (row.sets.length < n) row.sets.push({ kg: '', reps: '', done: false });
  // Reading a log must never truncate saved future sets.
  row.sets.forEach(s => { if (s.done == null) s.done = false; });
  return row;
}
function setExSetLog(week, day, i, setIdx, field, value, skipSave) {
  const x = exerciseConfig(week, day, i);
  if (!x || !['kg', 'reps', 'rpe'].includes(field)) return;
  const st = x.row.sets[setIdx], c = x.configs[setIdx];
  if (!st || st.done || lockedField(x.e, c, field)) return;
  st[field] = value;
  st[field + 'Source'] = 'manual';
  if (field === 'kg') cascadeKgFromSet(week, day, i, setIdx);
  resolveCalculatedSets(week, day, i);
  refreshSetValues(week, day, i);
  if (!skipSave) save();
}
/** Propaga i kg alle serie successive vuote — chiamare solo su blur/change, non su ogni tasto */
/** indice (escluso) in cui finisce il blocco che contiene la serie setIdx */
function blockEndForSet(week, day, i, setIdx, row) {
  try {
    const wObj = (S.prog && S.prog.weeks.find(x => x.label === week)) || W();
    const e = wObj && dayExercises(wObj, day) && dayExercises(wObj, day)[i];
    if (!e) return row.sets.length;
    const eff = buildEffectiveConfigs(parseComplexSets(e.text, blockExLift(e)), row);
    const cur = eff[setIdx];
    if (!cur) return row.sets.length;
    let end = setIdx + 1;
    while (end < eff.length && eff[end].blockIdx === cur.blockIdx) end++;
    return Math.min(end, row.sets.length);
  } catch (err) { return row.sets.length; }
}
function cascadeKgFromSet(week, day, i, setIdx) {
  const x = exerciseConfig(week, day, i);
  if (!x || !x.configs[setIdx]) return;
  const value = x.row.sets[setIdx].kg;
  for (let j = setIdx + 1; j < x.configs.length && x.configs[j].blockIdx === x.configs[setIdx].blockIdx; j++) {
    const st = x.row.sets[j];
    if (st.done || lockedField(x.e, x.configs[j], 'kg')) continue;
    // Existing unknown values are conservatively treated as manual after upgrade.
    if (st.kgSource === 'manual' || (!st.kgSource && st.kg !== '' && st.kg != null)) break;
    st.kg = value; st.kgSource = 'inherited';
  }
  refreshSetValues(week, day, i); save();
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
  const x = exerciseConfig(week, day, i);
  if (!x || !x.configs[setIdx]) return;
  ensureMonoSides(x.row.sets[setIdx]);
  const value = x.row.sets[setIdx][side].kg;
  for (let j = setIdx + 1; j < x.configs.length && x.configs[j].blockIdx === x.configs[setIdx].blockIdx; j++) {
    const st = ensureMonoSides(x.row.sets[j])[side];
    if (st.done || lockedField(x.e, x.configs[j], 'kg')) continue;
    if (st.kgSource === 'manual' || (!st.kgSource && st.kg !== '' && st.kg != null)) break;
    st.kg = value; st.kgSource = 'inherited';
  }
  refreshSetValues(week, day, i); save();
}
/** Salva kg/rip dai campi input PRIMA di un re-render (altrimenti si perdono) */
function flushSetInputsFromDOM() {
  // oninput is authoritative. Read only named fields; never infer field by position.
  document.querySelectorAll('.set-card input[data-field]').forEach(inp => {
    if (inp.disabled || inp.readOnly) return;
    const card = inp.closest('.set-card'), sd = inp.closest('.mono-side');
    const week = card.dataset.week, day = Number(card.dataset.day), i = Number(card.dataset.exi), si = Number(card.dataset.set);
    const x = exerciseConfig(week, day, i);
    if (!x || !x.row.sets[si]) return;
    const st = sd ? ensureMonoSides(x.row.sets[si])[sd.dataset.side] : x.row.sets[si];
    if ((st.done && !isPastEntry()) || st[inp.dataset.field] === inp.value) return;
    if (sd) setExSideLog(week, day, i, si, sd.dataset.side, inp.dataset.field, inp.value);
    else setExSetLog(week, day, i, si, inp.dataset.field, inp.value);
  });
  save();
}
function markSetDone(week, day, i, setIdx, done) {
  _pendingRestOwner = null;
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
  const x = exerciseConfig(week, day, i);
  if (!x || !['L', 'R'].includes(side) || !['kg', 'reps'].includes(field)) return;
  const st = x.row.sets[setIdx], c = x.configs[setIdx];
  if (!st || lockedField(x.e, c, field)) return;
  ensureMonoSides(st);
  if (st[side].done && !isPastEntry()) return;
  st[side][field] = value;
  st[side][field + 'Source'] = 'manual';
  if (field === 'kg') cascadeMonoKgFromSet(week, day, i, setIdx, side);
  refreshSetValues(week, day, i);
  save();
}
/** Segna fatto un lato (L/R) di una serie monolaterale → avvia recupero */
function markSideDone(week, day, i, setIdx, side, done) {
  _pendingRestOwner = null;
  const x = exerciseConfig(week, day, i); if (!x || !x.row.sets[setIdx]) return;
  const flag = done !== false;
  if (flag && !acceptSetSuggestions(week, day, i, setIdx, side)) return;
  const st = ensureMonoSides(x.row.sets[setIdx]); st[side].done = flag; ensureMonoSides(st);
  if (flag) { _pendingRestOwner = setOwner(week, day, i, setIdx, side); S.restReminder = null; }
  else cancelOwnedRest(week, day, i, setIdx, side);
  syncExerciseDoneFromSets(week, day, i); save();
}
/** Allinea S.chk con lo stato delle serie */
function syncExerciseDoneFromSets(week, day, i) {
  const x = exerciseConfig(week, day, i); if (!x || x.e.warm) return;
  const allDone = x.configs.length > 0 && x.configs.every((c, j) => {
    const st = x.row.sets[j]; return isMonolateral(x.e) ? !!(st && st.L && st.L.done && st.R && st.R.done) : !!(st && st.done);
  });
  const a = S.chk[week + '|' + day] = S.chk[week + '|' + day] || [];
  const idx = a.indexOf(i);
  if (allDone && idx < 0) a.push(i);
  if (!allDone && idx >= 0) a.splice(idx, 1);
}
/** Etichetta settimana precedente nel programma */
function prevWeekLabel(currentLabel) {
  if (!S.prog || !S.prog.weeks || !S.prog.weeks.length) return null;
  const i = S.prog.weeks.findIndex(w => w.label === currentLabel);
  if (i > 0) return S.prog.weeks[i - 1].label;
  return null;
}
/** Ultima volta (qualsiasi scheda) in cui l'esercizio è stato fatto, già convertita per mono/bilaterale. */
function findPrevAccessorySets(exerciseName, currentWeek, day, mono) {
  if (!exerciseName) return null;
  const en = lastExEntry(exerciseName, currentWeek, day);
  if (!en || !en.sets || !en.sets.length) return null;
  const other = en.progId && String(en.progId) !== String(exCurProgId());
  return {
    week: en.week || '',
    date: en.date,
    label: exFmtDate(en.date) + (other ? ' · altra scheda' : ''),
    sets: exConvertSets(en.sets.map(st => st.done === false ? {kg:null,reps:null} : st), !!mono),
  };
}
/**
 * Solo complementari: se i campi di questa sessione sono vuoti, precompila con kg/rip
 * dell'ultima volta (anche di un'altra scheda). Mono: sx e dx separati. Non sovrascrive nulla.
 */
function prefillAccessoryFromPrev(weekLabel, day, exIndex, exercise) {
  if (!exercise || !isAccessory(exercise)) return null;
  return findPrevAccessorySets(exercise.name, weekLabel, day, isMonolateral(exercise));
}
/** Scrive nel log per esercizio (indipendente dalla scheda). Una entry per scheda+settimana+giorno. */
function pushLiftHistory(name, sets, week, day, optNextKg, optNextNote, optNote) {
  const clean = exCleanSets(sets);
  if (!clean.length) return;
  const id = getExId(name);
  if (!id) return;
  const entry = { date: dstr(), progId: exCurProgId(), week: week || '', day: day, sets: clean };
  const nk = (optNextKg != null) ? { ...(getNextLoadPlan(name, week, day) || {}), kg: optNextKg, note: optNextNote || '' } : getNextLoadPlan(name, week, day);
  if (nk && nk.kg != null) {
    entry.nextKg = nk.kg;
    entry.nextNote = nk.note || '';
    if (nk.sides) entry.nextSides = nk.sides;
  }
  if (optNote) entry.note = optNote;
  exUpsertEntry(id, name, entry);
}
function lastLiftHistory(name, n) {
  return exEntriesFor(name).slice(0, n || 5);
}
/** Carico pianificato "per la prossima volta" nell'ultima sessione dell'esercizio (qualsiasi scheda) */
function getPlannedLoad(name, currentWeek, currentDay) {
  const cur = exCur(currentWeek, currentDay);
  const en = exEntriesFor(name).find(x => !exSameSession(x, cur));
  if (en && en.nextKg != null) {
    return { kg: en.nextKg, note: en.nextNote || '', sides: en.nextSides || null, date: en.date, week: en.week, day: en.day };
  }
  return null;
}
function historyHtml(name, week, day) {
  const all = exEntriesFor(name);
  if (!all.length) return '<p class="hist mut">Nessuno storico ancora</p>';
  const cur = (week != null) ? exCur(week, day) : null;
  const prev = cur ? all.find(en => !exSameSession(en, cur)) : null;
  const nextHtml = h => h.nextKg != null ? ` <span class="hist-next">→ ${esc(String(h.nextKg))} kg</span>` : '';
  let html = '';
  if (prev) {
    const other = prev.progId && String(prev.progId) !== String(exCurProgId());
    html += `<div class="hist-last">Volta scorsa <i>${esc(exFmtDate(prev.date) + (other ? ' · altra scheda' : ''))}</i>: <b>${esc(exFmtSets(prev.sets))}</b>${nextHtml(prev)}</div>`;
  }
  const rest = all.filter(en => en !== prev).slice(0, prev ? 3 : 4);
  if (rest.length) {
    html += '<div class="hist">' + rest.map(h => {
      const noteTxt = h.note ? ` <span class="hist-note-badge" title="${esc(h.note)}">📝</span>` : '';
      return `<span class="hist-row"><b>${esc(exFmtSets(h.sets))}</b>${nextHtml(h)}${noteTxt} <i>${esc(exFmtDate(h.date))}</i></span>`;
    }).join('') + '</div>';
  }
  return html;
}
function saveSessionLogs(week, day, exercises) {
  if (!exercises) return;
  exercises.forEach((e, i) => {
    if (e.warm) return;
    let lift = e.lift;
    if (!lift && isMainLift(e)) {
      const n = String(e.name || '').toLowerCase();
      if (/squat|acconsc/.test(n)) lift = 's';
      else if (/panca|bench/.test(n)) lift = 'b';
      else if (/stacco|deadlift|sumo|regular/.test(n)) lift = 'd';
    }
    resolveCalculatedSets(week, day, i);
    const complex = parseComplexSets(e.text, lift);
    const log = getExLog(week, day, i, complex.configs.length);
    const effC = buildEffectiveConfigs(complex, log);
    const exNote = getExNote(week, day, i);
    const nextPlan = isAccessory(e) ? getNextLoadPlan(e.name, week, day) : null;
    const nextKg = nextPlan && nextPlan.kg != null ? nextPlan.kg : null;
    const nextNote = nextPlan && nextPlan.note || '';

    if (isMainLift(e)) {
      const sets = log.sets.slice(0,effC.length).map((s, si) => {
        const c = effC[si] || effC[effC.length - 1] || {};
        const mode = c.mode || 'fixed';
        const prescKg = s.kgSource === 'calculated' ? exNum(s.kg) : c.kg;
        const prescRep = c.reps;
        const autoM = mode !== 'fixed';

        return {
          kg: (autoM && s.kg !== '' && s.kg != null) ? parseFloat(String(s.kg).replace(',', '.')) || prescKg : (prescKg != null ? prescKg : parseFloat(String(s.kg).replace(',', '.'))),
          reps: (autoM && s.reps !== '' && s.reps != null) ? parseInt(s.reps, 10) || prescRep : (prescRep != null ? prescRep : parseInt(s.reps, 10)),
          ...setHistoryMeta(s),
          done: s.done,
        };
      });
      pushLiftHistory(e.name, sets, week, day, nextKg, nextNote, exNote);
    } else {
      pushLiftHistory(e.name, log.sets, week, day, nextKg, nextNote, exNote);
    }
  });
  save();
}
/* ===== Note per esercizi e pianificazione carico prossima sessione ===== */
function getExNoteKey(week, day, i) { return exCurProgId() + '|' + week + '|' + day + '|' + accSlot(week, day, i); }
function getExNote(week, day, i) {
  return (S.exNotes && S.exNotes[getExNoteKey(week, day, i)]) || '';
}
function noteTextHtml(text) {
  const re = /https?:\/\/[^\s<>"']+/g;
  let html = '', start = 0;
  for (const match of String(text || '').matchAll(re)) {
    html += esc(String(text).slice(start, match.index));
    html += '<a href="' + esc(match[0]) + '" target="_blank" rel="noopener noreferrer">' + esc(match[0]) + '</a>';
    start = match.index + match[0].length;
  }
  return html + esc(String(text || '').slice(start));
}
function previousExerciseNotesHtml(week, day, i, exercise) {
  const cur = exCur(week, day), items = [], seen = new Set();
  const weeks = (S.prog && S.prog.weeks) || [];
  const currentIndex = weeks.findIndex(w => w.label === week);
  const eligible = w => {
    if (exSameSession(w, cur)) return false;
    if (String(w.progId) === String(exCurProgId())) {
      const index = weeks.findIndex(x => x.label === w.week);
      if (index >= 0 && currentIndex >= 0 && index > currentIndex) return false;
    }
    return !w.date || w.date <= (cur.date || dstr());
  };
  const add = (w, note, key) => {
    if (!eligible(w) || (!note && !(S.noteImages && S.noteImages[key] && S.noteImages[key].length))) return;
    const id = [w.progId, w.week, w.day, w.date].join('|');
    if (seen.has(id)) return;
    seen.add(id); items.push({ w, note, key });
  };
  const ordinal = Number((accSlot(week, day, i).match(/#(\d+)$/) || [])[1] || 0);
  (S.workoutLog || []).forEach(w => {
    const matches = (w.exercises || []).filter(e => getExId(e.name) === getExId(exercise.name));
    const e = matches[ordinal];
    if (e) add(w, e.note || '', e.noteImageKey || '');
  });
  exEntriesFor(exercise.name).forEach(en => add(en, en.note || '', ''));
  items.sort((a,b) => String(b.w.date || '').localeCompare(String(a.w.date || '')));
  if (!items.length) return '';
  return '<details class="previous-exercise-notes" open><summary>Note degli allenamenti precedenti</summary>' + items.map(({w,note,key}, n) =>
    '<details class="previous-note" ' + (n === 0 ? 'open' : '') + '><summary>' + esc([exFmtDate(w.date), w.week, w.day != null ? 'Giorno ' + w.day : ''].filter(Boolean).join(' · ')) + '</summary>' +
    (note ? '<div class="note-text">' + noteTextHtml(note) + '</div>' : '') +
    (key ? '<div class="note-gallery history-gallery" data-note-key="' + esc(key) + '"></div>' : '') + '</details>'
  ).join('') + '</details>';
}
function setExNote(week, day, i, text) {
  S.exNotes[getExNoteKey(week, day, i)] = String(text || '');
  const e = sessionExercise(week, day, i);
  if (e) {
    const slot = accSlot(week, day, i);
    (S.workoutLog || []).filter(w => w.progId === exCurProgId() && w.week === week && String(w.day) === String(day)).forEach(w => {
      const matches = (w.exercises || []).filter(ex => getExId(ex.name) === getExId(e.name));
      const ordinal = Number((slot.match(/#(\d+)$/) || [])[1] || 0);
      if (matches[ordinal]) matches[ordinal].note = String(text || '');
    });
    exEntriesFor(e.name).filter(en => exSameSession(en, exCur(week, day))).forEach(en => en.note = String(text || ''));
  }
  save();
}
function getNextLoadKey(exerciseName, week, day) {
  return exCurProgId() + '|' + week + '|' + day + '|' + (getExId(exerciseName) || liftKey(exerciseName));
}
/** Bozza "aumenta il carico la prossima volta" della sessione in corso; alla chiusura finisce nella entry del log esercizio. */
function getNextLoadPlan(exerciseName, week, day) {
  if (!S.nextLoad || week == null || day == null) return null;
  return S.nextLoad[getNextLoadKey(exerciseName, week, day)] || null;
}
function setNextLoadPlan(exerciseName, increase, kg, note, week, day, sides) {
  if (week == null || day == null) return;
  S.nextLoad = S.nextLoad || {};
  const key = getNextLoadKey(exerciseName, week, day);
  if (!increase) {
    delete S.nextLoad[key];
  } else {
    const prior=S.nextLoad[key] || {};
    const resolvedSides=sides || prior.sides || null;
    const values=resolvedSides ? Object.values(resolvedSides).map(x=>exNum(x.kg)).filter(x=>x!=null) : [];
    S.nextLoad[key] = { kg: exNum(kg) != null ? exNum(kg) : (values.length ? Math.min(...values) : null), note: note || '', sides: resolvedSides };
  }
  const plan=S.nextLoad[key];
  exEntriesFor(exerciseName).filter(en=>exSameSession(en,exCur(week,day))).forEach(en=>{en.nextKg=plan ? plan.kg : null;en.nextNote=plan ? plan.note : '';en.nextSides=plan ? plan.sides : null;});
  (S.workoutLog || []).filter(w=>w.progId===exCurProgId() && w.week===week && String(w.day)===String(day)).forEach(w=>(w.exercises || []).filter(e=>getExId(e.name)===getExId(exerciseName)).forEach(e=>{e.nextKg=plan ? plan.kg : null;e.nextNote=plan ? plan.note : '';e.nextSides=plan ? plan.sides : null;}));
  save();
}
function onToggleNextLoad(checkbox) {
  const section = checkbox.closest('.next-load-section');
  if (!section) return;
  const exName = section.dataset.ex;
  const week = section.dataset.week;
  const day = section.dataset.day;
  const form = section.querySelector('.next-load-form');
  const checked = checkbox.checked;
  checkbox.closest('.next-load-toggle')?.classList.toggle('active', checked);

  if (!checked) {
    setNextLoadPlan(exName, false, 0, '', week, day);
    if (form) form.classList.add('hidden');
  } else {
    if (form) {
      form.classList.remove('hidden');
      const kgInp = form.querySelector('input[type=number]');
      const noteInp = form.querySelector('.next-load-note-input');
      const kg = kgInp ? kgInp.value : '';
      const note = noteInp ? noteInp.value : '';
      if (kg) setNextLoadPlan(exName, true, kg, note, week, day);
      if (kgInp) setTimeout(() => kgInp.focus(), 50);
    }
  }
}

function onNextLoadInputsChange(input) {
  const section = input.closest('.next-load-section');
  if (!section) return;
  const exName = section.dataset.ex;
  const week = section.dataset.week;
  const day = section.dataset.day;
  const form = section.querySelector('.next-load-form');
  if (!form) return;
  const kgInp = form.querySelector('input[type=number]');
  const noteInp = form.querySelector('.next-load-note-input');
  const kg = kgInp ? kgInp.value : '';
  const note = noteInp ? noteInp.value : '';
  const sideInputs=[...form.querySelectorAll('[data-next-side]')];
  const sides=sideInputs.length ? Object.fromEntries(sideInputs.map(inp=>[inp.dataset.nextSide,{kg:exNum(inp.value)}])) : null;
  setNextLoadPlan(exName, true, kg, note, week, day, sides);
}

function applyPlannedLoadToSets(weekLabel, day, exIndex, kg) {
  const x = exerciseConfig(weekLabel,day,exIndex); if(!x)return;
  const plan=getPlannedLoad(x.e.name,weekLabel,day);
  x.configs.forEach((c,si)=>{
    const st=x.row.sets[si]; if(lockedField(x.e,c,'kg'))return;
    if(st.L || st.R) ['L','R'].forEach(side=>{const sd=ensureMonoSides(st)[side]; if(!sd.done) { sd.kg=String(plan && plan.sides && plan.sides[side] && plan.sides[side].kg != null ? plan.sides[side].kg : kg); sd.kgSource='manual'; }});
    else if(!st.done){st.kg=String(kg);st.kgSource='manual';}
  });
  save(); render();
}

function exNoteAndNextLoadHtml(weekLabel, day, exIndex, exercise) {
  if (!exercise || exercise.warm) return '';
  const wJs = jq(weekLabel);
  const note = getExNote(weekLabel, day, exIndex);
  const exerciseFinished = (S.chk[weekLabel + '|' + day] || []).includes(exIndex);
  const isAcc = isAccessory(exercise);

  let plannedBanner = '';
  let nextLoadSection = '';

  if (isAcc) {
    const plan = getNextLoadPlan(exercise.name, weekLabel, day);
    const planned = getPlannedLoad(exercise.name, weekLabel, day);
    const planKg = plan && plan.kg != null ? plan.kg : '';
    const planNote = plan && plan.note ? plan.note : '';
    const planChecked = plan ? 'checked' : '';
    const activeClass = plan ? 'active' : '';

    if (planned && planned.kg != null) {
      plannedBanner = `<div class="planned-load-banner">
        <span class="planned-load-icon">📌</span>
        <div class="planned-load-text">
          <span>Avevi programmato <b>${esc(String(planned.kg))} kg</b> per questa sessione</span>
          ${planned.note ? `<span class="planned-note-hint"> — ${esc(planned.note)}</span>` : ''}
        </div>
        <button type="button" class="planned-apply-btn" onclick='applyPlannedLoadToSets(${wJs}, ${day}, ${exIndex}, ${planned.kg})'>Applica a tutte</button>
      </div>`;
    }

    nextLoadSection = `<div class="next-load-section" data-ex="${esc(exercise.name)}" data-week="${esc(weekLabel)}" data-day="${esc(String(day))}">
      <label class="next-load-toggle ${activeClass}">
        <input type="checkbox" ${planChecked} onchange="onToggleNextLoad(this)">
        <span class="toggle-pill-text">Modificare il carico la prossima volta?</span>
      </label>
      <div class="next-load-form ${plan ? '' : 'hidden'}">
        <div class="next-load-inputs">
          <label>Prossimo carico (kg)
            <input type="number" inputmode="decimal" step="0.5" placeholder="es. 102.5" value="${esc(String(planKg))}"
              oninput="onNextLoadInputsChange(this)"
              onchange="onNextLoadInputsChange(this)">
          </label>
          ${isMonolateral(exercise) ? ['L','R'].map(side => `<label>Prossimo carico ${side === 'L' ? 'sinistro' : 'destro'} (kg)<input type="number" inputmode="decimal" step="0.5" data-next-side="${side}" value="${esc(String(plan && plan.sides && plan.sides[side] && plan.sides[side].kg != null ? plan.sides[side].kg : ''))}" placeholder="Usa il carico comune" oninput="onNextLoadInputsChange(this)"></label>`).join('') : ''}
          <label>Nota (facoltativa)
            <input type="text" class="next-load-note-input" placeholder="es. provare con cintura" value="${esc(planNote)}"
              oninput="onNextLoadInputsChange(this)"
              onchange="onNextLoadInputsChange(this)">
          </label>
        </div>
      </div>
    </div>`;
  }

  return `<div class="ex-notes-wrap">
    ${plannedBanner}
    ${previousExerciseNotesHtml(weekLabel, day, exIndex, exercise)}
    <div class="ex-note-field">
      <textarea class="ex-note-input" placeholder="Note per questo esercizio…" rows="2" ${exerciseFinished ? 'disabled aria-disabled="true"' : ''}
        oninput="setExNote(${wJs},${day},${exIndex},this.value)"
        onchange="setExNote(${wJs},${day},${exIndex},this.value)">${esc(note)}</textarea>
    </div>
    ${nextLoadSection}
  </div>`;
}
/** HTML card per ogni serie */
function setsLogHtml(weekLabel, day, exIndex, exercise) {
  let lift = exercise.lift;
  if (!lift && isMainLift(exercise)) {
    const n = String(exercise.name || '').toLowerCase();
    if (/squat|acconsc/.test(n)) lift = 's';
    else if (/panca|bench/.test(n)) lift = 'b';
    else if (/stacco|deadlift|sumo|regular/.test(n)) lift = 'd';
  }

  const complex = parseComplexSets(exercise.text, lift);
  const main = isMainLift(exercise);
  const allLocked = main && complex.configs.every(c => c.mode === 'fixed');

  const info = parseSets(exercise.text);
  const T = analyzeEx(exercise);
  const prevInfo = (!exercise.warm && !main) ? prefillAccessoryFromPrev(weekLabel, day, exIndex, exercise) : null;
  const hasMav = complex.configs.some(c => c.role === 'mav');
  const hasRpeRole = complex.configs.some(c => c.role === 'rpe');
  const log = getExLog(weekLabel, day, exIndex, complex.configs.length || info.count);
  const blocksList = groupBlocks(complex);
  const multiBlock = blocksList.length > 1;
  if (complex.hasDynamic || hasMav || hasRpeRole || blocksList.some(b => b.expandable)) log.dyn = true;
  // allinea lunghezza: MAV extra già in log
  const eff0 = buildEffectiveConfigs(complex, log);
  while (log.sets.length < eff0.length) log.sets.push({ kg: '', reps: '', done: false });
  resolveCalculatedSets(weekLabel, day, exIndex);
  const effConfigs = buildEffectiveConfigs(complex, log);

  const sugKg = (T.backoffPct || T.mav) ? null : prescribedKg(exercise.text, lift);
  const est = sugKg != null ? sugKg : rpeTargetKg(T, info.reps != null ? info.reps : (info.targets && info.targets[0]), lift);

  const wJs = jq(weekLabel);
  const restSec = getRestSec(exercise.name);
  const mono = !main && isMonolateral(exercise);
  if (mono) log.sets.forEach(st => ensureMonoSides(st));

  return `<div class="sets-wrap ${allLocked ? 'sets-locked' : ''} ${mono ? 'sets-mono' : ''}">
    ${multiBlock ? '' : (T.mode === 'ramp' ? rampHeaderHtml(T, info, log, est, lift) : (T.mode === 'free' ? '<p class="ramp-info">Istintivo: kg e rip liberi, scegli a sensazione</p>' : ''))}
    ${log.sets.slice(0,effConfigs.length).map((s, si) => {
    const c = effConfigs[si] || effConfigs[effConfigs.length - 1] || {};
    const cT = c.T || T;
    const cInfo = c.info || info;
    const mode = c.mode || 'fixed';

    let prescRep = c.reps != null ? c.reps : null;
    if (prescRep == null && (c.role === 'mav' || (c.T && c.T.mavReps != null && !c.T.pctOfMav))) {
      prescRep = (c.T && c.T.mavReps != null) ? c.T.mavReps : (T.mavReps != null ? T.mavReps : null);
    }
    let prescKg = c.kg != null ? c.kg : null;
    // 100% del MAV → kg dalla serie MAV
    if ((c.role === 'mavBackoff' || c.pctOfMav != null || (c.T && c.T.pctOfMav != null)) && prescKg == null) {
      const mavKg = getMavKgFromLog(log, effConfigs, si);
      const pct = c.pctOfMav != null ? c.pctOfMav : (c.T && c.T.pctOfMav);
      if (mavKg != null && pct != null) prescKg = Math.round(mavKg * pct / 100 / 2.5) * 2.5;
    }

    const isMav = !!(c.role === 'mav' || (cT.mav && !cT.pctOfMav && c.role !== 'mavBackoff' && c.role !== 'rpe'));
    const isRpe = c.role === 'rpe' || (!isMav && !!cT.rpe && mode === 'ramp' && c.role !== 'mavBackoff');
    const isMavBo = c.role === 'mavBackoff' || c.pctOfMav != null || cT.pctOfMav != null;
    const pctMav = c.pctOfMav != null ? c.pctOfMav : cT.pctOfMav;
    // kg bloccato su % del MAV; MAV/RPE: kg libero; fixed main: tutto bloccato
    const isLocked = isCalculated(c) || (main && mode === 'fixed' && !isMav && !isRpe);
    if (isCalculated(c)) prescKg = s.done ? exNum(s.kg) : calculatedKg(exerciseConfig(weekLabel, day, exIndex), si);
    // MAV e RPE: rip sempre fisse se prescritte (es. 3x3 RPE 7 → 3 rip)
    const repsEditable = (isMav || isMavBo || (isRpe && prescRep != null))
      ? false
      : (!main || mode === 'free' || (mode === 'ramp' && prescRep == null));

    const roleLbl = (isMav ? ' · MAV' + (prescRep != null ? ' ' + prescRep : '') : '')
      + (isRpe ? ' · ' + (cT.rpe ? cT.rpe.txt : 'RPE') + (prescRep != null ? ' · ' + prescRep + ' rip' : '') : '')
      + (isMavBo ? ' · ' + (pctMav != null ? pctMav + '% del MAV' : 'del MAV') : '')
      + (cInfo.roles && cInfo.roles[si] === 'top' ? ' · Top set' : cInfo.roles && cInfo.roles[si] === 'backoff' ? ' · Back-off' : '')
      + (mode === 'ramp' && !cInfo.roles && !isMav && (c.bpos != null ? c.bpos : si) >= (cInfo.count || 1) ? ' · extra' : '')
      + (mode === 'ramp' && cT.rpe && rpeOf(s) != null && rpeOf(s) >= cT.rpe.lo ? ' · target ✓' : '');

    const isDone = !!s.done && !isPastEntry();
    let inputs = '';

    if (mono) {
      // Logica monolaterale inalterata, usa prescRep
      ensureMonoSides(s);
      const setDoneBar = `<button type="button" class="mono-set-toggle ${isDone ? 'on' : ''}" data-mono-set-toggle="1">${isDone ? '✓ Serie ' + (si + 1) + ' completa' : 'Segna serie ' + (si + 1) + ' (Sx + Dx) · ' + fmtRest(restSec)}</button>`;
      const sides = [{ key: 'L', label: 'Sinistro' }, { key: 'R', label: 'Destro' }];
      const sidesHtml = sides.map(side => {
        const sd = s[side.key];
        const sideDone = !!sd.done && !isPastEntry();
        const fromPrev = prevSetSideKg(log, si, side.key);
        const kgV = sd.kg != null && sd.kg !== '' ? esc(String(sd.kg)) : '';
        const repV = sd.reps != null && sd.reps !== '' ? esc(String(sd.reps)) : '';
        const kgPh = fromPrev || 'kg';

        if (sideDone) return `<div class="mono-side mono-side-done" data-side="${side.key}"><div class="mono-side-label">✓ ${side.label}</div><div class="set-readonly set-done-ro"><span class="set-ro-kg">${kgV ? kgV + ' kg' : '— kg'}</span><span class="set-x">×</span><span class="set-ro-reps">${repV ? repV + ' rip' : '— rip'}</span></div><p class="set-lock-hint">Fatto · tocca per sbloccare</p></div>`;
        return `<div class="mono-side" data-side="${side.key}"><div class="mono-side-label">${side.label} ·${fmtRest(restSec)}</div><div class="set-inputs"><input data-field="kg" type="number" inputmode="decimal" step="0.5" placeholder="${esc(String(kgPh))}" value="${kgV}" oninput="setExSideLog(${wJs},${day},${exIndex},${si},'${side.key}','kg',this.value)" onchange="setExSideLog(${wJs},${day},${exIndex},${si},'${side.key}','kg',this.value);cascadeMonoKgFromSet(${wJs},${day},${exIndex},${si},'${side.key}')"><span class="set-x">×</span><input data-field="reps" type="number" inputmode="numeric" step="1" placeholder="${prescRep != null ? prescRep : 'rip'}" value="${repV}" oninput="setExSideLog(${wJs},${day},${exIndex},${si},'${side.key}','reps',this.value)" onchange="setExSideLog(${wJs},${day},${exIndex},${si},'${side.key}','reps',this.value)"></div><p class="set-lock-hint">Tocca qui → fatto + recupero</p></div>`;
      }).join('');
      const pm = prevInfo && prevInfo.sets ? (prevInfo.sets[si]) : null;
      const hasV = v => v !== '' && v != null;
      const pmTxt = x => (x && hasV(x.kg) ? esc(String(x.kg)) + ' kg' : '—') + ' × ' + (x && hasV(x.reps) ? esc(String(x.reps)) : '—');
      const monoHint = pm && (pm.L || pm.R) && [pm.L, pm.R].some(x => x && (hasV(x.kg) || hasV(x.reps)))
        ? `<p class="set-prev-hint">Scorsa (${esc(String(prevInfo.label || prevInfo.week))}): Sx <b>${pmTxt(pm.L)}</b> · Dx <b>${pmTxt(pm.R)}</b></p>` : '';
      inputs = setDoneBar + `<div class="mono-sides">${sidesHtml}</div>` + monoHint;
    } else if (isDone) {
      const kgShow = (s.kg !== '' && s.kg != null) ? String(s.kg).replace('.', ',') + ' kg' : (prescKg != null ? String(prescKg).replace('.', ',') + ' kg' : '— kg');
      const repShow = (s.reps !== '' && s.reps != null) ? String(s.reps) + ' rip' : (prescRep != null ? String(prescRep) + ' rip' : '— rip');
      inputs = `<div class="set-readonly set-done-ro"><span class="set-ro-kg">${esc(kgShow)}</span><span class="set-x">×</span><span class="set-ro-reps">${esc(repShow + (rpeOf(s) != null ? ' @' + String(rpeOf(s)).replace('.', ',') : ''))}</span></div><p class="set-lock-hint">Serie fatta · tocca la card per sbloccare</p>`;
    } else if (isLocked) {
      const kgLabel = prescKg != null ? String(prescKg).replace('.', ',') + ' kg'
        : (isMavBo ? (pctMav != null ? pctMav + '% del MAV' : 'dopo MAV') : '— kg');
      const repLabel = prescRep != null ? String(prescRep) + ' rip' : '— rip';
      const hint = isMavBo
        ? (prescKg != null ? 'Fisso: ' + (pctMav != null ? pctMav + '% del MAV' : 'del MAV') : 'Inserisci prima i kg del MAV')
        : 'Fisso dalla scheda (fondamentale)';
      inputs = `<div class="set-readonly"><span class="set-ro-kg">${esc(kgLabel)}</span><span class="set-x">×</span><span class="set-ro-reps">${esc(repLabel)}</span></div><p class="set-lock-hint">${esc(hint)}</p>`;
    } else if (isMav) {
      // MAV puro: kg sì · rip fisse = numero del MAV (mav5 → 5)
      const kgVal = s.kg != null && s.kg !== '' ? esc(String(s.kg)) : '';
      const fixedRep = prescRep != null ? String(prescRep) : '—';
      // forza rip nel log
      if (prescRep != null && (s.reps === '' || s.reps == null)) s.reps = String(prescRep);
      inputs = `<div class="set-inputs set-rpe">
             <input data-field="kg" type="number" inputmode="decimal" step="0.5" placeholder="kg" value="${kgVal}" oninput="setExSetLog(${wJs},${day},${exIndex},${si},'kg',this.value)" onchange="setExSetLog(${wJs},${day},${exIndex},${si},'kg',this.value);cascadeKgFromSet(${wJs},${day},${exIndex},${si})">
             <span class="set-x">×</span>
             <span class="set-ro-reps set-ro-inline">${esc(fixedRep)} rip</span>
           </div>
           <p class="set-lock-hint">MAV ${prescRep != null ? prescRep : ''} · kg modificabili · ripetizioni fisse</p>`;
    } else if (mode === 'ramp') {
      const kgVal = s.kg != null && s.kg !== '' ? esc(String(s.kg)) : '';
      const repVal = s.reps != null && s.reps !== '' ? esc(String(s.reps)) : (!repsEditable && prescRep != null ? String(prescRep) : '');
      const rpeVal = s.rpe != null && s.rpe !== '' ? esc(String(s.rpe)) : '';
      const bStart = si - (c.bpos || 0);
      const bLog = { sets: log.sets.slice(bStart, bStart + (c.bsize || log.sets.length)) };
      const bEst = multiBlock ? (prescKg != null ? prescKg : rpeTargetKg(cT, prescRep, lift)) : (prescKg != null ? prescKg : est);
      const ph = rampPlaceholder(cT, cInfo, bLog, c.bpos || 0, bEst);
      const roRepAttr = !repsEditable ? 'readonly class="ro-input" tabindex="-1"' : '';

      inputs = `<div class="set-inputs set-ramp">
             <input data-field="kg" type="number" inputmode="decimal" step="0.5" placeholder="${esc(ph)}" value="${kgVal}" oninput="setExSetLog(${wJs},${day},${exIndex},${si},'kg',this.value)" onchange="setExSetLog(${wJs},${day},${exIndex},${si},'kg',this.value);cascadeKgFromSet(${wJs},${day},${exIndex},${si})">
             <span class="set-x">×</span>
             <input data-field="reps" type="number" inputmode="numeric" step="1" placeholder="${prescRep != null ? prescRep : 'rip'}" value="${repVal}" ${roRepAttr} oninput="setExSetLog(${wJs},${day},${exIndex},${si},'reps',this.value)" onchange="setExSetLog(${wJs},${day},${exIndex},${si},'reps',this.value)">
             <span class="set-at">@</span>
             <input data-field="rpe" type="number" inputmode="decimal" step="0.5" min="1" max="10" placeholder="${cT.rpe ? esc(String(cT.rpe.hi)) : 'RPE'}" value="${rpeVal}" oninput="setExSetLog(${wJs},${day},${exIndex},${si},'rpe',this.value)" onchange="setExSetLog(${wJs},${day},${exIndex},${si},'rpe',this.value)">
           </div>
           <p class="set-lock-hint">kg × rip @ RPE sentito · tocca la card quando hai finito</p>`;
    } else {
      const pSet = prevInfo && prevInfo.sets ? (prevInfo.sets[si]) : null;
      const prevHint = pSet && ((pSet.kg !== '' && pSet.kg != null) || (pSet.reps !== '' && pSet.reps != null)) ? `<p class="set-prev-hint">Scorsa (${esc(String(prevInfo.label || prevInfo.week))}): <b>${pSet.kg !== '' && pSet.kg != null ? esc(String(pSet.kg)) + ' kg' : '—'} × ${pSet.reps !== '' && pSet.reps != null ? esc(String(pSet.reps)) + ' rip' : '—'}</b> · cerca di migliorare</p>` : '';
      const fromPrev = prevSetKg(log, si);
      const kgVal = s.kg != null && s.kg !== '' ? esc(String(s.kg)) : '';
      const repVal = s.reps != null && s.reps !== '' ? esc(String(s.reps)) : (!repsEditable && prescRep != null ? String(prescRep) : '');
      const kgPh = fromPrev ? String(fromPrev) : 'kg';
      const suggestNote = fromPrev && (s.kg === '' || s.kg == null) ? `<p class="set-prev-hint">Suggerito serie prec.: <b>${esc(String(fromPrev))} kg</b> (placeholder)</p>` : '';
      const roRepAttr = !repsEditable ? 'readonly class="ro-input" tabindex="-1"' : '';

      inputs = `<div class="set-inputs">
             <input data-field="kg" type="number" inputmode="decimal" step="0.5" placeholder="${esc(kgPh)}" value="${kgVal}" oninput="setExSetLog(${wJs},${day},${exIndex},${si},'kg',this.value)" onchange="setExSetLog(${wJs},${day},${exIndex},${si},'kg',this.value);cascadeKgFromSet(${wJs},${day},${exIndex},${si})">
             <span class="set-x">×</span>
             <input data-field="reps" type="number" inputmode="numeric" step="1" placeholder="${prescRep != null ? prescRep : 'rip'}" value="${repVal}" ${roRepAttr} oninput="setExSetLog(${wJs},${day},${exIndex},${si},'reps',this.value)" onchange="setExSetLog(${wJs},${day},${exIndex},${si},'reps',this.value)">
           </div>${suggestNote}${prevHint}`;
    }

    return `<div class="set-card ${isDone ? 'set-done' : ''} ${isLocked ? 'set-locked' : ''}" data-ex="${esc(exercise.name)}" data-week="${esc(weekLabel)}" data-day="${day}" data-exi="${exIndex}" data-set="${si}" role="button" title="${isDone ? 'Serie fatta · tocca per annullare' : 'Tocca: segna fatta + recupero ' + fmtRest(restSec)}">
        <div class="set-label">
          <span class="set-title">${isDone ? '✓ ' : ''}Serie ${(multiBlock && c.bpos != null ? c.bpos : si) + (multiBlock && c.bpos != null ? 1 : 1)}${roleLbl}${c.role === 'inst' ? ' · libera' : ''}${multiBlock && c.blockKind === 'pct' && c.T && /%/.test(c.partText || '') ? ' · ' + (String(c.partText).match(/(\d+(?:[.,]\d+)?)\s*%/) || [])[1] + '%' : ''}${prescRep != null && repsEditable ? ' · obiettivo ' + prescRep + ' rip' : ''}</span>
          <span class="set-rest-hint">${isDone ? 'fatta' : fmtRest(restSec)}</span>
        </div>
        ${inputs}
      </div>`;
  }).reduce((acc, html, si) => {
    const cfg = effConfigs[si];
    const prev = effConfigs[si - 1];
    const next = effConfigs[si + 1];
    // intestazione del blocco (solo prescrizioni con più blocchi)
    if (multiBlock && cfg && (!prev || prev.blockIdx !== cfg.blockIdx)) {
      const bn = blocksList.findIndex(b => b.idx === cfg.blockIdx) + 1;
      const bsz = cfg.bsize != null ? cfg.bsize : 1;
      const bStart = si;
      const bLog = { sets: log.sets.slice(bStart, bStart + bsz) };
      const cT0 = cfg.T || T;
      const estB = cfg.kg != null ? cfg.kg : rpeTargetKg(cT0, cfg.reps, lift);
      const extraHdr = cfg.blockKind === 'rpe' || cfg.blockKind === 'ramp' ? rampHeaderHtml(cT0, cfg.info || info, bLog, estB, lift) : '';
      const fixedHint = cfg.blockKind === 'pct' ? '<p class="ramp-info">Serie, rip e kg fissi dalla scheda</p>' : (cfg.blockKind === 'inst' ? '<p class="ramp-info">Istintivo: kg e rip liberi, scegli a sensazione</p>' : '');
      acc.push(`<div class="block-head block-${cfg.blockKind}"><span class="block-n">Blocco ${bn} — ${esc(BLOCK_LABEL[cfg.blockKind] || '')}</span><span class="block-txt">${esc(cfg.partText || '')}</span></div>${extraHdr}${fixedHint}`);
    }
    acc.push(html);
    // bottoni +/− sotto l'ultima serie di ogni blocco espandibile
    if (cfg && (!next || next.blockIdx !== cfg.blockIdx) && !mono) {
      const blk = blocksList.find(b => b.idx === cfg.blockIdx);
      if (blk && blk.expandable) {
        const lbl = { mav: 'MAV', rpe: 'RPE', inst: 'istintiva', ramp: '', pct: '', fixed: '' }[blk.kind] || '';
        const cls = blk.kind === 'mav' ? 'mav-actions' : (blk.kind === 'rpe' ? 'rpe-actions' : '');
        acc.push(`<div class="ramp-actions ${cls}">
          <button type="button" onclick='addBlockSet(${wJs},${day},${exIndex},${blk.idx})'>＋ Aggiungi serie${lbl ? ' ' + lbl : ''}</button>
          ${cfg.bsize > 1 ? `<button type="button" onclick='removeBlockSet(${wJs},${day},${exIndex},${blk.idx})'>− Togli ultima${lbl ? ' ' + lbl : ''}</button>` : ''}
        </div>`);
      }
    }
    return acc;
  }, []).join('')}
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
  if (S.preferences && S.preferences.restSound === false) return;
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
    setTimeout(() => { try { ctx.close(); } catch (e) { } }, 1200);
  } catch (e) { }
}
async function notifyRestDone(name) {
  if (isPastEntry() || (S.preferences && S.preferences.restNotification === false)) return;
  try {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch (e) { }
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
        try { new Notification('Recupero finito', opts); } catch (e2) { }
      }
    }
  } catch (e) { }
}
function isIosDevice() {
  try {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  } catch (e) { return false; }
}
/** Apre Comandi Rapidi "Recupero PL": secondi = avvia timer; "stop" = ferma timer sistema */
function openSystemRestTimer(secOrStop, ev) {
  if (ev) { try { ev.stopPropagation(); ev.preventDefault(); } catch (e) { } }
  const name = encodeURIComponent('Recupero PL');
  let text;
  // stringa vuota = ferma timer (Se input non contiene nessun valore → Annulla)
  if (secOrStop === 'stop' || secOrStop === 0 || secOrStop === '0') {
    text = '';
  } else {
    const sec = Math.max(15, Math.min(600, parseInt(secOrStop, 10) || 120));
    text = encodeURIComponent(String(sec));
    try { localStorage.setItem('powerapp_rest_ends', String(Date.now() + sec * 1000)); } catch (e) { }
  }
  const url = 'shortcuts://run-shortcut?name=' + name + '&input=text&text=' + text;
  try {
    // iframe nascosto evita di lasciare l'app in alcuni casi; fallback location
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    setTimeout(() => { try { document.body.removeChild(iframe); } catch (e) { } }, 1500);
    // fallback se iframe non basta
    setTimeout(() => {
      try {
        const a = document.createElement('a');
        a.href = url;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { try { document.body.removeChild(a); } catch (e) { } }, 500);
      } catch (e) { }
    }, 50);
  } catch (e) {
    try { window.location.href = url; } catch (e2) { }
  }
}
function onRestFinished() {
  if (_restTimer && _restTimer._done) return;
  armRestReminder(_restTimer && _restTimer.name);
  if (_restTimer) _restTimer._done = true;
  if (_restTimer && _restTimer._iv) {
    clearInterval(_restTimer._iv);
    _restTimer._iv = null;
  }
  try { localStorage.removeItem('powerapp_rest_ends'); } catch (e) { }
  playRestBeep();
  try { if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]); } catch (e) { }
  notifyRestDone(_restTimer && _restTimer.name);
  const el = document.getElementById('rest-timer-display');
  if (el) { el.textContent = 'Fine!'; el.classList.add('done'); }
  const bar = document.querySelector('.rest-bar');
  if (bar) bar.classList.add('done');
  setTimeout(() => {
    if (_restTimer && _restTimer.left <= 0) {
      _restTimer = null;
      try { localStorage.removeItem('powerapp_rest_ends'); localStorage.removeItem('powerapp_rest_name'); } catch (e) { }
      render();
    }
  }, 2500);
  // se la barra non c'è (pagina non renderizzata), forza un render
  if (!el) { try { render(); } catch (e) { } }
}
/** Un tick del timer di recupero: aggiorna il display e, a zero, chiude il conteggio */
function restTick() {
  if (!_restTimer || _restTimer._done) return;
  _restTimer.left = Math.max(0, Math.ceil((_restTimer.endsAt - Date.now()) / 1000));
  const el = document.getElementById('rest-timer-display');
  if (el && _restTimer.left > 0) {
    const m = Math.floor(_restTimer.left / 60), s = _restTimer.left % 60;
    el.textContent = m + ':' + String(s).padStart(2, '0');
    el.classList.remove('done');
  }
  if (_restTimer.left <= 0) {
    if (_restTimer._iv) { clearInterval(_restTimer._iv); _restTimer._iv = null; }
    onRestFinished();
  }
}
function startRestTicker() {
  if (!_restTimer) return;
  if (_restTimer._iv) clearInterval(_restTimer._iv);
  _restTimer._iv = setInterval(restTick, 200);
}
function startRest(name, ev) {
  if (ev) { ev.stopPropagation(); ev.preventDefault(); }
  if (isPastEntry()) return;
  if (_restTimer && _restTimer._iv) clearInterval(_restTimer._iv);
  if (_systemRestLaunch) clearTimeout(_systemRestLaunch);
  const sec = getRestSec(name) || 120;
  const owner = _pendingRestOwner || [exCurProgId(), S.today && S.today.week, S.today && S.today.day, name, 'manual'].join('|');
  _pendingRestOwner = null; S.restReminder = null;
  _restTimer = { endsAt: Date.now() + sec * 1000, name: String(name || ''), left: sec, owner, _done: false };
  localStorage.setItem('powerapp_rest_ends', String(_restTimer.endsAt));
  localStorage.setItem('powerapp_rest_name', String(name || ''));
  localStorage.setItem('powerapp_rest_owner', owner);
  localStorage.removeItem('powerapp_rest_system');
  startRestTicker(); save(); render(); restTick();
  if (isIosDevice() && S.restSystemTimer !== false) {
    _systemRestLaunch = setTimeout(() => {
      _systemRestLaunch = null;
      if (!_restTimer || _restTimer.owner !== owner) return;
      _restTimer.systemStarted = true; localStorage.setItem('powerapp_rest_system', '1');
      openSystemRestTimer(sec);
    }, 60);
  }
}
/** Se torni in app dopo background, completa il timer se scaduto */
function resumeRestTimerIfNeeded() {
  if (isPastEntry()) { cancelRestTimer(); return; }
  try {
    const ends = parseInt(localStorage.getItem('powerapp_rest_ends') || '', 10);
    if (!ends) return;
    const left = Math.ceil((ends - Date.now()) / 1000);
    const name = localStorage.getItem('powerapp_rest_name') || '';
    // scaduto da più di 2 minuti: il suono/notifica sarebbe fuori tempo, si ripulisce in silenzio
    if (left < -120) {
      try { localStorage.removeItem('powerapp_rest_ends'); localStorage.removeItem('powerapp_rest_name'); } catch (e) { }
      if (_restTimer) {
        if (_restTimer._iv) { clearInterval(_restTimer._iv); }
        _restTimer = null;
        try { render(); } catch (e) { }
      }
      return;
    }
    if (left <= 0) {
      if (!_restTimer) _restTimer = { endsAt: ends, name: name, left: 0, owner: localStorage.getItem('powerapp_rest_owner'), _done: false };
      else { _restTimer.endsAt = ends; _restTimer.left = 0; }
      onRestFinished();
      return;
    }
    // riprendi conteggio se perso (JS sospeso)
    if (!_restTimer || !_restTimer._iv) {
      _restTimer = { endsAt: ends, name: name, left: left, owner: localStorage.getItem('powerapp_rest_owner'), systemStarted: localStorage.getItem('powerapp_rest_system') === '1', _done: false };
      startRestTicker();
      render();
      restTick();
    }
  } catch (e) { }
}
function restBarHtml() {
  if (!_restTimer || (S.preferences && S.preferences.restBar === false)) return '';
  const left = Math.max(0, _restTimer.left | 0);
  const m = Math.floor(left / 60);
  const s = left % 60;
  const done = left <= 0;
  return `<div class="rest-bar ${done ? 'done' : ''}" id="rest-bar">
    <div class="rest-bar-inner">
      <span class="rest-label">Recupero · ${esc(_restTimer.name)}</span>
      ${S.preferences && S.preferences.restStop === false ? '' : '<button type="button" class="rest-cancel" onclick="cancelRestTimer()">Annulla</button>'}
      <span id="rest-timer-display" class="rest-time ${done ? 'done' : ''}">${done ? 'Fine!' : (m + ':' + String(s).padStart(2, '0'))}</span>
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
      ${allD.map(d => `<button type="button" style="border-left:8px solid ${AC[(d - 1) % 4]}" onclick="modalTrain(${d})">Giorno ${d} — ${dayFocus(w, d)}${doneArr.includes(Number(d)) ? ' ✓' : ''}</button>`).join('') || '<p class="mut">Nessun giorno</p>'}
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
function dayFocus(w, d) {
  const list = dayExercises(w, d);
  if (!list) return 'Accessori';
  const u = [];
  list.forEach(e => { if (e.lift && !e.warm && !u.includes(LN[e.lift])) u.push(LN[e.lift]); });
  return u.join(' · ') || 'Accessori';
}
function V(v) {
  S.view = v;
  _pg.sheet = null;
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
      if (/%\s*(?:del\s*)?mav/i.test(text)) return `<span class="rel">${p}% del MAV</span>`;
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
  // Ordine per numero dopo il punto ("SETT 1.2" -> 2). Se lo stesso numero compare piu volte
  // (es. due blocchi 1.1-1.4 e 2.1-2.4 in tabelle diverse) si ordina prima per il numero prima del punto.
  const _ns = weeks.map(w => w.n);
  const _collide = new Set(_ns).size !== _ns.length;
  const _major = w => { const m = String(w.label).match(/(\d+)\.\d+/); return m ? +m[1] : 0; };
  weeks.sort(_collide ? ((a, b) => _major(a) - _major(b) || a.n - b.n) : ((a, b) => a.n - b.n));
  if (!weeks.length) throw new Error('Nessuna tabella con settimane trovata');
  return { weeks, id: null, name: null };
}
async function imp(inp) {
  try {
    const file = inp.files[0];
    if (!file) return;
    if (S.progDraft && !confirm('Hai modifiche non applicate in Programma: caricando un file verranno scartate. Continuare?')) { inp.value = ''; return; }
    const prevProg = S.prog;
    // archivia scheda attuale (lo storico allenamenti NON si cancella)
    if (S.prog) archiveProg(S.prog);
    const prog = await parseDocx(file);
    prog.fileName = /\.docx$/i.test(file.name) ? file.name : (file.name + '.docx');
    prog.name = prog.fileName.replace(/\.docx$/i, '');
    // stessa scheda (aggiornamento) o scheda nuova? nome file simile e/o esercizi in comune
    const m = matchKnownProg(prog);
    let reuse = false;
    if (m) {
      if (m.auto) reuse = true;
      else {
        const why = m.nameSim >= 0.8 ? 'il nome del file è simile' : 'gli esercizi coincidono al ' + Math.round(m.fpSim * 100) + '%';
        try {
          reuse = confirm('Questa scheda somiglia a «' + (m.p.name || m.p.fileName) + '» (' + why + ').\n\nOK = aggiornamento della stessa scheda (mantengo i log)\nAnnulla = scheda nuova');
        } catch (e) { reuse = false; }
      }
    }
    if (reuse) {
      prog.id = m.p.id;
      if (m.p.name) prog.name = m.p.name;
      if (m.p.fileName) prog.fileName = m.p.fileName;
    } else {
      prog.id = newProgId();
    }
    ensureProgMeta(prog);
    resolvePendingExercises(prog);
    pgEnsureSids(prog.weeks);
    prog.base = pgClone(prog.weeks);
    if (reuse && prevProg && prevProg.id === prog.id && prevProg.base && prevProg.weeks) {
      // stessa scheda: riapplica le tue modifiche locali sopra la nuova versione del coach
      const res = pgMergeReimport(prevProg, prog.weeks);
      prog.versions = [{ ts: Date.now(), label: 'Prima del reimport del file', weeks: prevProg.weeks }].concat(prevProg.versions || []).slice(0, 5);
      if (res.hadEdits) {
        prog.weeks = res.weeks;
        setTimeout(() => { try { alert('Modifiche locali riapplicate: ' + res.applied + (res.unmatched ? '. Non riapplicabili: ' + res.unmatched : '') + '.'); } catch (e) { } }, 0);
      }
    }
    S.progDraft = null;
    S.pgSel = null;
    const same = !!(prevProg && prevProg.id === prog.id);
    const running = S.today && S.today.type === 'train' && !S.today.finished;
    const defer = running && !confirm('Attivare la scheda aggiornata adesso?\nOK: attiva ora; Annulla: attiva dopo aver terminato la sessione corrente.');
    if (defer) {
      let start=0;
      if (!same && prog.weeks.length > 1) { const choice=prompt('Settimana di partenza della nuova scheda (1–'+prog.weeks.length+')','1'); if(choice===null)return; const n=Number(choice); if(!Number.isInteger(n)||n<1||n>prog.weeks.length)throw new Error('Settimana non valida'); start=n-1; }
      S.pendingStartWeek=start;
      S.pendingProg = prog; archiveProg(prog); save(); render();
      alert('Scheda pronta: sarà attivata dopo il salvataggio dell’allenamento corrente.');
      return;
    }
    let startWeek = same ? Math.min(S.wi || 0, prog.weeks.length - 1) : 0;
    if (!same && prog.weeks.length > 1) {
      const choice = prompt('Da quale settimana vuoi iniziare? (1–' + prog.weeks.length + ')', '1');
      if (choice === null) return;
      const n = Number(choice);
      if (!Number.isInteger(n) || n < 1 || n > prog.weeks.length) throw new Error('Settimana non valida');
      startWeek = n - 1;
    }
    if (same && prevProg) reconcileProgramLogs(prevProg, prog);
    S.prog = prog;
    archiveProg(S.prog); // anche la nuova entra nel catalogo
    S.wi = startWeek;
    S.chk = {};
    if (!same) { S.today = null; S.cycleCompleted=null; cancelRestTimer(); }
    else if (S.today && S.today.type === 'train') { const aw=prog.weeks.find(w=>w.label===S.today.week); if(!aw || !dayExercises(aw,S.today.day)) { S.today=null; cancelRestTimer(); } }
    rebuildExerciseChecks();
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
      startedAt: Date.now(),
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
  const x = exerciseConfig(week, day, i); if (!x) return;
  // Keep bulk completion atomic. Suggestions are accepted in order so later
  // dependent blocks can use the values accepted from earlier sets.
  const before = JSON.parse(JSON.stringify(x.row));
  const key = week + '|' + day;
  const oldChecks = [...((S.chk[key]) || [])];
  const rollback = () => {
    Object.assign(x.row, before);
    S.chk[key] = oldChecks;
    save();
  };
  for (let si = 0; si < x.configs.length; si++) {
    if (done !== false && !acceptSetSuggestions(week, day, i, si)) { rollback(); return false; }
    if (markSetDone(week, day, i, si, done) === false) { rollback(); return false; }
  }
  _pendingRestOwner = null;
  syncExerciseDoneFromSets(week, day, i);
  return true;
}
function tg(i) {
  try { flushSetInputsFromDOM(); } catch (e) { }
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
    const complex = parseComplexSets(e.text, blockExLift(e));
    const row = getExLog(w.label, d, i, complex.configs.length);
    const allDone = complex.configs.length > 0 && complex.configs.every((_, si) => {
      const s = row.sets[si];
      return isMonolateral(e) ? !!(s && s.L && s.L.done && s.R && s.R.done) : !!(s && s.done);
    });
    if (!allDone) {
      if (!confirm('Non tutte le serie risultano fatte.\nVuoi davvero segnare l\'esercizio come completato?\n(Verranno segnate fatte anche tutte le serie.)')) return;
    }
    if (markAllSetsDone(w.label, d, i, true) === false) { save(); render(); return; }
  }
  if (a.indexOf(i) < 0) a.push(i);
  save();
  render();
}
function logFinishedWorkout(weekLabel, day, weekdayOverride, dateOverride) {
  const w = S.prog && S.prog.weeks.find(x => x.label === weekLabel);
  if (!w || day == null || day === 'comp') return;
  const exs = dayExercises(w, day);
  if (!exs) return;
  const k = weekLabel + '|' + day;
  const ck = S.chk[k] || [];
  if (S.prog) { ensureProgMeta(S.prog); archiveProg(S.prog); }
  const _date = dateOverride || dstr();
  const wd = weekdayOverride != null ? Number(weekdayOverride)
    : (dateOverride ? weekdayMon0(new Date(dateOverride + 'T12:00:00')) : weekdayMon0());
  const _ak = accKey(weekLabel, day);
  const _keepAcc = S.accLog && S.accLog[_ak] ? JSON.parse(JSON.stringify(S.accLog[_ak])) : null;
  removeWorkoutLogByWeekDay(weekLabel, day, S.prog && S.prog.id);
  removeStoricoByWeekWeekday(weekLabel, wd, S.prog && S.prog.id);
  if (_keepAcc) { S.accLog = S.accLog || {}; S.accLog[_ak] = _keepAcc; }

  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    type: 'train',
    durationSeconds: !isPastEntry() && S.today && S.today.startedAt ? Math.max(0, Math.round((Date.now() - S.today.startedAt) / 1000)) : null,
    date: _date,
    at: new Date().toISOString(),
    week: weekLabel,
    weekday: wd,
    day: day,
    title: dayFocus(w, day),
    progId: S.prog ? S.prog.id : null,
    progName: S.prog ? S.prog.name : 'Scheda',
    progFileName: S.prog ? displayProgFileName(S.prog) : 'Scheda.docx',
    exercises: exs.map((e, i) => {
      let sets = null;
      if (!e.warm) {
        let lift = e.lift;
        if (!lift && isMainLift(e)) {
          const n = String(e.name || '').toLowerCase();
          if (/squat|acconsc/.test(n)) lift = 's';
          else if (/panca|bench/.test(n)) lift = 'b';
          else if (/stacco|deadlift|sumo|regular/.test(n)) lift = 'd';
        }
        resolveCalculatedSets(weekLabel, day, i);
        const complex = parseComplexSets(e.text, lift);
        const log = getExLog(weekLabel, day, i, complex.configs.length);
        const effC = buildEffectiveConfigs(complex, log);

        sets = (log.sets || []).slice(0,effC.length).map((s, si) => {
          const c = effC[si] || effC[effC.length - 1] || {};
          const mode = c.mode || 'fixed';
          const prescKg = s.kgSource === 'calculated' ? exNum(s.kg) : c.kg;
          const prescRep = c.reps;
          const autoM = mode !== 'fixed';

          let kgN = null, repsN = null;
          if (isMainLift(e)) {
            if (autoM && s.kg !== '' && s.kg != null) {
              kgN = parseFloat(String(s.kg).replace(',', '.'));
              if (isNaN(kgN)) kgN = prescKg;
            } else {
              kgN = prescKg;
            }
            repsN = prescRep != null ? Number(prescRep) : null;
            if (autoM && s.reps !== '' && s.reps != null && !isNaN(parseInt(s.reps, 10))) {
              repsN = parseInt(s.reps, 10);
            }
          } else if (s.L || s.R) {
            ensureMonoSides(s);
            const parseSide = (sd) => {
              const kg = sd.kg !== '' && sd.kg != null ? parseFloat(String(sd.kg).replace(',', '.')) : null;
              const reps = sd.reps !== '' && sd.reps != null ? parseInt(sd.reps, 10) : null;
              return { kg: kg != null && !isNaN(kg) ? kg : null, reps: reps != null && !isNaN(reps) ? reps : null, done: !!sd.done };
            };
            return { ...setHistoryMeta(s), n: si + 1, mono: true, L: parseSide(s.L), R: parseSide(s.R), done: !!s.done, kg: null, reps: null };
          } else {
            const kgRaw = s.kg;
            const repsRaw = s.reps;
            kgN = kgRaw !== '' && kgRaw != null ? parseFloat(String(kgRaw).replace(',', '.')) : null;
            repsN = repsRaw !== '' && repsRaw != null ? parseInt(repsRaw, 10) : null;
            if (kgN != null && isNaN(kgN)) kgN = null;
            if (repsN != null && isNaN(repsN)) repsN = null;
          }
          return {
            ...setHistoryMeta(s),
            n: si + 1,
            kg: kgN,
            reps: repsN,
            done: !!s.done,
            ...(rpeOf(s) != null ? { rpe: rpeOf(s) } : {}),
          };
        });
      }
      const exNote = getExNote(weekLabel, day, i);
      const nextPlan = isAccessory(e) ? getNextLoadPlan(e.name, weekLabel, day) : null;
      return {
        sid: e.sid || null,
        name: e.name,
        warm: !!e.warm,
        main: isMainLift(e),
        text: e.text || '',
        done: ck.includes(i) || !!(sets && sets.length && sets.every(x => x.done)),
        sets: sets,
        note: exNote || '',
        noteImageKey: getExNoteKey(weekLabel, day, i),
        nextKg: nextPlan && nextPlan.kg != null ? nextPlan.kg : null,
        nextNote: nextPlan && nextPlan.note || '',
        nextSides: nextPlan && nextPlan.sides || null,
      };
    }),
  };

  S.workoutLog = S.workoutLog || [];
  S.workoutLog.unshift(entry);
  // Keep the complete workout history.
}
function deleteWorkoutLog(id) {
  if (!confirm('Eliminare questa voce dallo storico?\nIl Piano si aggiornerà di conseguenza.')) return;
  if (!confirm('Sei sicuro? Non si può annullare.')) return;
  const entry = (S.workoutLog || []).find(x => x.id === id);
  S.workoutLog = (S.workoutLog || []).filter(x => x.id !== id);
  if (entry && entry.week != null && entry.day != null && entry.day !== 'comp') {
    const k = entry.week + '|' + entry.day;
    const _pid = entry.progId || exCurProgId();
    if (S.chk) delete S.chk[k];
    if (S.accLog) delete S.accLog[accKeyFor(_pid, entry.week, entry.day)];
    exRemoveSession(_pid, entry.week, entry.day);
  }
  rebuildPianoFromStorico();
  save();
  render();
}
function finish() {
  try { flushSetInputsFromDOM(); } catch (e) { }
  const w = W();
  if (!w || !S.today) return;
  const d = Number(S.today.day);
  const weekLabel = w.label;
  const done = (S.done[weekLabel] = S.done[weekLabel] || []);
  if (!done.map(Number).includes(d)) done.push(d);
  const exs = dayExercises(w, d);
  if (exs) {
    saveSessionLogs(weekLabel, d, exs);
    logFinishedWorkout(weekLabel, d, null, S.today.date);
  }
  rebuildPianoFromStorico();
  advanceCompletedWeek(weekLabel);
  S.today = { date: dstr(), type: 'rest', finished: 1, week: weekLabel, day: d };
  cancelRestTimer(); activatePendingProgram();
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
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(dayFocus(w, d) + ' – ' + w.label + ' G' + d) + '&dates=' + f(s0) + '/' + f(e0) + '&details=' + encodeURIComponent(det);
}
/** Allenamento in corso: iniziato oggi, oppure meno di 12 ore fa (sessione a cavallo di mezzanotte) */
function trainInProgress(t) {
  if (!t || t.type !== 'train' || t.day == null || t.day === 'comp' || Number.isNaN(Number(t.day))) return false;
  if (t.date === dstr()) return true;
  return !!t.startedAt && (Date.now() - t.startedAt) < 12 * 3600 * 1000;
}
function oggi() {
  if (!S.prog) return importCard();
  const w = W();
  if (!w) return importCard();

  const t = S.today;
  if (t && t.week && t.type === 'train' && !t.finished) {
    const idx = S.prog.weeks.findIndex(x => x.label === t.week);
    if (idx >= 0) S.wi = idx;
  }
  const week = W() || w;

  // Allenamento in corso: priorità massima
  if (trainInProgress(t)) {
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
      return `<button type="button" style="border-left:8px solid ${AC[(d - 1) % 4]}" onclick="setToday('train',${d})">Giorno ${d} — ${dayFocus(week, d)}${done ? ' ✓' : ''}</button>`;
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
    const hist = !e.warm ? historyHtml(e.name, week.label, d) : '';
    const nmJs = jq(e.name);
    const timerBtn = !e.warm
      ? `<div class="rest-row">
          <button type="button" class="rest-start" data-ex="${esc(e.name)}" onclick='startRest(${nmJs}, event)'>Avvia ${fmtRest(rest)}</button>
          <button type="button" class="rest-set" data-ex="${esc(e.name)}" onclick='openRestPicker(${nmJs}, event)'>Tempo</button>
        </div>`
      : '';
    const noteBlock = exNoteAndNextLoadHtml(week.label, d, i, e);
    const setsBlock = !e.warm ? (setsLogHtml(week.label, d, i, e) + hist + noteBlock) : '';
    return `<div class="ex ${e.warm ? 'w' : ''} ${e.lift ? 'main' : ''} ${acc ? 'acc' : ''} ${ck.includes(i) ? 'ok' : ''}">
      <div class="n" onclick="tg(${i})" role="button">${ck.includes(i) ? '✓' : (i + 1)}</div>
      <div class="ex-body">
        <div class="ex-head" onclick="tg(${i})" role="button">
          <div class="nm">${esc(e.name)}</div>
          <div class="dt">${fmt(e.text, e.lift)}</div>
          ${techBadgesHtml(e)}${exProgNoteHtml(e)}
        </div>
        ${timerBtn}
        ${accessoryStartBanner(week.label, d, i, e)}
        ${setsBlock}
      </div>
    </div>`;
  }).join('');

  return `${restBarHtml()}
  <div class="train-wrap" style="--ac:${ac}">
    <div class="hero">
      <div class="mut">${esc(week.label)} · GIORNO ${d}</div>
      <p class="big">${dayFocus(week, d)}</p>
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
  const headers = ['workout_id', 'date', 'at', 'prog_id', 'prog_name', 'week', 'day', 'title', 'exercise', 'warm', 'main', 'exercise_done', 'set_n', 'kg', 'reps', 'set_done', 'kg_l', 'reps_l', 'kg_r', 'reps_r'];
  const lines = [headers.join(',')];
  const cv = v => (v != null && v !== '' ? v : '');
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
          st.done ? 1 : 0,
          cv(st.L && st.L.kg), cv(st.L && st.L.reps), cv(st.R && st.R.kg), cv(st.R && st.R.reps)
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
  const iKgL = header.indexOf('kg_l'), iRepsL = header.indexOf('reps_l'), iKgR = header.indexOf('kg_r'), iRepsR = header.indexOf('reps_r');

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
    // serie monolaterale: colonne kg_l / reps_l / kg_r / reps_r
    const numAt = (i, isInt) => { if (i < 0) return null; const v = row[i]; if (v === '' || v == null) return null; const x = isInt ? parseInt(v, 10) : parseFloat(String(v).replace(',', '.')); return isNaN(x) ? null : x; };
    const kgL = numAt(iKgL), repsL = numAt(iRepsL, true), kgR = numAt(iKgR), repsR = numAt(iRepsR, true);
    if (kgL != null || repsL != null || kgR != null || repsR != null) {
      const dn = iSetDone >= 0 ? (row[iSetDone] === '1' || row[iSetDone] === 'true') : false;
      ex.sets.push({ n: Number.isNaN(sn) ? ex.sets.length + 1 : sn, mono: true, kg: null, reps: null, done: dn, L: { kg: kgL, reps: repsL, done: dn }, R: { kg: kgR, reps: repsR, done: dn } });
      continue;
    }
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
        // Keep the complete workout history.
      }
      workouts.forEach(w => { try { exIngestWorkout(w); } catch (e) { } });
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
  const blockLabel = s.blockIdx != null ? 'Blocco ' + (s.blockIdx + 1) + ' · ' : '';
  if (s.mono || s.L || s.R) {
    const L = s.L || {};
    const R = s.R || {};
    const fmt = (sd, lab) => {
      const kg = sd.kg != null && sd.kg !== '' ? String(sd.kg).replace('.', ',') + ' kg' : '— kg';
      const reps = sd.reps != null && sd.reps !== '' ? String(sd.reps) + ' rip' : '— rip';
      const mark = sd.done ? '✓' : '·';
      return `<div class="hist-set ${sd.done ? 'done' : ''}"><span class="hist-set-n">${mark} ${lab}</span><span class="hist-set-val">${esc(kg)} × ${esc(reps)}</span></div>`;
    };
    return `<div class="hist-mono-set"><div class="hist-set-n" style="font-weight:800;margin:4px 0">${blockLabel}Serie ${s.blockSet != null ? s.blockSet : n}</div>${fmt(L, 'Sx')}${fmt(R, 'Dx')}</div>`;
  }
  const kg = s.kg != null && s.kg !== '' ? String(s.kg).replace('.', ',') + ' kg' : '— kg';
  const reps = s.reps != null && s.reps !== '' ? String(s.reps) + ' rip' : '— rip';
  const mark = s.done ? '✓' : '·';
  return `<div class="hist-set ${s.done ? 'done' : ''}"><span class="hist-set-n">${mark} ${blockLabel}Serie ${s.blockSet != null ? s.blockSet : n}</span><span class="hist-set-val">${esc(kg)} × ${esc(reps)}${s.rpe != null && s.rpe !== '' ? ' @' + esc(String(s.rpe).replace('.', ',')) : ''}</span></div>`;
}
function storico() {
  const list = S.workoutLog || [];
  const tools = `<div class="card hist-tools">
    <p class="big" style="font-size:16px;margin:0 0 8px">Esporta / Importa</p>
    <p class="mut" style="margin-bottom:10px">CSV con kg e rip di ogni serie. L'import deve corrispondere a una scheda presente in app (attuale o precedenti). Se sostituisci, il CSV deve includere tutte le schede già nello storico.</p>
    <button type="button" class="pri" onclick="exportWorkoutCsv()">⬇️ Esporta storico CSV</button>
    <button type="button" onclick="exportHevyCsv()">⬇️ CSV per Hevy (formato Strong)</button>
    <p class="mut">In Hevy: Import Strong CSV, unità kg. I file convertiti non sono ufficialmente supportati da Hevy.</p>
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
        <div class="hist-workout-head"><b class="hist-date">${esc(w.date)}</b><span class="mut">${esc(w.week)}${wdName ? ' · ' + esc(wdName) : ''}</span>
          <button class="res-btn" onclick="deleteWorkoutLog('${w.id}')">❌</button>
        </div>
        <p class="hist-rest-label">Riposo</p>
      </div>`;
    }
    const exList = (w.exercises || []).filter(e => !e.warm);
    const doneN = exList.filter(e => e.done || (e.sets && e.sets.some(s => s.done))).length;
    const tot = exList.length;
    const blocks = exList.map((e, ei) => {
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
      let noteHtml = '';
      if (e.noteImageKey && S.noteImages && S.noteImages[e.noteImageKey] && S.noteImages[e.noteImageKey].length) noteHtml += '<div class="note-gallery history-gallery" data-note-key="' + esc(e.noteImageKey) + '"></div>';
      if (e.note) noteHtml += `<div class="hist-ex-note note-text"><span class="hist-note-icon">📝</span> ${noteTextHtml(e.note)}</div>`;
      if (e.nextKg != null) noteHtml += `<div class="hist-ex-next"><span class="hist-next-icon">📌</span> Prossima volta: <b>${esc(String(e.nextKg))} kg</b>${e.nextNote ? ' — ' + esc(e.nextNote) : ''}</div>`;
      return `<div class="hist-ex-block ${e.done ? 'ok' : ''}">
        <div class="hist-ex-name">${e.done ? '✓ ' : ''}${esc(e.name)}</div>
        ${setsHtml}
        <button type="button" class="history-note-edit" onclick="editHistoryNote(${jq(w.id)},${ei})">Modifica note</button>
        ${prBadgeHtml(w, e)}
        ${noteHtml}
      </div>`;
    }).join('');
    const dayLabel = w.day === 'comp' ? 'Complementari' : ('Giorno ' + w.day);
    return `<div class="card hist-workout">
      <div class="hist-workout-head"><b class="hist-date">${esc(w.date)}</b><span class="hist-workout-label">${esc(w.week)} · ${esc(dayLabel)}</span>
        <button class="res-btn" onclick="deleteWorkoutLog('${w.id}')">❌</button>
      </div>
      <details class="hist-workout-details">
        <summary><span>${esc(w.title || 'Allenamento')}</span><span class="mut">${tot ? doneN + '/' + tot + ' esercizi' : 'Dettagli'}</span></summary>
        <div class="hist-ex-list">${blocks}</div>
      </details>
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
        ${ds.map(d => `<button style="border-left:8px solid ${AC[(d - 1) % 4]}" onclick="setWdayTrain(${d})">Giorno ${d} — ${dayFocus(wObj, d)}</button>`).join('') || '<p class="mut">Nessun giorno in questa settimana</p>'}
        <button style="border-left:8px solid #30a46c" onclick="setWdayTrain('comp')">Complementari <span class="mut" style="font-weight:600">(extra, fuori scheda)</span></button>
        <button onclick="S.dayEdit={...S.dayEdit,step:'type'};save();render()">← Indietro</button>
        <button onclick="cancelDayEdit()">Annulla</button>
      </div>`;
    }
    if (S.dayEdit.step === 'saveChoice') {
      const dn = S.dayEdit.dayNum;
      const label = dn === 'comp' ? 'Complementari' : ('Giorno ' + dn + (wObj && dn != null && dn !== 'comp' ? ' — ' + dayFocus(wObj, dn) : ''));
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
  ${trainingPreferencesHtml()}
  <h1>Timer recupero (iPhone)</h1>
  <div class="card">
    <p class="mut" style="margin-bottom:10px">Su iPhone il timer di sistema parte <b>in automatico</b> all’avvio del recupero. Annullare il recupero nell’app non interrompe il timer iPhone, che continua fino alla scadenza.</p>
    <button type="button" class="${S.restSystemTimer !== false ? 'pri' : ''}" onclick="S.restSystemTimer=!(S.restSystemTimer!==false);save();render()">
      ${S.restSystemTimer !== false ? '✓ Timer iPhone automatico attivo' : 'Timer iPhone automatico disattivo'}
    </button>
    <p class="mut" style="margin-top:12px;font-size:13px;line-height:1.45">
    <b>Setup una tantum del comando «Recupero PL» (solo per iPhone):</b><br>
    <b>Link:</b> <a href="https://www.icloud.com/shortcuts/e507d36734d8427ebb034a577f0cec32" target="_blank" rel="noopener noreferrer" style="color:#3e8bff;font-weight:bold;text-decoration:underline;">Comando rapido</a><br>
    1. Apri <b>il link</b> e aggiungi il comando rapido.<br>
    2. Fine: timer impostato correttamente.
  </p>
  </div>
  <h1>Settimane</h1>${S.prog.weeks.map((w, i) => `${makeEditCard(w.label)}<div class="wk ${i === S.wi ? 'cur' : ''} ${S.dayEdit && S.dayEdit.week === w.label ? 'wk-editing' : ''}" onclick="S.wi=${i};save();render()"><div class="wk-top"><b>${esc(w.label)}</b><button class="res-btn" onclick="resetWk('${w.label}', event)">❌</button></div>${weekDots(w)}</div>`).join('')}
  <p class="mut">Tocca un giorno (Lun–Dom) per impostare allenamento o riposo. Rosso = allenamento · blu = riposo · grigio = non registrato.</p>
  <h1>Nuova scheda</h1><div class="card"><label class="btn" style="margin:0;cursor:pointer">🔄 Cambia file della scheda<input type="file" accept=".docx" style="display:none" onchange="imp(this)"></label><button type="button" class="btn" style="margin:10px 0 0" onclick="exportBackupJson()">Scarica backup dati (.json)</button><label class="btn" style="margin:10px 0 0 8px;cursor:pointer">Ripristina backup (.json)<input type="file" accept=".json,application/json" style="display:none" onchange="importBackupJson(this)"></label><p id="err" class="mut"></p></div>`;
}
function resetWk(label, e) {
  e.stopPropagation();
  if (confirm('Attenzione: Vuoi davvero resettare gli allenamenti per la settimana ' + label + '?')) {
    if (confirm('Sei ASSOLUTAMENTE sicuro? Questa operazione non può essere annullata e perderai i progressi della settimana.')) {
      S.workoutLog = (S.workoutLog || []).filter(w => String(w.week) !== String(label));
      Object.keys(S.chk || {}).forEach(k => { if (k.startsWith(label + '|')) delete S.chk[k] });
      const _pre = exCurProgId() + '|' + label + '|';
      Object.keys(S.accLog || {}).forEach(k => { if (k.startsWith(_pre)) delete S.accLog[k] });
      exRemoveWeek(exCurProgId(), label);
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
      if (_pendingRestOwner && !isPastEntry()) startRest(name, ev); else render();
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
      if (_pendingRestOwner && !isPastEntry()) startRest(name, ev); else render();
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
      if (_pendingRestOwner && !isPastEntry()) startRest(name, ev); else render();
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
      const field = inp.dataset.field;
      if (!field || inp.readOnly || inp.disabled) return;
      const sideEl = inp.closest('.mono-side');
      if (sideEl) setExSideLog(week, day, exi, seti, sideEl.dataset.side, field, inp.value);
      else setExSetLog(week, day, exi, seti, field, inp.value);
    });
  });
}

/* =====================================================================
 * PROGRAMMA: modifica della scheda (nome, serie/rip, ordine, per settimana o per tutte),
 * bozza + applica, versioni, base del coach vs modifiche locali, strumenti, statistiche, export .docx
 * Modello: ogni esercizio ha un id di riga stabile `sid` (uguale nelle settimane); S.prog.weeks e' la
 * scheda attuale, S.prog.base l'originale del coach, S.progDraft la bozza non ancora applicata.
 * ===================================================================== */
const PG_VARIANTS = {
  s: ['Squat', 'Squat con pause', 'Front squat', 'Box squat', 'Squat tecnico'],
  b: ['Panca piana', 'Panca presa stretta', 'Panca con pause', 'Panca con fermo', 'Panca inclinata'],
  d: ['Stacco', 'Stacco sumo', 'Stacco rumeno', 'Stacco da deficit', 'Stacco con pause']
};
const PG_SCHEMES = [
  { id: '5x5', label: '5x5 a percentuale', blocks: [{ type: 'pct', sets: 5, reps: 5, pct: 75, note: '' }] },
  { id: '4x4', label: '4x4 a percentuale', blocks: [{ type: 'pct', sets: 4, reps: 4, pct: 77.5, note: '' }] },
  { id: '3x5', label: '3x5 a percentuale', blocks: [{ type: 'pct', sets: 3, reps: 5, pct: 75, note: '' }] },
  { id: '5x3', label: '5x3 a percentuale', blocks: [{ type: 'pct', sets: 5, reps: 3, pct: 80, note: '' }] },
  { id: '3x3', label: '3x3 a percentuale', blocks: [{ type: 'pct', sets: 3, reps: 3, pct: 85, note: '' }] },
  { id: '5x2', label: '5x2 a percentuale', blocks: [{ type: 'pct', sets: 5, reps: 2, pct: 87.5, note: '' }] },
  { id: 'top', label: 'Top set RPE 8 + back-off', blocks: [{ type: 'rpe', sets: 1, reps: 3, rpe: '8', note: '' }, { type: 'pct', sets: 3, reps: 5, pct: 75, note: '' }] },
  { id: 'rpe', label: '3x5 a RPE 7', blocks: [{ type: 'rpe', sets: 3, reps: 5, rpe: '7', note: '' }] },
  { id: 'ist', label: 'Istintiva', blocks: [{ type: 'ist', note: '' }] }
];
const PG_FIELDS = ['name', 'text', 'warm', 'lift', 'note', 'coachNote'];
const PG_CMP = PG_FIELDS.concat(['subOf']);
let _pg = { sheet: null, tool: {}, notice: '', max: null };

const pgClone = o => JSON.parse(JSON.stringify(o));
const pgNum = v => String(v == null ? '' : v).replace(',', '.').trim();
const pgNorm = (e, k) => (k === 'warm' ? !!e[k] : (e[k] == null ? '' : String(e[k])));
function pgLiftFor(name) {
  name = String(name || '');
  if (/riscaldamento|\bpre\b/i.test(name)) return null;
  return /squat/i.test(name) ? 's' : /stacco|regular|sumo/i.test(name) ? 'd' : /^panca(?!.*inclinata)/i.test(name) ? 'b' : null;
}
function pgWeeks() { return (S.progDraft && S.progDraft.weeks) || (S.prog && S.prog.weeks) || []; }
function pgDays(weeks) {
  const s = new Set();
  weeks.forEach(w => Object.keys(w.days || {}).forEach(d => s.add(Number(d))));
  return [...s].sort((a, b) => a - b);
}
function pgFind(weeks, label, day, sid) {
  const w = weeks.find(x => x.label === label);
  const list = w && dayExercises(w, day);
  if (!list) return null;
  const idx = list.findIndex(e => e.sid === sid);
  return idx < 0 ? null : { w, list, idx, e: list[idx] };
}
/** id di riga stabile: giorno|exId#occorrenza (uguale in tutte le settimane per lo stesso esercizio) */
function pgEnsureSids(weeks) {
  (weeks || []).forEach(w => Object.keys(w.days || {}).forEach(d => {
    const list = w.days[d] || [];
    const used = new Set(list.filter(e => e.sid).map(e => e.sid));
    const occ = {};
    list.forEach((e, i) => {
      const id = (e.name && getExId(e.name)) || ('x' + i);
      occ[id] = (occ[id] || 0) + 1;
      if (!e.sid) {
        let sid = d + '|' + id + '#' + (occ[id] - 1);
        while (used.has(sid)) sid += '+';
        used.add(sid); e.sid = sid;
      }
    });
  }));
}
function pgInit() {
  if (!S.prog || !S.prog.weeks) return;
  pgEnsureSids(S.prog.weeks);
  if (!S.prog.base) S.prog.base = pgClone(S.prog.weeks);
  if (S.progDraft) pgEnsureSids(S.progDraft.weeks);
}
function pgEnsureDraft() {
  if (!S.progDraft) S.progDraft = { weeks: pgClone(S.prog.weeks), changes: 0 };
  return S.progDraft;
}
function pgTouch() { if (S.progDraft) S.progDraft.changes = (S.progDraft.changes || 0) + 1; save(); }
function pgSel() {
  const ws = pgWeeks();
  const s = S.pgSel = S.pgSel || {};
  if (!ws.some(w => w.label === s.week)) s.week = (ws[Math.min(S.wi || 0, ws.length - 1)] || ws[0] || {}).label;
  const days = pgDays(ws);
  if (!days.includes(Number(s.day))) s.day = days.length ? days[0] : 1;
  s.day = Number(s.day);
  if (!['giorno', 'matrice', 'stats', 'strumenti'].includes(s.tab)) s.tab = 'giorno';
  if (s.mainOnly == null) s.mainOnly = true;
  if (s.allWeeks == null) s.allWeeks = true;
  return s;
}
function pgSetSel(k, v) { pgSel()[k] = v; save(); render(); }
function pgNotify(msg) { _pg.notice = msg || ''; }
function pgIsModified(e, label, day) {
  const base = S.prog && S.prog.base;
  if (!base) return false;
  const bw = base.find(w => w.label === label);
  if (!bw) return true;
  const b = (dayExercises(bw, day) || []).find(x => x.sid === e.sid);
  if (!b) return true;
  return PG_CMP.some(k => pgNorm(e, k) !== pgNorm(b, k));
}
/** per una riga: in quante settimane c'e' e dove nome/testo sono diversi dalla settimana indicata */
function pgUniform(ws, day, sid, e) {
  let n = 0; const diff = [];
  ws.forEach(w => {
    const h = pgFind([w], w.label, day, sid);
    if (!h) return;
    n++;
    if (h.e.name !== e.name || (h.e.text || '') !== (e.text || '')) diff.push(w.label);
  });
  return { n, total: ws.length, diff };
}
function pgLocked(labels) { return labels.filter(l => ((S.done && S.done[l]) || []).length); }

/* ----- blocchi della prescrizione <-> testo ----- */
function pgParseBlocks(text) {
  const raw = String(text || '').trim();
  if (!raw) return [];
  const parts = splitPrescriptionBlocks(raw);
  const NUM = '(\\d+(?:[.,]\\d+)?)';
  return (parts.length ? parts : [raw]).map(p => {
    p = String(p).trim();
    let m;
    const bad = r => /mav|\bdel\b|amrap|emom|cluster|%|@/i.test(r);
    if ((m = p.match(new RegExp('^(\\d+)\\s*x\\s*(\\d+)(s)?\\s+' + NUM + '\\s*%\\s*(.*)$', 'i'))) && !bad(m[5])) {
      return { type: 'pct', sets: +(m[3] ? m[2] : m[1]), reps: +(m[3] ? m[1] : m[2]), pct: parseFloat(pgNum(m[4])), note: m[5].trim() };
    }
    if ((m = p.match(new RegExp('^(\\d+)\\s*x\\s*(\\d+)\\s*@\\s*(' + NUM + '(?:\\s*-\\s*' + NUM + ')?)\\s*(.*)$', 'i')))) {
      const note = m[m.length - 1];
      if (!bad(note)) return { type: 'rpe', sets: +m[1], reps: +m[2], rpe: pgNum(m[3]).replace(/\s+/g, ''), note: note.trim() };
    }
    if ((m = p.match(new RegExp('^(\\d+)\\s*@\\s*(' + NUM + '(?:\\s*-\\s*' + NUM + ')?)\\s*(.*)$', 'i')))) {
      const note = m[m.length - 1];
      if (!bad(note)) return { type: 'rpe', sets: 1, reps: +m[1], rpe: pgNum(m[2]).replace(/\s+/g, ''), note: note.trim() };
    }
    if ((m = p.match(/^istintiva\b\s*(.*)$/i))) return { type: 'ist', note: m[1].trim() };
    if ((m = p.match(/^(\d+)\s*x\s*(\d+)(s)?\s*(.*)$/i)) && !bad(m[4])) {
      return { type: 'sr', sets: +(m[3] ? m[2] : m[1]), reps: +(m[3] ? m[1] : m[2]), note: m[4].trim() };
    }
    return { type: 'free', raw: p };
  });
}
function pgBlocksToText(blocks) {
  return (blocks || []).map(b => {
    const note = b.note ? ' ' + String(b.note).trim() : '';
    const sets = +b.sets || 1, reps = +b.reps || 1;
    if (b.type === 'pct') return `${sets}x${reps} ${pgNum(b.pct)}%${note}`;
    if (b.type === 'rpe') return (sets > 1 ? `${sets}x${reps} @${pgNum(b.rpe)}` : `${reps}@${pgNum(b.rpe)}`) + note;
    if (b.type === 'sr') return `${sets}x${reps}${note}`;
    if (b.type === 'ist') return 'istintiva' + note;
    return String(b.raw || '').trim();
  }).filter(Boolean).join(' + ');
}

/* ----- statistiche e controlli ----- */
function pgExStats(e, maxes) {
  const text = String(e.text || '');
  const parts = splitPrescriptionBlocks(text);
  let sets = 0, reps = 0, ton = 0, intW = 0, intR = 0;
  (parts.length ? parts : [text]).forEach(p => {
    const info = parseSets(p);
    const c = info.count || 0;
    let r = null;
    if (info.targets) r = info.targets.reduce((a, b) => a + b, 0);
    else if (info.reps != null) r = info.reps * c;
    sets += c;
    if (r != null) reps += r;
    const m = p.match(/(\d+(?:[.,]\d+)?)\s*%/);
    if (m && !/\bm\.?a\.?v\.?\b|\bdel\b/i.test(p) && r != null) {
      const pct = parseFloat(pgNum(m[1]));
      intW += pct * r; intR += r;
      const mx = e.lift && maxes ? maxes[e.lift] : null;
      if (mx) ton += Math.round(pct / 100 * mx / 2.5) * 2.5 * r;
    }
  });
  return { sets, reps, ton, intW, intR };
}
function pgWeekStats(w, maxes) {
  const out = { sets: 0, ton: 0, intW: 0, intR: 0, days: {} };
  Object.keys(w.days || {}).forEach(d => {
    let secs = 0, sets = 0;
    (w.days[d] || []).forEach(e => {
      if (e.warm) return;
      const s = pgExStats(e, maxes);
      out.sets += s.sets; out.ton += s.ton; out.intW += s.intW; out.intR += s.intR;
      sets += s.sets;
      secs += s.sets * ((getRestSec(e.name) || 120) + 45);
    });
    out.days[d] = { sets, min: Math.round(secs / 60) };
  });
  out.avg = out.intR ? out.intW / out.intR : null;
  return out;
}
function pgLint(ws) {
  const out = [];
  const counts = {};
  ws.forEach(w => Object.keys(w.days || {}).forEach(d => {
    const list = w.days[d] || [];
    const seen = {};
    list.forEach(e => {
      if (e.warm) return;
      const id = getExId(e.name);
      if (id) {
        if (seen[id]) out.push({ week: w.label, day: d, msg: 'Esercizio duplicato: ' + e.name });
        seen[id] = 1;
      }
      const t = String(e.text || '').trim();
      if (!t) out.push({ week: w.label, day: d, msg: 'Prescrizione vuota: ' + e.name });
      else if (!/\d/.test(t) && !/istintiva|mav|amrap|emom|singola|doppia|tripla|cluster|ramp/i.test(t)) {
        out.push({ week: w.label, day: d, msg: 'Notazione non riconosciuta (useranno 3 serie): ' + e.name });
      }
    });
    (counts[d] = counts[d] || []).push({ label: w.label, n: list.filter(e => !e.warm).length });
  }));
  Object.keys(counts).forEach(d => {
    const arr = counts[d], ref = arr[0];
    const diff = arr.find(x => x.n !== ref.n);
    if (diff) out.push({ week: diff.label, day: d, msg: `Numero di esercizi diverso: ${ref.label} ha ${ref.n}, ${diff.label} ha ${diff.n}` });
  });
  return out;
}

/* ----- bozza / applica / versioni ----- */
function pgApply() {
  const d = S.progDraft;
  if (!d || !S.prog) return;
  pgInit();
  const before = S.prog.weeks;
  S.prog.versions = [{ ts: Date.now(), label: (d.changes || 0) + ' modifiche', weeks: before }].concat(S.prog.versions || []).slice(0, 5);
  d.weeks.forEach(nw => {
    const ow = before.find(x => x.label === nw.label);
    Object.keys(nw.days || {}).forEach(day => {
      const a = (dayExercises(nw, day) || []).map(e => e.sid).join(',');
      const b = ow ? (dayExercises(ow, day) || []).map(e => e.sid).join(',') : null;
      if (a !== b && S.chk) delete S.chk[nw.label + '|' + day];
    });
  });
  S.prog.weeks = d.weeks;
  S.progDraft = null;
  S.pianoSession = null;
  if ((S.wi || 0) >= S.prog.weeks.length) S.wi = Math.max(0, S.prog.weeks.length - 1);
  try { archiveProg(S.prog); } catch (e) { }
  pgNotify('Modifiche applicate alla scheda.');
  save(); render();
}
function pgDiscard() {
  if (!S.progDraft) return;
  if (!confirm('Scartare le modifiche non applicate?')) return;
  S.progDraft = null; _pg.sheet = null; pgNotify(''); save(); render();
}
function pgRestoreVersion(i) {
  const vs = S.prog && S.prog.versions;
  if (!vs || !vs[i]) return;
  if (!confirm('Ripristinare la versione "' + vs[i].label + '" del ' + new Date(vs[i].ts).toLocaleString('it-IT') + '?\n\nLa scheda attuale viene salvata tra le versioni.')) return;
  const v = vs.splice(i, 1)[0];
  vs.unshift({ ts: Date.now(), label: 'Prima del ripristino', weeks: S.prog.weeks });
  S.prog.versions = vs.slice(0, 5);
  S.prog.weeks = v.weeks;
  S.progDraft = null;
  Object.keys(S.chk || {}).forEach(k => delete S.chk[k]);
  if ((S.wi || 0) >= S.prog.weeks.length) S.wi = Math.max(0, S.prog.weeks.length - 1);
  try { archiveProg(S.prog); } catch (e) { }
  save(); render();
}
function pgRestoreBaseAll() {
  if (!S.prog || !S.prog.base) return;
  if (!confirm('Riportare TUTTA la scheda a come l\'ha scritta il coach? (diventa una bozza, poi la applichi)')) return;
  pgEnsureDraft();
  S.progDraft.weeks = pgClone(S.prog.base);
  pgTouch(); render();
}
function pgRenameProg() {
  const n = prompt('Nome della scheda', S.prog.name || '');
  if (n == null || !n.trim()) return;
  S.prog.name = n.trim(); save(); render();
}

/* ----- foglio di modifica esercizio ----- */
function pgDefaultScope(e) { return (e.lift && !e.warm) ? 'this' : 'all'; }
function pgOpen(sid, label, day) {
  pgInit();
  const sel = pgSel();
  label = label || sel.week; day = day != null ? Number(day) : sel.day;
  const hit = pgFind(pgWeeks(), label, day, sid);
  if (!hit) return;
  const e = hit.e;
  const f = { name: e.name || '', text: e.text || '', warm: !!e.warm, lift: e.lift || '', note: e.note || '', coachNote: e.coachNote || '' };
  _pg.sheet = { mode: 'edit', sid, week: label, day, orig: pgClone(f), f, subOf: e.subOf || '', blocks: pgParseBlocks(f.text), textMode: false, scope: pgDefaultScope(e), pick: [], moveTo: '', subName: '' };
  render();
}
function pgOpenNew() {
  pgInit();
  const sel = pgSel();
  const f = { name: '', text: '3x10', warm: false, lift: '', note: '', coachNote: '' };
  _pg.sheet = { mode: 'new', sid: 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), week: sel.week, day: sel.day, orig: pgClone(f), f, subOf: '', blocks: pgParseBlocks(f.text), textMode: false, scope: 'all', pick: [], moveTo: '', subName: '' };
  render();
}
function pgClose() { _pg.sheet = null; render(); }
function pgRefreshPreview() {
  const el = $('pg-preview');
  if (el) el.innerHTML = pgPreviewHtml();
  const ta = $('pg-raw');
  if (ta && ta !== document.activeElement) ta.value = _pg.sheet.f.text;
}
function pgSet(k, v) {
  const sh = _pg.sheet; if (!sh) return;
  if (k === 'warm') sh.f.warm = !!v;
  else sh.f[k] = v;
  if (k === 'name') {
    // se la riga era "fondamentale" per nome, aggiorna anche l'alzata in base al nuovo nome
    if (pgLiftFor(sh.orig.name) === (sh.orig.lift || null) && !sh.liftTouched) sh.f.lift = pgLiftFor(v) || '';
  }
  if (k === 'lift') sh.liftTouched = true;
  if (k === 'lift' || k === 'warm') { render(); return; }
  if (k === 'text') { sh.blocks = pgParseBlocks(v); }
  pgRefreshPreview();
}
function pgBlockSet(i, k, v) {
  const sh = _pg.sheet; if (!sh || !sh.blocks[i]) return;
  sh.blocks[i][k] = (k === 'sets' || k === 'reps') ? (parseInt(v, 10) || '') : (k === 'pct' ? pgNum(v) : v);
  sh.f.text = pgBlocksToText(sh.blocks);
  pgRefreshPreview();
}
function pgBlockType(i, type) {
  const sh = _pg.sheet; if (!sh || !sh.blocks[i]) return;
  const old = sh.blocks[i];
  sh.blocks[i] = Object.assign({ type, sets: old.sets || 3, reps: old.reps || 5, note: old.note || '' },
    type === 'pct' ? { pct: old.pct || 75 } : type === 'rpe' ? { rpe: old.rpe || '8' } : type === 'free' ? { raw: pgBlocksToText([old]) } : {});
  sh.f.text = pgBlocksToText(sh.blocks);
  render();
}
function pgBlockAdd() {
  const sh = _pg.sheet; if (!sh) return;
  sh.blocks.push({ type: 'sr', sets: 3, reps: 8, note: '' });
  sh.f.text = pgBlocksToText(sh.blocks);
  render();
}
function pgBlockDel(i) {
  const sh = _pg.sheet; if (!sh) return;
  sh.blocks.splice(i, 1);
  sh.f.text = pgBlocksToText(sh.blocks);
  render();
}
function pgTextMode(on) { if (_pg.sheet) { _pg.sheet.textMode = !!on; if (!on) _pg.sheet.blocks = pgParseBlocks(_pg.sheet.f.text); render(); } }
function pgScheme(id) {
  const sh = _pg.sheet; const s = PG_SCHEMES.find(x => x.id === id);
  if (!sh || !s) return;
  sh.blocks = pgClone(s.blocks);
  sh.f.text = pgBlocksToText(sh.blocks);
  render();
}
function pgVariant(name) { if (_pg.sheet && name) { pgSet('name', name); render(); } }
function pgScope(s) { if (_pg.sheet) { _pg.sheet.scope = s; render(); } }
function pgPick(label, on) {
  const sh = _pg.sheet; if (!sh) return;
  sh.pick = (sh.pick || []).filter(x => x !== label);
  if (on) sh.pick.push(label);
  render();
}
/** settimane interessate dal salvataggio in base all'ambito scelto */
function pgScopeLabels(sh) {
  const ws = pgWeeks();
  const idx = ws.findIndex(w => w.label === sh.week);
  const hit = w => pgFind([w], w.label, sh.day, sh.sid);
  let out;
  if (sh.mode === 'new') out = sh.scope === 'all' ? ws.filter(w => dayExercises(w, sh.day)) : ws.filter(w => w.label === sh.week);
  else if (sh.scope === 'all') out = ws.filter(w => hit(w));
  else if (sh.scope === 'from') out = ws.filter((w, i) => i >= idx && hit(w));
  else if (sh.scope === 'same') {
    out = ws.filter(w => { const h = hit(w); return h && PG_FIELDS.every(k => pgNorm(h.e, k) === pgNorm(sh.orig, k)); });
    if (!out.some(w => w.label === sh.week)) out.push(ws[idx]);
  } else if (sh.scope === 'pick') out = ws.filter(w => hit(w) && ((sh.pick || []).includes(w.label) || w.label === sh.week));
  else out = ws.filter(w => w.label === sh.week);
  return out.filter(Boolean).map(w => w.label);
}
function pgConfirmLocked(labels) {
  const l = pgLocked(labels);
  if (!l.length) return true;
  return confirm('Alcune settimane sono già state fatte (' + l.join(', ') + ').\n\nLe modifiche cambiano la scheda ma NON lo storico degli allenamenti. Continuare?');
}
function pgRenameShare(oldName, newName) {
  const oldId = getExId(oldName);
  const known = exLookupId(newName);
  const hist = S.exLog && S.exLog[oldId] && S.exLog[oldId].entries && S.exLog[oldId].entries.length;
  if (hist && !known) {
    if (confirm('Hai rinominato "' + oldName + '" in "' + newName + '".\n\nÈ lo stesso esercizio (condivide lo storico)?\n\nOK = stesso esercizio, Annulla = esercizio diverso')) {
      const n = exNorm(newName);
      if (n.key) S.exAlias[n.key] = oldId;
    }
  }
}
function pgSaveSheet() {
  const sh = _pg.sheet; if (!sh) return;
  const f = sh.f;
  const name = String(f.name || '').trim();
  if (!name) { alert('Inserisci il nome dell\'esercizio.'); return; }
  const labels = pgScopeLabels(sh);
  if (!pgConfirmLocked(labels)) return;
  pgEnsureDraft();
  const ws = S.progDraft.weeks;
  const clean = { name, text: String(f.text || '').trim(), warm: !!f.warm, lift: f.lift || null, note: String(f.note || '').trim(), coachNote: String(f.coachNote || '').trim() };
  if (sh.mode === 'new') {
    labels.forEach(l => {
      const w = ws.find(x => x.label === l);
      const list = dayExercises(w, sh.day) || (w.days[sh.day] = []);
      const e = { sid: sh.sid, name: clean.name, text: clean.text, warm: clean.warm, lift: clean.lift };
      if (clean.note) e.note = clean.note;
      if (clean.coachNote) e.coachNote = clean.coachNote;
      list.push(e);
    });
  } else {
    const changed = PG_FIELDS.filter(k => pgNorm(clean, k) !== pgNorm(sh.orig, k));
    if (changed.includes('name')) pgRenameShare(sh.orig.name, clean.name);
    labels.forEach(l => {
      const h = pgFind(ws, l, sh.day, sh.sid);
      if (!h) return;
      changed.forEach(k => {
        if (k === 'note' || k === 'coachNote') { if (clean[k]) h.e[k] = clean[k]; else delete h.e[k]; }
        else h.e[k] = clean[k];
      });
    });
  }
  _pg.sheet = null;
  pgTouch(); render();
}
function pgDeleteSheet() {
  const sh = _pg.sheet; if (!sh || sh.mode !== 'edit') return;
  const labels = pgScopeLabels(sh);
  if (!pgConfirmLocked(labels)) return;
  if (!confirm('Eliminare "' + sh.orig.name + '" da ' + labels.length + ' settimana/e?')) return;
  pgEnsureDraft();
  labels.forEach(l => { const h = pgFind(S.progDraft.weeks, l, sh.day, sh.sid); if (h) h.list.splice(h.idx, 1); });
  _pg.sheet = null; pgTouch(); render();
}
function pgDuplicateSheet() {
  const sh = _pg.sheet; if (!sh || sh.mode !== 'edit') return;
  const labels = pgScopeLabels(sh);
  if (!pgConfirmLocked(labels)) return;
  pgEnsureDraft();
  const nsid = 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  labels.forEach(l => { const h = pgFind(S.progDraft.weeks, l, sh.day, sh.sid); if (h) { const c = pgClone(h.e); c.sid = nsid; h.list.splice(h.idx + 1, 0, c); } });
  _pg.sheet = null; pgTouch(); render();
}
function pgMoveToDay() {
  const sh = _pg.sheet; if (!sh || sh.mode !== 'edit') return;
  const to = Number(sh.moveTo);
  if (!to || to === sh.day) return;
  const labels = pgScopeLabels(sh);
  if (!pgConfirmLocked(labels)) return;
  pgEnsureDraft();
  const used = new Set();
  S.progDraft.weeks.forEach(w => (dayExercises(w, to) || []).forEach(e => used.add(e.sid)));
  let nsid = sh.sid; while (used.has(nsid)) nsid += '+';
  labels.forEach(l => {
    const h = pgFind(S.progDraft.weeks, l, sh.day, sh.sid);
    if (!h) return;
    const e = h.list.splice(h.idx, 1)[0];
    e.sid = nsid;
    (dayExercises(h.w, to) || (h.w.days[to] = [])).push(e);
  });
  _pg.sheet = null; pgTouch(); render();
}
function pgSubstitute() {
  const sh = _pg.sheet; if (!sh || sh.mode !== 'edit') return;
  const nn = String(sh.subName || '').trim();
  if (!nn) { alert('Scrivi il nome dell\'esercizio sostitutivo.'); return; }
  const labels = pgScopeLabels(sh);
  if (!pgConfirmLocked(labels)) return;
  pgEnsureDraft();
  const orig = sh.subOf || sh.orig.name;
  if (!exLookupId(nn) && confirm('"' + nn + '" condivide lo storico con "' + orig + '"?\n\nOK = stesso esercizio, Annulla = esercizio diverso')) {
    const n = exNorm(nn); if (n.key) S.exAlias[n.key] = getExId(orig);
  }
  labels.forEach(l => { const h = pgFind(S.progDraft.weeks, l, sh.day, sh.sid); if (h) { h.e.subOf = orig; h.e.name = nn; } });
  _pg.sheet = null; pgTouch(); render();
}
function pgUnsub() {
  const sh = _pg.sheet; if (!sh || !sh.subOf) return;
  const labels = pgScopeLabels(sh);
  pgEnsureDraft();
  labels.forEach(l => { const h = pgFind(S.progDraft.weeks, l, sh.day, sh.sid); if (h && h.e.subOf) { h.e.name = h.e.subOf; delete h.e.subOf; } });
  _pg.sheet = null; pgTouch(); render();
}
function pgRevertCell() {
  const sh = _pg.sheet; if (!sh || sh.mode !== 'edit' || !S.prog.base) return;
  const b = pgFind(S.prog.base, sh.week, sh.day, sh.sid);
  if (!b) { alert('Questa riga non esiste nella scheda del coach.'); return; }
  pgEnsureDraft();
  const h = pgFind(S.progDraft.weeks, sh.week, sh.day, sh.sid);
  if (h) { PG_CMP.forEach(k => { if (b.e[k] == null || b.e[k] === '') delete h.e[k]; else h.e[k] = b.e[k]; }); if (h.e.lift === undefined) h.e.lift = null; }
  _pg.sheet = null; pgTouch(); render();
}
function pgMove(sid, dir) {
  const sel = pgSel();
  pgEnsureDraft();
  const ws = S.progDraft.weeks;
  const cur = ws.find(w => w.label === sel.week);
  const list = cur && dayExercises(cur, sel.day);
  if (!list) return;
  const i = list.findIndex(e => e.sid === sid), j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  const nb = list[j].sid;
  const swap = l => { const a = l.findIndex(e => e.sid === sid), b = l.findIndex(e => e.sid === nb); if (a >= 0 && b >= 0) { const t = l[a]; l[a] = l[b]; l[b] = t; } };
  if (sel.allWeeks) ws.forEach(w => { const l = dayExercises(w, sel.day); if (l) swap(l); });
  else swap(list);
  pgTouch(); render();
}

/* ----- giorni, settimane, copia, progressione, scarico ----- */
function pgAddDay() {
  pgEnsureDraft();
  const n = Math.max(0, ...pgDays(S.progDraft.weeks)) + 1;
  S.progDraft.weeks.forEach(w => { w.days = w.days || {}; w.days[n] = []; });
  S.pgSel = Object.assign(pgSel(), { day: n });
  pgTouch(); render();
}
function pgDelDay() {
  const sel = pgSel();
  const days = pgDays(pgWeeks());
  if (days.length <= 1) { alert('Serve almeno un giorno.'); return; }
  if (!pgConfirmLocked(pgWeeks().map(w => w.label))) return;
  if (!confirm('Eliminare il Giorno ' + sel.day + ' da tutte le settimane?')) return;
  pgEnsureDraft();
  S.progDraft.weeks.forEach(w => { delete w.days[sel.day]; });
  pgTouch(); render();
}
function pgDelWeek(label) {
  const ws = pgWeeks();
  if (ws.length <= 1) { alert('Serve almeno una settimana.'); return; }
  if (!pgConfirmLocked([label])) return;
  if (!confirm('Eliminare la settimana ' + label + '?')) return;
  pgEnsureDraft();
  S.progDraft.weeks = S.progDraft.weeks.filter(w => w.label !== label);
  pgTouch(); render();
}
function pgTool(k, v) { _pg.tool[k] = v; }
function pgNextLabel(ws) {
  const last = ws[ws.length - 1];
  const nmax = Math.max(0, ...ws.map(w => w.n || 0));
  const lab = String(last.label || 'SETT 1.1');
  return /(\d+)\.(\d+)/.test(lab) ? lab.replace(/(\d+)\.(\d+)/, (m, a) => a + '.' + (nmax + 1)) : lab + ' ' + (nmax + 1);
}
function pgCopyDay() {
  const t = _pg.tool, sel = pgSel(), ws = pgWeeks();
  const from = t.copyFrom || sel.week, to = t.copyTo || sel.week, day = Number(t.copyDay || sel.day);
  if (from === to) { alert('Scegli due settimane diverse.'); return; }
  if (!pgConfirmLocked([to])) return;
  pgEnsureDraft();
  const src = S.progDraft.weeks.find(w => w.label === from), dst = S.progDraft.weeks.find(w => w.label === to);
  if (!src || !dst) return;
  dst.days[day] = pgClone(dayExercises(src, day) || []);
  pgNotify('Giorno ' + day + ' copiato da ' + from + ' a ' + to + '.');
  pgTouch(); render();
}
function pgCopyWeek() {
  const t = _pg.tool, sel = pgSel();
  const from = t.copyFrom || sel.week;
  const to = t.copyTo || '__new';
  pgEnsureDraft();
  const src = S.progDraft.weeks.find(w => w.label === from);
  if (!src) return;
  if (to === '__new') {
    const label = pgNextLabel(S.progDraft.weeks);
    const n = Math.max(0, ...S.progDraft.weeks.map(w => w.n || 0)) + 1;
    S.progDraft.weeks.push({ label, n, days: pgClone(src.days) });
    pgNotify('Creata la settimana ' + label + ' copiando ' + from + '.');
  } else {
    if (to === from) { alert('Scegli due settimane diverse.'); return; }
    if (!pgConfirmLocked([to])) return;
    const dst = S.progDraft.weeks.find(w => w.label === to);
    dst.days = pgClone(src.days);
    pgNotify('Settimana ' + from + ' copiata su ' + to + '.');
  }
  pgTouch(); render();
}
function pgGenerate() {
  const t = _pg.tool, ws = pgWeeks();
  const key = t.genSid || '';
  const [day, sid] = key.split('::');
  if (!sid) { alert('Scegli l\'esercizio.'); return; }
  const iFrom = Math.max(0, ws.findIndex(w => w.label === (t.genFrom || ws[0].label)));
  let iTo = ws.findIndex(w => w.label === (t.genTo || ws[ws.length - 1].label));
  if (iTo < iFrom) iTo = ws.length - 1;
  const start = parseFloat(pgNum(t.genStart ?? '70')), step = parseFloat(pgNum(t.genStep ?? '2.5'));
  const sets = parseInt(t.genSets || '3', 10) || 3, reps = parseInt(t.genReps || '5', 10) || 5;
  if (isNaN(start) || isNaN(step)) { alert('Percentuali non valide.'); return; }
  const labels = ws.slice(iFrom, iTo + 1).map(w => w.label);
  if (!pgConfirmLocked(labels)) return;
  pgEnsureDraft();
  let n = 0;
  labels.forEach((l, k) => {
    const h = pgFind(S.progDraft.weeks, l, Number(day), sid);
    if (!h) return;
    h.e.text = pgBlocksToText([{ type: 'pct', sets, reps, pct: Math.round((start + step * k) * 10) / 10, note: '' }]);
    n++;
  });
  pgNotify('Progressione applicata a ' + n + ' settimane.');
  pgTouch(); render();
}
function pgDeload() {
  const t = _pg.tool, sel = pgSel();
  const label = t.deloadWeek || sel.week;
  const pctDrop = parseFloat(pgNum(t.deloadPct ?? '10')) || 0, setsDrop = parseInt(t.deloadSets || '0', 10) || 0;
  if (!pgConfirmLocked([label])) return;
  pgEnsureDraft();
  const w = S.progDraft.weeks.find(x => x.label === label);
  if (!w) return;
  let done = 0, skipped = 0;
  Object.keys(w.days || {}).forEach(d => (w.days[d] || []).forEach(e => {
    if (e.warm || !e.text) return;
    const blocks = pgParseBlocks(e.text);
    if (!blocks.length || blocks.some(b => b.type === 'free')) { skipped++; return; }
    blocks.forEach(b => {
      if (b.type === 'pct') b.pct = Math.round(b.pct * (1 - pctDrop / 100) * 2) / 2;
      if (b.sets > 1) b.sets = Math.max(1, b.sets - setsDrop);
    });
    e.text = pgBlocksToText(blocks); done++;
  }));
  pgNotify('Scarico su ' + label + ': ' + done + ' esercizi modificati' + (skipped ? ', ' + skipped + ' lasciati com\'erano (notazione non semplice).' : '.'));
  pgTouch(); render();
}
function pgMax(k, v) {
  _pg.max = _pg.max || Object.assign({}, S.max);
  _pg.max[k] = parseFloat(pgNum(v)) || 0;
  const el = $('pg-stats-table'); if (el) el.innerHTML = pgStatsTableHtml();
}

/* ----- nuova scheda / duplica ----- */
function pgNewProgram() {
  const name = prompt('Nome della nuova scheda', 'Nuova scheda');
  if (name == null || !name.trim()) return;
  const nw = Math.max(1, Math.min(16, parseInt(prompt('Quante settimane? (1-16)', '4'), 10) || 4));
  const nd = Math.max(1, Math.min(7, parseInt(prompt('Quanti giorni a settimana? (1-7)', '4'), 10) || 4));
  if (S.prog) { try { archiveProg(S.prog); } catch (e) { } }
  const weeks = [];
  for (let k = 1; k <= nw; k++) { const days = {}; for (let d = 1; d <= nd; d++) days[d] = []; weeks.push({ label: 'SETT 1.' + k, n: k, days }); }
  S.prog = { id: newProgId(), name: name.trim(), fileName: name.trim() + '.docx', weeks };
  S.prog.base = pgClone(S.prog.weeks);
  S.wi = 0; S.chk = {}; S.today = null; S.progDraft = null; S.pgSel = null;
  try { archiveProg(S.prog); } catch (e) { }
  S.view = 'programma'; save(); render();
}
function pgDuplicateProgram() {
  if (!S.prog) return;
  if (S.progDraft && !confirm('Hai modifiche non applicate: verranno scartate. Continuare?')) return;
  try { archiveProg(S.prog); } catch (e) { }
  const c = pgClone({ name: S.prog.name, weeks: S.prog.weeks });
  S.prog = { id: newProgId(), name: (c.name || 'Scheda') + ' (copia)', fileName: (c.name || 'scheda') + ' (copia).docx', weeks: c.weeks };
  S.prog.base = pgClone(S.prog.weeks);
  S.progDraft = null; S.chk = {}; S.today = null;
  try { archiveProg(S.prog); } catch (e) { }
  pgNotify('Scheda duplicata: ora lavori sulla copia.');
  save(); render();
}

/* ----- reimport del file del coach: riapplica le modifiche locali ----- */
function pgMergeReimport(oldProg, newWeeks) {
  const oldBase = oldProg.base || [];
  const same = (a, b) => PG_CMP.every(k => pgNorm(a, k) === pgNorm(b, k));
  const cell = (weeks, label, day, sid) => { const h = pgFind(weeks, label, day, sid); return h ? h.e : null; };
  const out = { weeks: pgClone(newWeeks), applied: 0, conflicts: 0, unmatched: 0, hadEdits: false };
  const baseLabels = new Set(oldBase.map(w => w.label));
  const edits = [];
  oldProg.weeks.forEach(ow => {
    if (!baseLabels.has(ow.label)) return; // settimana aggiunta da te: viene conservata intera piu' sotto
    Object.keys(ow.days || {}).forEach(day => {
      const list = dayExercises(ow, day) || [];
      list.forEach((e, idx) => {
        const b = cell(oldBase, ow.label, day, e.sid);
        if (!b) edits.push({ kind: 'add', label: ow.label, day, e, idx });
        else if (!same(e, b)) edits.push({ kind: 'edit', label: ow.label, day, sid: e.sid, e, b });
      });
      const ob = oldBase.find(x => x.label === ow.label);
      (ob ? (dayExercises(ob, day) || []) : []).forEach(b => {
        if (!list.some(e => e.sid === b.sid)) edits.push({ kind: 'del', label: ow.label, day, sid: b.sid, b });
      });
    });
  });
  out.hadEdits = edits.length > 0 || oldProg.weeks.some(w => !baseLabels.has(w.label));
  // conflitti: il coach ha cambiato la stessa riga
  const plan = [];
  edits.forEach(ed => {
    if (ed.kind === 'add') { plan.push({ ed, ok: true }); return; }
    const nc = cell(out.weeks, ed.label, ed.day, ed.sid);
    if (!nc) { out.unmatched++; return; }
    if (ed.kind === 'del') { const conflict = !same(nc, ed.b); plan.push({ ed, nc, conflict }); return; }
    const fields = PG_CMP.filter(k => pgNorm(ed.e, k) !== pgNorm(ed.b, k));
    const confl = fields.filter(k => pgNorm(nc, k) !== pgNorm(ed.b, k) && pgNorm(nc, k) !== pgNorm(ed.e, k));
    plan.push({ ed, nc, fields, confl, conflict: confl.length > 0 });
  });
  out.conflicts = plan.filter(p => p.conflict).length;
  let keepMine = true;
  if (out.conflicts) {
    keepMine = confirm('Hai ' + plan.length + ' modifiche locali; in ' + out.conflicts + ' casi il coach ha cambiato anche la stessa riga.\n\nOK = tieni le tue modifiche anche nei conflitti\nAnnulla = nei conflitti usa la versione del coach (le altre tue modifiche restano)');
  }
  plan.forEach(p => {
    const ed = p.ed;
    if (ed.kind === 'add') {
      const w = out.weeks.find(x => x.label === ed.label);
      if (!w) { out.unmatched++; return; }
      const l = dayExercises(w, ed.day) || (w.days[ed.day] = []);
      const c = pgClone(ed.e);
      while (l.some(x => x.sid === c.sid)) c.sid += '+';
      l.splice(Math.min(ed.idx, l.length), 0, c); out.applied++;
      return;
    }
    if (ed.kind === 'del') {
      if (p.conflict && !keepMine) return;
      const h = pgFind(out.weeks, ed.label, ed.day, ed.sid); if (h) { h.list.splice(h.idx, 1); out.applied++; }
      return;
    }
    p.fields.forEach(k => {
      if (p.confl.includes(k) && !keepMine) return;
      if (k === 'warm') p.nc.warm = !!ed.e.warm;
      else if (ed.e[k] == null || ed.e[k] === '') delete p.nc[k];
      else p.nc[k] = ed.e[k];
    });
    out.applied++;
  });
  // ordine scelto da te (solo righe presenti in entrambe)
  oldProg.weeks.forEach(ow => {
    if (!baseLabels.has(ow.label)) return;
    const nw = out.weeks.find(x => x.label === ow.label);
    if (!nw) return;
    Object.keys(ow.days || {}).forEach(day => {
      const nl = dayExercises(nw, day); const ol = dayExercises(ow, day) || [];
      if (!nl) return;
      const inNew = new Set(nl.map(e => e.sid));
      const userSeq = ol.map(e => e.sid).filter(s => inNew.has(s));
      const ob = oldBase.find(x => x.label === ow.label);
      const baseSeq = ((ob && dayExercises(ob, day)) || []).map(e => e.sid).filter(s => userSeq.includes(s));
      if (userSeq.join() === baseSeq.join()) return;
      const common = new Set(userSeq), by = {}; nl.forEach(e => { by[e.sid] = e; });
      const slots = []; nl.forEach((e, i) => { if (common.has(e.sid)) slots.push(i); });
      const arr = nl.slice(); slots.forEach((pos, k) => { arr[pos] = by[userSeq[k]]; });
      nw.days[day] = arr;
      out.reordered = (out.reordered || 0) + 1; out.applied++;
    });
  });
  if (out.reordered) out.hadEdits = true;
  // settimane aggiunte da te
  oldProg.weeks.forEach(ow => { if (!baseLabels.has(ow.label) && !out.weeks.some(x => x.label === ow.label)) out.weeks.push(pgClone(ow)); });
  return out;
}

/* ----- esportazione .docx (stesso formato che legge parseDocx) ----- */
async function pgBuildDocx() {
  const weeks = pgWeeks();
  const x = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const tc = t => `<w:tc><w:p><w:r><w:t xml:space="preserve">${x(t)}</w:t></w:r></w:p></w:tc>`;
  const rows = [['', ...weeks.map(w => w.label)]];
  pgDays(weeks).forEach(d => {
    rows.push(['GIORNO ' + d]);
    const keys = [], seen = new Set(), cm = {};
    weeks.forEach((w, wi) => (dayExercises(w, d) || []).forEach(e => {
      const nm = (e.warm && !/riscaldamento|\bpre\b/i.test(e.name)) ? 'Riscaldamento ' + e.name : e.name;
      const key = (e.sid || nm) + '\u0001' + nm;
      if (!seen.has(key)) { seen.add(key); keys.push({ key, nm }); cm[key] = {}; }
      cm[key][wi] = e.text || '';
    }));
    keys.forEach(({ key, nm }) => {
      const texts = weeks.map((w, wi) => (cm[key][wi] != null ? cm[key][wi] : ''));
      const allSame = weeks.length > 1 && texts.every(t => t && t === texts[0]);
      rows.push(allSame ? [nm, texts[0]] : [nm, ...texts]);
    });
  });
  const NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const body = `<w:tbl>${rows.map(r => `<w:tr>${r.map(tc).join('')}</w:tr>`).join('')}</w:tbl><w:p/>`;
  const z = new JSZip();
  z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  z.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${NS}"><w:body>${body}</w:body></w:document>`);
  return z.generateAsync({ type: 'uint8array' });
}
async function pgExportDocx() {
  try {
    if (S.progDraft && !confirm('Hai modifiche non applicate: l\'esportazione include anche la bozza. Continuare?')) return;
    const bytes = await pgBuildDocx();
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = String((S.prog && S.prog.name) || 'scheda').replace(/[^\w\-. ]+/g, '_') + '-modificata.docx';
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  } catch (e) { alert('Esportazione non riuscita: ' + (e && e.message ? e.message : e)); }
}

/* ----- note dell'esercizio nella sessione di allenamento ----- */
function exProgNoteHtml(e) {
  if (!e || (!e.note && !e.coachNote && !e.subOf)) return '';
  let h = '';
  if (e.coachNote) h += '<div><b>Coach:</b> ' + esc(e.coachNote) + '</div>';
  if (e.note) h += '<div><b>Nota:</b> ' + esc(e.note) + '</div>';
  if (e.subOf) h += '<div><b>Sostituisce:</b> ' + esc(e.subOf) + '</div>';
  return '<div class="ex-prog-note">' + h + '</div>';
}

/* =============================== UI =============================== */
const pgChip = (on, js, label) => `<button type="button" class="pg-chip ${on ? 'on' : ''}" onclick="${js}">${label}</button>`;
function pgPreviewHtml() {
  const sh = _pg.sheet; if (!sh) return '';
  const text = String(sh.f.text || '').trim();
  if (!text) return '<span class="mut">Nessuna prescrizione</span>';
  const lift = sh.f.lift || null;
  const parts = splitPrescriptionBlocks(text);
  const list = parts.length ? parts : [text];
  const sets = list.reduce((a, p) => a + (parseSets(p).count || 0), 0);
  const kgs = list.map(p => prescribedKg(p, lift)).filter(v => v != null);
  const warn = (!/\d/.test(text) && !/istintiva|mav|amrap|emom|singola|doppia|tripla|cluster|ramp/i.test(text))
    ? '<div class="pg-warn">Notazione non riconosciuta: l\'app userà 3 serie.</div>' : '';
  return `<div class="dt">${fmt(text, lift)}</div><div class="mut pg-small">${sets} serie in totale${kgs.length ? ' · carichi: ' + kgs.map(v => v + ' kg').join(' / ') : ''}</div>${warn}`;
}
function pgBlockHtml(b, i) {
  const num = (k, ph, step) => `<input type="number" inputmode="decimal" step="${step || 'any'}" placeholder="${ph}" value="${esc(b[k] == null ? '' : b[k])}" oninput="pgBlockSet(${i},'${k}',this.value)">`;
  const sr = `<div class="pg-grid">${num('sets', 'Serie')}${num('reps', 'Rip')}</div>`;
  let body = '';
  if (b.type === 'pct') body = sr + `<div class="pg-grid">${num('pct', '% del massimale')}<input type="text" placeholder="Nota (es. no var)" value="${esc(b.note || '')}" oninput="pgBlockSet(${i},'note',this.value)"></div>`;
  else if (b.type === 'rpe') body = sr + `<div class="pg-grid"><input type="text" inputmode="decimal" placeholder="RPE (es. 8 o 7-8)" value="${esc(b.rpe || '')}" oninput="pgBlockSet(${i},'rpe',this.value)"><input type="text" placeholder="Nota" value="${esc(b.note || '')}" oninput="pgBlockSet(${i},'note',this.value)"></div>`;
  else if (b.type === 'sr') body = sr + `<input type="text" placeholder="Nota (es. manubri)" value="${esc(b.note || '')}" oninput="pgBlockSet(${i},'note',this.value)">`;
  else if (b.type === 'ist') body = `<input type="text" placeholder="Nota" value="${esc(b.note || '')}" oninput="pgBlockSet(${i},'note',this.value)">`;
  else body = `<input type="text" placeholder="Testo libero" value="${esc(b.raw || '')}" oninput="pgBlockSet(${i},'raw',this.value)">`;
  const opt = (v, l) => `<option value="${v}" ${b.type === v ? 'selected' : ''}>${l}</option>`;
  return `<div class="pg-block"><div class="pg-block-head"><select onchange="pgBlockType(${i}, this.value)">${opt('sr', 'Serie × rip')}${opt('pct', 'Percentuale')}${opt('rpe', 'RPE')}${opt('ist', 'Istintiva')}${opt('free', 'Testo libero')}</select><button type="button" class="pg-x" onclick="pgBlockDel(${i})" aria-label="Elimina blocco">×</button></div>${body}</div>`;
}
function pgSheetHtml() {
  const sh = _pg.sheet;
  if (!sh || S.view !== 'programma' || !S.prog) return '';
  const f = sh.f, ws = pgWeeks();
  const names = new Set();
  Object.values(S.exReg || {}).forEach(r => r && r.name && names.add(r.name));
  ws.forEach(w => Object.keys(w.days || {}).forEach(d => (w.days[d] || []).forEach(e => e.name && names.add(e.name))));
  const dl = '<datalist id="pg-names">' + [...names].map(n => `<option value="${esc(n)}">`).join('') + '</datalist>';
  const labels = pgScopeLabels(sh);
  const isNew = sh.mode === 'new';
  const uni = !isNew ? pgUniform(ws, sh.day, sh.sid, sh.orig) : null;
  const scopes = isNew
    ? [['this', 'Solo questa settimana'], ['all', 'Tutte le settimane']]
    : [['this', 'Solo questa settimana'], ['all', 'Tutte le settimane'], ['from', 'Da questa in poi'], ['same', 'Dove è ancora uguale'], ['pick', 'Scegli settimane']];
  const scopeHtml = scopes.map(([v, l]) => pgChip(sh.scope === v, `pgScope('${v}')`, l)).join('');
  const pickHtml = sh.scope === 'pick' ? '<div class="pg-chips">' + ws.filter(w => isNew || pgFind([w], w.label, sh.day, sh.sid)).map(w =>
    `<label class="pg-chip ${(sh.pick || []).includes(w.label) || w.label === sh.week ? 'on' : ''}"><input type="checkbox" style="display:none" ${(sh.pick || []).includes(w.label) || w.label === sh.week ? 'checked' : ''} onchange="pgPick(${jq(w.label)}, this.checked)">${esc(w.label.replace(/^SETT\s*/i, ''))}</label>`).join('') + '</div>' : '';
  const diffInfo = (!isNew && uni && uni.diff.length && sh.scope !== 'this')
    ? `<div class="pg-warn">Questa riga è diversa in: ${esc(uni.diff.join(', '))}. Con questo ambito vengono sovrascritte solo le parti che modifichi.</div>` : '';
  const lockInfo = pgLocked(labels).length ? `<div class="pg-warn">Settimane già fatte: ${esc(pgLocked(labels).join(', '))}</div>` : '';
  const variants = f.lift && PG_VARIANTS[f.lift] ? `<label class="pg-lbl">Variante</label><select onchange="pgVariant(this.value)"><option value="">Scegli…</option>${PG_VARIANTS[f.lift].map(v => `<option value="${esc(v)}" ${v === f.name ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>` : '';
  const schemes = `<label class="pg-lbl">Schema</label><select onchange="pgScheme(this.value);this.value=''"><option value="">Scegli uno schema…</option>${PG_SCHEMES.map(s => `<option value="${s.id}">${esc(s.label)}</option>`).join('')}</select>`;
  const prescr = sh.textMode
    ? `<textarea id="pg-raw" rows="3" oninput="pgSet('text', this.value)">${esc(f.text)}</textarea><button type="button" class="btn" onclick="pgTextMode(false)">Torna ai blocchi</button>`
    : sh.blocks.map((b, i) => pgBlockHtml(b, i)).join('') + `<div class="row"><button type="button" class="btn" onclick="pgBlockAdd()">+ Blocco</button><button type="button" class="btn" onclick="pgTextMode(true)">Modifica come testo</button></div>`;
  const days = pgDays(ws).filter(d => d !== sh.day);
  const extra = isNew ? '' : `
    <div class="pg-sec">Altre azioni (valgono per l'ambito scelto)</div>
    <div class="row"><select onchange="_pg.sheet.moveTo=this.value"><option value="">Sposta nel giorno…</option>${days.map(d => `<option value="${d}">Giorno ${d}</option>`).join('')}</select><button type="button" class="btn" style="margin-top:0" onclick="pgMoveToDay()">Sposta</button></div>
    <div class="row"><input type="text" list="pg-names" placeholder="Sostituisci con…" value="${esc(sh.subName || '')}" oninput="_pg.sheet.subName=this.value"><button type="button" class="btn" style="margin-top:0" onclick="pgSubstitute()">Sostituisci</button></div>
    ${sh.subOf ? `<button type="button" class="btn" onclick="pgUnsub()">Torna all'originale (${esc(sh.subOf)})</button>` : ''}
    <div class="row"><button type="button" class="btn" onclick="pgDuplicateSheet()">Duplica</button>${S.prog.base && pgIsModified(Object.assign({ sid: sh.sid }, sh.orig), sh.week, sh.day) ? '<button type="button" class="btn" onclick="pgRevertCell()">Ripristina come da coach</button>' : ''}</div>
    <button type="button" class="btn pg-danger" onclick="pgDeleteSheet()">Elimina esercizio</button>`;
  return `<div class="modal-backdrop piano-session-backdrop" id="pg-sheet" onclick="pgClose()">
    <div class="modal-card piano-session-card pg-sheet" onclick="event.stopPropagation()">
      <p class="big" style="margin-bottom:2px">${isNew ? 'Nuovo esercizio' : 'Modifica esercizio'}</p>
      <p class="mut" style="margin-bottom:10px">${esc(sh.week)} · Giorno ${sh.day}</p>
      ${dl}
      <label class="pg-lbl">Nome</label>
      <input type="text" list="pg-names" id="pg-name" value="${esc(f.name)}" oninput="pgSet('name', this.value)" placeholder="Nome dell'esercizio">
      <div class="pg-chips" style="margin-top:8px">
        ${pgChip(f.warm, `pgSet('warm', ${!f.warm})`, 'Riscaldamento')}
        ${['', 's', 'b', 'd'].map(l => pgChip(!f.warm && f.lift === l, `pgSet('lift','${l}')`, l === '' ? 'Complementare' : ({ s: 'Squat', b: 'Panca', d: 'Stacco' })[l])).join('')}
      </div>
      ${variants}
      <div class="pg-sec">Prescrizione</div>
      ${schemes}
      ${prescr}
      <div class="pg-preview" id="pg-preview">${pgPreviewHtml()}</div>
      <label class="pg-lbl">Nota tua</label>
      <input type="text" value="${esc(f.note)}" oninput="pgSet('note', this.value)" placeholder="Es. tecnica, sensazioni">
      <label class="pg-lbl">Nota del coach</label>
      <input type="text" value="${esc(f.coachNote)}" oninput="pgSet('coachNote', this.value)" placeholder="Es. indicazioni scritte dal coach">
      <div class="pg-sec">Applica a</div>
      <div class="pg-chips">${scopeHtml}</div>${pickHtml}
      <div class="mut pg-small">${labels.length} settimana/e: ${esc(labels.join(', '))}</div>
      ${diffInfo}${lockInfo}
      <div class="row" style="margin-top:12px"><button type="button" class="btn" onclick="pgClose()">Annulla</button><button type="button" class="btn pri" onclick="pgSaveSheet()">Salva in bozza</button></div>
      ${extra}
    </div></div>`;
}
function pgDayHtml(sel) {
  const ws = pgWeeks();
  const w = ws.find(x => x.label === sel.week);
  const list = (w && dayExercises(w, sel.day)) || [];
  const lint = pgLint(ws).filter(x => x.week === sel.week && Number(x.day) === sel.day);
  const st = w ? pgWeekStats(w, S.max) : { days: {} };
  const dd = st.days[sel.day] || { sets: 0, min: 0 };
  const done = ((S.done && S.done[sel.week]) || []).map(Number).includes(sel.day);
  const cards = list.map((e, i) => {
    const badge = e.warm ? 'Riscaldamento' : (e.lift ? 'Fondamentale' : 'Complementare');
    const uni = pgUniform(ws, sel.day, e.sid, e);
    const meta = e.warm ? '' : (uni.diff.length ? `Diverso in: ${esc(uni.diff.join(', '))}` : `Uguale in ${uni.n} settimane`);
    const mod = pgIsModified(e, sel.week, sel.day);
    return `<div class="pg-ex ${e.lift && !e.warm ? 'main' : ''} ${e.warm ? 'warm' : ''}">
      <div class="pg-ex-top"><div class="pg-ex-nm">${esc(e.name)}${mod ? ' <span class="pg-dot" title="Modificato rispetto al coach">●</span>' : ''}</div>
        <div class="pg-ex-ctrl"><button type="button" aria-label="Su" ${i === 0 ? 'disabled' : ''} onclick="pgMove(${jq(e.sid)}, -1)">▲</button><button type="button" aria-label="Giù" ${i === list.length - 1 ? 'disabled' : ''} onclick="pgMove(${jq(e.sid)}, 1)">▼</button></div></div>
      <div class="pg-ex-txt">${fmt(e.text || '', e.lift)}</div>
      <div class="pg-ex-meta"><span class="pg-badge">${badge}</span> ${meta}${e.subOf ? ' · sostituisce ' + esc(e.subOf) : ''}</div>
      ${e.note || e.coachNote ? `<div class="pg-ex-meta">${e.coachNote ? 'Coach: ' + esc(e.coachNote) : ''} ${e.note ? 'Nota: ' + esc(e.note) : ''}</div>` : ''}
      <button type="button" class="btn pg-edit" onclick="pgOpen(${jq(e.sid)})">Modifica</button></div>`;
  }).join('') || '<p class="mut">Nessun esercizio in questo giorno.</p>';
  return `${done ? '<div class="pg-warn">Questo giorno è già stato fatto in questa settimana.</div>' : ''}
    <div class="pg-order"><label><input type="checkbox" ${sel.allWeeks ? 'checked' : ''} onchange="pgSetSel('allWeeks', this.checked)"> Riordina in tutte le settimane</label></div>
    ${cards}
    <button type="button" class="btn pri" onclick="pgOpenNew()">+ Aggiungi esercizio</button>
    <div class="mut pg-small" style="margin-top:8px">${dd.sets} serie · durata stimata ~${dd.min} min</div>
    ${lint.length ? '<div class="pg-warn">' + lint.map(l => esc(l.msg)).join('<br>') + '</div>' : ''}`;
}
function pgMatrixHtml(sel) {
  const ws = pgWeeks();
  let html = `<div class="pg-chips">${pgChip(sel.mainOnly, `pgSetSel('mainOnly', ${!sel.mainOnly})`, 'Solo fondamentali')}</div><div class="pg-mx-wrap" tabindex="0" role="region" aria-label="Tabella del programma, scorri orizzontalmente"><table class="pg-mx"><thead><tr><th></th>${ws.map(w => `<th>${esc(w.label.replace(/^SETT\s*/i, ''))}</th>`).join('')}</tr></thead><tbody>`;
  pgDays(ws).forEach(d => {
    const sids = [], seen = new Set();
    ws.forEach(w => (dayExercises(w, d) || []).forEach(e => { if (!seen.has(e.sid)) { seen.add(e.sid); sids.push(e.sid); } }));
    const rows = sids.filter(sid => ws.some(w => { const h = pgFind([w], w.label, d, sid); return h && !h.e.warm && (!sel.mainOnly || h.e.lift); }));
    if (!rows.length) return;
    html += `<tr class="pg-mx-day"><td colspan="${ws.length + 1}">Giorno ${d}</td></tr>`;
    rows.forEach(sid => {
      let name = '';
      ws.forEach(w => { const h = pgFind([w], w.label, d, sid); if (h && !name) name = h.e.name; });
      html += `<tr><th>${esc(name)}</th>` + ws.map(w => {
        const h = pgFind([w], w.label, d, sid);
        if (!h) return '<td class="pg-mx-empty">—</td>';
        const t = String(h.e.text || '');
        return `<td class="${pgIsModified(h.e, w.label, d) ? 'mod' : ''}" onclick="pgOpen(${jq(sid)}, ${jq(w.label)}, ${d})">${esc(t.length > 24 ? t.slice(0, 23) + '…' : t) || '·'}</td>`;
      }).join('') + '</tr>';
    });
  });
  return html + '</tbody></table></div><p class="mut pg-small">Tocca una cella per modificare quella settimana.</p>';
}
function pgStatsTableHtml() {
  const ws = pgWeeks(), mx = _pg.max || S.max;
  const stats = ws.map(w => ({ label: w.label, s: pgWeekStats(w, mx) }));
  const vals = stats.map(x => x.s.ton || x.s.sets);
  const maxV = Math.max(1, ...vals);
  const bw = 26, gap = 10, H = 70;
  const bars = stats.map((x, i) => {
    const h = Math.max(2, Math.round((vals[i] / maxV) * H));
    return `<rect x="${i * (bw + gap)}" y="${H - h}" width="${bw}" height="${h}" rx="4" fill="var(--ac,#3e8bff)"></rect><text x="${i * (bw + gap) + bw / 2}" y="${H + 14}" text-anchor="middle" font-size="9" fill="currentColor">${esc(x.label.replace(/^SETT\s*/i, ''))}</text>`;
  }).join('');
  const W = Math.max(120, stats.length * (bw + gap));
  const ton = stats.some(x => x.s.ton);
  return `<div class="pg-chart"><svg viewBox="0 0 ${W} ${H + 20}" width="100%" height="${H + 20}" preserveAspectRatio="xMinYMid meet" role="img" aria-label="${ton ? 'Tonnellaggio' : 'Serie'} per settimana">${bars}</svg></div>
    <p class="mut pg-small">${ton ? 'Barre: tonnellaggio dei fondamentali a percentuale (kg)' : 'Barre: serie totali'}</p>
    <div class="pg-mx-wrap" tabindex="0" role="region" aria-label="Tabella del programma, scorri orizzontalmente"><table class="pg-mx"><thead><tr><th>Sett.</th><th>Serie</th><th>Tonn.</th><th>Int. media</th></tr></thead><tbody>${stats.map(x => `<tr><th>${esc(x.label)}</th><td>${x.s.sets}</td><td>${x.s.ton ? Math.round(x.s.ton) : '—'}</td><td>${x.s.avg != null ? x.s.avg.toFixed(1) + '%' : '—'}</td></tr>`).join('')}</tbody></table></div>`;
}
function pgStatsHtml() {
  const m = _pg.max || S.max || {};
  const inp = (k, l) => `<div><label class="pg-lbl">${l}</label><input type="number" inputmode="decimal" value="${esc(m[k] || '')}" oninput="pgMax('${k}', this.value)"></div>`;
  return `<div class="pg-sec">Anteprima con massimali diversi (non li salva)</div><div class="pg-grid3">${inp('s', 'Squat')}${inp('b', 'Panca')}${inp('d', 'Stacco')}</div><div id="pg-stats-table">${pgStatsTableHtml()}</div>`;
}
function pgToolsHtml(sel) {
  const ws = pgWeeks(), t = _pg.tool;
  if (!ws.length) return '<p class="mut">Nessuna settimana disponibile. Crea una nuova scheda.</p><button type="button" class="btn" onclick="pgNewProgram()">Nuova scheda vuota</button>';
  const wopt = (cur, extra) => (extra || '') + ws.map(w => `<option value="${esc(w.label)}" ${w.label === cur ? 'selected' : ''}>${esc(w.label)}</option>`).join('');
  const field = (label, control) => `<label class="pg-field"><span>${label}</span>${control}</label>`;
  const number = (key, label, fallback, decimal = false) => field(label, `<input type="number" ${decimal ? 'inputmode="decimal" step="any"' : 'step="1"'} placeholder="${label}" value="${esc(t[key] ?? fallback)}" oninput="pgTool('${key}',this.value)">`);
  const weeks = (key, label, cur, extra) => field(label, `<select onchange="pgTool('${key}',this.value)">${wopt(cur, extra)}</select>`);
  const days = pgDays(ws);
  const mains = [];
  days.forEach(d => { const seen = new Set(); ws.forEach(w => (dayExercises(w, d) || []).forEach(e => { if (e.lift && !e.warm && !seen.has(e.sid)) { seen.add(e.sid); mains.push({ d, sid: e.sid, name: e.name }); } })); });
  const lint = pgLint(ws);
  const vs = (S.prog && S.prog.versions) || [];
  return `<div class="pg-tools">
    <section class="pg-tool-section" aria-label="Copia">
      <h2 class="pg-sec">Copia</h2>
      <div class="pg-grid">${weeks('copyFrom', 'Da settimana', t.copyFrom || sel.week)}${weeks('copyTo', 'A settimana', t.copyTo || '__new', '<option value="__new">Nuova settimana</option>')}</div>
      <button type="button" class="btn" onclick="pgCopyWeek()">Copia settimana</button>
      ${field('Giorno da copiare', `<select onchange="pgTool('copyDay',this.value)">${days.map(d => `<option value="${d}" ${Number(t.copyDay || sel.day) === d ? 'selected' : ''}>Giorno ${d}</option>`).join('')}</select>`)}
      <button type="button" class="btn" onclick="pgCopyDay()">Copia giorno</button>
    </section>
    <section class="pg-tool-section" aria-label="Generatore di progressione">
      <h2 class="pg-sec">Generatore di progressione</h2>
      ${field('Esercizio', `<select onchange="pgTool('genSid',this.value)"><option value="">Esercizio…</option>${mains.map(m => `<option value="${m.d}::${esc(m.sid)}" ${t.genSid === m.d + '::' + m.sid ? 'selected' : ''}>Giorno ${m.d} · ${esc(m.name)}</option>`).join('')}</select>`)}
      <div class="pg-grid">${weeks('genFrom', 'Dalla settimana', t.genFrom || ws[0].label)}${weeks('genTo', 'Alla settimana', t.genTo || ws[ws.length - 1].label)}</div>
      <div class="pg-grid3">${number('genStart', '% iniziale', '70', true)}${number('genStep', '+% a settimana', '2.5', true)}${number('genSets', 'Serie', '3')}</div>
      ${number('genReps', 'Ripetizioni', '5')}
      <button type="button" class="btn" onclick="pgGenerate()">Applica progressione</button>
    </section>
    <section class="pg-tool-section" aria-label="Settimana di scarico">
      <h2 class="pg-sec">Settimana di scarico</h2>
      ${weeks('deloadWeek', 'Settimana', t.deloadWeek || sel.week)}
      <div class="pg-grid">${number('deloadPct', '-% carico', '10', true)}${number('deloadSets', '-serie', '0')}</div>
      <button type="button" class="btn" onclick="pgDeload()">Applica scarico</button>
    </section>
    <section class="pg-tool-section" aria-label="Giorni e settimane">
      <h2 class="pg-sec">Giorni e settimane</h2>
      <div class="row"><button type="button" class="btn" onclick="pgAddDay()">+ Giorno</button><button type="button" class="btn" onclick="pgDelDay()">Elimina Giorno ${sel.day}</button></div>
      ${weeks('delWeek', 'Settimana da eliminare', t.delWeek || sel.week)}
      <button type="button" class="btn" onclick="pgDelWeek(_pg.tool.delWeek || pgSel().week)">Elimina settimana</button>
    </section>
    <section class="pg-tool-section" aria-label="Controlli">
      <h2 class="pg-sec">Controlli (${lint.length})</h2>
      ${lint.length ? '<div class="pg-warn">' + lint.slice(0, 30).map(l => esc(l.week) + ' G' + esc(l.day) + ': ' + esc(l.msg)).join('<br>') + '</div>' : '<p class="mut pg-small">Nessun problema trovato.</p>'}
    </section>
    <section class="pg-tool-section" aria-label="Versioni">
      <h2 class="pg-sec">Versioni</h2>
      ${vs.length ? vs.map((v, i) => `<div class="pg-ver"><span>${esc(new Date(v.ts).toLocaleString('it-IT'))} · ${esc(v.label)}</span><button type="button" onclick="pgRestoreVersion(${i})">Ripristina</button></div>`).join('') : '<p class="mut pg-small">Nessuna versione salvata: se ne crea una a ogni “Applica”.</p>'}
    </section>
    <section class="pg-tool-section" aria-label="Scheda">
      <h2 class="pg-sec">Scheda</h2>
      <button type="button" class="btn" onclick="pgRenameProg()">Rinomina scheda</button>
      <button type="button" class="btn" onclick="pgRestoreBaseAll()">Ripristina tutto come da coach</button>
      <button type="button" class="btn" onclick="pgExportDocx()">Esporta .docx</button>
      <div class="row"><button type="button" class="btn" onclick="pgDuplicateProgram()">Duplica scheda</button><button type="button" class="btn" onclick="pgNewProgram()">Nuova scheda vuota</button></div>
    </section>
  </div>`;
}
function programma() {
  if (!S.prog) {
    return `<div class="card"><p class="big">Programma</p><p class="mut">Nessuna scheda caricata.</p>
      <label class="btn pri" style="cursor:pointer">Carica scheda (.docx)<input type="file" accept=".docx" style="display:none" onchange="imp(this)"></label>
      <button type="button" class="btn" onclick="pgNewProgram()">Crea scheda da zero</button></div>`;
  }
  pgInit();
  const sel = pgSel(), ws = pgWeeks();
  const d = S.progDraft;
  const weekChips = ws.map(w => {
    const dn = (((S.done && S.done[w.label]) || []).length) > 0;
    return `<button type="button" class="pg-chip ${w.label === sel.week ? 'on' : ''}" onclick="pgSetSel('week', ${jq(w.label)})">${esc(w.label.replace(/^SETT\s*/i, ''))}${dn ? ' ✓' : ''}</button>`;
  }).join('');
  const dayChips = pgDays(ws).map(n => `<button type="button" class="pg-chip ${n === sel.day ? 'on' : ''}" onclick="pgSetSel('day', ${n})">Giorno ${n}</button>`).join('');
  const tabs = [['giorno', 'Giorno'], ['matrice', 'Matrice'], ['stats', 'Statistiche'], ['strumenti', 'Strumenti']]
    .map(([k, l]) => pgChip(sel.tab === k, `pgSetSel('tab','${k}')`, l)).join('');
  const body = sel.tab === 'matrice' ? pgMatrixHtml(sel) : sel.tab === 'stats' ? pgStatsHtml() : sel.tab === 'strumenti' ? pgToolsHtml(sel) : pgDayHtml(sel);
  const notice = _pg.notice ? `<div class="pg-notice">${esc(_pg.notice)}</div>` : '';
  const vs = (S.prog.versions || []);
  return `<div class="card pg-head">
      <p class="big" style="margin-bottom:2px">Programma</p>
      <p class="mut" style="margin:0 0 8px">${esc(S.prog.name || '')}</p>
      ${d ? `<div class="pg-draft"><b>Bozza: ${d.changes || 0} modifiche</b> non ancora applicate<div class="row"><button type="button" class="btn" onclick="pgDiscard()">Scarta</button><button type="button" class="btn pri" onclick="pgApply()">Applica</button></div></div>`
        : (vs.length ? `<button type="button" class="btn pg-undo" onclick="pgRestoreVersion(0)">Annulla ultima applicazione</button>` : '')}
      ${notice}
      <div class="pg-chips">${tabs}</div>
    </div>
    <div class="card pg-content">
      ${sel.tab === 'strumenti' || sel.tab === 'stats' ? '' : `<div class="pg-scroll">${weekChips}</div>`}
      ${sel.tab === 'giorno' ? `<div class="pg-scroll">${dayChips}</div>` : ''}
      ${body}
    </div>`;
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
    const t0 = $('t0'), t1 = $('t1'), t2 = $('t2'), t3 = $('t3');
    if (t0) t0.className = S.view === 'oggi' ? 'on' : '';
    if (t1) t1.className = S.view === 'piano' ? 'on' : '';
    if (t2) t2.className = S.view === 'storico' ? 'on' : '';
    if (t3) t3.className = S.view === 'programma' ? 'on' : '';
    let body = '';
    if (S.view === 'oggi') body = oggi();
    else if (S.view === 'storico') body = storico();
    else if (S.view === 'programma') body = programma();
    else body = piano();
    $('app').innerHTML = body + dayModalHtml() + pianoSessionHtml() + compModalHtml() + restPickerHtml() + pgSheetHtml();
    document.body.classList.toggle('modal-open', !!(S.dayModal || S.restPicker || S.pianoSession || S.compModal || (_pg.sheet && S.view === 'programma')));
    bindRestButtons();
    enhanceTrainingUI();

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

/* ===== Session data: one resolver for UI, calculations and history ===== */
S.preferences = Object.assign({ restBar: true, restStop: true, restSound: true, restNotification: true, forgottenRest: true, reminderSeconds: 120, summary: true }, S.preferences || {});
let _pendingRestOwner = null;
let _systemRestLaunch = null;
function isPastEntry() { return !!S.pianoSession || !!(S.today && S.today.fromPiano); }
function setHistoryMeta(s) {
  const out = {};
  ['blockIdx', 'blockSet', 'blockText', 'blockRole', 'n', 'done'].forEach(k => { if (s[k] != null) out[k] = s[k]; });
  return out;
}
function sessionExercise(week, day, i) {
  const w = S.prog && S.prog.weeks.find(w => w.label === week);
  return w && (dayExercises(w, day) || [])[i];
}
function exerciseConfig(week, day, i) {
  const e = sessionExercise(week, day, i);
  if (!e) return null;
  const complex = parseComplexSets(e.text, blockExLift(e));
  const row = getExLog(week, day, i, complex.configs.length);
  const configs = buildEffectiveConfigs(complex, row);
  while (row.sets.length < configs.length) row.sets.push({ kg: '', reps: '', done: false });
  return { e, complex, row, configs };
}
function isCalculated(c) { return !!c && (c.role === 'mavBackoff' || (c.role === 'backoff' && c.T && c.T.backoffPct != null)); }
function lockedField(e, c, field) {
  if (!c) return true;
  if (isCalculated(c)) return field === 'kg' || (field === 'reps' && c.reps != null);
  if (isMainLift(e) && c.mode === 'fixed') return field === 'kg' || field === 'reps';
  return field === 'reps' && c.reps != null && (c.role === 'mav' || c.role === 'rpe');
}
function calculatedKg(x, si) {
  const c = x.configs[si];
  if (!c) return null;
  if (c.role === 'mavBackoff') {
    const base = getMavKgFromLog(x.row, x.configs, si);
    return base == null ? null : roundKg(base * c.pctOfMav / 100);
  }
  if (c.role === 'backoff' && c.T && c.T.backoffPct != null) {
    let top = null;
    for (let j = 0; j < si; j++) if (x.configs[j].role === 'top') {
      const k = exNum(x.row.sets[j].kg); if (k > 0) top = top == null ? k : Math.max(top, k);
    }
    return top == null ? null : roundKg(top * (1 - c.T.backoffPct / 100));
  }
  return c.kg == null ? null : c.kg;
}
function resolveCalculatedSets(week, day, i) {
  const x = exerciseConfig(week, day, i);
  if (!x) return;
  x.configs.forEach((c, si) => {
    const st = x.row.sets[si];
    Object.assign(st, { blockIdx: c.blockIdx, blockSet: c.bpos + 1, blockText: c.partText || '', blockRole: c.role || c.blockKind, n: si + 1 });
    if (st.done) return; // performed sets are snapshots
    if (lockedField(x.e, c, 'reps') && c.reps != null) st.reps = String(c.reps);
    if (lockedField(x.e, c, 'kg')) {
      const value = calculatedKg(x, si);
      st.kg = value == null ? '' : String(value);
      st.kgSource = 'calculated';
    }
  });
}




function matchingSetCards(week, day, i) {
  return [...document.querySelectorAll('.set-card')].filter(card => card.dataset.week === String(week) && card.dataset.day === String(day) && card.dataset.exi === String(i));
}
function refreshSetValues(week, day, i) {
  const x = exerciseConfig(week, day, i);
  if (!x) return;
  matchingSetCards(week, day, i).forEach(card => {
    const si = Number(card.dataset.set), st = x.row.sets[si], c = x.configs[si];
    if (!st || !c) return;
    card.querySelectorAll('input[data-field]').forEach(inp => {
      const el = inp.closest('.mono-side');
      const data = el ? st[el.dataset.side] : st;
      if (!data || data.done || inp === document.activeElement) return;
      inp.value = data[inp.dataset.field] == null ? '' : data[inp.dataset.field];
      inp.classList.toggle('kg-suggested', data.kgSource === 'inherited');
    });
    if (!st.done && lockedField(x.e, c, 'kg')) {
      const kg = card.querySelector('.set-ro-kg');
      if (kg) kg.textContent = st.kg !== '' && st.kg != null ? st.kg + ' kg' : 'Completa prima il MAV / top set';
    }
  });
}

function suggestedField(x, si, side, field, week, day) {
  const st = side ? ensureMonoSides(x.row.sets[si])[side] : x.row.sets[si];
  if (st[field] !== '' && st[field] != null) return st[field];
  const c = x.configs[si];
  if (field === 'kg' && lockedField(x.e, c, field)) return calculatedKg(x, si);
  if (isAccessory(x.e)) {
    const plan = getPlannedLoad(x.e.name, week, day);
    if (field === 'kg' && plan && plan.kg != null) return side && plan.sides && plan.sides[side] && plan.sides[side].kg != null ? plan.sides[side].kg : plan.kg;
    const prev = findPrevAccessorySets(x.e.name, week, day, !!side);
    const p = prev && prev.sets[si];
    const data = side ? p && p[side] : p;
    if (data && data[field] !== '' && data[field] != null) return data[field];
  }
  if (field === 'reps') return c.reps == null ? null : c.reps;
  if (field === 'kg') {
    for (let j = si - 1; j >= 0 && x.configs[j].blockIdx === c.blockIdx; j--) {
      const p = side ? x.row.sets[j][side] : x.row.sets[j];
      if (p && p.kg !== '' && p.kg != null) return p.kg;
    }
  }
  return null;
}
function acceptSetSuggestions(week, day, i, si, side) {
  resolveCalculatedSets(week, day, i);
  const x = exerciseConfig(week, day, i);
  if (!x || !x.configs[si]) return false;
  if (isCalculated(x.configs[si]) && calculatedKg(x, si) == null) {
    alert('Completa prima il MAV o il top set da cui dipende questo blocco.'); return false;
  }
  const st = side ? ensureMonoSides(x.row.sets[si])[side] : x.row.sets[si];
  const card = matchingSetCards(week, day, i).find(c => Number(c.dataset.set) === si);
  const root = side && card ? card.querySelector('.mono-side[data-side="' + side + '"]') : card;
  ['kg', 'reps', 'rpe'].forEach(field => {
    if (st[field] !== '' && st[field] != null) return;
    const inp = root && root.querySelector('input[data-field="' + field + '"]');
    let value = inp && /^\d+(?:[.,]\d+)?$/.test(inp.placeholder) ? exNum(inp.placeholder) : null;
    if (value == null && field !== 'rpe') value = suggestedField(x, si, side, field, week, day);
    // Target RPE is not an actual reported RPE.
    if (field === 'rpe') return;
    if (value != null && Number.isFinite(Number(value))) { st[field] = String(value); st[field + 'Source'] = 'accepted'; }
  });
  return true;
}
function setOwner(week, day, i, si, side) { return [exCurProgId(), week, day, accSlot(week, day, i), si, side || 'both'].join('|'); }
function markSetDone(week, day, i, setIdx, done) {
  _pendingRestOwner = null;
  const x = exerciseConfig(week, day, i); if (!x || !x.row.sets[setIdx]) return false;
  const st = x.row.sets[setIdx], flag = done !== false;
  const mono = isMonolateral(x.e);
  if (flag) {
    if (mono) { if (!acceptSetSuggestions(week, day, i, setIdx, 'L') || !acceptSetSuggestions(week, day, i, setIdx, 'R')) return false; }
    else if (!acceptSetSuggestions(week, day, i, setIdx)) return false;
  }
  st.done = flag;
  if (mono || st.L || st.R) { ensureMonoSides(st); st.L.done = flag; st.R.done = flag; st.done = flag; }
  const owner = setOwner(week, day, i, setIdx);
  if (flag) { _pendingRestOwner = owner; S.restReminder = null; }
  else cancelOwnedRest(week, day, i, setIdx);
  syncExerciseDoneFromSets(week, day, i); save();
  return true;
}




function cancelRestTimer() {
  if (_systemRestLaunch) { clearTimeout(_systemRestLaunch); _systemRestLaunch = null; }
  if (_restTimer && _restTimer._iv) clearInterval(_restTimer._iv);
  _restTimer = null; _pendingRestOwner = null; S.restReminder = null;
  ['ends', 'name', 'owner', 'system'].forEach(k => localStorage.removeItem('powerapp_rest_' + k));
  save();
  const bar = document.getElementById('rest-bar'); if (bar) bar.remove();
}
function cancelOwnedRest(week, day, i, si, side) {
  const owner = localStorage.getItem('powerapp_rest_owner') || '';
  const prefix = setOwner(week, day, i, si).replace(/\|both$/, '|');
  if (owner.startsWith(prefix) && (!side || owner.endsWith('|' + side) || owner.endsWith('|both'))) cancelRestTimer();
  S.restReminder = null;
}

function advanceCompletedWeek(label) {
  const idx = S.prog && S.prog.weeks.findIndex(w => w.label === label);
  if (idx == null || idx < 0 || idx !== S.wi || remaining(S.prog.weeks[idx]).length) return;
  if (idx < S.prog.weeks.length - 1) S.wi = idx + 1;
  else S.cycleCompleted = { progId: exCurProgId(), date: dstr() };
}
function rebuildExerciseChecks() {
  if (!S.prog) return;
  S.prog.weeks.forEach(w => days(w).forEach(d => (dayExercises(w, d) || []).forEach((e, i) => {
    const existing = S.accLog && S.accLog[accKey(w.label, d)];
    if (existing && existing[accSlot(w.label, d, i)]) syncExerciseDoneFromSets(w.label, d, i);
  })));
}
function reconcileProgramLogs(oldProg, newProg) {
  // Freeze changed prescriptions in completed history. Preserve session rows only when compatible.
  S.programSessionArchive = S.programSessionArchive || [];
  newProg.weeks.forEach(w => days(w).forEach(d => {
    const ow = oldProg.weeks.find(x => x.label === w.label); if (!ow) return;
    const key = accKeyFor(oldProg.id, w.label, d), rows = S.accLog[key]; if (!rows) return;
    const oldList = dayExercises(ow, d) || [], newList = dayExercises(w, d) || [];
    const occurrence = (list, name, n) => list.filter(e => getExId(e.name) === getExId(name))[n];
    const counts = {};
    oldList.forEach(e => {
      const id = getExId(e.name), n = counts[id] || 0; counts[id] = n + 1;
      const slot = id + (n ? '#' + n : '');
      const next = occurrence(newList, e.name, n), row = rows[slot];
      if (!row || (next && next.text === e.text)) return;
      S.programSessionArchive.push({ progId: oldProg.id, week: w.label, day: d, exercise: e.name, prescription: e.text, row: JSON.parse(JSON.stringify(row)), archivedAt: Date.now() });
      delete rows[slot];
    });
  }));
}
function accessoryStartBanner(week, day, i, e) {
  if (!isAccessory(e)) return '';
  const prev = findPrevAccessorySets(e.name, week, day, isMonolateral(e));
  if (!prev || !prev.sets[0]) return '';
  return '<div class="exercise-start-banner"><b>Ultima volta · prima serie</b><span>' + esc(exFmtSets([prev.sets[0]])) + '</span><small>' + esc(prev.label) + '</small></div>';
}


/* ===== Training preferences, summary and reminder ===== */
function trainingPreferencesHtml() {
  const options = [['restBar','Mostra barra del recupero'],['restStop','Mostra Annulla nella barra'],['restSound','Suono a fine recupero'],['restNotification','Notifica a fine recupero'],['forgottenRest','Promemoria recupero dimenticato'],['summary','Riepilogo all’inizio dell’allenamento']];
  return archivedDraftsHtml() + '<h1>Preferenze allenamento</h1><div class="card training-preferences">' + options.map(([key,label]) => '<label class="preference-row"><span>' + label + '</span><input type="checkbox" ' + (S.preferences[key] !== false ? 'checked' : '') + ' onchange="setTrainingPreference(\'' + key + '\',this.checked)"></label>').join('') + '<label>Promemoria dopo (secondi)<input type="number" min="30" max="900" step="30" value="' + S.preferences.reminderSeconds + '" onchange="setTrainingPreference(\'reminderSeconds\',this.value)"></label><p class="mut">Il promemoria funziona mentre l’app è aperta e al rientro. Il suono del timer iPhone si gestisce separatamente con il timer di sistema.</p><button type="button" onclick="cancelRestTimer();render()">Annulla recupero attivo</button></div>';
}
function setTrainingPreference(key, value) {
  if (!['restBar','restStop','restSound','restNotification','forgottenRest','summary','reminderSeconds'].includes(key)) return;
  S.preferences[key] = key === 'reminderSeconds' ? Math.max(30, Math.min(900, Number(value) || 120)) : !!value;
  if (key === 'forgottenRest' && !value) S.restReminder = null;
  save(); render();
}
function activeSessionKey() {
  const t = S.today;
  return t && t.type === 'train' && !t.finished && !isPastEntry() ? [exCurProgId(),t.week,t.day,t.startedAt || t.date].join('|') : null;
}
function armRestReminder(name) {
  const key = activeSessionKey(); if (!key) return;
  S.restReminder = { key, name: name || '', since: Date.now(), dismissed: false }; save();
}
function checkForgottenRest() {
  const r = S.restReminder, key = activeSessionKey();
  const old = document.getElementById('forgotten-rest');
  if (!r || !key || r.key !== key || r.dismissed || S.preferences.forgottenRest === false || (_restTimer && _restTimer.left > 0)) { if (old) old.remove(); return; }
  if (document.visibilityState === 'hidden' || Date.now() - r.since < S.preferences.reminderSeconds * 1000 || old) return;
  const div = document.createElement('aside'); div.id = 'forgotten-rest'; div.className = 'training-toast'; div.setAttribute('role','status');
  const title = document.createElement('b'); title.textContent = 'Hai registrato la serie o avviato il recupero?'; div.appendChild(title);
  const desc = document.createElement('p'); desc.textContent = r.name || 'Controlla il recupero prima della prossima serie.'; div.appendChild(desc);
  if (r.name) { const go = document.createElement('button'); go.textContent = 'Avvia recupero'; go.onclick = () => startRest(r.name); div.appendChild(go); }
  const close = document.createElement('button'); close.textContent = 'Sto ancora eseguendo'; close.onclick = () => { armRestReminder(r.name); div.remove(); }; div.appendChild(close);
  const dismiss = document.createElement('button'); dismiss.textContent = 'Ignora'; dismiss.onclick = () => { r.dismissed = true; save(); div.remove(); }; div.appendChild(dismiss);
  document.body.appendChild(div);
}
function showWorkoutSummary(force) {
  const key = activeSessionKey();
  if (!key || (!force && (S.preferences.summary === false || S.summarySeen === key))) return;
  if (document.getElementById('workout-summary')) return;
  const t = S.today, w = S.prog.weeks.find(w => w.label === t.week) || W();
  const list = (dayExercises(w,t.day) || []).filter(e => isMainLift(e) && !e.warm);
  const modal = document.createElement('div'); modal.id = 'workout-summary'; modal.className = 'modal-backdrop summary-backdrop';
  modal.innerHTML = '<section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="summary-title"><h2 id="summary-title">Il tuo allenamento</h2><p>' + esc(w.label) + ' · Giorno ' + esc(t.day) + '</p>' + (list.length ? list.map(e => '<div class="summary-lift"><b>' + esc(e.name) + '</b><p>' + fmt(e.text,blockExLift(e)) + '</p></div>').join('') : '<p>Sessione dedicata ai complementari.</p>') + '<button type="button" class="pri">Inizia allenamento</button></section>';
  const close = () => { S.summarySeen = key; save(); modal.remove(); };
  modal.querySelector('button').onclick = close;
  modal.addEventListener('keydown', ev => { if (ev.key === 'Escape') close(); });
  document.body.appendChild(modal); modal.querySelector('button').focus();
}
function enhanceTrainingUI() {
  document.body.classList.toggle('past-entry', isPastEntry());
  document.querySelectorAll('.set-card').forEach(card => {
    const week = card.dataset.week, day = Number(card.dataset.day), i = Number(card.dataset.exi), si = Number(card.dataset.set);
    const x = exerciseConfig(week,day,i); if (!x || !x.configs[si]) return;
    card.querySelectorAll('input[data-field]').forEach(inp => {
      const sideEl = inp.closest('.mono-side'), side = sideEl && sideEl.dataset.side;
      const value = suggestedField(x,si,side,inp.dataset.field,week,day);
      if (value != null && inp.dataset.field !== 'rpe') inp.placeholder = String(value);
      if (lockedField(x.e,x.configs[si],inp.dataset.field)) { inp.readOnly=true; const st=side ? x.row.sets[si][side] : x.row.sets[si]; if (st && st[inp.dataset.field] != null) inp.value=st[inp.dataset.field]; }
      inp.addEventListener('focus', () => {
        if (!isPastEntry() && (!S.restReminder || S.restReminder.dismissed)) armRestReminder(x.e.name);
      });
    });
    if (isPastEntry()) {
      card.onclick = null; card.removeAttribute('role'); card.title = 'Inserimento di un allenamento passato';
      card.querySelectorAll('.mono-side').forEach(el => { el.onclick = null; });
      card.querySelectorAll('.mono-set-toggle').forEach(el => { el.disabled = true; el.textContent = 'Serie · registrazione passata'; });
      card.querySelectorAll('.set-lock-hint').forEach(el => el.textContent = 'Registra i valori · nessun timer');
    }
  });
  document.querySelectorAll('.ex-note-field').forEach(field => {
    const area = field.querySelector('textarea'); if (!area || field.querySelector('.note-media')) return;
    const wrap = field.closest('.ex-body');
    const card = wrap && wrap.querySelector('.set-card'); if (!card) return;
    const week = card.dataset.week, day = Number(card.dataset.day), i = Number(card.dataset.exi);
    const key = getExNoteKey(week,day,i);
    const locked = area.disabled;
    const box = document.createElement('div'); box.className = 'note-media'; box.dataset.noteKey = key;
    const label = document.createElement('label'); label.className = 'btn note-upload'; label.textContent = '＋ Foto nelle note';
    const upload = document.createElement('input'); upload.type = 'file'; upload.accept = 'image/*'; upload.multiple = true; upload.hidden = true;
    upload.disabled = locked;
    upload.onchange = () => uploadNoteImages(key, upload); label.appendChild(upload); if (!locked) box.appendChild(label);
    const links = document.createElement('div'); links.className = 'note-links';
    const refreshLinks = () => {
      links.replaceChildren();
      [...new Set(area.value.match(/https?:\/\/[^\s<>"']+/g) || [])].forEach(url => {
        const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = url; links.appendChild(a);
      });
    };
    refreshLinks(); area.addEventListener('input',refreshLinks); box.appendChild(links);
    const link = document.createElement('button'); link.type = 'button'; link.textContent = '＋ Link video'; link.onclick = () => {
      const url = prompt('Incolla il link al video (https://…)'); if (!url) return;
      try { if (!['http:','https:'].includes(new URL(url).protocol)) throw new Error(); } catch { alert('Inserisci un indirizzo http o https valido.'); return; }
      area.value += (area.value ? '\n' : '') + url; setExNote(week,day,i,area.value); refreshLinks();
    }; if (!locked) box.appendChild(link);
    const gallery = document.createElement('div'); gallery.className = 'note-gallery'; box.appendChild(gallery); field.appendChild(box);
    renderNoteImages(key,gallery,locked);
  });
  const hero = document.querySelector('.train-wrap .hero');
  if (hero && !isPastEntry()) {
    const btn = document.createElement('button'); btn.className = 'summary-open'; btn.textContent = 'Riepilogo allenamento'; btn.onclick = () => showWorkoutSummary(true); hero.appendChild(btn);
    const key = activeSessionKey();
    if (key && (!S.restReminder || S.restReminder.key !== key)) {
      const t = S.today, w = S.prog.weeks.find(w => w.label === t.week) || W();
      const first = (dayExercises(w,t.day) || []).find(e => !e.warm); armRestReminder(first && first.name);
    }
    setTimeout(() => showWorkoutSummary(false),0);
  }
  if (S.cycleCompleted && S.cycleCompleted.progId === exCurProgId() && S.view === 'oggi' && !activeSessionKey()) {
    const el = document.createElement('div'); el.className = 'exercise-start-banner'; el.textContent = '✓ Programma concluso'; document.getElementById('app').prepend(el);
  }
  document.querySelectorAll('.history-gallery').forEach(g => renderNoteImages(g.dataset.noteKey,g,true));
  document.querySelectorAll('.next-load-section').forEach(section => { const status=document.createElement('small'); status.className='next-load-status'; status.textContent='Le modifiche vengono salvate automaticamente'; section.appendChild(status); });
  checkForgottenRest();
  updateViewport();
}
function updateViewport() {
  const vv = window.visualViewport;
  const focused = document.activeElement;
  const editing = focused && /INPUT|TEXTAREA|SELECT/.test(focused.tagName);
  const keyboard = !!(vv && editing && window.innerHeight - vv.height > 120);
  document.documentElement.classList.toggle('keyboard-open', keyboard);
  document.documentElement.style.setProperty('--viewport-height', (vv ? vv.height : window.innerHeight) + 'px');
  document.documentElement.style.setProperty('--viewport-top', (vv ? vv.offsetTop : 0) + 'px');
}
window.addEventListener('resize',updateViewport);
window.addEventListener('orientationchange',updateViewport);
if (window.visualViewport) { window.visualViewport.addEventListener('resize',updateViewport); window.visualViewport.addEventListener('scroll',updateViewport); }
document.addEventListener('focusin',updateViewport);
document.addEventListener('focusout',() => setTimeout(updateViewport,0));
window.addEventListener('pagehide', () => { flushSetInputsFromDOM(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); else { updateViewport(); checkForgottenRest(); } });
setInterval(checkForgottenRest,1000);

/* ===== Records: compare only completed, equivalent exercise sets ===== */
function recordMetrics(e) {
  const out = [];
  (e.sets || []).forEach(s => {
    if (s.L || s.R) ['L','R'].forEach(side => { const sd = s[side]; if (sd && sd.done) out.push({ ...sd, side }); });
    else if (s.done) out.push({ ...s, side: 'both' });
  });
  return out.filter(s => exNum(s.kg) > 0 && exInt(s.reps) > 0).map(s => ({ kg: exNum(s.kg), reps: exInt(s.reps), side: s.side, e1rm: exInt(s.reps) <= 12 ? (exInt(s.reps) === 1 ? exNum(s.kg) : exNum(s.kg)*(1+exInt(s.reps)/30)) : null }));
}
function prBadgeHtml(workout,e) {
  const current = recordMetrics(e); if (!current.length) return '';
  const past = (S.workoutLog || []).filter(w => w.id !== workout.id && (w.date < workout.date || (w.date === workout.date && String(w.at || '') < String(workout.at || ''))));
  const old = past.flatMap(w => (w.exercises || []).filter(ex => getExId(ex.name) === getExId(e.name)).flatMap(recordMetrics));
  if (!old.length) return '<span class="pr-badge baseline">Prima prestazione registrata</span>';
  const labels = new Set(); let bestEstimate = null;
  current.forEach(s => {
    const same = old.filter(p => p.side === s.side); if (!same.length) return;
    if (s.kg > Math.max(...same.map(p => p.kg))) labels.add('PR carico');
    const rep = same.filter(p => p.reps === s.reps);
    if (rep.length && s.kg > Math.max(...rep.map(p => p.kg))) labels.add('PR ' + s.reps + ' rep');
    const estimates = same.filter(p => p.e1rm != null);
    if (s.e1rm != null && estimates.length && s.e1rm > Math.max(...estimates.map(p => p.e1rm)) + 0.01) { labels.add('PR e1RM'); bestEstimate = Math.max(bestEstimate || 0,s.e1rm); }
  });
  return [...labels].map(label => '<span class="pr-badge" title="e1RM: formula Epley, kg × (1 + rep/30), massimo 12 rep; è una stima.">' + esc(label) + (label === 'PR e1RM' ? ' · ' + bestEstimate.toFixed(1) + ' kg stimati' : '') + '</span>').join('');
}
function hevyCsvText() {
  const rows = [['Date','Workout Name','Duration','Exercise Name','Set Order','Weight','Reps','Distance','Seconds','Notes','Workout Notes','RPE']];
  (S.workoutLog || []).filter(w => entryType(w) === 'train').slice().sort((a,b) => String(a.date).localeCompare(String(b.date)) || String(a.at).localeCompare(String(b.at))).forEach(w => {
    let time = '12:00:00';
    if (w.at) { const d = new Date(w.at); if (!Number.isNaN(+d)) time = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); }
    const date = w.date + ' ' + time;
    (w.exercises || []).filter(e => !e.warm).forEach(e => {
      let setN = 0;
      (e.sets || []).forEach((s,si) => {
        const sides = s.L || s.R ? [['L',s.L],['R',s.R]] : [['',s]];
        sides.forEach(([side,sd]) => {
          if (!sd || !sd.done || exNum(sd.kg) == null || !(exInt(sd.reps) > 0)) return;
          rows.push([date, w.title || w.progName || 'Allenamento', w.durationSeconds ? formatDuration(w.durationSeconds) : '00:00:00', e.name, ++setN, exNum(sd.kg), exInt(sd.reps),'','', [e.note, s.blockIdx != null ? 'Block ' + (s.blockIdx+1) + ', set ' + (s.blockSet || si+1) : 'Set '+(si+1), side === 'L' ? 'Left side' : side === 'R' ? 'Right side' : ''].filter(Boolean).join(' | '),w.progName || '',rpeOf(sd) == null ? '' : rpeOf(sd)]);
        });
      });
    });
  });
  return rows.map(row => row.map(csvEsc).join(',')).join('\r\n');
}
function formatDuration(seconds) { const s = Math.max(0, Math.round(seconds)); return pad(Math.floor(s/3600))+':'+pad(Math.floor(s%3600/60))+':'+pad(s%60); }
function downloadData(content,type,name) {
  const url = URL.createObjectURL(new Blob([content],{type})); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url),1500);
}
function exportHevyCsv() {
  const csv = hevyCsvText(); if (csv.split('\r\n').length < 2) { alert('Nessuna serie eseguita con kg e ripetizioni da esportare.'); return; }
  downloadData(csv,'text/csv;charset=utf-8','hevy-strong-'+dstr()+'.csv');
}

/* ===== Images: IndexedDB, compressed photos and complete backup ===== */
let _mediaDBPromise;
function mediaDB() {
  if (_mediaDBPromise) return _mediaDBPromise;
  _mediaDBPromise = new Promise((resolve,reject) => {
    if (!window.indexedDB) { reject(new Error('Foto non disponibili in questo browser')); return; }
    const req = indexedDB.open('powerapp_media_v1',1);
    req.onupgradeneeded = () => req.result.createObjectStore('images',{keyPath:'id'});
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  });
  return _mediaDBPromise;
}
async function mediaOperation(mode,action) {
  const db = await mediaDB();
  return new Promise((resolve,reject) => { const tx = db.transaction('images',mode); const req = action(tx.objectStore('images')); let result;
    if (req) req.onsuccess = () => result = req.result;
    tx.oncomplete = () => resolve(result); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('Salvataggio foto annullato'));
  });
}
function mediaGet(id) { return mediaOperation('readonly',s => s.get(id)); }
function mediaPut(record) { return mediaOperation('readwrite',s => s.put(record)); }
function mediaDelete(id) { return mediaOperation('readwrite',s => s.delete(id)); }
async function compressNoteImage(file) {
  if (!file.type.startsWith('image/')) throw new Error('Seleziona una foto');
  if (file.size > 25*1024*1024) throw new Error('Foto troppo grande (massimo 25 MB)');
  const url = URL.createObjectURL(file), img = new Image();
  try { await new Promise((resolve,reject) => { img.onload=resolve; img.onerror=() => reject(new Error('Formato immagine non leggibile. Usa JPG, PNG o WebP.')); img.src=url; });
    const ratio = Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight));
    const canvas=document.createElement('canvas'); canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio)); canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));
    const ctx=canvas.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(img,0,0,canvas.width,canvas.height);
    return canvas.toDataURL('image/jpeg',0.8);
  } finally { URL.revokeObjectURL(url); }
}
async function uploadNoteImages(key,input) {
  const files=[...input.files]; input.disabled=true;
  try {
    for (const file of files) {
      const data=await compressNoteImage(file), id='img_'+Date.now().toString(36)+Math.random().toString(36).slice(2);
      await mediaPut({id,data,name:file.name,createdAt:Date.now()});
      S.noteImages=S.noteImages || {}; (S.noteImages[key]=S.noteImages[key] || []).push({id,name:file.name}); save();
    }
    render();
  } catch(e) { alert('Foto non salvata: '+e.message); }
  finally { input.disabled=false; input.value=''; }
}
async function renderNoteImages(key,gallery,readonly) {
  const generation = gallery._noteGeneration = (gallery._noteGeneration || 0) + 1;
  gallery.replaceChildren();
  const images=(S.noteImages && S.noteImages[key]) || [];
  for (const ref of images) {
    try {
      const rec=await mediaGet(ref.id); if (!gallery.isConnected || gallery._noteGeneration !== generation) return;
      const figure=document.createElement('figure');
      if (rec) { const button=document.createElement('button'); button.type='button'; button.className='note-photo-open'; button.setAttribute('aria-label','Apri foto: ' + (ref.name || 'Foto esercizio')); button.onclick=ev => { ev.preventDefault(); ev.stopPropagation(); openNotePhoto(rec.data,ref.name); }; const img=document.createElement('img'); img.src=rec.data; img.alt=ref.name || 'Foto esercizio'; img.loading='lazy'; button.appendChild(img); figure.appendChild(button); }
      else { const p=document.createElement('span'); p.textContent='Foto non disponibile'; figure.appendChild(p); }
      if (!readonly) { const btn=document.createElement('button'); btn.type='button'; btn.textContent='Elimina foto'; btn.onclick=async () => {
        if (!confirm('Eliminare questa foto dalle note?')) return;
        S.noteImages[key]=S.noteImages[key].filter(r=>r.id!==ref.id); save();
        // Keep shared references intact when archived sessions still use the image.
        if (!Object.values(S.noteImages).some(refs=>refs.some(r=>r.id===ref.id))) await mediaDelete(ref.id);
        figure.remove();
      }; figure.appendChild(btn); }
      gallery.appendChild(figure);
    } catch(e) { gallery.textContent='Foto non disponibili: '+e.message; }
  }
}

function openNotePhoto(data,name) {
  const previous = document.activeElement;
  const old = document.getElementById('note-photo-viewer'); if (old) old.remove();
  const viewer = document.createElement('div'); viewer.id='note-photo-viewer'; viewer.className='note-photo-viewer';
  viewer.setAttribute('role','dialog'); viewer.setAttribute('aria-modal','true'); viewer.setAttribute('aria-label',name || 'Foto esercizio');
  const close = document.createElement('button'); close.type='button'; close.className='note-photo-close'; close.textContent='Chiudi ✕';
  const img = document.createElement('img'); img.src=data; img.alt=name || 'Foto esercizio';
  const prevOverflow = document.body.style.overflow;
  const dismiss = () => { viewer.remove(); document.body.style.overflow=prevOverflow; document.removeEventListener('keydown',keyHandler); if (previous && previous.isConnected) previous.focus(); };
  const keyHandler = ev => {
    if(ev.key==='Escape') { ev.preventDefault(); ev.stopPropagation(); dismiss(); }
    if(ev.key==='Tab') { ev.preventDefault(); close.focus(); }
  };
  close.onclick=dismiss; viewer.onclick=ev => { if(ev.target===viewer) dismiss(); };
  viewer.append(close,img); document.body.appendChild(viewer); document.body.style.overflow='hidden';
  document.addEventListener('keydown',keyHandler); close.focus();
}




function activatePendingProgram() {
  if (!S.pendingProg) return;
  const next=S.pendingProg, old=S.prog; const same=old && next.id===old.id;
  if (same) reconcileProgramLogs(old,next);
  S.prog=next; delete S.pendingProg;
  S.wi=same ? Math.min(S.wi,next.weeks.length-1) : (S.pendingStartWeek || 0); delete S.pendingStartWeek;
  S.today=null; S.chk={}; S.cycleCompleted=null;
  rebuildPianoFromStorico(); rebuildExerciseChecks();
  save();
}

function editHistoryNote(workoutId,index) {
  const w=(S.workoutLog || []).find(w=>w.id===workoutId); if(!w)return;
  const e=(w.exercises || []).filter(e=>!e.warm)[index]; if(!e)return;
  const note=prompt('Note per '+e.name,e.note || ''); if(note===null)return;
  e.note=note;
  exEntriesFor(e.name).filter(en=>exSameSession(en,{progId:w.progId,week:w.week,day:w.day,date:w.date})).forEach(en=>en.note=note);
  if(e.noteImageKey) S.exNotes[e.noteImageKey]=note;
  else if(w.progId===exCurProgId()) { const list=dayExercises((S.prog.weeks || []).find(x=>x.label===w.week),w.day) || []; const i=list.findIndex(x=>x.name===e.name); if(i>=0)S.exNotes[getExNoteKey(w.week,w.day,i)]=note; }
  save(); render();
}

function archivedDraftsHtml() {
  const rows=S.programSessionArchive || [];
  if(!rows.length)return '';
  return '<details class="card"><summary>Dati conservati dagli aggiornamenti scheda ('+rows.length+')</summary><p class="mut">Le prescrizioni cambiate hanno nuove serie. Qui restano i valori inseriti prima dell’aggiornamento.</p>'+rows.slice().reverse().map(a=>'<div class="archived-draft"><b>'+esc(a.exercise)+'</b><p>'+esc(a.week)+' · Giorno '+esc(a.day)+'</p><p class="mut">'+esc(a.prescription || '')+'</p><p>'+esc(exFmtSets(a.row.sets || []))+'</p></div>').join('')+'</details>';
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
  } catch (e) { }
  // delay leggero così il DOM è pronto
  setTimeout(() => openDayModal(false), 120);
})();

rebuildPianoFromStorico();
try { migrateToV2(); } catch (e) { console.error(e); }
try { pgInit(); } catch (e) { console.error(e); }
render();
// Espone funzioni usate dagli onclick inline (iOS / strict)
window.startRest = startRest;
window.resumeRestTimerIfNeeded = resumeRestTimerIfNeeded;
window.openSystemRestTimer = openSystemRestTimer;
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
window.addMavSet = addMavSet;
window.removeMavSet = removeMavSet;
window.addRpeSet = addRpeSet;
window.removeRpeSet = removeRpeSet;
window.addBlockSet = addBlockSet;
window.removeBlockSet = removeBlockSet;
window.addRampSet = addRampSet;
window.removeLastSet = removeLastSet;
window.exportWorkoutCsv = exportWorkoutCsv;
window.cancelPianoSession = cancelPianoSession;
window.savePianoSession = savePianoSession;
window.pianoSaveWithLoads = pianoSaveWithLoads;
window.pianoSaveEmpty = pianoSaveEmpty;
window.importWorkoutCsvFile = importWorkoutCsvFile;
window.setExNote = setExNote;
window.setNextLoadPlan = setNextLoadPlan;
window.onToggleNextLoad = onToggleNextLoad;
window.onNextLoadInputsChange = onNextLoadInputsChange;
window.applyPlannedLoadToSets = applyPlannedLoadToSets;
window.compOnNameChange = compOnNameChange;
window.compApplyPlannedKg = compApplyPlannedKg;
window.compToggleNext = compToggleNext;
window.getPlannedLoad = getPlannedLoad;
window.exportBackupJson = exportBackupJson;
window.mergeExercises = mergeExercises;
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
