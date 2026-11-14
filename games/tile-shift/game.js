/*
 * Tile Shift: the classic 15 puzzle. Plain DOM, no dependencies.
 * The board is an array of 16 numbers; 0 is the gap.
 */
(() => {
  'use strict';

  const SIZE = 4;
  const SHUFFLE_MOVES = 220;

  const boardElement = document.getElementById('board');
  const movesElement = document.getElementById('moves');
  const timeElement = document.getElementById('time');
  const messageElement = document.getElementById('message');
  const newGameButton = document.getElementById('new-game');

  let tiles = [];
  let moves = 0;
  let seconds = 0;
  let timer = null;
  let solved = false;

  function neighbours(index) {
    const row = Math.floor(index / SIZE);
    const column = index % SIZE;
    const result = [];
    if (row > 0) result.push(index - SIZE);
    if (row < SIZE - 1) result.push(index + SIZE);
    if (column > 0) result.push(index - 1);
    if (column < SIZE - 1) result.push(index + 1);
    return result;
  }

  function isSolved() {
    return tiles.every((value, index) => value === (index + 1) % (SIZE * SIZE));
  }

  /* Shuffling with real moves guarantees that the puzzle can be solved. */
  function shuffle() {
    tiles = Array.from({ length: SIZE * SIZE }, (_, index) => (index + 1) % (SIZE * SIZE));
    let gap = tiles.indexOf(0);
    let previous = -1;
    for (let step = 0; step < SHUFFLE_MOVES; step += 1) {
      const options = neighbours(gap).filter((index) => index !== previous);
      const next = options[Math.floor(Math.random() * options.length)];
      tiles[gap] = tiles[next];
      tiles[next] = 0;
      previous = gap;
      gap = next;
    }
    if (isSolved()) shuffle();
  }

  function formatTime(total) {
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }

  function stopTimer() {
    window.clearInterval(timer);
    timer = null;
  }

  function startTimer() {
    if (timer !== null) return;
    timer = window.setInterval(() => {
      // Do not count while the tab is in the background.
      if (document.hidden) return;
      seconds += 1;
      timeElement.textContent = formatTime(seconds);
    }, 1000);
  }

  function render(focusValue) {
    boardElement.replaceChildren(
      ...tiles.map((value, index) => {
        if (value === 0) {
          const gap = document.createElement('div');
          gap.className = 'gap';
          return gap;
        }
        const tile = document.createElement('button');
        tile.type = 'button';
        tile.className = value === index + 1 ? 'tile is-home' : 'tile';
        tile.textContent = String(value);
        tile.disabled = solved;
        tile.addEventListener('click', () => move(index));
        return tile;
      }),
    );
    if (focusValue !== undefined) {
      const index = tiles.indexOf(focusValue);
      boardElement.children[index]?.focus();
    }
    movesElement.textContent = String(moves);
  }

  function move(index) {
    if (solved) return;
    const gap = tiles.indexOf(0);
    if (!neighbours(gap).includes(index)) return;

    const value = tiles[index];
    tiles[gap] = value;
    tiles[index] = 0;
    moves += 1;
    startTimer();

    if (isSolved()) {
      solved = true;
      stopTimer();
      messageElement.textContent = `Solved in ${moves} moves and ${formatTime(seconds)}. Nice!`;
      messageElement.classList.add('is-win');
    }
    render(solved ? undefined : value);
  }

  function newGame() {
    stopTimer();
    moves = 0;
    seconds = 0;
    solved = false;
    timeElement.textContent = formatTime(0);
    messageElement.textContent = 'Click a tile next to the gap, or use the arrow keys.';
    messageElement.classList.remove('is-win');
    shuffle();
    render();
  }

  /* Arrow keys move the tile that sits on the opposite side of the gap. */
  window.addEventListener('keydown', (event) => {
    const gap = tiles.indexOf(0);
    const row = Math.floor(gap / SIZE);
    const column = gap % SIZE;
    const targets = {
      ArrowUp: row < SIZE - 1 ? gap + SIZE : null,
      ArrowDown: row > 0 ? gap - SIZE : null,
      ArrowLeft: column < SIZE - 1 ? gap + 1 : null,
      ArrowRight: column > 0 ? gap - 1 : null,
    };
    if (!(event.key in targets)) return;
    event.preventDefault();
    const target = targets[event.key];
    if (target !== null) move(target);
  });

  newGameButton.addEventListener('click', newGame);
  newGame();
})();
