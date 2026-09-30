const KEY = 'powerapp_v1', AC = ['#e5484d', '#3e8bff', '#e08a00', '#30a46c'], LN = { s: 'Squat', b: 'Panca', d: 'Stacco' };
let S = {};
try { S = JSON.parse(localStorage.getItem(KEY)) || {} } catch (e) { }
S.max = S.max || { s: 210, b: 110, d: 265 }; S.done = S.done || {}; S.chk = S.chk || {}; S.wi = S.wi || 0; S.view = S.view || 'oggi'; S.time = S.time || '17:00'; S.pushOn = S.pushOn || false; S.weekLog = S.weekLog || {}; S.promptedDate = S.promptedDate || null; S.dayModal = S.dayModal || null; S.accLog = S.accLog || {}; S.liftHistory = S.liftHistory || {}; S.restByEx = S.restByEx || {}; S.restDefault = S.restDefault || 120; S.restPicker = S.restPicker || null;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)) } catch (e) { } };
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = n => String(n).padStart(2, '0');
const dstr = (d = new Date()) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());

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
  S.weekLog = S.weekLog || {}; S.promptedDate = S.promptedDate || null; S.dayModal = S.dayModal || null; S.accLog = S.accLog || {}; S.liftHistory = S.liftHistory || {}; S.restByEx = S.restByEx || {}; S.restDefault = S.restDefault || 120; S.restPicker = S.restPicker || null;
  S.weekLog[weekLabel] = S.weekLog[weekLabel] || {};
  if (type === 'train') S.weekLog[weekLabel][wd] = { type: 'train', day };
  else S.weekLog[weekLabel][wd] = { type: 'rest' };
};
const clearCal = (weekLabel, wd = weekdayMon0()) => {
  if (S.weekLog && S.weekLog[weekLabel]) {
    const prev = S.weekLog[weekLabel][wd];
    const prevDay = logDayNum(prev);
    // se era un allenamento con giorno scheda, togli da done
    if (logType(prev) === 'train' && prevDay != null && prevDay !== 'comp' && S.done[weekLabel]) {
      S.done[weekLabel] = S.done[weekLabel].filter(x => x !== prevDay);
      if (!S.done[weekLabel].length) delete S.done[weekLabel];
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
    clearCal(week, wd);
    if (wd === weekdayMon0() && week === (W() && W().label)) S.today = null;
    S.dayEdit = null;
    save(); render();
    return;
  }
  if (type === 'rest') {
    // se prima c'era un train, clearCal gestisce done
    clearCal(week, wd);
    logCal('rest', week, wd);
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
  logCal('train', week, wd, dayNum);
  // complementari: non entra in S.done (non è un giorno della scheda)
  if (dayNum !== 'comp') {
    const done = (S.done[week] = S.done[week] || []);
    if (!done.includes(dayNum)) done.push(dayNum);
    const wObj = S.prog.weeks.find(x => x.label === week);
    if (wObj && !remaining(wObj).length) {
      const idx = S.prog.weeks.findIndex(x => x.label === week);
      if (idx >= 0 && idx < S.prog.weeks.length - 1 && S.wi === idx) S.wi = idx + 1;
    }
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
/** Fondamentali (o varianti già taggate s/b/d dal parser) */
function isMainLift(e) {
  return !!(e && e.lift && (e.lift === 's' || e.lift === 'b' || e.lift === 'd'));
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
function openRestPicker(name) {
  S.restPicker = { name: name, sec: getRestSec(name) };
  save();
  render();
  // Apri il selettore nativo appena il DOM è pronto
  requestAnimationFrame(() => {
    const inp = document.getElementById('rest-time-input');
    if (!inp) return;
    try {
      if (typeof inp.showPicker === 'function') inp.showPicker();
      else { inp.focus(); inp.click(); }
    } catch (e) {
      try { inp.focus(); } catch (e2) {}
    }
  });
}
function closeRestPicker() {
  S.restPicker = null;
  save();
  render();
}
function confirmRestPicker() {
  if (!S.restPicker) return;
  const inp = document.getElementById('rest-time-input');
  const sec = inp ? timeValueToSec(inp.value) : S.restPicker.sec;
  setRestSec(S.restPicker.name, sec);
  S.restPicker = null;
  save();
  render();
}
function restPickerHtml() {
  if (!S.restPicker) return '';
  const sec = S.restPicker.sec;
  const name = S.restPicker.name;
  return `<div class="modal-backdrop rest-picker-backdrop" onclick="closeRestPicker()">
    <div class="modal-card rest-picker-card" onclick="event.stopPropagation()">
      <p class="big">Tempo di recupero</p>
      <p class="mut" style="margin-bottom:12px">${esc(name)}</p>
      <label class="rest-picker-label">Durata
        <input id="rest-time-input" type="time" step="1" value="${secToTimeValue(sec)}"
          onchange="S.restPicker.sec=timeValueToSec(this.value)">
      </label>
      <div class="rest-presets">
        <button type="button" onclick="document.getElementById('rest-time-input').value=secToTimeValue(60);S.restPicker.sec=60">1:00</button>
        <button type="button" onclick="document.getElementById('rest-time-input').value=secToTimeValue(90);S.restPicker.sec=90">1:30</button>
        <button type="button" onclick="document.getElementById('rest-time-input').value=secToTimeValue(120);S.restPicker.sec=120">2:00</button>
        <button type="button" onclick="document.getElementById('rest-time-input').value=secToTimeValue(180);S.restPicker.sec=180">3:00</button>
        <button type="button" onclick="document.getElementById('rest-time-input').value=secToTimeValue(240);S.restPicker.sec=240">4:00</button>
        <button type="button" onclick="document.getElementById('rest-time-input').value=secToTimeValue(300);S.restPicker.sec=300">5:00</button>
      </div>
      <button class="pri" onclick="confirmRestPicker()">Salva</button>
      <button onclick="closeRestPicker()">Annulla</button>
    </div>
  </div>`;
}
function getAccLog(week, day, i) {
  const k = week + '|' + day;
  S.accLog = S.accLog || {};
  S.accLog[k] = S.accLog[k] || {};
  S.accLog[k][i] = S.accLog[k][i] || { kg: '', reps: '' };
  return S.accLog[k][i];
}
function setAccLog(week, day, i, field, value) {
  const row = getAccLog(week, day, i);
  row[field] = value;
  save();
}
/** Storico nel tempo per esercizio complementare */
function pushLiftHistory(name, kg, reps, week, day) {
  if (kg === '' || kg == null || reps === '' || reps == null) return;
  const kgN = parseFloat(String(kg).replace(',', '.'));
  const repsN = parseInt(reps, 10);
  if (isNaN(kgN) || isNaN(repsN)) return;
  const key = liftKey(name);
  S.liftHistory = S.liftHistory || {};
  S.liftHistory[key] = S.liftHistory[key] || [];
  // evita doppione stesso giorno
  S.liftHistory[key] = S.liftHistory[key].filter(h => h.date !== dstr());
  S.liftHistory[key].unshift({
    date: dstr(),
    kg: kgN,
    reps: repsN,
    week: week || '',
    day: day,
  });
  // tieni ultimi 40
  if (S.liftHistory[key].length > 40) S.liftHistory[key].length = 40;
}
function lastLiftHistory(name, n) {
  const list = (S.liftHistory && S.liftHistory[liftKey(name)]) || [];
  return list.slice(0, n || 5);
}
function historyHtml(name) {
  const rows = lastLiftHistory(name, 5);
  if (!rows.length) return '<p class="hist mut">Nessuno storico ancora</p>';
  return '<div class="hist">' + rows.map(h =>
    `<span class="hist-row"><b>${h.kg} kg</b> × ${h.reps} <i>${h.date.slice(5)}</i></span>`
  ).join('') + '</div>';
}
function saveSessionLogs(week, day, exercises) {
  if (!exercises) return;
  exercises.forEach((e, i) => {
    if (!isAccessory(e)) return;
    const log = getAccLog(week, day, i);
    pushLiftHistory(e.name, log.kg, log.reps, week, day);
  });
  save();
}

/* ---- Timer recupero ---- */
let _restTimer = null; // { endsAt, name, left }
function startRest(name) {
  const sec = getRestSec(name);
  if (_restTimer && _restTimer._iv) clearInterval(_restTimer._iv);
  _restTimer = { endsAt: Date.now() + sec * 1000, name, left: sec };
  const tick = () => {
    if (!_restTimer) return;
    _restTimer.left = Math.max(0, Math.ceil((_restTimer.endsAt - Date.now()) / 1000));
    const el = document.getElementById('rest-timer-display');
    if (el) {
      const m = Math.floor(_restTimer.left / 60);
      const s = _restTimer.left % 60;
      el.textContent = m + ':' + String(s).padStart(2, '0');
      if (_restTimer.left <= 0) {
        el.classList.add('done');
        try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {}
        clearInterval(_restTimer._iv);
      }
    } else if (_restTimer.left <= 0) {
      clearInterval(_restTimer._iv);
    }
  };
  _restTimer._iv = setInterval(tick, 250);
  tick();
  render();
}
function stopRest() {
  if (_restTimer && _restTimer._iv) clearInterval(_restTimer._iv);
  _restTimer = null;
  render();
}
function restBarHtml() {
  if (!_restTimer) return '';
  const m = Math.floor(_restTimer.left / 60);
  const s = _restTimer.left % 60;
  const done = _restTimer.left <= 0;
  return `<div class="rest-bar ${done ? 'done' : ''}">
    <div class="rest-bar-inner">
      <span class="rest-label">Recupero · ${esc(_restTimer.name)}</span>
      <span id="rest-timer-display" class="rest-time ${done ? 'done' : ''}">${m}:${String(s).padStart(2, '0')}</span>
      <button type="button" class="rest-stop" onclick="stopRest()">${done ? 'Chiudi' : 'Stop'}</button>
    </div>
  </div>`;
}
function fmtRest(sec) {
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
  S.dayModal = null;
  save();
  render();
}
function modalTrain(day) {
  setToday('train', day);
  S.dayModal = null;
  save();
  render();
}
function dayModalHtml() {
  if (!S.dayModal || !S.prog) return '';
  const w = W();
  if (!w) return '';
  const rem = remaining(w);
  let body = '';
  if (S.dayModal.step === 'pick') {
    body = `<p class="big">Quale allenamento?</p>
      <p class="mut">${esc(w.label)}</p>
      ${rem.map(d => `<button style="border-left:8px solid ${AC[(d - 1) % 4]}" onclick="modalTrain(${d})">Giorno ${d} — ${focus(w, d)}</button>`).join('') || '<p class="mut">Settimana completata 🎉</p>'}
      <button style="border-left:8px solid #30a46c" onclick="modalTrain('comp')">🔧 Complementari</button>
      <button onclick="S.dayModal={step:'ask'};save();render()">← Indietro</button>`;
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
const remaining = w => days(w).filter(d => !(S.done[w.label] || []).includes(d));
function focus(w, d) { const u = []; w.days[d].forEach(e => { if (e.lift && !e.warm && !u.includes(LN[e.lift])) u.push(LN[e.lift]) }); return u.join(' · ') || 'Accessori' }
function V(v) { S.view = v; save(); render() }
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
  return { weeks };
}
async function imp(inp) {
  try { S.prog = await parseDocx(inp.files[0]); S.wi = 0; S.done = {}; S.chk = {}; S.weekLog = {}; S.today = null; save(); render() }
  catch (e) { $('err').textContent = 'Errore: ' + e.message }
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
  if (type === 'train' && day === 'comp' && S.prog) {
    const w = W();
    if (w) logCal('train', w.label, weekdayMon0(), 'comp');
    S.today = { date: dstr(), type: 'rest', finished: 1, week: w.label, day: 'comp' };
    save(); render();
    return;
  }
  S.today = { date: dstr(), type, day };
  if (type === 'rest' && S.prog) {
    const w = W();
    if (w) logCal('rest', w.label);
  }
  save(); render();
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
function tg(i) { const w = W(), k = w.label + '|' + S.today.day; const a = S.chk[k] = S.chk[k] || []; const x = a.indexOf(i); x < 0 ? a.push(i) : a.splice(x, 1); save(); render() }
function finish() {
  const w = W(), d = S.today.day; (S.done[w.label] = S.done[w.label] || []).push(d);
  const weekLabel = w.label;
  if (w.days[d]) saveSessionLogs(weekLabel, d, w.days[d]);
  logCal('train', weekLabel, weekdayMon0(), d);
  if (!remaining(w).length && S.wi < S.prog.weeks.length - 1) S.wi++;
  S.today = { date: dstr(), type: 'rest', finished: 1, week: weekLabel, day: d }; save(); render()
}
function calLink(w, d) {
  const [h, m] = S.time.split(':').map(Number), s = new Date(); s.setHours(h, m, 0, 0); const e = new Date(s.getTime() + 5400000);
  const f = x => x.getFullYear() + pad(x.getMonth() + 1) + pad(x.getDate()) + 'T' + pad(x.getHours()) + pad(x.getMinutes()) + '00';
  const det = w.days[d].filter(x => !x.warm).map(x => x.name + ': ' + x.text.replace(/(\d+(?:[.,]\d+)?)\s*%/g, (mm, p) => x.lift ? p + '% (' + Math.round(parseFloat(p.replace(',', '.')) / 100 * S.max[x.lift] / 2.5) * 2.5 + 'kg)' : mm)).join('\n');
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent('🏋️ ' + focus(w, d) + ' – ' + w.label + ' G' + d) + '&dates=' + f(s) + '/' + f(e) + '&details=' + encodeURIComponent(det);
}
function oggi() {
  if (!S.prog) return importCard();
  const w = W(), t = S.today;
  if (!t || t.date !== dstr() || t.type === 'ask') {
    const tot = days(w).length;
    const rem = remaining(w);
    const done = tot - rem.length;
    const pct = tot > 0 ? (done / tot) * 100 : 0;
    const wd = weekdayMon0();
    const todayLog = (S.weekLog[w.label] || {})[wd];
    const todayKind = logType(todayLog);

    if (todayKind) {
      const isTrain = todayKind === 'train';
      return `<div class="card">
      <p class="mut">${w.label} · completati ${done} su ${tot}</p>
      <div class="bar" style="background:var(--pill); margin-top:8px; margin-bottom:20px;">
        <i style="width:${pct}%; background:var(--ac, #3e8bff)"></i>
      </div>
      <p class="date-line">${todayLabel()}</p>
      <p class="big">${isTrain ? 'Allenamento fatto ✓' : 'Giorno di riposo 😴'}</p>
      <p class="mut">${isTrain ? (logDayNum(todayLog) === 'comp' ? 'Oggi: complementari (extra)' : ('Oggi: allenamento' + (logDayNum(todayLog) != null ? ' · Giorno ' + logDayNum(todayLog) : ''))) : 'Oggi è registrato come riposo.'}</p>
      <button onclick="cambiaOggi()">Cambia risposta</button>
    </div>${coachImg()}`
    }

    return `<div class="card">
      <p class="mut">${w.label} · completati ${done} su ${tot}</p>
      <div class="bar" style="background:var(--pill); margin-top:8px; margin-bottom:20px;">
        <i style="width:${pct}%; background:var(--ac, #3e8bff)"></i>
      </div>
      <p class="date-line">${todayLabel()}</p>
      <p class="big">Che giorno è oggi?</p>
      <div class="row">
        <button onclick="setToday('rest')">😴 Riposo</button>
        <button onclick="S.today={date:dstr(),type:'pick'};save();render()">💪 Allenamento</button>
      </div>
    </div>${coachImg()}`}
  if (t.type === 'pick') {
    const rem = remaining(w);
    return `<div class="card"><p class="big">Quale allenamento?</p><p class="mut">${w.label} · quelli che ti restano</p>${rem.map(d => `<button style="border-left:8px solid ${AC[(d - 1) % 4]}" onclick="setToday('train',${d})">Giorno ${d} — ${focus(w, d)}</button>`).join('') || '<p>Settimana completata 🎉</p>'}<button style="border-left:8px solid #30a46c" onclick="setToday('train','comp')">🔧 Complementari <span class="mut" style="font-weight:600">(extra, fuori scheda)</span></button><button onclick="askDay()">← Indietro</button><button onclick="S.today=null;save();render()">🏠 Torna alla home</button></div>${coachImg()}`
  }
  if (t.type === 'rest') return `<div class="card"><p class="big">${t.finished ? 'Allenamento fatto ✓' : 'Giorno di riposo 😴'}</p><p class="mut">Prossimo: ${w.label}${remaining(w).length ? ' · giorno ' + remaining(w)[0] : ''}</p>
  <div class="row">
    <button onclick="askDay()">Cambia risposta</button>
    <button class="pri" onclick="S.today=null;save();render()">🏠 Torna alla home</button>
  </div></div>${coachImg()}`;
  const d = t.day, ex = w.days[d], k = w.label + '|' + d, ck = S.chk[k] || [], left = ex.length - ck.length, ac = AC[(d - 1) % 4];
  return `${restBarHtml()}<div style="--ac:${ac}"><div class="hero"><div class="mut">${w.label} · GIORNO ${d}</div><p class="big">${focus(w, d)}</p><div class="mut">${ck.length}/${ex.length} esercizi fatti</div><div class="bar"><i style="width:${ck.length / ex.length * 100}%"></i></div></div>
  ${ex.map((e, i) => {
    const acc = isAccessory(e);
    const log = acc ? getAccLog(w.label, d, i) : null;
    const rest = !e.warm ? getRestSec(e.name) : 0;
    const hist = acc ? historyHtml(e.name) : '';
    const timerBtn = !e.warm
      ? `<div class="rest-row" onclick="event.stopPropagation()">
          <button type="button" class="rest-start" onclick="startRest(${JSON.stringify(e.name)})">⏱ Avvia ${fmtRest(rest)}</button>
          <button type="button" class="rest-set" onclick="openRestPicker(${JSON.stringify(e.name)})">Imposta tempo</button>
        </div>`
      : '';
    const logRow = acc
      ? `<div class="ex-log" onclick="event.stopPropagation()">
          <input type="number" inputmode="decimal" step="0.5" placeholder="kg" value="${log.kg}"
            onchange="setAccLog(${JSON.stringify(w.label)},${d},${i},'kg',this.value)">
          <input type="number" inputmode="numeric" step="1" placeholder="rip" value="${log.reps}"
            onchange="setAccLog(${JSON.stringify(w.label)},${d},${i},'reps',this.value)">
        </div>${hist}`
      : '';
    return `<div class="ex ${e.warm ? 'w' : ''} ${e.lift ? 'main' : ''} ${acc ? 'acc' : ''} ${ck.includes(i) ? 'ok' : ''}" onclick="tg(${i})">
      <div class="n">${ck.includes(i) ? '✓' : i + 1}</div>
      <div class="ex-body">
        <div class="nm">${esc(e.name)}</div>
        <div class="dt">${fmt(e.text, e.lift)}</div>
        ${logRow}
        ${timerBtn}
      </div>
    </div>`;
  }).join('')}
  <div class="card card-time"><label>Orario allenamento</label><input type="time" value="${S.time}" onchange="if(this.value){S.time=this.value;save();render()}else{this.value=S.time}"><a class="btn" target="_blank" rel="noopener" href="${calLink(w, d)}">📅 Aggiungi al calendario</a></div>
  <button class="pri" style="background:${ac};color:#fff" ${left ? 'disabled' : ''} onclick="finish()">${left ? 'Mancano ' + left + ' esercizi' : 'Allenamento finito ✓'}</button>
  ${left ? `<button onclick="finish()">Segna finito comunque</button>` : ''}
  <button onclick="askDay()">Cambia giorno</button>
  <button onclick="S.today=null;save();render()">🏠 Torna alla home</button>
  ${coachImg()}</div>`;
}

// Funzione helper per l'aggiornamento dei massimali con controllo
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
      if (S.done[label]) delete S.done[label];
      if (S.weekLog && S.weekLog[label]) delete S.weekLog[label];
      Object.keys(S.chk).forEach(k => { if (k.startsWith(label + '|')) delete S.chk[k] });
      save();
      render();
    }
  }
}
function render() {
  const w = S.prog && W(), ac = S.view === 'oggi' && S.today && S.today.type === 'train' ? AC[(S.today.day - 1) % 4] : '#3e8bff';
  document.documentElement.style.setProperty('--ac', ac);
  $('t0').className = S.view === 'oggi' ? 'on' : ''; $('t1').className = S.view === 'piano' ? 'on' : '';
  $('app').innerHTML = (S.view === 'oggi' ? oggi() : piano()) + dayModalHtml() + restPickerHtml();
  document.body.classList.toggle('modal-open', !!(S.dayModal || S.restPicker));
  if (S.dayEdit) {
    requestAnimationFrame(() => {
      const el = document.getElementById('edit-day-panel');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
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

render();
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
