# Paper Gale — ride the sunset wind

A complete browser game in plain static files: fly a paper plane across a living sky,
catch golden sun-motes, thread wind rings, and dodge the storm clouds as the sun sinks
from morning gold into violet dusk and starlight.

## How to play

- **Steer** — move the mouse, or use arrow keys / WASD. The plane eases after your pointer.
- **Gust boost** — hold Space, Shift, or the mouse button. Watch the meter: rings refill it.
- **Sun-motes** — catch them to score. Catch them quickly in a row to chain a combo (up to x12).
- **Wind rings** — fly through one for +50 points and a boost refill.
- **Storm clouds** — one hit costs a paper plane. You have three. Lightning flickers before a hit.
- **Levels** — every 20 seconds the level rises: the wind quickens, the storm thickens, and the sky changes act.
- **Pause** — P or Esc. **Mute** — M. **Restart** — R, or click on the game-over screen.

Score trickles in with distance flown, so staying alive is worth points on its own. Your best
flight is remembered in this browser.

## Run it

```
node serve.ts        # serves game/ on http://localhost:8080
```

Open `game/index.html` in desktop Chrome (or any static server). No network requests, no
build step, no libraries: one canvas, a handful of ES modules, and WebAudio sounds
synthesised in code.

## Files

- `game/index.html` — the page, one canvas and the module entry point.
- `game/src/main.js` — boot, the fixed-step loop, the four screens (title / play / paused / over).
- `game/src/world.js` — the simulation: plane physics, motes, rings, storm clouds, combos, levels.
- `game/src/render.js` — every pixel: the sky's five acts, sun and stars, clouds, plane, HUD.
- `game/src/input.js` — mouse and keyboard, read in logical coordinates.
- `game/src/sound.js` — all sounds synthesised with WebAudio; nothing to download.
- `game/src/shots.js` — the deterministic screenshot scenes (`?shot=start|play|dusk|end`).
- `game/src/config.js` — every tuning number and colour in one place.
- `game/src/random.js` — a seeded RNG, so a seed always plays the same flight.
- `main.ts` — hands the game in: copies `game/` and `screenshots/` and writes `dossier.json`.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.
- `screenshots/` — four real renders of the game's own code: title, play, dusk, game over.

## Screenshots

The four shots are staged by `?shot=` with a fixed seed, played forward by an autopilot
that chases motes and swerves around clouds — the same code a player runs, never a mock-up.
