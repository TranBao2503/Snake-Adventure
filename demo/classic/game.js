(() => {
  'use strict';

  const { ClassicGame, DIRECTIONS } = globalThis.ClassicSnake;
  const game = new ClassicGame();
  const board = document.querySelector('#board');
  const context = board.getContext('2d');
  const cellSize = board.width / game.size;
  const stepMs = 125;

  // 1. Load snake sprite assets safely
  const assets = {
    head: [new Image(), new Image()],
    bodyStraight: [new Image(), new Image()],
    turningLeft: [new Image(), new Image()],
    turningRight: [new Image(), new Image()],
    tail: new Image(),
    food: new Image(),
  };

  assets.head[0].src = 'assets/Head1.png';
  assets.head[1].src = 'assets/Head2.png';
  assets.bodyStraight[0].src = 'assets/BodyStraight1.png';
  assets.bodyStraight[1].src = 'assets/BodyStraight2.png';
  assets.turningLeft[0].src = 'assets/TurningLeft1.png';
  assets.turningLeft[1].src = 'assets/TurningLeft2.png';
  assets.turningRight[0].src = 'assets/TurningRight1.png';
  assets.turningRight[1].src = 'assets/TurningRight2.png';
  assets.tail.src = 'assets/Tail1.png';
  assets.food.src = 'assets/food.png';

  let animFrame = 0;

  const elements = Object.fromEntries([
    'status', 'food-count', 'length', 'pause', 'restart', 'overlay',
    'overlay-label', 'overlay-title', 'overlay-text', 'overlay-action', 'announcement',
  ].map((id) => [id, document.getElementById(id)]));

  let accumulator = 0;
  let lastTimestamp = null;
  let frameId = null;
  let lastUiState = '';

  function roundedRectangle(x, y, width, height, radius, color) {
    context.fillStyle = color;
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
    context.fill();
  }

  const FACING = { 'right': 0, 'down': Math.PI / 2, 'left': Math.PI, 'up': -Math.PI / 2 };

  // Precise segment asset and rotation calculation with explicit corner mapping
function getSegmentAssetAndAngle(snake, index, direction) {
    const curr = snake[index];
    const n = snake.length;

    if (index === 0) { // HEAD
      return { img: assets.head[animFrame], angle: FACING[direction] };
    } else if (index === n - 1) { // TAIL
      const neck = snake[n - 2];
      const dx = curr.x - neck.x;
      const dy = curr.y - neck.y;
      return { img: assets.tail, angle: Math.atan2(dy, dx) + Math.PI };
    } else { // BODY / TURNS
      // Alternates 0 and 1 by index so adjacent segments are never the same (1, 2, 1, 2)
      const frameIndex = index % 2; 

      const prev = snake[index - 1]; // towards head
      const next = snake[index + 1]; // towards tail

      const dxIn = curr.x - next.x;
      const dyIn = curr.y - next.y;
      const dxOut = prev.x - curr.x;
      const dyOut = prev.y - curr.y;

      const isTurn = (dxIn !== dxOut || dyIn !== dyOut);

      if (!isTurn) { // STRAIGHT BODY
        return { img: assets.bodyStraight[frameIndex], angle: Math.atan2(dyOut, dxOut) };
      } else { // TURN - Your exact working rules with alternating frameIndex
        let img, angle = 0;

        // Rule 1: Moving from left to right (dxIn === 1)
        if (dxIn === 1 && dyIn === 0) {
          if (dyOut === 1) {
            img = assets.turningRight[frameIndex];
            angle = 0;
          } else {
            img = assets.turningLeft[frameIndex];
            angle = 0;
          }
        }
        // Rule 2: Moving from right to left (dxIn === -1)
        else if (dxIn === -1 && dyIn === 0) {
          if (dyOut === 1) {
            img = assets.turningLeft[frameIndex];
            angle = Math.PI;
          } else {
            img = assets.turningRight[frameIndex];
            angle = Math.PI;
          }
        }
        // Rule 3: Moving vertically down (dyIn === 1)
        else if (dxIn === 0 && dyIn === 1) {
          if (dxOut === 1) {
            img = assets.turningLeft[frameIndex];
            angle = Math.PI / 2;
          } else {
            img = assets.turningRight[frameIndex];
            angle = Math.PI / 2;
          }
        }
        // Rule 4: Moving vertically up (dyIn === -1)
        else if (dxIn === 0 && dyIn === -1) {
          if (dxOut === 1) {
            img = assets.turningRight[frameIndex];
            angle = (3 * Math.PI) / 2;
          } else {
            img = assets.turningLeft[frameIndex];
            angle = (3 * Math.PI) / 2;
          }
        } else {
          img = assets.bodyStraight[frameIndex];
          angle = 0;
        }

        return { img, angle };
      }
    }
  }

  function draw() {
    context.fillStyle = '#1b2a1f';
    context.fillRect(0, 0, board.width, board.height);
    
    // Draw walls / board grid
    for (let y = 0; y < game.size; y += 1) {
      for (let x = 0; x < game.size; x += 1) {
        if (game.isWall({ x, y })) {
          roundedRectangle(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2, 2, '#88704f');
          context.fillStyle = '#aa8c65';
          context.fillRect(x * cellSize + 3, y * cellSize + 3, cellSize - 6, 2);
        } else {
          context.fillStyle = (x + y) % 2 === 0 ? '#1c2c20' : '#203024';
          context.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }

    // Draw Food
    if (game.food) {
      const fx = game.food.x * cellSize;
      const fy = game.food.y * cellSize;
      if (assets.food.complete && assets.food.naturalWidth !== 0) {
        context.drawImage(assets.food, fx, fy, cellSize, cellSize);
      } else {
        context.fillStyle = '#ef8a60';
        context.beginPath();
        context.arc(fx + cellSize / 2, fy + cellSize / 2, cellSize * 0.3, 0, Math.PI * 2);
        context.fill();
      }
    }

    // Draw Animated Snake with correct rotations
    game.snake.forEach((cell, index) => {
      const x = cell.x * cellSize;
      const y = cell.y * cellSize;
      const { img, angle } = getSegmentAssetAndAngle(game.snake, index, game.direction);

      if (img.complete && img.naturalWidth !== 0) {
        context.save();
        context.translate(x + cellSize / 2, y + cellSize / 2);
        context.rotate(angle);
        context.drawImage(img, -cellSize / 2, -cellSize / 2, cellSize, cellSize);
        context.restore();
      } else {
        roundedRectangle(x + 2, y + 2, cellSize - 4, cellSize - 4, 5, index === 0 ? '#c1f18b' : '#88bd57');
      }
    });
  }

  function syncUi() {
    const signature = `${game.status}:${game.foodEaten}:${game.snake.length}`;
    if (lastUiState === signature) return;
    lastUiState = signature;
    elements['food-count'].textContent = game.foodEaten;
    elements.length.textContent = game.snake.length;
    elements.status.textContent = {
      ready: 'Sẵn sàng', running: 'Đang chơi', paused: 'Tạm dừng', gameover: 'Kết thúc', won: 'Hoàn thành',
    }[game.status];
    elements.pause.disabled = !['running', 'paused'].includes(game.status);
    elements.pause.textContent = game.status === 'paused' ? 'Tiếp tục' : 'Tạm dừng';
    elements.overlay.hidden = game.status === 'running';

    const messages = {
      ready: ['CLASSIC MODE', 'Sẵn sàng săn mồi?', 'Điều khiển rắn trong sân. Đụng tường hoặc thân rắn sẽ kết thúc lượt chơi.', 'Bắt đầu chơi'],
      paused: ['TẠM DỪNG', 'Nghỉ một chút.', 'Nhấn Space hoặc Tiếp tục để trở lại lượt chơi.', 'Tiếp tục'],
      gameover: ['GAME OVER', game.reason === 'wall' ? 'Bạn đã chạm tường.' : 'Bạn đã chạm thân rắn.', `Bạn ăn được ${game.foodEaten} mồi. Thử thêm một lượt nhé.`, 'Chơi lại'],
      won: ['HOÀN THÀNH', 'Bạn đã phủ kín sân!', `Ăn được ${game.foodEaten} mồi và lấp đầy mọi ô trống.`, 'Chơi lại'],
    };
    if (messages[game.status]) {
      const [label, title, text, action] = messages[game.status];
      elements['overlay-label'].textContent = label;
      elements['overlay-title'].textContent = title;
      elements['overlay-text'].textContent = text;
      elements['overlay-action'].textContent = `${action} →`;
      elements.announcement.textContent = `${title} ${text}`;
      if (['gameover', 'won'].includes(game.status)) elements['overlay-action'].focus({ preventScroll: true });
    }
  }

  function render() { draw(); syncUi(); }

  function stopClock() {
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
    accumulator = 0;
    lastTimestamp = null;
  }

  function frame(timestamp) {
    frameId = null;
    if (game.status !== 'running') return;
    if (lastTimestamp !== null) {
      const elapsed = timestamp - lastTimestamp;
      if (elapsed < 500) accumulator += elapsed;
      else accumulator = 0;
    }
    lastTimestamp = timestamp;
    while (accumulator >= stepMs && game.status === 'running') {
      game.tick();
      animFrame = 1 - animFrame; 
      accumulator -= stepMs;
    }
    render();
    if (game.status === 'running') frameId = requestAnimationFrame(frame);
    else stopClock();
  }

  function runClock() {
    stopClock();
    render();
    frameId = requestAnimationFrame(frame);
    board.focus({ preventScroll: true });
  }

  function restart() { game.reset(); game.start(); runClock(); }
  function togglePause() {
    game.togglePause();
    if (game.status === 'running') runClock();
    else { stopClock(); render(); }
  }

  elements['overlay-action'].addEventListener('click', () => {
    if (game.status === 'ready') { game.start(); runClock(); }
    else if (game.status === 'paused') togglePause();
    else restart();
  });
  elements.restart.addEventListener('click', restart);
  elements.pause.addEventListener('click', togglePause);

  document.querySelectorAll('[data-direction]').forEach((button) => {
    button.addEventListener('click', () => { game.queueTurn(button.dataset.direction); board.focus({ preventScroll: true }); });
  });

  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const direction = {
      ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', ArrowLeft: 'left',
      w: 'up', d: 'right', s: 'down', a: 'left',
    }[event.key.length === 1 ? event.key.toLowerCase() : event.key];
    if (direction) {
      event.preventDefault();
      if (!event.repeat) game.queueTurn(direction);
    } else if ((event.code === 'Space' || event.key === 'Escape' || event.key.toLowerCase() === 'p') && ['running', 'paused'].includes(game.status)) {
      if (event.code === 'Space' && event.target instanceof HTMLButtonElement) return;
      event.preventDefault();
      if (!event.repeat) togglePause();
    } else if (event.key === 'Enter' && game.status === 'ready' && event.target === board) {
      event.preventDefault(); game.start(); runClock();
    }
  });

  render();
})();