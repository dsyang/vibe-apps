# Bullet-Time Snake: ideas

Backlog for `tools/bullet-time-snake.html`. Two collections: **challenges** (rules that change how a run plays) and **power-ups** (pickups or abilities the player gets).

## Challenges

### Speed ramp
The snake gets faster as you eat food.
- Today speed is constant (`cfg.speed`, 7 cells/s by default). Eating only adds a point and grows the snake.
- Sketch: add a small increment per food (for example +0.25 cells/s) with a cap, so `speedNow()` becomes `cfg.speed + eaten * step`, clamped.
- Open questions: should bullet time slow-down scale with it, and should the tutorial stay at its current fixed speed?

### Solid walls
Wrap-around stays the default; this challenge makes edges lethal (hitting an edge is a crash).
- Today the game always wraps, so this is a new rule on top of the baseline.
- Sketch: a `cfg.walls` flag checked where `crash` is computed; red board border while active; off in the tutorial.
- Bullet-time angle: the head could stop half a cell into the wall before the crash, so a late steer can still save you.
- Open: a start-screen picker, and separate high scores per challenge.

### More challenge ideas
- **Shrinking arena:** the playable board loses a ring of cells every N foods; edges become solid there.
- **Obstacles:** a few static blocks, adding one per food eaten. Pairs well with wrap.
- **Ring squeeze:** the bullet-time ring (`cfg.ring`) gets shorter per food, so you have less aiming time as you grow.
- **Limited bullet time:** a meter that drains while held and refills while released. Turns slow-mo from free into a resource.
- **Moving food:** food drifts one cell every few seconds, so you can't pre-plan the whole route.
- **Poison food:** a second pickup that shrinks you or reverses steering; skip it or eat it deliberately.
- **Time attack:** score as much as you can in 60 s; food adds a few seconds.
- **Ghost trail:** your previous run replays as an obstacle snake.

## Power-ups

Pickups that spawn occasionally beside normal food and last a few seconds. Sketch: a `powerup` object with type and expiry time, drawn as a distinct glyph, with a small HUD chip showing the active one.

- **Phase:** pass through your own body for a few seconds (and through walls in solid-walls mode).
- **Extra slow-mo:** bullet time slows further (`cfg.slow` halved) and the ring lasts longer.
- **Time freeze:** the snake stops for 2 s while you can still queue turns.
- **Shrink:** drop the tail back to a short length, handy late in a run.
- **Magnet:** food within 3 cells is pulled toward the head.
- **Double points:** food counts 2x while active.
- **Slow snake:** base speed drops to 60% for a few seconds. Cancels any speed-ramp gain temporarily.
- **Shield:** survive one crash; the snake bounces and the shield is consumed.
- **Bonus bullet-time charge:** refills the meter if the limited bullet-time challenge is on.

## Open questions
- Which challenges ship first?
- Are challenges selectable on the start screen, combinable, or a rotating daily rule?
- Do power-ups appear in challenge modes, or only in a "classic+" mode?
