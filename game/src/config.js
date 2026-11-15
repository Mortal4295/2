// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical
// area; the renderer scales it to the window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLANE = {
  x: 300,
  y: 360,
  radius: 16,
  accel: 2600,
  maxSpeed: 430,
  boostSpeed: 720,
  boostDrain: 55,
  boostRegen: 9,
  boostRing: 45,
  invulnerable: 1.6,
  turn: 14,
};

export const PLANES = 3;

export const MOTE = {
  radius: 11,
  points: 10,
  comboWindow: 3.5,
  interval: 0.85,
  intervalJitter: 0.5,
  drift: 60,
};

export const RING = {
  radius: 46,
  points: 50,
  interval: 9,
  intervalJitter: 4,
};

export const CLOUD = {
  radius: 46,
  radiusJitter: 26,
  speed: 88,
  speedPerLevel: 9,
  interval: 2.2,
  intervalScale: 0.9,
  minInterval: 0.7,
};

export const BIRD = { interval: 2.2, speed: 120 };

/** Seconds of play per level; the last level caps the difficulty growth. */
export const LEVEL = { seconds: 20, max: 8 };

/** Distance score: points per second of flight. */
export const DISTANCE_POINTS = 2;

/** How many motes, clouds, rings, birds and particles can exist at once. */
export const POOL = { motes: 24, clouds: 18, rings: 3, birds: 8, particles: 240 };

/**
 * The sky's four acts. As the level rises the sun sinks, the palette warms into dusk and
 * finally the stars come out. Each act is [top, mid, low] sky stops plus sun and cloud tints.
 */
export const SKY = [
  {
    name: 'morning gold',
    top: '#7ec8e3', mid: '#bfe6ef', low: '#ffe9b8',
    sun: '#ffd76a', sunGlow: 'rgba(255, 214, 106, 0.55)',
    cloud: 'rgba(255, 255, 255, 0.92)', cloudShade: 'rgba(214, 232, 240, 0.9)',
    mote: '#f5a623', ring: '#2e9e7b', storm: '#5b6472', stormDark: '#3d4450',
    text: '#233043', muted: '#5a6b7d',
  },
  {
    name: 'afternoon amber',
    top: '#5aa9d6', mid: '#a8d8e8', low: '#ffd28a',
    sun: '#ffb347', sunGlow: 'rgba(255, 179, 71, 0.5)',
    cloud: 'rgba(255, 250, 240, 0.92)', cloudShade: 'rgba(240, 214, 178, 0.9)',
    mote: '#ef8f1f', ring: '#2e9e7b', storm: '#565e6e', stormDark: '#3a404c',
    text: '#26313f', muted: '#5f6d7c',
  },
  {
    name: 'sunset rose',
    top: '#6a5acd', mid: '#e07856', low: '#ffc46b',
    sun: '#ff8c42', sunGlow: 'rgba(255, 140, 66, 0.55)',
    cloud: 'rgba(255, 214, 196, 0.95)', cloudShade: 'rgba(232, 150, 150, 0.9)',
    mote: '#ffd23f', ring: '#37b89a', storm: '#4a4460', stormDark: '#322e44',
    text: '#2c2338', muted: '#6b5a72',
  },
  {
    name: 'violet dusk',
    top: '#2b2a55', mid: '#7a4a8c', low: '#ff9e7d',
    sun: '#ff7e5f', sunGlow: 'rgba(255, 126, 95, 0.45)',
    cloud: 'rgba(196, 164, 214, 0.9)', cloudShade: 'rgba(140, 110, 170, 0.85)',
    mote: '#ffe066', ring: '#4fd1a5', storm: '#3a3350', stormDark: '#262038',
    text: '#f2e9f5', muted: '#b9a8c4',
  },
  {
    name: 'starlight',
    top: '#0d1030', mid: '#232a55', low: '#4a3a6e',
    sun: '#f4ead8', sunGlow: 'rgba(244, 234, 216, 0.35)',
    cloud: 'rgba(120, 128, 178, 0.85)', cloudShade: 'rgba(84, 90, 138, 0.85)',
    mote: '#ffe066', ring: '#4fd1a5', storm: '#1e1b33', stormDark: '#14122a',
    text: '#eef0fa', muted: '#9aa0c2',
  },
];

/** Which sky act a level shows: levels 1-2 morning, 3 amber, 4-5 rose, 6-7 dusk, 8+ stars. */
export function skyForLevel(level) {
  if (level <= 2) return SKY[0];
  if (level === 3) return SKY[1];
  if (level <= 5) return SKY[2];
  if (level <= 7) return SKY[3];
  return SKY[4];
}

export const PALETTE = {
  plane: '#ffffff',
  planeFold: '#ff8f5e',
  planeEdge: '#e2603f',
  trail: 'rgba(255, 255, 255, 0.55)',
  hud: 'rgba(20, 28, 44, 0.42)',
  hudText: '#ffffff',
  panel: 'rgba(20, 28, 44, 0.55)',
  panelEdge: 'rgba(255, 255, 255, 0.25)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'paper-gale.best';
