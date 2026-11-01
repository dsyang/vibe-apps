# Bullet-Time Snake: Game Design Document

Source of truth for **BTS v1**, to be built as `tools/bts-v1.html`. The current `tools/bullet-time-snake.html` is the prototype this grows from and stays as it is. Ideas not (yet) in this document live in [`bullet-time-snake-ideas.md`](bullet-time-snake-ideas.md).

---

## 1. Overview

**Pitch:** Snake where holding your finger slows time and dragging steers. Each run is a short roguelike: three stages, three power-up picks, and one challenge you see coming.

**Platform:** Phone first (portrait, one thumb). Desktop with a mouse works too. Built with LittleJS.

**Design pillars**
1. **One verb.** Hold, drag, release. Everything (steering, multi-turn paths, U-turns) comes from that one gesture. Menus are plain taps.
2. **Short runs, visible decisions.** A run is about 30 food. Every pick and every threat is on screen before it matters.
3. **Counter-picking.** You learn the challenge before it starts and build for it. Each challenge has at least 2 power-ups that answer it.

---

## 2. Core mechanics (as built in the prototype)

These already exist in `tools/bullet-time-snake.html` and carry over to v1 unchanged unless noted.

### Board and snake
- Board is **13 × 20** cells and **edges wrap**. Only your own body is deadly.
- The tutorial and start-screen board is 13 × 13, which leaves room for the instructions.
- Base speed `cfg.speed` = **7 cells/s**. The snake starts 3 cells long, heading up.
- Each food eaten grows the snake by 1.

### Bullet time (the steering gesture)
- **Hold** anywhere and time eases down to `cfg.slow` (**×0.08**) over `cfg.ramp` (**120 ms**).
- A **ring** around your finger closes over `cfg.ring` (**0.45 s, real time**).
- **Drag** past the deadzone (`cfg.dead`, **26 px**) to aim. **Release** to commit the steer.
- **Multi-leg paths:** one hold can draw a bent path. Each time the drag bends past the deadzone, a new leg starts.
  - Leg 1 turns now. Each later leg turns one cell later.
  - Allows zig-zags and U-turns, up to `MAX_TURNS` = 4 turns per hold.
- **Instant turns:** if the head is less than halfway into its current move, the move is redone in the new direction. Otherwise the move finishes instantly and then turns.
  - A guard stops quick double-steers from redoing a move straight into the neck.
- **Ring expiry:** if the ring closes before you release, the steer is **cancelled** by default. The "Commit steer" debug option makes it commit instead.
- **Counters:** `steers` (committed gestures) and `expired` (rings that closed) are tracked.

### Tutorial
Six steps at 70% speed. The ring starts long and tightens each step until it reaches the real setting.
1. Hold. Time slows and the ring appears.
2. Drag in the asked direction and let go.
3. Again, with a quicker ring.
4. Two turns in one hold.
5. A U-turn in one hold.
6. Full-speed ring: eat 3 food to finish.

Finishing sets `localStorage['bsnake-tut-done'] = '1'`. The **?** button replays it any time.

---

## 3. Run structure

### Flow
```
[Blind pick 1 of 2] → Stage 1 → [Reveal challenge + pick 1 of 2] → Stage 2 → [Pick 1 of 2] → Stage 3 → WIN → (Continue)
```

1. **Blind pick:** choose 1 of 2 power-ups before you know the challenge.
   - Only offered once the tutorial is done. Before that, stage 1 starts with no power-up.
2. **Stage 1, Normal:** eat 10 food. Constant speed.
3. **Staging zone 1:** the **challenge is revealed** (a card), then **pick 1 of 2** power-ups.
4. **Stage 2, Prepare:** eat 10 food.
   - Power-ups are on and **Speed Ramp starts**.
   - The challenge is **not** active yet; the HUD shows it as upcoming.
5. **Staging zone 2:** **pick 1 of 2** power-ups.
6. **Stage 3, Challenge:** eat 10 food (15 with *Feast*). Power-ups, Speed Ramp and the challenge are all on.
7. **Win screen.**
8. **Continue mode** (optional): play on endlessly with the same build.

### Stage table
| Stage | Food goal | Speed | Power-ups | Challenge |
|---|---|---|---|---|
| 1 Normal | 10 | base | blind pick only | hidden until stage 1 ends |
| 2 Prepare | 10 | Speed Ramp on | 2 | revealed, **inactive** |
| 3 Challenge | 10 (15 Feast) | Speed Ramp on | 3 | **active** |
| Continue | endless | Speed Ramp to cap | 3 | active |

### Rules
- **Staging zones** pause time and show tap-to-select cards, not the steering gesture. In zone 1 the challenge card shows first, then the two power-up cards.
- **One round per run.** Dying before the win ends the run. The next run starts from a new blind pick: roguelike, no checkpoints.
- **The snake keeps growing across stages.** It's 33 cells long by the end of stage 3, so stage 3 is naturally the hardest.
- **No duplicate offers.** A pick never offers a power-up you already own, so every winning run has 3 different power-ups.
- **Continue mode:** after the win, keep your power-ups and score. The challenge stays on, and Speed Ramp keeps climbing to its cap. The run ends on death.

### Seed
- Every run is generated from a **5-character seed**, e.g. `K7QX4`.
  - Characters are A–Z and 2–9, without look-alikes (0, O, 1, I, L): 31 symbols, about 28.6M seeds.
- A new random seed is made for each run. In debug settings you can enter one to replay a run.
- The seed is hashed into a seeded PRNG (e.g. a string hash into mulberry32), split into **two independent streams**:
  - **Run stream:** which challenge comes up and which power-ups are offered at each pick. Steering can't change these.
  - **Board stream:** food and decoy spawn positions.
- **Guarantee:** same seed = same challenge and same offers. Spawns depend on where the snake is, so they only repeat if you play exactly the same.
- The seed is shown on the **pause screen** and **every end screen**.

---

## 4. Speed Ramp (core mechanic)

*Promoted from the old "Speed ramp" challenge.*

- Speed rises with each food eaten, **starting in stage 2**: `speed = base + step × min(rampFood, cap − 10)`.
  - `rampFood` counts food eaten since stage 2 began.
  - `cap` is the run's total food count where the ramp stops (default 50).
- **Cap at about 50 food,** so it never levels off during a round (20 ramped food) and keeps climbing well into continue mode.
- Starting numbers: `step` = **+0.15 cells/s per food**.
  - That's 7 → 10 cells/s at the win (20 ramped food) and 13 cells/s at the cap (40 ramped food). Tune in playtesting.
- Bullet-time slow-down is a multiplier, so it scales with the ramp automatically. No separate change is needed.
- The tutorial stays at its fixed 70% speed.

---

## 5. Scoring

| Event | Points |
|---|---|
| Eat food | **+10** |
| Steer (one committed gesture, including a multi-leg path) | **−1** |
| Expired ring | **−1** |
| Eat a decoy (*Decoy* challenge) | **−20** |

- **No floor:** the score can go negative.
- **Time** is tracked and shown, but it doesn't affect the score.
- **Max round score:** 300, or 350 with *Feast*.
- **Design intent:** steering cost is per gesture, not per turn. Planning a whole zig-zag or U-turn in one hold is rewarded, which is the core bullet-time skill.

---

## 6. Challenges (5)

One per run. It's revealed at staging zone 1 and **active in stage 3 and continue mode**.

| Challenge | Effect | Pressures | Counters |
|---|---|---|---|
| **Short Fuse** | Bullet-time ring closes 2× faster (ring ×0.5) | Decision time | Long Fuse, Savor |
| **Lockdown** | Edges stop wrapping; hitting one kills you | Space | Phase Shift, Shed Skin |
| **Skittish Prey** | Food moves one cell every few seconds | The target | Lure, Second Helping |
| **Feast** | Stage 3 needs 15 food instead of 10 | Endurance | Shed Skin |
| **Decoy** | A fake food in a different colour is also on the board | Reading the board | Second Helping |

### Decoy rules
- Eating the decoy: **−20 points** and the snake **grows**, but it **doesn't count** toward the stage's food goal.
- Each time you eat **real** food, the decoy respawns somewhere new.
- The decoy never spawns in the **4 × 4 area around the snake's head**, so there are no unfair spawns right in front of you. See open questions about centring.
- **Lure** pulls the decoy as well as real food. That's intended: a risky combo.

---

## 7. Power-ups (8)

Picked 1 of 2, three times per run. They're active from the stage after you pick them.

| Power-up | Effect | Hook (prototype code) | Counters |
|---|---|---|---|
| **Phase Shift** | Pass through your own body once per stage | `move()` crash check | Lockdown, a long snake |
| **Deep Focus** | Slow-mo goes slower | `cfg.slow` | Speed Ramp (generalist) |
| **Adrenaline** | Base speed −20%: as your adrenaline rises, the world seems to slow down | `speedNow()` | Speed Ramp (generalist) |
| **Shed Skin** | Every 3rd food shrinks the tail by 2 instead of growing it | `arrive()` | Lockdown, Feast |
| **Long Fuse** | Bullet-time ring lasts 50% longer | `ringTime()` | Short Fuse |
| **Savor** | About 2 s of ring-free slow-mo right after each food | `arrive()` + gesture timer | Short Fuse |
| **Lure** | Food within 2 cells is pulled toward your head | per-move food step | Skittish Prey |
| **Second Helping** | Two real food on the board at once | `food` becomes an array | Skittish Prey, Decoy |

Deep Focus and Adrenaline help in every run, which makes them safe **blind picks**.

### Counter matrix
|  | Short Fuse | Lockdown | Skittish Prey | Feast | Decoy |
|---|:-:|:-:|:-:|:-:|:-:|
| Phase Shift |  | ● |  |  |  |
| Deep Focus |  |  |  |  |  |
| Adrenaline |  |  |  |  |  |
| Shed Skin |  | ● |  | ● |  |
| Long Fuse | ● |  |  |  |  |
| Savor | ● |  |  |  |  |
| Lure |  |  | ● |  | ✕ (pulls decoy) |
| Second Helping |  |  | ● |  | ● |

- **Deep Focus** and **Adrenaline** counter Speed Ramp, which is in every run.
- **Weakest coverage:** Feast and Decoy have a single dedicated counter each, so watch them in playtesting.

### Parked
- **Muscle Memory:** a turn you drew still happens when the ring closes, at no score cost.
  - Parked until the tutorial teaches what ring expiry is.
  - It also overlaps the existing "Commit steer" debug option.

---

## 8. Screens and UI

### Start screen
- First launch: **Start tutorial** or **Skip to game** (as in the prototype).
- After the tutorial: **Play** goes straight to the blind pick.

### HUD
- **Top row:** score (with steers and expired rings under it) on the left. **⏸** pause, **?** tutorial and **⚙︎** debug settings on the right, as 44 px buttons.
- **Stage bar:** a green `STAGE n/3` badge and a bar of three segments. Finished stages are full, and the current segment grows with food and shows `food n/10`.
- **Challenge card:** under the stage bar. "Challenge ???" until it's revealed, then its icon, name, one-line effect and a `STAGE 3` tag, which becomes `ACTIVE` in stage 3.
- **Power-up dock:** at the bottom, under your thumb. Three slots show the icon and name of each power-up held, and empty slots are dashed.
- All HUD elements sit 22 px in from the screen edges. The board fits the space between the challenge card and the dock.

### Staging-zone cards
- Zone 1 opens with the **challenge reveal card**: name, one-line effect and "active in stage 3". Tap to continue.
- Each pick shows **2 power-up cards**: icon, name and one-line effect. Tap one to pick it.
- A small "you have:" row shows the power-ups you already own.

### Pause screen
- Opened by **⏸**. The game also **auto-pauses on `visibilitychange`** (switching apps or locking the phone).
- Styled like the in-game HUD: the same stage bar, challenge card and power-up slots, on a solid background.
- **Current stats:**
  - stage n/3 and food n/10
  - score (with steers and expired rings)
  - time
- **What's left:**
  - remaining stages and their food targets
  - power-ups held
  - the challenge: **"???"** until it's revealed, then its name, effect and when it activates
- **Seed.**
- Buttons: **Resume** and **Quit run** (back to the start screen).
- The timer stops while paused.

### Crash screen
- Stage reached, score, time.
- The revealed challenge (or "not revealed"), the power-ups picked so far, and the **seed**.
- The **modified-settings** block, if any.
- Tap to retry: a **new run** with a new seed, starting from the blind pick.

### Win screen
- **ROUND CLEAR:** score, time, challenge, the 3 power-ups, **seed**, and the **modified-settings** block, if any.
- Buttons: **Continue** (enter continue mode) and **New run**.

### Continue-mode end screen
- The win screen again, plus final stats: score and time at the round clear, then the final score, total food and total time.
- It still counts as a win.

### Modified-settings block (all end screens)
- Shown only if any debug value differs from its default. Each change is listed as `name: default → value`. Examples:
  - `Base speed: 7 → 9`
  - `Long Fuse ring: ×1.5 → ×2.0`
  - `Forced challenge: Lockdown`
- Forced challenges, forced offers and granted power-ups are flagged.
- Together with the seed, a screenshot of any end screen is enough to reproduce the run. It also shows when a score came from a tweaked game.

---

## 9. Debug settings (⚙︎)

The prototype's settings sheet becomes a **debug panel**. Players aren't expected to use it; it's for tuning and testing.

### Engine (from the prototype)
Board width/height, snake speed, ring length, slow-down, drag deadzone, time ramp, and the ring-expiry mode (cancel or commit). These are the **base values** that power-ups and challenges change.

### Run
- **Seed:** enter a seed for the next run, or leave it blank for random.
- **Stage food goal** (default 10).
- **Speed Ramp** step (+0.15) and cap (50 food).
- **Force challenge**, **force offers**, and **grant power-up at start**.

### Content tuning
A section per power-up and per challenge, generated from the tunables declared in `content.js`, so new knobs appear automatically.

| Content | Tunables (default) |
|---|---|
| Phase Shift | charges per stage (1) |
| Deep Focus | slow factor (×0.5 of base slow) |
| Adrenaline | speed factor (×0.8) |
| Shed Skin | every N food (3), tail cells removed (2) |
| Long Fuse | ring multiplier (×1.5) |
| Savor | ring-free slow-mo duration (2 s) |
| Lure | range (2 cells) |
| Second Helping | food on board (2) |
| Short Fuse | ring multiplier (×0.5) |
| Lockdown | (none) |
| Skittish Prey | move interval (3 s) |
| Feast | stage 3 food goal (15) |
| Decoy | penalty (−20), no-spawn area (4 × 4) |

### Behaviour
- Every value has a default in `content.js`.
- Debug values persist in `localStorage`.
- **Reset all to defaults** clears them.
- Any non-default value shows up in the modified-settings block on end screens.

---

## 10. Technical design

### Files
A multi-file tool instead of the prototype's single inline page:

```
tools/bts-v1.html              page shell: HUD + overlay markup, styles, <script src> tags
tools/bts-v1/littlejs.release.js   vendored LittleJS (littlejsengine@1.28.0)
tools/bts-v1/rng.js            seed generation, hashing, mulberry32, run/board streams
tools/bts-v1/content.js        challenge + power-up definitions and tunables (data)
tools/bts-v1/game.js           engine loop, snake, bullet time (ported from the prototype), run/stage logic
tools/bts-v1/ui.js             HUD, cards, pause/crash/win screens, debug panel
```

- `bts-v1.html` must keep `<title>` and `<meta name="description">` so `build.py` adds it to the index.
- **Asset loading:** `build.py`'s `find_local_assets()` only picks up files referenced directly by `src`/`href` attributes in the HTML. So:
  - every sub-asset needs its own `<script src="bts-v1/…">` tag;
  - files share globals, with no ES-module `import`s between them (`build.py` wouldn't copy imported files).
- **LittleJS is vendored:**
  - It's the `littlejsengine@1.28.0` `dist/littlejs.release.js`, the same build the prototype loads from jsDelivr.
  - It's committed under `tools/bts-v1/`, so the game works offline and can't change under a CDN update.
  - To upgrade, replace the file and update the version noted here.

### State
```js
run = {
  seed, rngRun, rngBoard,
  stage,          // 1 | 2 | 3 | 'continue'
  stageFood,      // food eaten this stage
  rampFood,       // food eaten since stage 2 started (Speed Ramp)
  powerups: [],   // ids, in pick order
  challenge,      // id, chosen at run start from rngRun
  revealed,       // true after staging zone 1
  score, steers, expired, time, roundClear: { score, time } | null,
}
```

### Modifier hooks
Power-ups and challenges are data with hooks, not scattered `if`s. The prototype's constants become functions that apply active modifiers:
- `speedNow()`: base × Adrenaline, + Speed Ramp.
- `ringTime()`: base × Long Fuse × Short Fuse.
- `slowNow()`: base × Deep Focus.
- `arrive()`: scoring, Shed Skin, Savor, decoy respawn.
- `move()`: Phase Shift, Lockdown walls.
- `placeFood()`: Second Helping, board stream, decoy no-spawn area.
- per-tick: Skittish Prey, Lure.

### Build order
1. Port the prototype into the multi-file layout and vendor LittleJS.
2. Run/stage loop, food goals, HUD.
3. Seed and RNG streams.
4. Scoring.
5. Pause, crash and win screens (with the seed and the modified-settings block).
6. Staging zones and cards.
7. Speed Ramp.
8. Cheap power-ups: Long Fuse, Deep Focus, Adrenaline.
9. Challenges: Short Fuse, Lockdown, Feast, Skittish Prey, Decoy.
10. Remaining power-ups: Phase Shift, Shed Skin, Savor, Lure, Second Helping.
11. Debug content tuning panel.
12. Continue mode.

---

## 11. Open questions and tuning

- **Numbers to tune:**
  - Speed Ramp step and cap
  - Savor duration
  - Skittish Prey interval
  - Lure range
  - Shed Skin cadence
- **Decoy no-spawn area:** a 4 × 4 square can't be centred on one cell. Either offset it toward the snake's heading, or use 5 × 5 (2 cells each way).
- **Phase Shift indicator:** how to show an unused charge (e.g. a translucent glow on the head).
- **Debug panel access:** always-visible ⚙︎, or hidden behind `?debug=1`.
- **Best score:** whether to persist it in `localStorage` and show it on the start screen.
- **Feast and Decoy coverage:** each has only one dedicated counter. Consider a second counter if they test too hard.

### Decisions made while building BTS v1
- **Decoy no-spawn area:** built as a centred **5 × 5** square (`area` tunable, odd sizes only).
- **Phase Shift indicator:** a translucent blue glow around the head while a charge is unused.
- **Debug panel access:** the ⚙︎ button is always visible.
- **Offers:** the run stream shuffles the 8 power-ups once, and the three picks take disjoint pairs. That keeps same seed = same offers whatever you pick.
- **Skittish Prey** timer runs on game time, so bullet time slows it too.
- **Lure** measures range as Manhattan distance across wrapped edges.
- **Decoy** is not respawned when you eat it; it comes back with the next real food.

