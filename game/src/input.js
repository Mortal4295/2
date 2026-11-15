// Keyboard and mouse input, read in the game's logical coordinates. The plane is steered
// by the mouse (it eases toward the pointer) or by arrow keys / WASD; Space or Shift is the
// gust boost, P pauses, M mutes, R restarts, Space / Enter / click confirms on menus.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;

const KEYMAP = {
  Space: ACTION_CONFIRM,
  Enter: ACTION_CONFIRM,
  KeyP: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  KeyR: ACTION_RESTART,
  KeyM: ACTION_MUTE,
};

export function createInput(canvas) {
  let actions = 0;
  let pointer = null;
  let pointerDown = false;
  const keys = new Set();

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / 1280, rect.height / 720);
    const ox = (rect.width - 1280 * scale) / 2;
    const oy = (rect.height - 720 * scale) / 2;
    return {
      x: (event.clientX - rect.left - ox) / scale,
      y: (event.clientY - rect.top - oy) / scale,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const action = KEYMAP[event.code];
    if (action !== undefined) {
      actions |= action;
      if (event.code === 'Space') event.preventDefault();
    }
    keys.add(event.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointermove', (event) => {
    pointer = toLogical(event);
  });
  canvas.addEventListener('pointerdown', (event) => {
    pointer = toLogical(event);
    pointerDown = true;
    actions |= ACTION_CONFIRM;
  });
  canvas.addEventListener('pointerup', () => {
    pointerDown = false;
  });
  canvas.addEventListener('pointerleave', () => {
    pointer = null;
  });

  function direction() {
    let x = 0;
    let y = 0;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) x -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD')) x += 1;
    if (keys.has('ArrowUp') || keys.has('KeyW')) y -= 1;
    if (keys.has('ArrowDown') || keys.has('KeyS')) y += 1;
    if (x !== 0 && y !== 0) {
      x *= Math.SQRT1_2;
      y *= Math.SQRT1_2;
    }
    return { x, y };
  }

  return {
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    direction,
    pointer() {
      return pointer;
    },
    boosting() {
      return pointerDown || keys.has('Space') || keys.has('ShiftLeft') || keys.has('ShiftRight');
    },
    pointerDown() {
      return pointerDown;
    },
  };
}
