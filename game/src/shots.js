// The screenshot scenes behind ?shot=start|play|dusk|end. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by an autopilot that
// chases the nearest sun-mote and swerves around storm clouds, so every frame is what a
// short game really looks like and the same seed always gives the same frame.
import { FIELD, STEP } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const DUSK_SECONDS = 88;
const END_LIMIT_SECONDS = 600;

/**
 * Where the autopilot wants the plane to be: the nearest mote (or a wind ring when one is
 * close), swerving above or below any storm cloud drifting into its path. A careless pilot
 * chases motes and ignores clouds, so it is caught out as the storm thickens.
 */
function autopilotTarget(state, careful) {
  const plane = state.plane;
  let target = null;
  let bestD = Infinity;
  for (const m of state.motes) {
    if (!m.active) continue;
    // Nearest mote in either direction: motes drift in from the right and float past,
    // so chasing only rightward would pin the plane against the screen's edge.
    const d = Math.abs(m.x - plane.x) + Math.abs(m.y - plane.y) * 0.4;
    if (d < bestD) { bestD = d; target = { x: m.x, y: m.y }; }
  }
  for (const r of state.rings) {
    if (!r.active) continue;
    const d = Math.abs(r.x - plane.x) + Math.abs(r.y - plane.y) * 0.4;
    if (d < bestD * 0.8) { bestD = d; target = { x: r.x, y: r.y }; }
  }
  if (target === null) target = { x: FIELD.width * 0.6, y: FIELD.height * 0.5 };
  if (careful) {
    // A threat is any storm cloud drifting into the plane's lane ahead. Swerve early,
    // to the side with more room, and ignore motes until the lane is clear.
    for (const c of state.clouds) {
      if (!c.active) continue;
      const dx = c.x - plane.x;
      if (dx > -60 && dx < 430 && Math.abs(c.y - plane.y) < c.r + 110) {
        const above = c.y - c.r - 130;
        const below = c.y + c.r + 130;
        const pickAbove = Math.abs(above - plane.y) < Math.abs(below - plane.y) || below > FIELD.height - 60;
        const ty = pickAbove ? Math.max(50, above) : Math.min(FIELD.height - 50, below);
        return { x: plane.x + 260, y: ty };
      }
    }
    for (const c of state.clouds) {
      if (!c.active) continue;
      const dx = c.x - plane.x;
      if (dx > -40 && dx < 300 && Math.abs(c.y - target.y) < c.r + 70) {
        target = { x: target.x, y: c.y > FIELD.height / 2 ? c.y - c.r - 110 : c.y + c.r + 110 };
      }
    }
  }
  return target;
}

function pilotInput(state, careful) {
  const target = autopilotTarget(state, careful);
  const plane = state.plane;
  const dx = target.x - plane.x;
  const dy = target.y - plane.y;
  const far = Math.hypot(dx, dy) > 320;
  return {
    dir: { x: 0, y: 0 },
    pointer: { x: target.x, y: target.y },
    boosting: far && state.boost > 30,
  };
}

/**
 * Set `world` to the named scene (start, play, dusk or end; any other name is start) and
 * return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'dusk' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, { dir: { x: 0, y: 0 }, pointer: null, boosting: false }, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const seconds = name === 'play' ? PLAY_SECONDS : name === 'dusk' ? DUSK_SECONDS : END_LIMIT_SECONDS;
  const careful = name !== 'end';
  for (let index = 0; index < seconds / STEP; index += 1) {
    if (world.step(STEP, pilotInput(world.state, careful), false) & EVENT_OVER) break;
  }
  const over = world.state.planes === 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
