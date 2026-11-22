// Rampok Museum — keyboard and mouse input. The game reads one plain
// object per frame: a move vector, sneak, interact held, an interact edge,
// and a click target in world coordinates.

export function createInput(canvas) {
  const keys = new Set();
  const input = {
    x: 0,
    y: 0,
    sneak: false,
    interact: false,
    interactPressed: false,
    throwAt: null,
  };

  function refresh() {
    let x = 0;
    let y = 0;
    if (keys.has('arrowleft') || keys.has('a')) x -= 1;
    if (keys.has('arrowright') || keys.has('d')) x += 1;
    if (keys.has('arrowup') || keys.has('w')) y -= 1;
    if (keys.has('arrowdown') || keys.has('s')) y += 1;
    input.x = x;
    input.y = y;
    input.sneak = keys.has('shift');
    input.interact = keys.has('e');
  }

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
      event.preventDefault();
    }
    if (key === 'e' && !keys.has('e')) input.interactPressed = true;
    keys.add(key);
    refresh();
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.key.toLowerCase());
    refresh();
  });
  window.addEventListener('blur', () => {
    keys.clear();
    refresh();
  });

  canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    input.throwAt = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  });

  return input;
}

/** Hand the frame's input to the world, then clear the one-shot edges. */
export function consumeInput(input) {
  const frame = {
    x: input.x,
    y: input.y,
    sneak: input.sneak,
    interact: input.interact,
    interactPressed: input.interactPressed,
    throwAt: input.throwAt,
  };
  input.interactPressed = false;
  input.throwAt = null;
  return frame;
}
