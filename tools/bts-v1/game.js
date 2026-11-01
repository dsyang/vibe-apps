'use strict';
// Bullet-Time Snake v1: engine loop, snake, bullet-time gesture, run/stage logic and modifier hooks.
// Ported from tools/bullet-time-snake.html. Uses globals from rng.js / content.js, and ui.js for screens.

// ---------- engine settings ----------
setGLEnable(false);                 // plain canvas2d: lets us draw the ring with raw arcs in gameRenderPost
setEngineVariableStep(true);        // one update per display frame, so slow-mo input stays smooth
setCanvasPixelRatio(undefined);     // use devicePixelRatio for crisp lines
setCanvasClearColor(new Color().setHex('#0d0f14'));
setTouchGamepadEnable(false);
setShowSplashScreen(false);

const hex = h => new Color().setHex(h);
const C = {
  board: hex('#121620'), grid: hex('#1a1f2c'), edge: hex('#2a3142'), wall: hex('#ff5a6e'),
  body: hex('#2fd08a'), head: hex('#7dffc2'), dead: hex('#5a6476'), deadHead: hex('#8792a6'),
  food: hex('#ffcc4d'), decoy: hex('#c77dff'), eye: hex('#0d0f14'), ok: hex('#53f2a6'), bad: hex('#ff5a6e'),
  phase: new Color(0.55, 0.8, 1, 0.3),
};

// ---------- game state ----------
let COLS = cfg.cols, ROWS = cfg.rows;   // edges wrap (except under Lockdown)
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };   // grid space, y down
let snake, prev, dir, pendingDir, foods = [], decoy = null, alive = true, acc = 0;
let grow = false, dying = false, dyingAt = 0.12, snap = null;
let turnQueue = [], lastDir = 'up';   // turnQueue: extra turns from one drawn path, applied one per cell
const MAX_TURNS = 4;
// phase: menu | pick | ready | play | paused | dead | win
let phase = 'menu', readyUntil = 0;
let mode = 'play', tut = null;   // tut: {step, need, eaten, subT}
let run = null;                  // see GDD section 10; null in the menu and the tutorial
let tutDone = false; try { tutDone = localStorage.getItem('bsnake-tut-done') === '1'; } catch (e) {}
const TUT_STEPS = 8, TUT_EAT = 3;   // steps: 0 hold, 1-2 drag, 3 two turns, 4 U-turn, 5 pick a power-up, 6 meet a challenge, 7 eat food with both on
const START_LEN = 3;   // snake length at the start of a run (the menu and tutorial show it whole)
const CONTACT = 0.12; // fraction of a move at which a crashing head touches its body
let deadAt = -1, gesture = null, flash = 0, pulse = 0, shake = 0, lastReal = 0, pops = [];
const PAD = 12;
// space the DOM HUD takes at the top and bottom of the canvas (css px), measured from the elements
let hudInsets = null;
function insets() {
  if (hudInsets) return hudInsets;
  const bottomOf = id => { const e = document.getElementById(id); return e.classList.contains('hidden') ? 0 : e.getBoundingClientRect().bottom; };
  const top = Math.max(bottomOf('chal'), bottomOf('hud')) + 12;
  const dock = document.getElementById('dock'), bottom = dock.classList.contains('hidden') ? 0 : innerHeight - dock.getBoundingClientRect().top + 12;
  return hudInsets = { top, bottom };
}
addEventListener('resize', () => { hudInsets = null; });

// ---------- modifier hooks ----------
const has = id => !!run && run.powerups.includes(id);
const chActive = id => !!run && run.challenge === id && (run.stage === 3 || run.stage === 'continue');
const wallsOn = () => chActive('lockdown');
const rb = () => run ? run.rngBoard() : Math.random();   // board stream

const stageGoal = () => {
  if (!run) return 0;
  if (run.stage === 'continue' || run.classic) return Infinity;
  return run.stage === 3 && run.challenge === 'feast' ? T('feast', 'goal') : runCfg.stageFood;
};
function speedNow() {
  if (mode === 'tut') return cfg.speed * 0.7;
  let s = cfg.speed * (has('adrenaline') ? T('adrenaline', 'factor') : 1);
  if (run) s += runCfg.rampStep * Math.min(run.rampFood, Math.max(0, runCfg.rampCap - runCfg.stageFood));
  return s;
}
const slowNow = () => cfg.slow * (has('focus') || (tut && tut.pu === 'focus') ? T('focus', 'factor') : 1);
function ringTime() {
  if (mode === 'tut') {
    if (tut.step < 5) return Math.max(cfg.ring, [1.4, 1.1, 0.8, 1.2, 1.2][tut.step]);
    // the last step runs with the picked power-up and Short Fuse, like a real stage 3
    return cfg.ring * (tut.pu === 'longfuse' ? T('longfuse', 'ring') : 1) * (tut.chOn ? T('shortfuse', 'ring') : 1);
  }
  return cfg.ring * (has('longfuse') ? T('longfuse', 'ring') : 1) * (chActive('shortfuse') ? T('shortfuse', 'ring') : 1);
}
const savoring = () => !!run && has('savor') && timeReal < run.savorUntil;
// real-time moment a held ring starts counting down (it waits out Savor)
const ringStart = g => run && has('savor') ? Math.max(g.t0, run.savorUntil) : g.t0;
const ringFrac = g => Math.max(0, Math.min(1, 1 - (timeReal - ringStart(g)) / ringTime()));

// ---------- layout ----------
function layout() {
  const availW = mainCanvasSize.x - 44, availH = mainCanvasSize.y - insets().top - insets().bottom - PAD * 2;
  return { cell: Math.floor(Math.min(availW / COLS, availH / ROWS)) };
}
function applyCamera() {
  const { cell } = layout();
  setCameraScale(cell);
  const sx = shake ? (Math.random() - .5) * 10 * shake / cell : 0;
  const sy = shake ? (Math.random() - .5) * 10 * shake / cell : 0;
  setCameraPos(vec2(COLS / 2 + sx, ROWS / 2 + ((insets().top - insets().bottom) / 2) / cell + sy));
}
// grid cell (y down) -> world pos (y up), cell centre
const W = (x, y) => vec2(x + .5, ROWS - y - .5);

// ---------- board ----------
function reset() {
  if (mode === 'tut' || phase === 'menu') { COLS = 13; ROWS = 13; } else { COLS = cfg.cols; ROWS = cfg.rows; }
  alive = true; pops = [];
  recenter();
  placeFoods(); updateHud();
}
// head back at the start cell with n cells heading up, board cleared of food
function recenter(n = START_LEN) {
  const cx = Math.floor(COLS / 2), cy = Math.floor(ROWS * 0.6);
  snake = Array.from({ length: n }, (_, i) => [cx, cy + i]);
  prev = snake.map(s => s.slice());
  dir = 'up'; pendingDir = null; acc = 0.999; grow = false; dying = false; snap = null;
  turnQueue = []; lastDir = 'up'; foods = []; decoy = null;
}
// every stage (and every run, Classic included) starts with just the head at the centre; the body then grows one cell per
// move to its full length, so a long body can't be forgotten about. A new run's full length is START_LEN.
function restartStage(full = snake.length) {
  recenter(1);
  run.regrow = Math.max(0, full - 1);
}
const foodAt = p => foods.some(f => f[0] === p[0] && f[1] === p[1]) || (decoy && decoy[0] === p[0] && decoy[1] === p[1]);
const onSnake = p => snake.some(s => s[0] === p[0] && s[1] === p[1]);
const taken = p => onSnake(p) || foods.some(f => f[0] === p[0] && f[1] === p[1]) || (decoy && decoy[0] === p[0] && decoy[1] === p[1]);
// random free cell from the board stream
function freeCell(ok) {
  for (let i = 0; i < 300; i++) {
    const p = [Math.floor(rb() * COLS), Math.floor(rb() * ROWS)];
    if (!taken(p) && (!ok || ok(p))) return p;
  }
  for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) if (!taken([x, y]) && (!ok || ok([x, y]))) return [x, y];
  return null;
}
function foodTarget() {
  if (mode === 'tut') return tut.step < 7 ? 0 : 1;
  return has('second') ? T('second', 'count') : 1;
}
// Food and the decoy keep a smooth on-screen position (vx, vy) that glides toward their grid cell,
// so Lure and Skittish Prey move continuously instead of teleporting.
function vis(p) {
  p.ux = p.fx = p.vx = p[0]; p.uy = p.fy = p.vy = p[1]; p.t = 1; p.dur = 1; p.smooth = false;
  return p;
}
// q is the cell p moves to, one step of (sx, sy); the glide starts from wherever p is drawn right now
function glide(p, q, sx, sy, dur, smooth) {
  q.ux = p.ux + sx; q.uy = p.uy + sy; q.fx = q.vx = p.vx; q.fy = q.vy = p.vy;
  q.t = 0; q.dur = dur; q.smooth = smooth;
  return q;
}
function tweenCells(dt) {
  for (const c of decoy ? foods.concat([decoy]) : foods) {
    if (c.t >= 1) continue;
    c.t = Math.min(1, c.t + dt / c.dur);
    const k = c.smooth ? c.t * c.t * (3 - 2 * c.t) : c.t;
    c.vx = c.fx + (c.ux - c.fx) * k; c.vy = c.fy + (c.uy - c.fy) * k;
  }
}
function placeFoods() {
  while (foods.length < foodTarget()) { const p = freeCell(); if (!p) break; foods.push(vis(p)); }
}
function placeDecoy() {
  decoy = null;
  if (!chActive('decoy')) return;
  const a = Math.floor(T('decoy', 'area') / 2), h = snake[0];
  // the area around the head is off limits, measured across wrapped edges
  decoy = freeCell(p => !(Math.abs(wdelta(p[0] - h[0], COLS)) <= a && Math.abs(wdelta(p[1] - h[1], ROWS)) <= a));
  if (decoy) vis(decoy);
}
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
const isReverse = (a, b) => DIRS[a][0] === -DIRS[b][0] && DIRS[a][1] === -DIRS[b][1];
const wrap = (v, n) => ((v % n) + n) % n;
// shortest signed offset on a wrapping axis
const wdelta = (d, n) => d > n / 2 ? d - n : d < -n / 2 ? d + n : d;

function popText(cell, text, col) { pops.push({ x: cell[0], y: cell[1], text, col, t: 0 }); }

// ---------- moves ----------
// the previous move has just finished visually: the head is centred on snake[0]
function arrive() {
  const h = snake[0];
  if (decoy && decoy[0] === h[0] && decoy[1] === h[1]) {      // Decoy: grows, costs points, doesn't count
    const pen = T('decoy', 'penalty');
    run.score -= pen; grow = true; pulse = 1; flash = 0.7; popText(h, '−' + pen, '#c77dff');
    decoy = null; updateHud();
  }
  const fi = foods.findIndex(f => f[0] === h[0] && f[1] === h[1]);
  if (fi < 0) return true;
  foods.splice(fi, 1); pulse = 1;
  if (mode === 'tut') {
    grow = true;
    if (++tut.eaten >= TUT_EAT) { finishTutorial(); return false; }
    placeFoods(); tutSub(`${tut.eaten} / ${TUT_EAT}`);
    return true;
  }
  run.score += 10; run.totalFood++; run.stageFood++; if (run.stage !== 1 && !run.classic) run.rampFood++;
  popText(h, '+10', '#ffcc4d');
  grow = true;
  if (has('savor')) run.savorUntil = timeReal + T('savor', 'dur');
  if (chActive('decoy')) placeDecoy();
  placeFoods(); updateHud();
  if (!run.classic && run.stage !== 'continue' && run.stageFood >= stageGoal()) { endStage(); return false; }
  return true;
}
// start moving one cell in `dir`
function move() {
  snap = { snake: snake.map(c => c.slice()), prev: prev.map(c => c.slice()), grow, lastDir, phaseLeft: run ? run.phaseLeft : 0, regrow: run ? run.regrow : 0 };
  if (!grow && run && run.regrow > 0) { grow = true; run.regrow--; }   // regrowing after a stage start
  lastDir = dir;
  prev = snake.map(c => c.slice());
  const [dx, dy] = DIRS[dir];
  let hx = snake[0][0] + dx, hy = snake[0][1] + dy, wall = false;
  if (wallsOn()) wall = hx < 0 || hx >= COLS || hy < 0 || hy >= ROWS;   // Lockdown: no wrapping
  else { hx = wrap(hx, COLS); hy = wrap(hy, ROWS); }
  const body = grow ? snake : snake.slice(0, -1);
  let crash = wall || body.some(c => c[0] === hx && c[1] === hy);
  if (crash && !wall && has('phase') && run.phaseLeft > 0) { run.phaseLeft--; crash = false; popText([hx, hy], 'PHASE', '#8ccfff'); }
  snake.unshift([hx, hy]);
  if (grow) { prev.push(prev[prev.length - 1].slice()); grow = false; } else snake.pop();
  if (crash) { dying = true; dyingAt = wall ? 0.5 : CONTACT; }   // keep moving until the head visibly touches, then die
  if (has('lure')) lure();
  updateHud();
}
// Lure: food (and, deliberately, the decoy) within range slides one cell toward the head
function lure() {
  const every = T('lure', 'every');
  const h = snake[0], range = T('lure', 'range');
  const pull = p => {
    const dx = h[0] - p[0], dy = h[1] - p[1];   // straight distance: food is never pulled across a screen edge
    if (!dx && !dy || Math.abs(dx) + Math.abs(dy) > range) { p.pullN = 0; return p; }
    p.pullN = (p.pullN || 0) + 1;
    if ((p.pullN - 1) % every) return p;   // pulled when it enters range, then only every Nth snake step
    const tries = Math.abs(dx) >= Math.abs(dy) ? [[Math.sign(dx), 0], [0, Math.sign(dy)]] : [[0, Math.sign(dy)], [Math.sign(dx), 0]];
    for (const [sx, sy] of tries) {
      if (!sx && !sy) continue;
      const q = [p[0] + sx, p[1] + sy];
      if (q[0] < 0 || q[0] >= COLS || q[1] < 0 || q[1] >= ROWS) continue;   // never wraps
      const bodyHit = snake.some((c, i) => i > 0 && c[0] === q[0] && c[1] === q[1]);
      if (!bodyHit && !foods.some(f => f !== p && f[0] === q[0] && f[1] === q[1])) { q.pullN = p.pullN; return glide(p, q, sx, sy, every / speedNow(), false); };   // one step of travel per snake step
    }
    return p;
  };
  foods = foods.map(pull);
  if (decoy) decoy = pull(decoy);
}
function step() {
  if (!arrive()) return;
  if (turnQueue.length) { const d = turnQueue.shift(); if (d !== dir && !isReverse(d, dir)) dir = d; }
  move();
}
// turn right now instead of at the next cell: if the head is less than half way into its
// current move, redo that move in the new direction; otherwise finish it instantly and turn
function turnNow(d) {
  // redoing the move is only safe if the new heading isn't a reversal of the heading *before* it
  if (snap && Math.min(1, acc) < 0.5 && !isReverse(d, snap.lastDir)) {
    snake = snap.snake; prev = snap.prev; grow = snap.grow; lastDir = snap.lastDir; dying = false;
    if (run) { run.phaseLeft = snap.phaseLeft; run.regrow = snap.regrow; }
    dir = d; move();
  } else {
    dir = d; acc = 0; step();
  }
}
// Skittish Prey: food hops a cell every few seconds (scaled game time, so bullet time slows it)
function skitTick(dt) {
  if (!chActive('skittish')) return;
  run.skitT += dt;
  if (run.skitT < T('skittish', 'interval')) return;
  run.skitT = 0;
  const ds = Object.values(DIRS);
  foods = foods.map(p => {
    const hd = snake[0];
    if (Math.abs(hd[0] - p[0]) + Math.abs(hd[1] - p[1]) <= T('skittish', 'calm')) return p;   // head is right there: stay put
    const order = rShuffle(rb, ds);
    for (const [dx, dy] of order) {
      const q = [p[0] + dx, p[1] + dy];
      if (q[0] < 0 || q[0] >= COLS || q[1] < 0 || q[1] >= ROWS) continue;   // never wraps
      if (!taken(q)) return glide(p, q, dx, dy, Math.min(0.3, T('skittish', 'interval') * 0.6), true);   // never onto the snake's body
    }
    return p;
  });
}

// ---------- run / stage flow ----------
let pendingSeed = '';   // seed typed into the hidden start-screen prompt; used by the next newRun() only
function newRun() {
  const typed = cleanSeed(pendingSeed || runCfg.seed); pendingSeed = '';
  const seed = typed.length === 5 ? typed : genSeed();
  const st = makeStreams(seed);
  const drawn = CHALLENGE_IDS[rInt(st.run, CHALLENGE_IDS.length)];   // always drawn, so a forced challenge doesn't shift the offers
  let perm = rShuffle(st.run, POWERUP_IDS);
  const forced = forcedOfferIds();
  perm = forced.concat(perm.filter(i => !forced.includes(i))).filter(i => !runCfg.grant.includes(i));
  return {
    seed, rngRun: st.run, rngBoard: st.board,
    stage: 1, stageFood: 0, rampFood: 0, totalFood: 0,
    powerups: runCfg.grant.slice(), granted: runCfg.grant.slice(),
    offers: [[], perm.slice(0, 2), perm.slice(2, 4)],   // index = pick number (no pick before stage 1); disjoint pairs: never a duplicate offer, same seed = same offers
    challenge: runCfg.force || drawn, revealed: false,
    score: 0, steers: 0, expired: 0, time: 0, roundClear: null,
    phaseLeft: 0, savorUntil: 0, skitT: 0, regrow: 0,
  };
}
// classic === true: no power-ups, no challenge, no stages, no speed ramp; play until you crash
function startRun(classic, seed) {
  mode = 'play'; tut = null; pendingSeed = seed || ''; run = newRun();
  if (classic === true) Object.assign(run, { classic: true, stage: 'classic', challenge: null, powerups: [], granted: [], offers: [[], [], []] }); gesture = null; phase = 'ready';
  reset(); hideTip();
  beginStage(run.classic ? 'classic' : 1);   // no blind pick: every run starts straight in stage 1
}
function pickPower(n, id) {
  run.powerups.push(id);
  beginStage(n + 1);
}
function beginStage(s) {
  run.stage = s; run.stageFood = 0; run.skitT = 0;
  restartStage(s === 1 || s === 'classic' ? START_LEN : undefined);
  if (s === 2) run.rampFood = 0;
  run.phaseLeft = has('phase') ? T('phase', 'charges') : 0;
  if (chActive('decoy')) placeDecoy(); else decoy = null;
  placeFoods(); updateHud();
  setReady(s === 'classic' ? 'GO' : `STAGE ${s}`, 1000);
}
function setReady(label, ms) {
  phase = 'ready'; readyUntil = timeReal + ms / 1000; gesture = null;
  showBanner(label);
}
function endStage() {
  gesture = null; acc = 1;
  if (has('shed')) {                                  // Shed Skin: the tail is cut at every stage end (never below 3 cells)
    const cut = Math.min(T('shed', 'cut'), snake.length - 3);
    if (cut > 0) { snake.length -= cut; prev = snake.map(c => c.slice()); popText(snake[snake.length - 1], '−' + cut, '#8ccfff'); }
  }
  if (run.stage === 3) { winRound(); return; }
  if (run.stage === 1) { run.revealed = true; phase = 'pick'; showReveal(); }
  else showPick(2);
}
function showPick(n) {
  const offer = run.offers[n];
  if (!offer.length) { beginStage(n + 1); return; }   // nothing left to offer
  phase = 'pick'; gesture = null; renderPick(n, offer);
}
function winRound() {
  phase = 'win'; run.roundClear = { score: run.score, time: run.time };
  showWin();
}
function continueRun() {
  run.stage = 'continue'; run.stageFood = 0; restartStage(); placeFoods(); updateHud();
  setReady('CONTINUE', 900);
}
function die() {
  alive = false; deadAt = timeReal; gesture = null; shake = 1; phase = 'dead';
  if (run && run.classic) showClassicEnd();
  else if (run && run.stage === 'continue') showContinueEnd(); else showCrash();
}
function pauseGame() {
  if (phase !== 'play' || !run) return;
  gesture = null; phase = 'paused'; showPause();
}
function resumeGame() { setReady('GO', 800); }
function quitRun() { run = null; showStart(); }
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });

// ---------- gesture ----------
// positions are in canvas css pixels (mousePosScreen)
// One hold can draw a path: every time the drag bends past the deadzone a new leg starts.
// Leg 1 turns the snake now; each further leg turns it one cell later (zig-zags, U-turns).
function newGesture() {
  const x = mousePosScreen.x, y = mousePosScreen.y;
  return { x0: x, y0: y, x, y, t0: timeReal, ax: x, ay: y, segs: [], pts: [[x, y]], trail: [[x, y]] };
}
function trackGesture(g) {
  const tl = g.trail[g.trail.length - 1];
  if (Math.hypot(g.x - tl[0], g.y - tl[1]) > 3) g.trail.push([g.x, g.y]);
  const dx = g.x - g.ax, dy = g.y - g.ay, last = g.segs[g.segs.length - 1];
  if (Math.hypot(dx, dy) < (last ? cfg.dead * 1.2 : cfg.dead)) return;
  const d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  if (d === last) { g.ax = g.x; g.ay = g.y; g.pts[g.pts.length - 1] = [g.x, g.y]; return; } // same leg, keep extending
  if (last && isReverse(d, last)) return;                                                     // doubling back: ignore
  if (g.segs.length >= MAX_TURNS + 1) return;
  g.segs.push(d); g.ax = g.x; g.ay = g.y; g.pts.push([g.x, g.y]);
}
const gestureDir = g => g.segs[g.segs.length - 1] || null;
// the turns a gesture asks for, relative to the snake's current heading
function plan(g) {
  const turns = g.segs.slice();
  while (turns.length && turns[0] === dir) turns.shift();  // a leg along the current heading is a no-op
  return { turns, bad: !!(turns.length && isReverse(turns[0], dir)) };
}
function commit(g) {
  const { turns, bad } = plan(g);
  if (turns.length && !bad && alive) {
    if (run) { run.steers++; run.score--; }
    turnNow(turns[0]); turnQueue = turns.slice(1); updateHud();
  }
  if (mode !== 'tut' || !alive) return;
  const d = turns[0] || g.segs[0];
  if (tut.step === 1 || tut.step === 2) {
    if (d === tut.need) { tutSub('Nice!'); tutAdvance(); }
    else if (!d) tutSub('Drag a bit further before letting go', true);
    else tutSub(`That was ${d} — try ${tut.need}`, true);
  } else if (tut.step === 3) {
    if (turns[0] === tut.need && turns[1] === tut.need2) { tutSub('Double turn!'); tutAdvance(); }
    else if (turns.length === 1) tutSub(`That was one turn — keep holding and bend ${tut.need2} too`, true);
    else tutSub(`Drag ${tut.need}, then ${tut.need2}, in one hold`, true);
  } else if (tut.step === 4) {
    if (turns[0] === tut.need && turns[1] === tut.need2) { tutSub('U-turn!'); tutAdvance(); }
    else if (turns.length === 1) tutSub(`Keep holding and bend ${tut.need2} to finish the U-turn`, true);
    else tutSub(`Drag ${tut.need}, then ${tut.need2}, in one hold`, true);
  }
}
function ringExpired() {
  if (run) { run.expired++; run.score--; }
  if (mode === 'tut') tutSub('The ring closed — let go sooner', true);
}
function pressIsOnUi() {
  const el = document.elementFromPoint(mousePosScreen.x, mousePosScreen.y);
  return el && el.closest && el.closest('#gear, #help, #pausebtn, #skip, #sheet, #chal, #dock, #detail, #overlay button');
}
const sheetIsOpen = () => document.getElementById('sheet').classList.contains('open');

// ---------- engine callbacks ----------
function gameInit() { lastReal = timeReal; showStart(); }

// gameUpdate runs on *scaled* time: timeDelta shrinks while the finger is down
function gameUpdate() {
  if (phase === 'play' && alive && !sheetIsOpen()) {
    acc += timeDelta * speedNow();
    if (run) skitTick(timeDelta);
    tweenCells(timeDelta);
    while (acc >= 1 && !dying && phase === 'play') { acc -= 1; step(); }
    if (dying && acc >= dyingAt) { acc = dyingAt; die(); }
  }
}

// gameUpdatePost: input, ring and time scale all on *real* time
function gameUpdatePost() {
  const realDt = Math.min(0.05, timeReal - lastReal); lastReal = timeReal;
  const sheetOpen = sheetIsOpen();
  const playing = phase === 'play' && alive;

  if (phase === 'ready' && !sheetOpen && timeReal >= readyUntil) { phase = 'play'; hideBanner(); }
  if (playing && run && !sheetOpen) run.time += realDt;

  if (mouseWasPressed(0) && !sheetOpen && playing && !gesture && !pressIsOnUi()) gesture = newGesture();
  if (gesture) {
    gesture.x = mousePosScreen.x; gesture.y = mousePosScreen.y; trackGesture(gesture);
    if (mouseWasReleased(0) || !mouseIsDown(0)) { commit(gesture); gesture = null; }
    else if (timeReal - ringStart(gesture) >= ringTime()) {
      if (cfg.expire === 'commit') commit(gesture);
      else { flash = 0.7; ringExpired(); updateHud(); }
      gesture = null;
    }
  }
  if (sheetOpen || !playing) gesture = null;
  if (mode === 'tut' && playing) tutUpdate();

  // ease the engine's time scale toward slow-mo while held (or while savouring)
  const target = gesture || (playing && savoring()) ? slowNow() : 1;
  const ts = cfg.ramp <= 0 ? target : timeScale + (target - timeScale) * (1 - Math.exp(-realDt * 1000 / (cfg.ramp / 3)));
  setTimeScale(Math.max(0.001, ts));

  flash = Math.max(0, flash - realDt * 2.2);
  pulse = Math.max(0, pulse - realDt * 3);
  shake = Math.max(0, shake - realDt * 2.5);
  for (const p of pops) p.t += realDt;
  pops = pops.filter(p => p.t < 0.9);
  applyCamera();
}

function gameRender() {
  const walls = wallsOn();
  drawRect(vec2(COLS / 2, ROWS / 2), vec2(COLS, ROWS), C.board);
  for (let x = 1; x < COLS; x++) drawLine(vec2(x, 0), vec2(x, ROWS), 0.04, C.grid);
  for (let y = 1; y < ROWS; y++) drawLine(vec2(0, y), vec2(COLS, y), 0.04, C.grid);
  const edge = walls ? C.wall : C.edge;
  for (const [a, b] of [[vec2(0, 0), vec2(COLS, 0)], [vec2(COLS, 0), vec2(COLS, ROWS)], [vec2(COLS, ROWS), vec2(0, ROWS)], [vec2(0, ROWS), vec2(0, 0)]])
    drawLine(a, b, walls ? 0.16 : 0.08, edge);
  if (!snake) return;

  // food (and decoy, a purple diamond)
  const bob = 1 + 0.08 * Math.sin(timeReal * 5.5);
  const drawFoodLayer = onlyOnBody => {
    const tl0 = worldToScreen(vec2(0, ROWS)), br0 = worldToScreen(vec2(COLS, 0));
    drawContext.save();
    drawContext.beginPath(); drawContext.rect(tl0.x, tl0.y, br0.x - tl0.x, br0.y - tl0.y); drawContext.clip();
    for (const ox of walls ? [0] : [-COLS, 0, COLS]) for (const oy of walls ? [0] : [-ROWS, 0, ROWS]) {   // copies so a glide across an edge looks continuous
      for (const f of foods) if (!onlyOnBody || onSnake(f)) drawCircle(W(f.vx + ox, f.vy + oy), 0.64 * bob, C.food);
      if (decoy && !onlyOnBody) drawRect(W(decoy.vx + ox, decoy.vy + oy), vec2(0.56 * bob), C.decoy, Math.PI / 4);
    }
    drawContext.restore();
  };
  drawFoodLayer(false);

  // snake as a path through cell centres: interpolated head, body cells, interpolated tail.
  // corners stay square; coordinates are unwrapped so the snake can slide through an edge
  const t = Math.min(1, acc), n = snake.length;
  const path = [];
  let cur = (snake[1] || snake[0]).slice();   // a lone head (start of a stage) has no neck
  const headU = [cur[0] + wdelta(snake[0][0] - cur[0], COLS), cur[1] + wdelta(snake[0][1] - cur[1], ROWS)];
  path.push([cur[0] + (headU[0] - cur[0]) * t, cur[1] + (headU[1] - cur[1]) * t]);
  path.push(cur.slice());
  for (let i = 2; i < n; i++) {
    cur = [cur[0] + wdelta(snake[i][0] - snake[i - 1][0], COLS), cur[1] + wdelta(snake[i][1] - snake[i - 1][1], ROWS)];
    path.push(cur.slice());
  }
  const oldTail = prev[n - 1] || snake[n - 1];
  const tailU = [cur[0] + wdelta(oldTail[0] - snake[n - 1][0], COLS), cur[1] + wdelta(oldTail[1] - snake[n - 1][1], ROWS)];
  path.push([tailU[0] + (cur[0] - tailU[0]) * t, tailU[1] + (cur[1] - tailU[1]) * t]);

  const bodyCol = alive ? C.body : C.dead, w = 0.66 + pulse * 0.15;
  const tl = worldToScreen(vec2(0, ROWS)), br = worldToScreen(vec2(COLS, 0));
  drawContext.save();
  drawContext.beginPath(); drawContext.rect(tl.x, tl.y, br.x - tl.x, br.y - tl.y); drawContext.clip();
  for (const ox of walls ? [0] : [-COLS, 0, COLS]) for (const oy of walls ? [0] : [-ROWS, 0, ROWS]) {
    const pts = path.map(p => W(p[0] + ox, p[1] + oy));
    for (let i = 0; i < pts.length; i++) {
      drawCircle(pts[i], w, bodyCol);
      if (i) drawLine(pts[i - 1], pts[i], w, bodyCol);
    }
    const hp = pts[0];
    if (run && has('phase') && run.phaseLeft > 0 && alive) drawCircle(hp, 1.25 + 0.08 * Math.sin(timeReal * 6), C.phase);   // unused Phase Shift charge
    drawCircle(hp, 0.8, alive ? C.head : C.deadHead);
    const [ex, ey] = DIRS[dir];
    for (const s of [-1, 1]) {
      const ox2 = ex * .14 + ey * s * .15, oy2 = ey * .14 - ex * s * .15;
      drawCircle(hp.add(vec2(ox2, -oy2)), 0.14, C.eye);
    }
  }
  drawContext.restore();
  drawFoodLayer(true);   // food that hopped onto the body shows on top of it
  const h = W(wrap(path[0][0], COLS), wrap(path[0][1], ROWS));

  // ghost preview from the head
  if (gesture && alive) {
    const { turns, bad } = plan(gesture);
    const col = (bad ? C.bad : C.ok).scale(1, .85);
    let p = h;
    turns.forEach((d, i) => {
      const [gx, gy] = DIRS[d], len = i === turns.length - 1 ? 3 : 1;
      const end = p.add(vec2(gx * len, -gy * len));
      for (let k = 0; k < len * 2; k++) { // dashed
        drawLine(p.lerp(end, (k + .1) / (len * 2)), p.lerp(end, (k + .55) / (len * 2)), 0.1, col);
      }
      p = end;
    });
  }
}

// screen-space overlay: vignette, edge flash, countdown ring (raw canvas2d, css pixels)
function gameRenderPost() {
  const ctx = mainContext, Wd = mainCanvasSize.x, Hd = mainCanvasSize.y;
  const slowAmt = Math.max(0, Math.min(1, (1 - timeScale) / ((1 - slowNow()) || 1)));
  ctx.save();
  if (slowAmt > 0.01) {
    const g = ctx.createRadialGradient(Wd / 2, Hd / 2, Math.min(Wd, Hd) * 0.3, Wd / 2, Hd / 2, Math.max(Wd, Hd) * 0.75);
    const tint = savoring() && !gesture ? '40,30,0' : '10,20,60';
    g.addColorStop(0, `rgba(${tint},0)`); g.addColorStop(1, `rgba(${tint},${0.55 * slowAmt})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, Wd, Hd);
  }
  if (flash > 0) { ctx.globalAlpha = flash; ctx.strokeStyle = '#ff5a6e'; ctx.lineWidth = 10; ctx.strokeRect(0, 0, Wd, Hd); ctx.globalAlpha = 1; }

  // floating score text
  if (pops.length) {
    const { cell } = layout();
    ctx.font = `700 ${Math.round(cell * 0.7)}px -apple-system, system-ui, sans-serif`; ctx.textAlign = 'center';
    for (const p of pops) {
      const s = worldToScreen(W(p.x, p.y));
      ctx.globalAlpha = 1 - p.t / 0.9; ctx.fillStyle = p.col;
      ctx.fillText(p.text, s.x, s.y - cell * (0.4 + p.t * 1.2));
    }
    ctx.globalAlpha = 1;
  }
  // Savor timer: a thin amber bar under the HUD
  if (run && phase === 'play' && savoring()) {
    const f = (run.savorUntil - timeReal) / T('savor', 'dur');
    ctx.fillStyle = 'rgba(255,204,77,.85)'; ctx.fillRect(22, insets().top - 8, (Wd - 44) * Math.max(0, f), 3);
  }

  if (gesture) {
    const g = gesture, R = 62;
    const frac = ringFrac(g);
    const d = gestureDir(g), bad = plan(g).bad;
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.arc(g.x0, g.y0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(g.x0, g.y0, cfg.dead, 0, Math.PI * 2); ctx.stroke();
    if (d) {
      ctx.strokeStyle = bad ? 'rgba(255,90,110,.8)' : 'rgba(83,242,166,.8)'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(g.x0, g.y0);
      for (const [px, py] of g.trail) ctx.lineTo(px, py);
      ctx.lineTo(g.x, g.y); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(g.x, g.y, R, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `hsl(${150 * frac},90%,60%)`; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(g.x, g.y, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); ctx.stroke();
    if (frac < 0.3) {
      ctx.globalAlpha = 0.4 * (0.5 + 0.5 * Math.sin(timeReal * 25));
      ctx.beginPath(); ctx.arc(g.x, g.y, R + 10, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    }
    if (d) {
      const [dx, dy] = DIRS[d], col = bad ? '#ff5a6e' : '#53f2a6';
      ctx.strokeStyle = ctx.fillStyle = col; ctx.lineWidth = 4;
      const ax = g.x + dx * (R + 30), ay = g.y + dy * (R + 30);
      ctx.beginPath(); ctx.moveTo(g.x + dx * (R + 14), g.y + dy * (R + 14)); ctx.lineTo(ax, ay); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ax + dx * 10, ay + dy * 10);
      ctx.lineTo(ax - dy * 8, ay + dx * 8); ctx.lineTo(ax + dy * 8, ay - dx * 8); ctx.closePath(); ctx.fill();
    }
  }
  if (mode === 'tut' && phase === 'play' && alive && !gesture) drawTutHint(ctx, Wd, Hd);
  ctx.restore();
}

// ghost finger demonstrating the gesture
function drawTutHint(ctx, Wd, Hd) {
  const cx = Wd / 2, cy = Hd * 0.62;
  if (tut.step === 0) {
    const k = (timeReal % 1.6) / 1.6, a = Math.sin(Math.PI * Math.min(1, k * 1.3));
    ctx.globalAlpha = 0.5 * a; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#53f2a6'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(cx, cy, 62, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - k)); ctx.stroke();
    ctx.globalAlpha = 1; return;
  }
  if ((tut.step === 3 || tut.step === 4) && tut.need && tut.need2) {
    const [ax, ay] = DIRS[tut.need], [bx, by] = DIRS[tut.need2], k = (timeReal % 1.8) / 1.8;
    const m = Math.min(1, k / 0.7) * 120, l1 = Math.min(60, m), l2 = Math.max(0, m - 60);
    const fx = cx + ax * l1 + bx * l2, fy = cy + ay * l1 + by * l2, lift = k > 0.8;
    ctx.globalAlpha = lift ? 0.5 * Math.max(0, 1 - (k - 0.8) / 0.2) : 0.5;
    ctx.strokeStyle = '#53f2a6'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + ax * 60, cy + ay * 60); ctx.lineTo(cx + ax * 60 + bx * 75, cy + ay * 60 + by * 75); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(fx, fy, lift ? 16 : 22, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; return;
  }
  if ((tut.step === 1 || tut.step === 2) && tut.need) {
    const [dx, dy] = DIRS[tut.need], k = (timeReal % 1.4) / 1.4;
    const m = Math.min(1, k / 0.6), dist = 70 * (1 - Math.pow(1 - m, 3));
    const lift = k > 0.7;
    ctx.globalAlpha = lift ? 0.5 * Math.max(0, 1 - (k - 0.7) / 0.3) : 0.5;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx + dx * dist, cy + dy * dist, lift ? 16 : 22, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#53f2a6'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + dx * 90, cy + dy * 90); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
}

// ---------- tutorial ----------
const ARROW = { up: '↑', down: '↓', left: '←', right: '→' };
function startTutorial() {
  mode = 'tut'; tut = { step: 0, need: null, eaten: 0, subT: 0, pu: null, chOn: false }; run = null; phase = 'play';
  gesture = null; reset(); hideOverlay(); showTip(); tutRender(); tutSub('');
}
// step 5: take a power-up; step 6: meet a challenge; then step 7 plays with both on
function tutPicked(id) {
  tut.pu = id; tut.step = 6; showTutChallenge();
}
function tutChallengeSeen() {
  tut.chOn = true; tut.step = 7;
  placeFoods(); updateHud(); tutRender(); showTip(); tutSub('');
  setReady('GO', 700);
}
function pickNeed() {
  const h = snake[0];
  return (dir === 'up' || dir === 'down') ? (h[0] < COLS / 2 ? 'right' : 'left') : (h[1] < ROWS / 2 ? 'down' : 'up');
}
function tutAdvance() {
  tut.step++;
  if (tut.step >= 1 && tut.step <= 4) tut.need = null; // picked in tutUpdate once the turn lands
  if (tut.step === 5) { gesture = null; hideTip(); showTutPick(); return; }
  tutRender();
}
function tutUpdate() {
  if (tut.step === 0 && gesture && timeReal - gesture.t0 > 0.35) { tutSub('Time is slowed. See the ring?'); tutAdvance(); }
  if ((tut.step === 1 || tut.step === 2) && !turnQueue.length &&
      (!tut.need || tut.need === dir || isReverse(tut.need, dir))) { tut.need = pickNeed(); tutRender(); }
  if (tut.step === 3 && !turnQueue.length && !gesture &&
      (!tut.need || tut.need === dir || isReverse(tut.need, dir))) { tut.need = pickNeed(); tut.need2 = dir; tutRender(); }
  if (tut.step === 4 && !turnQueue.length && !gesture &&
      (!tut.need || tut.need === dir || isReverse(tut.need, dir))) { tut.need = pickNeed(); tut.need2 = OPP[dir]; tutRender(); }
  if (tut.subT && timeReal > tut.subT) { document.querySelector('#tip .sub').style.opacity = 0; tut.subT = 0; }
}
function tutRender() {
  const tip = document.getElementById('tip');
  const n = tut.need ? `<b>${ARROW[tut.need]} ${tut.need}</b>` : '';
  const txt = [
    'Press and <b>hold</b> anywhere.<br>Time slows down while you hold.',
    `Keep holding, drag ${n},<br>then <b>let go</b> before the ring closes.`,
    `Again — drag ${n} and let go.<br>The ring is quicker now.`,
    `Two turns in one hold: drag ${n},<br>then bend ${tut.need2 ? `<b>${ARROW[tut.need2]} ${tut.need2}</b>` : ''} before letting go.`,
    `Now a U-turn: drag ${n},<br>then bend ${tut.need2 ? `<b>${ARROW[tut.need2]} ${tut.need2}</b>` : ''} to head back the way you came.`,
    '', '',
    `Short Fuse is on: the ring closes faster.<br>Steer to the food. Eat ${TUT_EAT} to finish.`,
  ][tut.step];
  tip.querySelector('.step').textContent = `TUTORIAL ${tut.step + 1} / ${TUT_STEPS}`;
  tip.querySelector('.txt').innerHTML = txt;
}
function tutSub(text, bad) {
  const el = document.querySelector('#tip .sub');
  el.textContent = text; el.classList.toggle('bad', !!bad); el.style.opacity = 1;
  if (tut) tut.subT = text ? timeReal + 1.6 : 0;
}
function finishTutorial() {
  tutDone = true; try { localStorage.setItem('bsnake-tut-done', '1'); } catch (e) {}
  gesture = null; mode = 'play'; tut = null; phase = 'menu'; hideTip(); updateHud();
  showTutDone();
}
