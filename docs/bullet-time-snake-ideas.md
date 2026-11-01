# Bullet-Time Snake: ideas

Backlog for `tools/bullet-time-snake.html`. Two collections: **challenges** (rules that change how a run plays) and **power-ups** (pickups or abilities the player gets).

## Challenges

### Speed ramp
The snake gets faster as you eat food.
- Today speed is constant (`cfg.speed`, 7 cells/s by default). Eating only adds a point and grows the snake.
- Sketch: add a small increment per food (for example +0.25 cells/s) with a cap, so `speedNow()` becomes `cfg.speed + eaten * step`, clamped.
- Open questions: should bullet time slow-down scale with it, and should the tutorial stay at its current fixed speed?

## Power-ups

_None yet._
