# Bullet-Time Snake: ideas

Backlog for Bullet-Time Snake. Settled design lives in the **[Game Design Document](bullet-time-snake-gdd.md)**. This file keeps ideas that aren't in it yet, plus a record of where earlier ideas went.

Two collections: **challenges** (rules that change how a run plays) and **power-ups** (abilities the player picks).

## Challenges

### Speed ramp → promoted to the GDD (core mechanic, "Speed Ramp")
The snake gets faster as you eat food.
- Original sketch: `speedNow()` becomes `cfg.speed + eaten * step`, clamped. That's what the GDD adopts: +0.15 cells/s per food from stage 2, capped at about 50 food.
- Open questions, now answered:
  - Bullet-time slow-down is a multiplier, so it scales with the ramp automatically.
  - The tutorial stays at its fixed speed.

## Power-ups

### Parked: Muscle Memory
When the ring closes, the turn you drew still happens and doesn't cost a point.
- Counters Short Fuse.
- Parked because it only makes sense once the tutorial explains what happens when the ring expires.
- It also overlaps the existing "Commit steer" debug option.

### Rejected
- **Free steer** (every 5th steer is free): it only helps the score and counters no challenge.
- **Hair Trigger** (smaller drag deadzone): rejected in review.
- **Foresight** (path preview while holding): rejected in review.
