'use strict';
// Challenges, power-ups and their tunables (data). The debug panel is generated from `tun`.
// Gameplay hooks live in game.js and read values via T(id, key).

const CHALLENGES = {
  shortfuse: { id: 'shortfuse', name: 'Short Fuse', icon: '⏱️', desc: 'The bullet-time ring closes 2× faster.',
    tun: { ring: { label: 'Ring multiplier', def: 0.5, min: 0.2, max: 1, step: 0.05, fmt: v => '×' + (+v).toFixed(2) } } },
  lockdown: { id: 'lockdown', name: 'Lockdown', icon: '🧱', desc: 'Edges stop wrapping. Touch one and you die.', tun: {} },
  skittish: { id: 'skittish', name: 'Skittish Prey', icon: '🐇', desc: 'Food hops one cell every few seconds.',
    tun: { interval: { label: 'Move interval', def: 3, min: 0.5, max: 10, step: 0.5, fmt: v => v + ' s' } } },
  feast: { id: 'feast', name: 'Feast', icon: '🍖', desc: 'Stage 3 needs 15 food instead of 10.',
    tun: { goal: { label: 'Stage 3 food goal', def: 15, min: 10, max: 30, step: 1, fmt: v => v + ' food' } } },
  decoy: { id: 'decoy', name: 'Decoy', icon: '🎭', desc: 'A fake food is on the board. Eating it costs 20 points and doesn\'t count.',
    tun: {
      penalty: { label: 'Penalty', def: 20, min: 0, max: 60, step: 1, fmt: v => '−' + v },
      area: { label: 'No-spawn area around head (square)', def: 5, min: 3, max: 9, step: 2, fmt: v => v + ' × ' + v },
    } },
};

const POWERUPS = {
  phase: { id: 'phase', name: 'Phase Shift', icon: '👻', desc: 'Pass through your own body once per stage.',
    tun: { charges: { label: 'Charges per stage', def: 1, min: 1, max: 5, step: 1, fmt: v => v } } },
  focus: { id: 'focus', name: 'Deep Focus', icon: '🎯', desc: 'Bullet time runs slower still.',
    tun: { factor: { label: 'Slow factor (× base slow)', def: 0.5, min: 0.1, max: 1, step: 0.05, fmt: v => '×' + (+v).toFixed(2) } } },
  adrenaline: { id: 'adrenaline', name: 'Adrenaline', icon: '💉', desc: 'Base speed −20%. The world seems to slow down.',
    tun: { factor: { label: 'Speed factor', def: 0.8, min: 0.4, max: 1, step: 0.05, fmt: v => '×' + (+v).toFixed(2) } } },
  shed: { id: 'shed', name: 'Shed Skin', icon: '🐍', desc: 'Every 3rd food shrinks your tail by 2 instead of growing it.',
    tun: {
      every: { label: 'Every N food', def: 3, min: 2, max: 8, step: 1, fmt: v => v },
      cut: { label: 'Tail cells removed', def: 2, min: 1, max: 6, step: 1, fmt: v => v },
    } },
  longfuse: { id: 'longfuse', name: 'Long Fuse', icon: '🧨', desc: 'The bullet-time ring lasts 50% longer.',
    tun: { ring: { label: 'Ring multiplier', def: 1.5, min: 1, max: 3, step: 0.05, fmt: v => '×' + (+v).toFixed(2) } } },
  savor: { id: 'savor', name: 'Savor', icon: '🍯', desc: 'About 2 s of ring-free slow-mo after each food.',
    tun: { dur: { label: 'Slow-mo duration', def: 2, min: 0.5, max: 6, step: 0.5, fmt: v => v + ' s' } } },
  lure: { id: 'lure', name: 'Lure', icon: '🧲', desc: 'Food within 2 cells is pulled toward your head.',
    tun: { range: { label: 'Range', def: 2, min: 1, max: 6, step: 1, fmt: v => v + ' cells' } } },
  second: { id: 'second', name: 'Second Helping', icon: '🍽️', desc: 'Two real food on the board at once.',
    tun: { count: { label: 'Food on board', def: 2, min: 2, max: 4, step: 1, fmt: v => v } } },
};

// who answers what (GDD section 7). Deep Focus and Adrenaline answer Speed Ramp, which every run has.
const COUNTERS = { shortfuse: ['longfuse', 'savor'], lockdown: ['phase', 'shed'], skittish: ['lure', 'second'], feast: ['shed'], decoy: ['second'] };
const GENERALISTS = ['focus', 'adrenaline'];

const ALL_CONTENT = Object.assign({}, CHALLENGES, POWERUPS);
const CHALLENGE_IDS = Object.keys(CHALLENGES);
const POWERUP_IDS = Object.keys(POWERUPS);

// ---------- debug settings (persisted) ----------
// engine values are the base values power-ups and challenges modify
const ENGINE_DEF = { cols: 13, rows: 20, speed: 7, ring: 0.45, slow: 0.08, dead: 26, ramp: 120, expire: 'cancel' };
const RUN_DEF = { seed: '', stageFood: 10, rampStep: 0.15, rampCap: 50, force: '', offers: '', grant: [] };
const DBG_KEY = 'bts-v1-dbg';

const cfg = Object.assign({}, ENGINE_DEF);          // engine (read everywhere)
const runCfg = JSON.parse(JSON.stringify(RUN_DEF)); // run options
const contentCfg = {};                              // { 'phase.charges': 2 }

(function loadDbg() {
  try {
    const s = JSON.parse(localStorage.getItem(DBG_KEY) || '{}');
    Object.assign(cfg, s.cfg || {}); Object.assign(runCfg, s.run || {}); Object.assign(contentCfg, s.content || {});
  } catch (e) {}
})();
function saveDbg() {
  try { localStorage.setItem(DBG_KEY, JSON.stringify({ cfg, run: runCfg, content: contentCfg })); } catch (e) {}
}
function resetDbg() {
  Object.assign(cfg, ENGINE_DEF); Object.assign(runCfg, JSON.parse(JSON.stringify(RUN_DEF)));
  for (const k of Object.keys(contentCfg)) delete contentCfg[k];
  saveDbg();
}
// tunable value for a challenge/power-up
function T(id, key) {
  const v = contentCfg[id + '.' + key];
  return v === undefined ? ALL_CONTENT[id].tun[key].def : +v;
}

// list of non-default settings: [{name, from, to}] or [{text}]
function modifiedSettings() {
  const out = [];
  const ENGINE_NAMES = { cols: 'Board width', rows: 'Board height', speed: 'Base speed', ring: 'Ring length', slow: 'Slow-down',
    dead: 'Drag deadzone', ramp: 'Time ramp', expire: 'Ring expiry' };
  for (const k of Object.keys(ENGINE_DEF)) if (cfg[k] !== ENGINE_DEF[k]) out.push(`${ENGINE_NAMES[k]}: ${ENGINE_DEF[k]} → ${cfg[k]}`);
  if (runCfg.stageFood !== RUN_DEF.stageFood) out.push(`Stage food goal: ${RUN_DEF.stageFood} → ${runCfg.stageFood}`);
  if (runCfg.rampStep !== RUN_DEF.rampStep) out.push(`Speed Ramp step: +${RUN_DEF.rampStep} → +${runCfg.rampStep}`);
  if (runCfg.rampCap !== RUN_DEF.rampCap) out.push(`Speed Ramp cap: ${RUN_DEF.rampCap} → ${runCfg.rampCap}`);
  if (runCfg.force) out.push(`Forced challenge: ${CHALLENGES[runCfg.force].name}`);
  if (runCfg.offers) out.push(`Forced offers: ${forcedOfferIds().map(i => POWERUPS[i].name).join(', ')}`);
  if (runCfg.grant.length) out.push(`Granted power-ups: ${runCfg.grant.map(i => POWERUPS[i].name).join(', ')}`);
  for (const k of Object.keys(contentCfg)) {
    const [id, key] = k.split('.'), t = ALL_CONTENT[id] && ALL_CONTENT[id].tun[key];
    if (t && +contentCfg[k] !== t.def) out.push(`${ALL_CONTENT[id].name} ${t.label.toLowerCase()}: ${t.fmt(t.def)} → ${t.fmt(contentCfg[k])}`);
  }
  return out;
}
// "phase, focus" / names -> valid power-up ids, in order, no duplicates
function forcedOfferIds() {
  const seen = [];
  for (const raw of String(runCfg.offers || '').split(/[\s,]+/)) {
    const t = raw.toLowerCase();
    const id = POWERUP_IDS.find(i => i === t || POWERUPS[i].name.toLowerCase().replace(/\s/g, '') === t);
    if (id && !seen.includes(id)) seen.push(id);
  }
  return seen;
}
