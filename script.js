const KEY = 'powerapp_v1', AC = ['#e5484d', '#3e8bff', '#e08a00', '#30a46c'], LN = { s: 'Squat', b: 'Panca', d: 'Stacco' };
let S = {};
try { S = JSON.parse(localStorage.getItem(KEY)) || {} } catch (e) { }
S.max = S.max || { s: 210, b: 110, d: 265 }; S.done = S.done || {}; S.chk = S.chk || {}; S.wi = S.wi || 0; S.view = S.view || 'oggi'; S.time = S.time || '17:00'; S.pushOn = S.pushOn || false;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)) } catch (e) { } };
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = n => String(n).padStart(2, '0');
const dstr = (d = new Date()) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
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
  try { S.prog = await parseDocx(inp.files[0]); S.wi = 0; S.done = {}; S.chk = {}; S.today = null; save(); render() }
  catch (e) { $('err').textContent = 'Errore: ' + e.message }
}
const coachImg = () => `<div class="coach-wrap"><img src="coach.jpg" alt="Leggi bene – Disciplina oggi, risultati domani" class="coach-img" loading="lazy"></div>`;
const importCard = () => `<div class="card"><p class="big">Carica la scheda</p><p class="mut">Scegli il file .docx del coach. Viene letto sul tuo telefono.</p><label class="btn pri" style="margin-top:16px;cursor:pointer">Carica file .docx<input type="file" accept=".docx" style="display:none" onchange="imp(this)"></label><p id="err" class="mut"></p></div>${coachImg()}`;
function setToday(type, day) { S.today = { date: dstr(), type, day }; save(); render() }
function askDay() {
  if (S.today && S.today.finished && S.today.week && S.today.day) {
    const wLabel = S.today.week, d = S.today.day;
    if (S.done[wLabel]) {
      S.done[wLabel] = S.done[wLabel].filter(x => x !== d);
      if (!S.done[wLabel].length) delete S.done[wLabel];
    }
    delete S.chk[wLabel + '|' + d];
    if (S.prog) {
      const i = S.prog.weeks.findIndex(w => w.label === wLabel);
      if (i >= 0) S.wi = i;
    }
  }
  S.today = { date: dstr(), type: 'ask' }; save(); render()
}
function tg(i) { const w = W(), k = w.label + '|' + S.today.day; const a = S.chk[k] = S.chk[k] || []; const x = a.indexOf(i); x < 0 ? a.push(i) : a.splice(x, 1); save(); render() }
function finish() {
  const w = W(), d = S.today.day; (S.done[w.label] = S.done[w.label] || []).push(d);
  const weekLabel = w.label;
  if (!remaining(w).length && S.wi < S.prog.weeks.length - 1) S.wi++;
  S.today = { date: dstr(), type: 'rest', finished: 1, week: weekLabel, day: d }; save(); render()
}
function calLink(w, d) {
  const [h, m] = S.time.split(':').map(Number), s = new Date(); s.setHours(h, m, 0, 0); const e = new Date(s.getTime() + 5400000);
  const f = x => x.getFullYear() + pad(x.getMonth() + 1) + pad(x.getDate()) + 'T' + pad(x.getHours()) + pad(x.getMinutes()) + '00';
  const det = w.days[d].filter(x => !x.warm).map(x => x.name + ': ' + x.text.replace(/(\d+(?:[.,]\d+)?)\s*%/g, (mm, p) => x.lift ? p + '% (' + Math.round(parseFloat(p.replace(',', '.')) / 100 * S.max[x.lift] / 2.5) * 2.5 + 'kg)' : mm)).join('\n');
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(' ' + focus(w, d) + ' – ' + w.label + ' G' + d) + '&dates=' + f(s) + '/' + f(e) + '&details=' + encodeURIComponent(det);
}
function oggi() {
  if (!S.prog) return importCard();
  const w = W(), t = S.today;
  if (!t || t.date !== dstr() || t.type === 'ask') {
    const tot = days(w).length;
    const rem = remaining(w);
    const done = tot - rem.length;
    const pct = tot > 0 ? (done / tot) * 100 : 0;

    return `<div class="card">
      <p class="mut">${w.label} · completati ${done} su ${tot}</p>
      <div class="bar" style="background:var(--pill); margin-top:8px; margin-bottom:20px;">
        <i style="width:${pct}%; background:var(--ac, #3e8bff)"></i>
      </div>
      <p class="big">Che giorno è oggi?</p>
      <div class="row">
        <button onclick="setToday('rest')"> Riposo</button>
        <button onclick="S.today={date:dstr(),type:'pick'};save();render()"> Allenamento</button>
      </div>
    </div>${coachImg()}`}
  if (t.type === 'pick') {
    const rem = remaining(w);
    return `<div class="card"><p class="big">Quale allenamento?</p><p class="mut">${w.label} · quelli che ti restano</p>${rem.map(d => `<button style="border-left:8px solid ${AC[(d - 1) % 4]}" onclick="setToday('train',${d})">Giorno ${d} — ${focus(w, d)}</button>`).join('') || '<p>Settimana completata </p>'}<button onclick="askDay()">← Indietro</button><button onclick="S.today=null;save();render()"> Torna alla home</button></div>${coachImg()}`
  }
  if (t.type === 'rest') return `<div class="card"><p class="big">${t.finished ? 'Allenamento fatto ✓' : 'Giorno di riposo '}</p><p class="mut">Prossimo: ${w.label}${remaining(w).length ? ' · giorno ' + remaining(w)[0] : ''}</p>
  <div class="row">
    <button onclick="askDay()">Cambia risposta</button>
    <button class="pri" onclick="S.today=null;save();render()">Torna alla home</button>
  </div></div>${coachImg()}`;
  const d = t.day, ex = w.days[d], k = w.label + '|' + d, ck = S.chk[k] || [], left = ex.length - ck.length, ac = AC[(d - 1) % 4];
  return `<div style="--ac:${ac}"><div class="hero"><div class="mut">${w.label} · GIORNO ${d}</div><p class="big">${focus(w, d)}</p><div class="mut">${ck.length}/${ex.length} esercizi fatti</div><div class="bar"><i style="width:${ck.length / ex.length * 100}%"></i></div></div>
  ${ex.map((e, i) => `<div class="ex ${e.warm ? 'w' : ''} ${e.lift ? 'main' : ''} ${ck.includes(i) ? 'ok' : ''}" onclick="tg(${i})"><div class="n">${ck.includes(i) ? '✓' : i + 1}</div><div><div class="nm">${esc(e.name)}</div><div class="dt">${fmt(e.text, e.lift)}</div></div></div>`).join('')}
  <div class="card"><label>Orario allenamento</label><input type="time" value="${S.time}" onchange="if(this.value){S.time=this.value;save();render()}else{this.value=S.time}"><a class="btn" target="_blank" rel="noopener" href="${calLink(w, d)}"> Aggiungi al calendario</a></div>
  <button class="pri" style="background:${ac};color:#fff" ${left ? 'disabled' : ''} onclick="finish()">${left ? 'Mancano ' + left + ' esercizi' : 'Allenamento finito ✓'}</button>
  ${left ? `<button onclick="finish()">Segna finito comunque</button>` : ''}
  <button onclick="askDay()">Cambia giorno</button>
  <button onclick="S.today=null;save();render()"> Torna alla home</button>
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
    ? `<button onclick="disablePush()"> Disattiva notifiche</button><button onclick="testPush()"> Invia notifica di prova</button>`
    : `<button class="pri" onclick="enablePush()"> Attiva notifiche</button>`;
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
  <h1>Settimane</h1>${S.prog.weeks.map((w, i) => `<div class="wk ${i === S.wi ? 'cur' : ''}" onclick="S.wi=${i};save();render()"><b>${esc(w.label)}</b>${days(w).map(d => `<span class="dot ${(S.done[w.label] || []).includes(d) ? 'd' : ''}">${(S.done[w.label] || []).includes(d) ? '✓' : d}</span>`).join('')}<button class="res-btn" onclick="resetWk('${w.label}', event)">❌</button></div>`).join('')}
  <p class="mut">Tocca una settimana per impostarla come corrente. Avanza da sola quando chiudi tutti gli allenamenti.</p>
  <h1>Nuova scheda</h1><div class="card"><label class="btn" style="margin:0;cursor:pointer">🔄 Cambia file della scheda<input type="file" accept=".docx" style="display:none" onchange="imp(this)"></label><p id="err" class="mut"></p></div>`;
}
function resetWk(label, e) {
  e.stopPropagation();
  if (confirm('Attenzione: Vuoi davvero resettare gli allenamenti per la settimana ' + label + '?')) {
    if (confirm('Sei ASSOLUTAMENTE sicuro? Questa operazione non può essere annullata e perderai i progressi della settimana.')) {
      if (S.done[label]) delete S.done[label];
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
  $('app').innerHTML = S.view === 'oggi' ? oggi() : piano();
}
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
    alert(' Notifiche attivate! Riceverai un promemoria ogni mattina.');
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
    await reg.showNotification(' Scheda Powerlifting', {
      body: 'Notifica di prova! Tutto funziona ',
      icon: '/coach.jpg',
      badge: '/coach.jpg',
      tag: 'test'
    });
  } catch (e) {
    alert('Errore test: ' + e.message);
  }
}
