'use strict';
// HUD, cards, pause/crash/win screens and the debug panel. Loaded last; boots the engine.

const $ = id => document.getElementById(id);
const overlay = $('overlay'), banner = $('banner'), tip = $('tip'), sheet = $('sheet');

// ---------- small helpers ----------
const fmtTime = s => { const m = Math.floor(s / 60); return `${m}:${(s - m * 60).toFixed(1).padStart(4, '0')}`; };
const goalOf = st => st === 3 && run.challenge === 'feast' ? T('feast', 'goal') : runCfg.stageFood;
function setOverlay(html, cls) { overlay.className = cls || 'modal'; overlay.innerHTML = html; overlay.scrollTop = 0; }
function hideOverlay() { overlay.className = 'hidden'; overlay.innerHTML = ''; }
const showTip = () => tip.classList.remove('hidden');
const hideTip = () => tip.classList.add('hidden');
function showBanner(t) { banner.textContent = t; banner.classList.remove('hidden'); hideOverlay(); }
const hideBanner = () => banner.classList.add('hidden');
const chip = (c, extra) => `<div class="box"><b>${c.icon} ${c.name}</b> — ${c.desc}${extra ? '<br>' + extra : ''}</div>`;
const haveRow = () => run.powerups.length ? `<div class="have">you have: ${run.powerups.map(i => POWERUPS[i].icon + ' ' + POWERUPS[i].name).join(' · ')}</div>` : '';

// ---------- HUD pieces (shared by the in-game HUD and the pause screen) ----------
function stageBarHtml() {
  const st = run.stage, cont = st === 'continue';
  const segs = [1, 2, 3].map(n => {
    const done = cont || n < st, cur = cont ? n === 3 : n === st;
    const w = done ? 100 : cur ? Math.min(100, run.stageFood / stageGoal() * 100) : 0;
    const label = cur ? (cont ? `food ${run.totalFood}` : `${run.stageFood} / ${stageGoal()}`) : '';
    return `<div class="seg1 ${done ? 'done' : ''} ${cur ? 'cur' : ''}"><i style="width:${w}%"></i><em>${label}</em></div>`;
  }).join('');
  return `<div class="stagerow"><div class="stagebadge">${cont ? 'CONTINUE' : `STAGE ${st}/3`}</div><div class="segs">${segs}</div></div>`;
}
function chalCardHtml() {
  const active = run.stage === 3 || run.stage === 'continue';
  if (!run.revealed) return '<div class="chalcard"><div class="ic">❓</div><div><b>Challenge ???</b><span class="d">Revealed after stage 1</span></div></div>';
  const ch = CHALLENGES[run.challenge];
  return `<div class="chalcard ${active ? 'on' : 'soon'}" data-detail="${ch.id}"><div class="ic">${ch.icon}</div><div><b>${ch.name}</b><span class="d">${ch.desc.split('.')[0]}</span></div><div class="tag">${active ? 'ACTIVE' : 'STAGE 3'}</div></div>`;
}
function dockHtml() {
  return '<div class="docks">' + [0, 1, 2].map(i => {
    const id = run.powerups[i];
    return id ? `<div class="pu" data-detail="${id}"><span class="ic">${POWERUPS[id].icon}</span><span>${POWERUPS[id].name}</span></div>` : '<div class="pu empty">—</div>';
  }).join('') + '</div>';
}
function updateHud() {
  const inRun = !!run;
  for (const id of ['stagebar', 'chal', 'dock']) $(id).classList.toggle('hidden', !inRun);
  hudInsets = null;
  if (!run) { $('score').textContent = '0'; $('stats').textContent = mode === 'tut' ? 'tutorial' : ''; return; }
  $('score').textContent = run.score;
  $('stats').textContent = `${run.steers} steers · ${run.expired} expired`;
  $('stagebar').innerHTML = stageBarHtml();
  $('chal').innerHTML = chalCardHtml();
  $('dock').innerHTML = dockHtml();
}

// ---------- screens ----------
function showStart() {
  phase = 'menu'; mode = 'play'; tut = null; gesture = null; run = null;
  reset(); acc = 0; hideTip(); hideBanner();
  setOverlay(`<div class="hero"><h1>BULLET SNAKE</h1>
    <p>Hold to slow time. Drag to aim. Let go before the ring closes.</p>
    <p>3 stages · 3 power-ups · 1 challenge you see coming.</p></div>
    <div class="btns">${tutDone
      ? '<button class="primary" id="goPlay">Play</button>'
      : '<button class="primary" id="goTut">Start tutorial</button><button class="secondary" id="goPlay">Skip to game</button>'}</div>`, 'start');
  if ($('goTut')) $('goTut').onclick = startTutorial;
  $('goPlay').onclick = startRun;
}
function showTutDone() {
  setOverlay(`<h1>YOU GOT IT</h1><p>Walls wrap around — only your own tail is deadly.</p>
    <div class="btns"><button class="primary" id="go">Play</button></div>`);
  $('go').onclick = startRun;
}
function renderPick(n, offer) {
  hideBanner();
  setOverlay(`<h2>${n === 0 ? 'BLIND PICK' : 'POWER-UP'} · ${n + 1} / 3</h2><h1>Pick 1 of ${offer.length}</h1>
    <p>${n === 0 ? "You don't know the challenge yet." : run.revealed ? `Challenge: <b>${CHALLENGES[run.challenge].name}</b> in stage 3.` : ''}</p>
    <div class="cards">${offer.map(id => { const p = POWERUPS[id];
      return `<button class="card" data-id="${id}"><div class="ic">${p.icon}</div><div><b>${p.name}</b><span>${p.desc}</span></div></button>`; }).join('')}</div>
    ${haveRow()}`);
  overlay.querySelectorAll('.card').forEach(b => b.onclick = () => pickPower(n, b.dataset.id));
}
function showReveal() {
  const ch = CHALLENGES[run.challenge];
  updateHud();
  setOverlay(`<h2>CHALLENGE REVEALED</h2>
    <div class="cards"><button class="card challenge" id="rev"><div class="ic">${ch.icon}</div><div><b>${ch.name}</b><span>${ch.desc}</span></div>
    <span style="color:#ff9aa8">Active in stage 3</span></button></div>
    <p class="big">Tap to continue</p>`);
  $('rev').onclick = () => showPick(1);
}
function powerLine() { return run.powerups.length ? run.powerups.map(i => POWERUPS[i].icon + ' ' + POWERUPS[i].name).join(', ') : 'none'; }
function modsBlock() {
  const m = modifiedSettings();
  return m.length ? `<div class="box mods"><b>Modified settings</b><br>${m.join('<br>')}</div>` : '';
}
function endStats() {
  const ch = CHALLENGES[run.challenge], st = run.stage === 'continue' ? 'continue' : `${run.stage} / 3`;
  return `<div class="box">Stage <b>${st}</b> · score <b>${run.score}</b> (${run.steers} steers, ${run.expired} expired)<br>
    Time <b>${fmtTime(run.time)}</b> · food <b>${run.totalFood}</b><br>
    Challenge <b>${run.revealed || run.roundClear ? ch.icon + ' ' + ch.name : 'not revealed'}</b><br>
    Power-ups <b>${powerLine()}</b><br>Seed <span class="seed">${run.seed}</span></div>${modsBlock()}`;
}
function showCrash() {
  setOverlay(`<h1>CRASHED</h1>${endStats()}<p class="big">Tap to retry</p>`);
  overlay.onclick = () => { if (phase === 'dead' && timeReal - deadAt > 0.5) { overlay.onclick = null; startRun(); } };
}
function showWin() {
  const ch = CHALLENGES[run.challenge];
  setOverlay(`<h1 style="color:var(--accent)">ROUND CLEAR</h1>
    <div class="box">Score <b>${run.score}</b> · time <b>${fmtTime(run.time)}</b><br>Challenge <b>${ch.icon} ${ch.name}</b><br>
    Power-ups <b>${powerLine()}</b><br>Seed <span class="seed">${run.seed}</span></div>${modsBlock()}
    <div class="btns"><button class="primary" id="cont">Continue</button><button class="secondary" id="again">New run</button></div>`);
  $('cont').onclick = continueRun;
  $('again').onclick = () => { hideOverlay(); startRun(); };
}
function showContinueEnd() {
  const ch = CHALLENGES[run.challenge], rc = run.roundClear;
  setOverlay(`<h1 style="color:var(--accent)">ROUND CLEAR</h1><h2>CONTINUE MODE OVER</h2>
    <div class="box">At round clear: score <b>${rc.score}</b> · time <b>${fmtTime(rc.time)}</b><br>
    Final: score <b>${run.score}</b> · food <b>${run.totalFood}</b> · time <b>${fmtTime(run.time)}</b><br>
    Challenge <b>${ch.icon} ${ch.name}</b><br>Power-ups <b>${powerLine()}</b><br>Seed <span class="seed">${run.seed}</span></div>${modsBlock()}
    <div class="btns"><button class="primary" id="again">New run</button></div>`);
  $('again').onclick = () => { hideOverlay(); startRun(); };
}
function showPause() {
  const st = run.stage;
  const left = [];
  if (st !== 'continue') for (let s = st; s <= 3; s++) left.push(s === st ? `stage ${s}: ${goalOf(s) - run.stageFood} food left` : `stage ${s}: ${goalOf(s)}`);
  setOverlay(`<div class="pz"><h1 style="text-align:center;margin:0 0 4px">PAUSED</h1>
    <div><div class="lbl">PROGRESS</div>${stageBarHtml()}${left.length ? `<div class="left">${left.join(' · ')}</div>` : ''}</div>
    <div class="stats">
      <div class="stat"><b>${run.score}</b><span>score · ${run.steers} steers · ${run.expired} expired</span></div>
      <div class="stat" style="flex:.7"><b>${fmtTime(run.time)}</b><span>time</span></div>
    </div>
    <div><div class="lbl">CHALLENGE</div>${chalCardHtml()}</div>
    <div><div class="lbl">POWER-UPS</div>${dockHtml()}</div>
    <div class="seedrow"><span>SEED</span><span class="seed">${run.seed}</span></div>
    <div class="btns"><button class="primary" id="res">Resume</button><button class="secondary" id="quit">Quit run</button></div></div>`, 'modal solid');
  $('res').onclick = resumeGame;
  $('quit').onclick = quitRun;
}

// ---------- detail card (tap a power-up or the challenge) ----------
function openDetail(id) {
  const c = ALL_CONTENT[id], isCh = !!CHALLENGES[id];
  const kv = Object.entries(c.tun).map(([k, t]) => `<div class="kv"><span>${t.label}</span><b>${t.fmt(T(id, k))}</b></div>`).join('');
  const chip = i => `<span class="${run.powerups.includes(i) ? 'own' : ''}">${POWERUPS[i].icon} ${POWERUPS[i].name}${run.powerups.includes(i) ? ' ✓' : ''}</span>`;
  let body, status = '';
  if (isCh) {
    const active = run.stage === 3 || run.stage === 'continue';
    status = `<div class="st ${active ? 'on' : ''}">${active ? 'ACTIVE NOW' : 'ACTIVE IN STAGE 3'}</div>`;
    body = `<div class="lbl">ANSWERED BY</div><div class="chips">${COUNTERS[id].map(chip).join('')}</div>`;
  } else {
    status = '<div class="st">ACTIVE</div>';
    body = '';   // what a power-up answers is left for the player to work out
  }
  const d = $('detail');
  d.innerHTML = `<div class="dcard ${isCh ? 'chal' : ''}"><div class="big">${c.icon}</div><h3>${c.name}</h3>${status}<p class="eff">${c.desc}</p>${kv}${body}
    <button class="secondary" id="closeDetail">Close</button></div>`;
  d.classList.remove('hidden');
  $('closeDetail').onclick = closeDetail;
  d.onclick = e => { if (e.target === d) closeDetail(); };
}
function closeDetail() { $('detail').classList.add('hidden'); }
// tapping the in-game card/dock pauses and opens the detail; on the pause screen it just opens it
document.addEventListener('click', e => {
  const el = e.target.closest('[data-detail]');
  if (!el || !run) return;
  if (overlay.contains(el)) { if (phase !== 'paused') return; }
  else { if (phase !== 'play') return; pauseGame(); }
  openDetail(el.dataset.detail);
});

// ---------- top-bar buttons ----------
$('pausebtn').addEventListener('click', pauseGame);
$('help').addEventListener('click', () => { sheet.classList.remove('open'); run = null; startTutorial(); });
$('skip').addEventListener('click', () => { gesture = null; startRun(); });
$('gear').addEventListener('click', () => { gesture = null; sheet.classList.add('open'); });
document.addEventListener('contextmenu', e => e.preventDefault());

// ---------- debug panel (generated from the settings tables in content.js) ----------
const ENGINE_UI = [
  ['cols', 'Board width (next run)', 7, 21, 1, v => v + ' cells'], ['rows', 'Board height (next run)', 7, 30, 1, v => v + ' cells'],
  ['speed', 'Base speed', 3, 16, 0.5, v => v + ' cells/s'], ['ring', 'Ring length (real time)', 0.15, 1.5, 0.05, v => (+v).toFixed(2) + ' s'],
  ['slow', 'Slow-down (time scale)', 0.01, 0.5, 0.01, v => '×' + (+v).toFixed(2)], ['dead', 'Drag deadzone', 8, 80, 1, v => v + ' px'],
  ['ramp', 'Time ramp (in/out)', 0, 300, 10, v => v + ' ms'],
];
function sliderRow(parent, label, get, set, min, max, step, fmt) {
  const row = document.createElement('div'); row.className = 'row';
  row.innerHTML = `<label>${label} <b></b></label><input type="range" min="${min}" max="${max}" step="${step}">`;
  const out = row.querySelector('b'), inp = row.querySelector('input');
  inp.value = get(); out.textContent = fmt(get());
  inp.addEventListener('input', () => { set(+inp.value); out.textContent = fmt(inp.value); saveDbg(); });
  parent.appendChild(row);
}
function segRow(parent, label, opts, get, set, multi) {
  const row = document.createElement('div'); row.className = 'row';
  row.innerHTML = `<label>${label}</label><div class="seg"></div>`;
  const seg = row.querySelector('.seg');
  const paint = () => seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', multi ? get().includes(b.dataset.v) : get() === b.dataset.v));
  for (const [v, text] of opts) {
    const b = document.createElement('button'); b.dataset.v = v; b.textContent = text; seg.appendChild(b);
    b.onclick = () => { set(v); paint(); saveDbg(); };
  }
  paint(); parent.appendChild(row);
}
function buildSheet() {
  sheet.innerHTML = '<h2>Debug <button id="closeSheet">Done</button></h2><div id="sheetBody"></div>';
  const body = $('sheetBody');
  const grp = (t, sub) => { const g = document.createElement('div'); g.className = 'grp' + (sub ? ' sub' : ''); g.textContent = t; body.appendChild(g); };

  grp('Engine (base values)');
  for (const [k, label, min, max, step, fmt] of ENGINE_UI) sliderRow(body, label, () => cfg[k], v => { cfg[k] = v; }, min, max, step, fmt);
  segRow(body, 'When the ring runs out', [['cancel', 'Cancel steer'], ['commit', 'Commit steer']], () => cfg.expire, v => { cfg.expire = v; });

  grp('Run');
  const seedRow = document.createElement('div'); seedRow.className = 'row';
  seedRow.innerHTML = '<label>Seed for next run (blank = random)</label><input class="inp" id="seedIn" maxlength="5" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="e.g. K7QX4">';
  body.appendChild(seedRow);
  const seedIn = seedRow.querySelector('input'); seedIn.value = runCfg.seed;
  seedIn.addEventListener('input', () => { runCfg.seed = cleanSeed(seedIn.value); saveDbg(); });
  sliderRow(body, 'Stage food goal', () => runCfg.stageFood, v => { runCfg.stageFood = v; }, 3, 20, 1, v => v);
  sliderRow(body, 'Speed Ramp step (cells/s per food)', () => runCfg.rampStep, v => { runCfg.rampStep = v; }, 0, 0.5, 0.01, v => '+' + (+v).toFixed(2));
  sliderRow(body, 'Speed Ramp cap (total food)', () => runCfg.rampCap, v => { runCfg.rampCap = v; }, 15, 100, 1, v => v);
  segRow(body, 'Force challenge', [['', 'Random']].concat(CHALLENGE_IDS.map(i => [i, CHALLENGES[i].name])), () => runCfg.force, v => { runCfg.force = v; });
  const offRow = document.createElement('div'); offRow.className = 'row';
  offRow.innerHTML = `<label>Force offers (power-up ids in order, 2 per pick)</label><input class="inp" id="offIn" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${POWERUP_IDS.join(', ')}">`;
  body.appendChild(offRow);
  const offIn = offRow.querySelector('input'); offIn.value = runCfg.offers;
  offIn.addEventListener('input', () => { runCfg.offers = offIn.value; saveDbg(); });
  segRow(body, 'Grant power-ups at start', POWERUP_IDS.map(i => [i, POWERUPS[i].icon + ' ' + POWERUPS[i].name]),
    () => runCfg.grant, v => { const g = runCfg.grant, i = g.indexOf(v); if (i >= 0) g.splice(i, 1); else g.push(v); }, true);

  grp('Content tuning');
  for (const [id, c] of Object.entries(ALL_CONTENT)) {
    const keys = Object.keys(c.tun);
    if (!keys.length) continue;
    grp(`${c.icon} ${c.name}`, true);
    for (const k of keys) {
      const t = c.tun[k];
      sliderRow(body, t.label, () => T(id, k), v => { if (v === t.def) delete contentCfg[id + '.' + k]; else contentCfg[id + '.' + k] = v; }, t.min, t.max, t.step, t.fmt);
    }
  }
  const rs = document.createElement('button'); rs.className = 'reset'; rs.textContent = 'Reset all to defaults'; body.appendChild(rs);
  rs.onclick = () => { resetDbg(); buildSheet(); };
  $('closeSheet').onclick = () => sheet.classList.remove('open');
}
buildSheet();

// typing a seed must not be swallowed by the engine's key handling
if (typeof setInputPreventDefault === 'function') setInputPreventDefault(false);

engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost);
