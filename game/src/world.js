// The simulation: a paper plane rides the wind across a sunset sky. It chases golden
// sun-motes (each one chains a combo), flies through wind rings for a bonus and a boost
// refill, and must dodge storm clouds — three hits and the flight is over. Every 20 seconds
// the level rises, the sun sinks and the wind gets faster. The world advances in fixed
// 1/60 s steps and never reads the clock, so a seeded run always plays out the same way.
import {
  BIRD, CLOUD, DISTANCE_POINTS, FIELD, LEVEL, MOTE, PLANE, PLANES, POOL, RING, STEP,
} from './config.js';

export const EVENT_MOTE = 1;
export const EVENT_RING = 2;
export const EVENT_HIT = 4;
export const EVENT_OVER = 8;
export const EVENT_LEVEL = 16;

export const KIND_MOTE = 0;
export const KIND_CLOUD = 1;

function makePool(size, make) {
  const pool = [];
  for (let i = 0; i < size; i += 1) pool.push(make());
  return pool;
}

export function createWorld(random) {
  const state = {
    time: 0,
    level: 1,
    score: 0,
    scoreFrac: 0,
    combo: 0,
    comboTimer: 0,
    planes: PLANES,
    boost: 100,
    plane: { x: PLANE.x, y: PLANE.y, vx: 0, vy: 0, angle: 0, invuln: 0 },
    motes: makePool(POOL.motes, () => ({ active: false, x: 0, y: 0, baseY: 0, phase: 0, r: MOTE.radius })),
    clouds: makePool(POOL.clouds, () => ({ active: false, x: 0, y: 0, r: CLOUD.radius, speed: 0, flash: 0 })),
    rings: makePool(POOL.rings, () => ({ active: false, x: 0, y: 0, r: RING.radius })),
    birds: makePool(POOL.birds, () => ({ active: false, x: 0, y: 0, speed: 0, phase: 0 })),
    particles: makePool(POOL.particles, () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 3, color: '#fff' })),
    shake: 0,
    over: false,
  };
  let moteTimer = 0.4;
  let cloudTimer = 1.6;
  let ringTimer = 5;
  let birdTimer = 1;
  let trailTimer = 0;

  function spawnParticle(x, y, vx, vy, life, size, color) {
    for (let i = 0; i < state.particles.length; i += 1) {
      const p = state.particles[i];
      if (p.active) continue;
      p.active = true;
      p.x = x; p.y = y; p.vx = vx; p.vy = vy;
      p.life = life; p.max = life; p.size = size; p.color = color;
      return;
    }
  }

  function burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i += 1) {
      const a = random() * Math.PI * 2;
      const s = speed * (0.4 + random() * 0.8);
      spawnParticle(x, y, Math.cos(a) * s, Math.sin(a) * s, 0.5 + random() * 0.4, 2 + random() * 3, color);
    }
  }

  function spawnMote() {
    for (let i = 0; i < state.motes.length; i += 1) {
      const m = state.motes[i];
      if (m.active) continue;
      m.active = true;
      m.x = FIELD.width + 30;
      m.baseY = 70 + random() * (FIELD.height - 160);
      m.y = m.baseY;
      m.phase = random() * Math.PI * 2;
      return;
    }
  }

  function spawnCloud() {
    for (let i = 0; i < state.clouds.length; i += 1) {
      const c = state.clouds[i];
      if (c.active) continue;
      c.active = true;
      c.x = FIELD.width + 90;
      c.y = 60 + random() * (FIELD.height - 120);
      c.r = CLOUD.radius + (random() * 2 - 1) * CLOUD.radiusJitter;
      c.speed = CLOUD.speed + (state.level - 1) * CLOUD.speedPerLevel + random() * 40;
      c.flash = 0;
      return;
    }
  }

  function spawnRing() {
    for (let i = 0; i < state.rings.length; i += 1) {
      const r = state.rings[i];
      if (r.active) continue;
      r.active = true;
      r.x = FIELD.width + 60;
      r.y = 90 + random() * (FIELD.height - 180);
      return;
    }
  }

  function spawnBird() {
    for (let i = 0; i < state.birds.length; i += 1) {
      const b = state.birds[i];
      if (b.active) continue;
      b.active = true;
      b.x = FIELD.width + 40;
      b.y = 60 + random() * 260;
      b.speed = BIRD.speed * (0.8 + random() * 0.5);
      b.phase = random() * Math.PI * 2;
      return;
    }
  }

  function reset() {
    state.time = 0;
    state.level = 1;
    state.score = 0;
    state.scoreFrac = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.planes = PLANES;
    state.boost = 100;
    state.plane.x = PLANE.x;
    state.plane.y = PLANE.y;
    state.plane.vx = 0;
    state.plane.vy = 0;
    state.plane.angle = 0;
    state.plane.invuln = 0;
    state.shake = 0;
    state.over = false;
    for (const list of [state.motes, state.clouds, state.rings, state.birds, state.particles]) {
      for (const item of list) item.active = false;
    }
    moteTimer = 0.4;
    cloudTimer = 1.6;
    ringTimer = 5;
    birdTimer = 1;
    trailTimer = 0;
  }

  function step(dt, input, attract) {
    let events = 0;
    state.time += dt;
    const level = Math.min(LEVEL.max, Math.floor(state.time / LEVEL.seconds) + 1);
    if (level !== state.level) {
      state.level = level;
      events |= EVENT_LEVEL;
    }
    const plane = state.plane;
    const wind = 30 + state.level * 8;

    // --- steer the plane: toward the pointer, or by keys, or a lazy wander on the title screen
    let tx = 0;
    let ty = 0;
    if (attract) {
      tx = Math.sin(state.time * 0.35) * 140;
      ty = Math.sin(state.time * 0.7) * 90;
      const dx = PLANE.x + 140 + tx - plane.x;
      const dy = PLANE.y + ty - plane.y;
      const len = Math.hypot(dx, dy) || 1;
      plane.vx += (dx / len) * PLANE.accel * 0.4 * dt;
      plane.vy += (dy / len) * PLANE.accel * 0.4 * dt;
    } else if (input.pointer) {
      const dx = input.pointer.x - plane.x;
      const dy = input.pointer.y - plane.y;
      const len = Math.hypot(dx, dy);
      if (len > 6) {
        const speed = input.boosting && state.boost > 0 ? PLANE.boostSpeed : PLANE.maxSpeed;
        tx = (dx / len) * speed;
        ty = (dy / len) * speed;
        plane.vx += (tx - plane.vx) * Math.min(1, PLANE.turn * dt);
        plane.vy += (ty - plane.vy) * Math.min(1, PLANE.turn * dt);
      } else {
        plane.vx *= 1 - Math.min(1, 6 * dt);
        plane.vy *= 1 - Math.min(1, 6 * dt);
      }
    } else {
      plane.vx += input.dir.x * PLANE.accel * dt;
      plane.vy += input.dir.y * PLANE.accel * dt;
      const max = input.boosting && state.boost > 0 ? PLANE.boostSpeed : PLANE.maxSpeed;
      const sp = Math.hypot(plane.vx, plane.vy);
      if (sp > max) {
        plane.vx = (plane.vx / sp) * max;
        plane.vy = (plane.vy / sp) * max;
      }
    }
    const boosting = !attract && input.boosting && state.boost > 0;
    if (boosting) {
      state.boost = Math.max(0, state.boost - PLANE.boostDrain * dt);
    } else {
      state.boost = Math.min(100, state.boost + PLANE.boostRegen * dt);
    }
    plane.x += (plane.vx - wind * 0.25) * dt;
    plane.y += plane.vy * dt;
    plane.x = Math.max(24, Math.min(FIELD.width - 24, plane.x));
    plane.y = Math.max(24, Math.min(FIELD.height - 24, plane.y));
    const targetAngle = Math.atan2(plane.vy, Math.max(60, Math.abs(plane.vx))) * 0.6;
    plane.angle += (targetAngle - plane.angle) * Math.min(1, 10 * dt);
    if (plane.invuln > 0) plane.invuln -= dt;
    if (state.shake > 0) state.shake -= dt;

    // Ribbon trail behind the plane.
    trailTimer -= dt;
    if (trailTimer <= 0 && Math.hypot(plane.vx, plane.vy) > 120) {
      trailTimer = 0.03;
      spawnParticle(
        plane.x - Math.cos(plane.angle) * 22, plane.y - Math.sin(plane.angle) * 22 + 4,
        -plane.vx * 0.08 + (random() - 0.5) * 20, -plane.vy * 0.08 + (random() - 0.5) * 20,
        0.5, boosting ? 4 : 2.5, boosting ? '#ffe9a8' : 'rgba(255,255,255,0.7)',
      );
    }

    if (!attract) {
      // Distance trickles in as score; the combo clock ticks down.
      state.scoreFrac += DISTANCE_POINTS * dt;
      if (state.scoreFrac >= 1) {
        state.score += Math.floor(state.scoreFrac);
        state.scoreFrac -= Math.floor(state.scoreFrac);
      }
      if (state.comboTimer > 0) {
        state.comboTimer -= dt;
        if (state.comboTimer <= 0) state.combo = 0;
      }

      // Spawning.
      moteTimer -= dt;
      if (moteTimer <= 0) {
        spawnMote();
        moteTimer = MOTE.interval * (0.7 + random() * MOTE.intervalJitter) * Math.max(0.55, 1 - state.level * 0.04);
      }
      cloudTimer -= dt;
      if (cloudTimer <= 0) {
        spawnCloud();
        const interval = Math.max(CLOUD.minInterval, CLOUD.interval * Math.pow(CLOUD.intervalScale, state.level - 1));
        cloudTimer = interval * (0.7 + random() * 0.6);
      }
      ringTimer -= dt;
      if (ringTimer <= 0) {
        spawnRing();
        ringTimer = RING.interval + random() * RING.intervalJitter;
      }
    }
    birdTimer -= dt;
    if (birdTimer <= 0) {
      spawnBird();
      birdTimer = BIRD.interval * (0.6 + random() * 0.8);
    }

    // Motes drift left and bob; catching one chains the combo.
    for (const m of state.motes) {
      if (!m.active) continue;
      m.x -= (MOTE.drift + state.level * 6) * dt;
      m.y = m.baseY + Math.sin(state.time * 2 + m.phase) * 14;
      if (m.x < -30) { m.active = false; continue; }
      if (!attract) {
        const dx = plane.x - m.x;
        const dy = plane.y - m.y;
        if (dx * dx + dy * dy < (PLANE.radius + m.r) * (PLANE.radius + m.r)) {
          m.active = false;
          state.combo = Math.min(12, state.combo + 1);
          state.comboTimer = MOTE.comboWindow;
          state.score += MOTE.points + state.combo;
          burst(m.x, m.y, '#ffd23f', 10, 160);
          events |= EVENT_MOTE;
        }
      }
    }

    // Wind rings drift left; flying through one pays a bonus and refills the boost.
    for (const r of state.rings) {
      if (!r.active) continue;
      r.x -= (MOTE.drift + 20) * dt;
      if (r.x < -80) { r.active = false; continue; }
      if (!attract) {
        const dx = plane.x - r.x;
        const dy = plane.y - r.y;
        if (dx * dx + dy * dy < (r.r * 0.75) * (r.r * 0.75)) {
          r.active = false;
          state.score += RING.points;
          state.boost = Math.min(100, state.boost + PLANE.boostRing);
          burst(r.x, r.y, '#4fd1a5', 16, 220);
          events |= EVENT_RING;
        }
      }
    }

    // Storm clouds drift left; one hit costs a plane and breaks the combo.
    for (const c of state.clouds) {
      if (!c.active) continue;
      c.x -= c.speed * dt;
      if (c.flash > 0) c.flash -= dt;
      if (random() < dt * 0.25) c.flash = 0.12;
      if (c.x < -140) { c.active = false; continue; }
      if (attract || plane.invuln > 0) continue;
      const dx = plane.x - c.x;
      const dy = plane.y - c.y;
      const rr = PLANE.radius + c.r * 0.58;
      if (dx * dx + dy * dy < rr * rr) {
        c.active = false;
        state.planes -= 1;
        state.combo = 0;
        state.comboTimer = 0;
        plane.invuln = PLANE.invulnerable;
        state.shake = 0.45;
        burst(plane.x, plane.y, '#8b93a3', 22, 260);
        events |= EVENT_HIT;
        if (state.planes <= 0) {
          state.over = true;
          events |= EVENT_OVER;
        }
      }
    }

    // Birds are scenery: they drift left and flap away.
    for (const b of state.birds) {
      if (!b.active) continue;
      b.x -= b.speed * dt;
      b.y += Math.sin(state.time * 3 + b.phase) * 12 * dt;
      if (b.x < -40) b.active = false;
    }

    // Particles fade.
    for (const p of state.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 2 * dt;
      p.vy *= 1 - 2 * dt;
    }

    return events;
  }

  return { state, reset, step };
}
