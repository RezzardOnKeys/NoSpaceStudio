/*
 * Star Dodger: steer the ship left and right, avoid the asteroids.
 * Plain canvas, no dependencies. All sizes are relative to the screen so the
 * game plays the same in a small window and in fullscreen.
 */
(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const BEST_KEY = 'star-dodger.best';

  let width = 0;
  let height = 0;
  let unit = 0; // Base length: everything is sized in multiples of this.

  const keys = new Set();
  let pointerX = null;

  let state = 'ready'; // 'ready' | 'playing' | 'over'
  let ship = { x: 0 };
  let asteroids = [];
  let stars = [];
  let elapsed = 0;
  let spawnTimer = 0;
  let best = loadBest();
  let lastFrame = 0;

  function loadBest() {
    try {
      return Number(localStorage.getItem(BEST_KEY)) || 0;
    } catch {
      return 0; // Storage can be blocked; the game works without it.
    }
  }

  function saveBest(value) {
    try {
      localStorage.setItem(BEST_KEY, String(value));
    } catch {
      /* Ignore: see loadBest. */
    }
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    unit = Math.min(width, height) / 100;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    stars = Array.from({ length: 90 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.6 + 0.4,
      speed: Math.random() * 0.6 + 0.2,
    }));
    if (state !== 'playing') ship.x = width / 2;
  }

  function start() {
    state = 'playing';
    ship.x = width / 2;
    asteroids = [];
    elapsed = 0;
    spawnTimer = 0;
    pointerX = null;
  }

  function difficulty() {
    // Gentle for the first seconds, then steadily harder.
    return 1 + Math.max(0, elapsed - 5) / 22;
  }

  function spawnAsteroid() {
    const radius = unit * (3 + Math.random() * 4.5);
    const points = Array.from({ length: 9 }, () => 0.72 + Math.random() * 0.36);
    asteroids.push({
      x: radius + Math.random() * (width - radius * 2),
      y: -radius,
      radius,
      speed: unit * (26 + Math.random() * 22) * difficulty(),
      drift: unit * (Math.random() * 12 - 6),
      angle: Math.random() * Math.PI * 2,
      spin: Math.random() * 2 - 1,
      points,
    });
  }

  function shipRadius() {
    return unit * 3;
  }

  function shipY() {
    return height - unit * 12;
  }

  function update(dt) {
    for (const star of stars) {
      star.y += star.speed * unit * 14 * dt * (state === 'playing' ? difficulty() : 0.5);
      if (star.y > height) {
        star.y = 0;
        star.x = Math.random() * width;
      }
    }

    if (state !== 'playing') return;

    elapsed += dt;

    const speed = unit * 95;
    if (pointerX !== null) {
      const distance = pointerX - ship.x;
      ship.x += Math.sign(distance) * Math.min(Math.abs(distance), speed * 1.6 * dt);
    } else {
      const left = keys.has('ArrowLeft') || keys.has('KeyA');
      const right = keys.has('ArrowRight') || keys.has('KeyD');
      if (left) ship.x -= speed * dt;
      if (right) ship.x += speed * dt;
    }
    ship.x = Math.max(shipRadius(), Math.min(width - shipRadius(), ship.x));

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnAsteroid();
      // Wider screens need more asteroids to stay equally dense.
      const density = Math.max(1, width / height);
      spawnTimer = 0.62 / (difficulty() * density);
    }

    for (const asteroid of asteroids) {
      asteroid.y += asteroid.speed * dt;
      asteroid.x += asteroid.drift * dt;
      asteroid.angle += asteroid.spin * dt;

      const dx = asteroid.x - ship.x;
      const dy = asteroid.y - shipY();
      const reach = asteroid.radius * 0.82 + shipRadius() * 0.7;
      if (dx * dx + dy * dy < reach * reach) {
        state = 'over';
        if (elapsed > best) {
          best = elapsed;
          saveBest(best);
        }
      }
    }
    asteroids = asteroids.filter((asteroid) => asteroid.y < height + asteroid.radius);
  }

  function drawShip() {
    const r = shipRadius();
    const y = shipY();
    ctx.save();
    ctx.translate(ship.x, y);

    // Engine flame.
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, r * 0.8);
    ctx.lineTo(0, r * (1.5 + Math.random() * 0.5));
    ctx.lineTo(r * 0.4, r * 0.8);
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = '#7c5cff';
    ctx.shadowBlur = r * 1.4;
    ctx.fillStyle = '#e9e6ff';
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.3);
    ctx.lineTo(r, r);
    ctx.lineTo(0, r * 0.55);
    ctx.lineTo(-r, r);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawAsteroid(asteroid) {
    ctx.save();
    ctx.translate(asteroid.x, asteroid.y);
    ctx.rotate(asteroid.angle);
    ctx.beginPath();
    asteroid.points.forEach((scale, index) => {
      const angle = (index / asteroid.points.length) * Math.PI * 2;
      const x = Math.cos(angle) * asteroid.radius * scale;
      const y = Math.sin(angle) * asteroid.radius * scale;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = '#3a3f5c';
    ctx.strokeStyle = '#8f96bd';
    ctx.lineWidth = Math.max(1.5, unit * 0.35);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawText(text, y, size, color, weight = 700) {
    ctx.font = `${weight} ${size}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(text, width / 2, y);
  }

  function draw() {
    ctx.fillStyle = '#05060f';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#ffffff';
    for (const star of stars) {
      ctx.globalAlpha = 0.25 + star.speed * 0.6;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    ctx.globalAlpha = 1;

    asteroids.forEach(drawAsteroid);
    if (state !== 'over') drawShip();

    const small = Math.max(13, unit * 2.6);
    ctx.textBaseline = 'alphabetic';
    if (state === 'playing') {
      ctx.font = `600 ${small}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
      ctx.fillStyle = '#e9e6ff';
      ctx.textAlign = 'left';
      ctx.fillText(`Time ${elapsed.toFixed(1)}s`, unit * 3, unit * 3 + small);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#8f96bd';
      ctx.fillText(`Best ${best.toFixed(1)}s`, width - unit * 3, unit * 3 + small);
      return;
    }

    const title = Math.max(28, unit * 9);
    const middle = height / 2;
    if (state === 'ready') {
      drawText('STAR DODGER', middle - title * 0.4, title, '#e9e6ff', 800);
      drawText('Arrow keys, A/D, mouse or touch to steer', middle + small * 1.4, small, '#8f96bd', 500);
    } else {
      drawText('GAME OVER', middle - title * 0.4, title, '#ff6b81', 800);
      drawText(
        `You survived ${elapsed.toFixed(1)}s  ·  Best ${best.toFixed(1)}s`,
        middle + small * 1.4,
        small,
        '#e9e6ff',
        600,
      );
    }
    drawText('Press Space or tap to start', middle + small * 4, small, '#a594ff', 600);
  }

  function frame(time) {
    // Cap the step so a background tab does not cause a huge jump.
    const dt = Math.min(0.05, (time - lastFrame) / 1000 || 0);
    lastFrame = time;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);

  window.addEventListener('keydown', (event) => {
    keys.add(event.code);
    pointerX = null;
    if (['ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if ((event.code === 'Space' || event.code === 'Enter') && state !== 'playing') start();
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointerdown', (event) => {
    if (state !== 'playing') {
      start();
      return;
    }
    pointerX = event.clientX;
  });
  canvas.addEventListener('pointermove', (event) => {
    if (state === 'playing') pointerX = event.clientX;
  });

  resize();
  requestAnimationFrame(frame);
})();
