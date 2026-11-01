'use strict';
// Seed generation, hashing and seeded PRNG streams (shared globals, no modules).
// A run seed is 5 chars from a 31-symbol alphabet (no 0 O 1 I L): ~28.6M seeds.
const SEED_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function genSeed() {
  let s = '';
  for (let i = 0; i < 5; i++) s += SEED_CHARS[Math.floor(Math.random() * SEED_CHARS.length)];
  return s;
}
// accept what a player might type: upper-case, look-alikes mapped, junk dropped
function cleanSeed(str) {
  const map = { '0': 'O', '1': 'I' };
  let out = '';
  for (const ch of String(str || '').toUpperCase()) {
    const c = map[ch] || ch;
    if (SEED_CHARS.includes(c)) out += c;
  }
  return out.slice(0, 5);
}
// xmur3 string hash -> 32-bit int
function hashStr(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}
function mulberry32(a) {
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// two independent streams: `run` (challenge + offers, steering can't touch it)
// and `board` (food/decoy spawns, depends on play)
function makeStreams(seed) {
  return { run: mulberry32(hashStr('run:' + seed)), board: mulberry32(hashStr('board:' + seed)) };
}
const rInt = (rng, n) => Math.floor(rng() * n);
function rShuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = rInt(rng, i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
