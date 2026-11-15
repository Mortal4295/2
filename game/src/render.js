// Every pixel the game shows, drawn on one canvas in a fixed 1280x720 logical field that
// scales to the window. The sky is a living gradient: as the level rises the sun sinks,
// the palette warms from morning gold into violet dusk and finally starlight, so the same
// flight looks different at every stage.
import { FIELD, FONT, PALETTE, skyForLevel, SKY } from './config.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_OVER = 3;

function hexToRgb(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return `rgb(${Math.round(ca[0] + (cb[0] - ca[0]) * t)}, ${Math.round(ca[1] + (cb[1] - ca[1]) * t)}, ${Math.round(ca[2] + (cb[2] - ca[2]) * t)})`;
}

function mixRgba(a, b, t) {
  const pa = a.replace('rgba(', '').replace(')', '').split(',').map(Number);
  const pb = b.replace('rgba(', '').replace(')', '').split(',').map(Number);
  return `rgba(${Math.round(pa[0] + (pb[0] - pa[0]) * t)}, ${Math.round(pa[1] + (pb[1] - pa[1]) * t)}, ${Math.round(pa[2] + (pb[2] - pa[2]) * t)}, ${pa[3] + (pb[3] - pa[3]) * t})`;
}

/** The sky's progress, 0 (morning) to 4 (starlight), gliding between acts as time passes. */
function skyProgress(state) {
  const inLevel = (state.time % 20) / 20;
  const p = (state.level - 1 + inLevel) / 2;
  return Math.max(0, Math.min(4, p));
}

function blendedSky(state) {
  const p = skyProgress(state);
  const i = Math.min(3, Math.floor(p));
  const t = p - i;
  const a = SKY[i];
  const b = SKY[i + 1];
  return {
    p,
    top: mix(a.top, b.top, t), mid: mix(a.mid, b.mid, t), low: mix(a.low, b.low, t),
    sun: mix(a.sun, b.sun, t),
    sunGlow: mixRgba(a.sunGlow, b.sunGlow, t),
    cloud: mixRgba(a.cloud, b.cloud, t), cloudShade: mixRgba(a.cloudShade, b.cloudShade, t),
    mote: mix(a.mote, b.mote, t), ring: mix(a.ring, b.ring, t),
    storm: mix(a.storm, b.storm, t), stormDark: mix(a.stormDark, b.stormDark, t),
    text: mix(a.text, b.text, t), muted: mix(a.muted, b.muted, t),
  };
}

// Fixed stars for the night act: seeded positions that never move.
const STARS = [];
{
  let s = 1234567;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) / 4294967296);
  };
  for (let i = 0; i < 110; i += 1) {
    STARS.push({ x: rnd() * FIELD.width, y: rnd() * 420, r: 0.6 + rnd() * 1.6, tw: rnd() * Math.PI * 2 });
  }
}

// Soft background clouds, placed by a hash of their index so they never jump.
function bgCloudX(i, time, speed) {
  const span = FIELD.width + 480;
  const base = (i * 397.3) % span;
  return ((base - time * speed) % span + span) % span - 240;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = FIELD.width * dpr;
    canvas.height = FIELD.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  function drawSky(state, sky) {
    const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    g.addColorStop(0, sky.top);
    g.addColorStop(0.55, sky.mid);
    g.addColorStop(1, sky.low);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    // Stars fade in as night falls.
    if (sky.p > 2.6) {
      const a = Math.min(1, (sky.p - 2.6) / 1.4);
      for (const s of STARS) {
        const tw = 0.5 + 0.5 * Math.sin(state.time * 1.5 + s.tw);
        ctx.globalAlpha = a * (0.35 + 0.65 * tw);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // The sun sinks as the flight goes on; by starlight it is a pale moon.
    const sunX = 1000 - sky.p * 40;
    const sunY = 130 + sky.p * 105;
    const glow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 190);
    glow.addColorStop(0, sky.sunGlow);
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sunX - 200, sunY - 200, 400, 400);
    ctx.fillStyle = sky.sun;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sky.p > 3.4 ? 34 : 46, 0, Math.PI * 2);
    ctx.fill();
    if (sky.p > 3.4) {
      ctx.fillStyle = 'rgba(200,200,220,0.5)';
      ctx.beginPath();
      ctx.arc(sunX - 12, sunY - 8, 8, 0, Math.PI * 2);
      ctx.arc(sunX + 10, sunY + 12, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Distant hills, darker as dusk falls.
    ctx.fillStyle = sky.p > 3 ? 'rgba(20, 18, 44, 0.55)' : 'rgba(90, 110, 90, 0.28)';
    ctx.beginPath();
    ctx.moveTo(0, FIELD.height);
    for (let x = 0; x <= FIELD.width; x += 80) {
      ctx.lineTo(x, FIELD.height - 46 - Math.sin(x * 0.006 + 1.2) * 26 - Math.sin(x * 0.013) * 12);
    }
    ctx.lineTo(FIELD.width, FIELD.height);
    ctx.closePath();
    ctx.fill();
  }

  function drawBackgroundClouds(state, sky) {
    for (let layer = 0; layer < 2; layer += 1) {
      const speed = layer === 0 ? 12 : 26;
      const scale = layer === 0 ? 0.7 : 1.15;
      const alpha = layer === 0 ? 0.55 : 0.9;
      for (let i = 0; i < 6; i += 1) {
        const x = bgCloudX(i + layer * 6, state.time, speed);
        const y = 90 + ((i * 173 + layer * 271) % 300) + layer * 60;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = sky.cloud;
        ctx.beginPath();
        ctx.ellipse(x, y, 74 * scale, 22 * scale, 0, 0, Math.PI * 2);
        ctx.ellipse(x - 42 * scale, y + 8 * scale, 46 * scale, 16 * scale, 0, 0, Math.PI * 2);
        ctx.ellipse(x + 44 * scale, y + 8 * scale, 50 * scale, 17 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = sky.cloudShade;
        ctx.beginPath();
        ctx.ellipse(x, y + 12 * scale, 62 * scale, 12 * scale, 0, 0, Math.PI);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawBirds(state) {
    ctx.strokeStyle = 'rgba(40, 48, 64, 0.75)';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    for (const b of state.birds) {
      if (!b.active) continue;
      const flap = Math.sin(state.time * 10 + b.phase) * 7;
      ctx.beginPath();
      ctx.moveTo(b.x - 11, b.y - flap);
      ctx.quadraticCurveTo(b.x - 3, b.y + 3, b.x, b.y);
      ctx.quadraticCurveTo(b.x + 3, b.y + 3, b.x + 11, b.y - flap);
      ctx.stroke();
    }
  }

  function drawMotes(state, sky) {
    for (const m of state.motes) {
      if (!m.active) continue;
      const pulse = 0.75 + 0.25 * Math.sin(state.time * 4 + m.phase);
      const glow = ctx.createRadialGradient(m.x, m.y, 1, m.x, m.y, 26);
      glow.addColorStop(0, sky.mote);
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = 0.55 * pulse;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = sky.mote;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(m.x - 3, m.y - 3, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawRings(state, sky) {
    for (const r of state.rings) {
      if (!r.active) continue;
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(Math.sin(state.time * 1.2) * 0.12);
      ctx.strokeStyle = sky.ring;
      ctx.lineWidth = 7;
      ctx.setLineDash([26, 14]);
      ctx.lineDashOffset = -state.time * 30;
      ctx.beginPath();
      ctx.arc(0, 0, r.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = sky.ring;
      ctx.beginPath();
      ctx.arc(0, 0, r.r - 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawClouds(state, sky) {
    for (const c of state.clouds) {
      if (!c.active) continue;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.fillStyle = c.flash > 0 ? '#ffe9a8' : sky.storm;
      ctx.beginPath();
      ctx.ellipse(0, 0, c.r, c.r * 0.55, 0, 0, Math.PI * 2);
      ctx.ellipse(-c.r * 0.55, c.r * 0.14, c.r * 0.6, c.r * 0.38, 0, 0, Math.PI * 2);
      ctx.ellipse(c.r * 0.55, c.r * 0.14, c.r * 0.62, c.r * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = sky.stormDark;
      ctx.beginPath();
      ctx.ellipse(0, c.r * 0.22, c.r * 0.8, c.r * 0.28, 0, 0, Math.PI);
      ctx.fill();
      if (c.flash > 0) {
        ctx.strokeStyle = '#fff3b0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-6, c.r * 0.4);
        ctx.lineTo(2, c.r * 0.75);
        ctx.lineTo(-3, c.r * 0.75);
        ctx.lineTo(6, c.r * 1.1);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawPlane(state, sky) {
    const p = state.plane;
    const blink = p.invuln > 0 && Math.floor(state.time * 12) % 2 === 0;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.scale(1.35, 1.35);
    ctx.globalAlpha = blink ? 0.35 : 1;
    // Ribbon trail is particles; the plane itself is a folded paper dart.
    ctx.fillStyle = PALETTE.plane;
    ctx.strokeStyle = PALETTE.planeEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.lineTo(-18, -13);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-18, 13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = PALETTE.planeFold;
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-18, -13);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-18, 13);
    ctx.closePath();
    ctx.fillStyle = '#ffb08a';
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      if (!p.active) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + p.life / p.max), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(state, best, sky, muted) {
    ctx.textBaseline = 'alphabetic';
    // Score, top left.
    ctx.fillStyle = PALETTE.hud;
    roundRect(18, 16, 240, 64, 14);
    ctx.fill();
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = `700 30px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(String(state.score), 34, 50);
    ctx.font = `600 13px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText(`BEST ${Math.max(best, state.score)}`, 34, 70);
    if (state.combo > 1) {
      ctx.fillStyle = '#ffd23f';
      ctx.font = `800 22px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText(`COMBO x${state.combo}`, 270, 52);
      ctx.fillStyle = 'rgba(255,210,63,0.7)';
      ctx.fillRect(270, 60, 90 * Math.max(0, state.comboTimer / 3.5), 5);
    }

    // Planes and level, top right.
    ctx.fillStyle = PALETTE.hud;
    roundRect(FIELD.width - 258, 16, 240, 64, 14);
    ctx.fill();
    for (let i = 0; i < 3; i += 1) {
      const x = FIELD.width - 232 + i * 34;
      const y = 48;
      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = i < state.planes ? 1 : 0.25;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-9, -7);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-9, 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = `700 20px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(`LEVEL ${state.level}`, FIELD.width - 34, 52);
    ctx.font = `600 13px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText(skyForLevel(state.level).name.toUpperCase(), FIELD.width - 34, 70);

    // Boost meter, bottom centre.
    const bw = 260;
    const bx = (FIELD.width - bw) / 2;
    const by = FIELD.height - 34;
    ctx.fillStyle = 'rgba(20,28,44,0.4)';
    roundRect(bx - 8, by - 8, bw + 16, 24, 12);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    roundRect(bx, by, bw, 8, 4);
    ctx.fill();
    const boostFrac = state.boost / 100;
    ctx.fillStyle = boostFrac > 0.25 ? '#4fd1a5' : '#ffb347';
    roundRect(bx, by, Math.max(8, bw * boostFrac), 8, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = `700 11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('GUST  —  hold SPACE or mouse button to boost', FIELD.width / 2, by + 26);

    if (muted) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `600 13px ${FONT}`;
      ctx.textAlign = 'right';
      ctx.fillText('MUTED  (M)', FIELD.width - 20, FIELD.height - 44);
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = PALETTE.panel;
    roundRect(x, y, w, h, 20);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawTitle(state, best, sky) {
    ctx.textAlign = 'center';
    ctx.fillStyle = sky.text;
    ctx.font = `800 84px ${FONT}`;
    ctx.shadowColor = 'rgba(255,255,255,0.45)';
    ctx.shadowBlur = 24;
    ctx.fillText('PAPER GALE', FIELD.width / 2, 218);
    ctx.shadowBlur = 0;
    ctx.font = `600 24px ${FONT}`;
    ctx.fillStyle = sky.muted;
    ctx.fillText('Ride the sunset wind. Catch the light. Dodge the storm.', FIELD.width / 2, 262);

    panel(FIELD.width / 2 - 330, 300, 660, 148);
    ctx.fillStyle = '#fff';
    ctx.font = `600 19px ${FONT}`;
    ctx.fillText('MOUSE or ARROWS / WASD — steer your paper plane', FIELD.width / 2, 338);
    ctx.fillText('Hold SPACE or CLICK — gust boost  (watch the meter)', FIELD.width / 2, 372);
    ctx.fillText('Catch sun-motes to chain combos  •  Fly through rings for +50', FIELD.width / 2, 406);
    ctx.fillText('Storm clouds cost a plane — you have three.  P pauses  •  M mutes', FIELD.width / 2, 428);

    const bob = Math.sin(state.time * 2.4) * 8;
    ctx.fillStyle = sky.text;
    ctx.font = `800 30px ${FONT}`;
    ctx.fillText('Click or press SPACE to fly', FIELD.width / 2, 512 + bob);
    if (best > 0) {
      ctx.fillStyle = sky.muted;
      ctx.font = `600 18px ${FONT}`;
      ctx.fillText(`Best flight: ${best}`, FIELD.width / 2, 552 + bob);
    }
  }

  function drawPaused(state, sky) {
    ctx.fillStyle = 'rgba(16, 20, 36, 0.45)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(FIELD.width / 2 - 220, 270, 440, 170);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = `800 44px ${FONT}`;
    ctx.fillText('PAUSED', FIELD.width / 2, 340);
    ctx.font = `600 19px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText('Press P or click to keep flying', FIELD.width / 2, 384);
  }

  function drawOver(state, best, isNewBest, sky) {
    ctx.fillStyle = 'rgba(16, 20, 36, 0.45)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(FIELD.width / 2 - 300, 168, 600, 384);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = `800 52px ${FONT}`;
    ctx.fillText('FLIGHT OVER', FIELD.width / 2, 248);
    if (isNewBest) {
      ctx.fillStyle = '#ffd23f';
      ctx.font = `800 22px ${FONT}`;
      ctx.fillText('★ NEW BEST FLIGHT ★', FIELD.width / 2, 288);
    }
    ctx.fillStyle = '#fff';
    ctx.font = `800 64px ${FONT}`;
    ctx.fillText(String(state.score), FIELD.width / 2, 366);
    ctx.font = `600 18px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    const mins = Math.floor(state.time / 60);
    const secs = Math.floor(state.time % 60).toString().padStart(2, '0');
    ctx.fillText(`Best ${best}   •   Level ${state.level}   •   ${mins}:${secs} in the air`, FIELD.width / 2, 404);
    ctx.fillText('The wind is still out there.', FIELD.width / 2, 436);
    const bob = Math.sin(state.time * 2.4) * 6;
    ctx.fillStyle = '#ffd23f';
    ctx.font = `800 26px ${FONT}`;
    ctx.fillText('Press R or click to fly again', FIELD.width / 2, 502 + bob);
  }

  function draw(state, screen, best, isNewBest, muted) {
    const sky = blendedSky(state);
    ctx.save();
    if (state.shake > 0) {
      const s = state.shake * 14;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }
    drawSky(state, sky);
    drawBackgroundClouds(state, sky);
    drawBirds(state);
    drawRings(state, sky);
    drawMotes(state, sky);
    drawClouds(state, sky);
    drawParticles(state);
    drawPlane(state, sky);
    ctx.restore();
    if (screen === SCREEN_TITLE) drawTitle(state, best, sky);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(state, best, sky, muted);
    if (screen === SCREEN_PAUSED) drawPaused(state, sky);
    if (screen === SCREEN_OVER) drawOver(state, best, isNewBest, sky);
  }

  return { draw };
}
