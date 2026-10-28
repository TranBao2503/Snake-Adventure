(() => {
  'use strict';

  const { ClassicGame, DIRECTIONS } = globalThis.ClassicSnake;
  const { HuntGame } = globalThis.HuntSnake;
  const { PlayerSession } = globalThis.ClassicPlayer;
  const session = new PlayerSession({ localFile: location.protocol === 'file:' });
  let mode = 'classic';
  let game = new ClassicGame();
  let run = null;
  let hasEntered = false;
  let leaderboardRequest = 0;
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
    'player-gate', 'game-layout', 'player-form', 'player-name', 'player-message', 'named-play', 'guest-play',
    'player-display', 'player-policy', 'change-player', 'cancel-player', 'mode-title', 'mode-description', 'mode-tag',
    'score-message', 'leaderboard-list', 'leaderboard-message', 'refresh-leaderboard', 'food-label',
    'hunt-stats', 'hunt-level', 'hunt-featured', 'hunt-remaining', 'hunt-timer', 'hunt-timer-label', 'hunt-portal',
    'hunt-food-score', 'hunt-time-score', 'portal-legend', 'demo-note',
    'hunt-targets', 'hunt-time-note',
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

    if (mode === 'hunt') drawHuntActors();

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

  function drawHuntActors() {
    if (game.portal) {
      const x = game.portal.x * cellSize;
      const y = game.portal.y * cellSize;
      roundedRectangle(x + 1, y + 1, cellSize - 2, cellSize - 2, 5, '#b7a1ff');
      roundedRectangle(x + 5, y + 4, cellSize - 10, cellSize - 7, 4, '#493d74');
      context.fillStyle = '#e6dcff';
      context.fillRect(x + 11, y + 8, 3, 8);
    }
    for (const prey of game.prey) {
      const x = (prey.x + .5) * cellSize;
      const y = (prey.y + .5) * cellSize;
      const definition = game.catalog.get(prey.type);
      context.fillStyle = definition.color ?? '#efb88c';
      context.beginPath();
      if (prey.type === 'bird') {
        context.moveTo(x - 9, y - 6); context.lineTo(x, y - 1); context.lineTo(x + 9, y - 6);
        context.lineTo(x + 5, y + 4); context.lineTo(x, y + 7); context.lineTo(x - 5, y + 4);
      } else {
        context.ellipse(x, y + 1, 7, 6, 0, 0, Math.PI * 2);
      }
      context.fill();
      for (const side of [-1, 1]) {
        context.fillStyle = definition.color ?? '#efb88c';
        context.beginPath();
        context.arc(x + side * 5, y - 4, prey.type === 'frog' ? 4 : 3, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#19251b';
        context.beginPath(); context.arc(x + side * 3, y - 2, 1.5, 0, Math.PI * 2); context.fill();
      }
    }
  }

  function timeLabel(milliseconds, roundUp = false) {
    const seconds = Math.max(0, (roundUp ? Math.ceil : Math.floor)(milliseconds / 1000));
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function scoreLabel(value) { return value === null ? 'Chưa cấu hình' : value.toLocaleString('vi-VN'); }

  function syncUi() {
    const signature = `${mode}:${game.status}:${game.foodEaten}:${game.snake.length}:${game.levelIndex}:${game.phase}:${Math.floor((game.activeDurationMs ?? 0) / 1000)}`;
    if (lastUiState === signature) return;
    lastUiState = signature;
    elements['food-count'].textContent = game.foodEaten;
    elements.length.textContent = game.snake.length;
    elements.status.textContent = {
      ready: 'Sẵn sàng', running: mode === 'hunt' && game.phase === 'portal' ? 'Cổng đã mở' : 'Đang chơi',
      paused: 'Tạm dừng', gameover: 'Kết thúc', won: 'Hoàn thành', levelcomplete: 'Đã qua màn',
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
    if (mode === 'hunt') {
      const featured = game.catalog.get(game.level.featuredPreyId);
      elements['hunt-level'].textContent = `MÀN ${game.levelIndex + 1} / ${game.rules.levels.length} · ${game.level.title ?? game.level.id}`;
      elements['hunt-featured'].textContent = `Mồi đặc trưng: ${featured?.label ?? game.level.featuredPreyId}`;
      elements['hunt-targets'].replaceChildren();
      for (const [id, target] of Object.entries(game.level.preyCounts)) {
        const row = document.createElement('p');
        row.textContent = `${game.catalog.get(id).label ?? id}: ${game.caught[id]} / ${target}`;
        elements['hunt-targets'].append(row);
      }
      elements['hunt-remaining'].textContent = game.prey.length;
      const remaining = game.rules.timeGraceSeconds * 1000 - game.activeDurationMs;
      elements['hunt-timer-label'].textContent = remaining >= 0 ? 'Trong mốc thưởng' : 'Vượt mốc thưởng';
      elements['hunt-timer'].textContent = remaining >= 0 ? timeLabel(remaining, true) : `+${timeLabel(-remaining)}`;
      elements['hunt-portal'].textContent = game.phase === 'hunting' ? 'Chưa mở' : game.phase === 'portal' ? 'Đã mở · hãy đi vào' : 'Đã đi qua';
      const breakdown = game.levelScore();
      elements['hunt-food-score'].textContent = scoreLabel(breakdown.foodScore);
      elements['hunt-time-score'].textContent = scoreLabel(breakdown.timeScore);
      elements['hunt-time-note'].textContent = breakdown.timeScore === 0
        ? 'Đã hết điểm thời gian. Bạn vẫn được chơi tiếp và qua cổng.'
        : '60 giây đầu giữ 1.000 điểm, sau đó trừ 10 điểm/giây. Điểm dừng ở 0.';
      messages.ready = [`MÀN ${game.levelIndex + 1} · THE HUNT`, game.level.title ?? 'Bắt đầu cuộc săn',
        `${game.level.description ?? 'Bắt hết mồi rồi đi qua cổng.'} Rắn giữ nguyên chiều dài.`, 'Vào màn'];
      const result = game.completedLevels.at(-1);
      const resultText = result ? `Thời gian tới cổng: ${timeLabel(result.activeDurationMs)}. Điểm mồi: ${scoreLabel(result.foodScore)}. Điểm thời gian: ${scoreLabel(result.timeScore)}. Tổng điểm màn: ${scoreLabel(result.score)}.` : '';
      messages.levelcomplete = ['ĐÃ ĐI QUA CỔNG', 'Hoàn thành màn!', resultText, 'Màn tiếp theo'];
      const campaignScore = game.completedLevels.every((level) => level.score !== null)
        ? game.completedLevels.reduce((total, level) => total + level.score, 0) : null;
      messages.won = ['THE HUNT · HOÀN THÀNH', 'Bạn đã qua mọi cánh cổng!', `${resultText} Tổng lượt: ${scoreLabel(campaignScore)}.`, 'Chơi lại'];
      messages.gameover[2] = `Đã bắt ${game.totalCaught} con mồi, qua ${game.completedLevels.length} màn. Điểm chỉ tính các màn đã vào cổng.`;
    }
    if (messages[game.status]) {
      const [label, title, text, action] = messages[game.status];
      elements['overlay-label'].textContent = label;
      elements['overlay-title'].textContent = title;
      elements['overlay-text'].textContent = text;
      elements['overlay-action'].textContent = `${action} →`;
      elements.announcement.textContent = `${title} ${text}`;
      if (['gameover', 'won', 'levelcomplete'].includes(game.status)) elements['overlay-action'].focus({ preventScroll: true });
    }
    if (['gameover', 'won'].includes(game.status) && run && !run.finished) void finishRun();
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
      if (run) run.activeDurationMs += stepMs;
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

  function newRun() {
    return {
      runId: crypto.randomUUID(), mode, playerId: session.player?.user?.id ?? null,
      rulesVersion: session.rules?.version ?? null, activeDurationMs: 0, finished: false,
    };
  }

  function startReady() {
    if (!hasEntered) return;
    run ??= newRun();
    game.start();
    runClock();
  }

  function restart() {
    if (!hasEntered) return;
    stopClock(); game.reset(); run = newRun(); animFrame = 0; lastUiState = '';
    elements['score-message'].textContent = session.player.kind === 'guest' ? 'Lượt chơi khách không được lưu điểm.' : '';
    if (mode === 'classic') startReady();
    else render();
  }
  function togglePause() {
    game.togglePause();
    if (game.status === 'running') runClock();
    else { stopClock(); render(); }
  }

  elements['overlay-action'].addEventListener('click', () => {
    if (game.status === 'ready') startReady();
    else if (game.status === 'paused') togglePause();
    else if (game.status === 'levelcomplete') { game.nextLevel(); render(); }
    else restart();
  });
  elements.restart.addEventListener('click', restart);
  elements.pause.addEventListener('click', togglePause);

  document.querySelectorAll('[data-direction]').forEach((button) => {
    button.addEventListener('click', () => { game.queueTurn(button.dataset.direction); board.focus({ preventScroll: true }); });
  });

  document.addEventListener('keydown', (event) => {
    // Typing a name, changing a radio option, and native form shortcuts must stay native.
    if (!hasEntered || !elements['player-gate'].hidden || event.ctrlKey || event.metaKey || event.altKey
      || event.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
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
      event.preventDefault(); startReady();
    }
  });

  function busy(value) {
    elements['named-play'].disabled = value;
    elements['guest-play'].disabled = value;
    elements['cancel-player'].disabled = value;
    elements['player-name'].readOnly = value;
    document.querySelectorAll('input[name="mode"]').forEach((input) => { input.disabled = value; });
  }

  async function refreshLeaderboard() {
    const request = ++leaderboardRequest;
    const requestedMode = mode;
    try {
      const result = await session.leaderboard(requestedMode);
      if (request !== leaderboardRequest || requestedMode !== mode) return;
      elements['leaderboard-list'].replaceChildren();
      for (const entry of result.items) {
        const item = document.createElement('li');
        const row = document.createElement('div'); row.className = 'rank-row';
        const name = document.createElement('span'); name.textContent = entry.username;
        const score = document.createElement('strong'); score.textContent = entry.score.toLocaleString('vi-VN');
        row.append(name, score); item.append(row); elements['leaderboard-list'].append(item);
      }
      elements['leaderboard-message'].textContent = result.items.length ? '' : 'Chưa có thành tích.';
    } catch {
      if (request !== leaderboardRequest || requestedMode !== mode) return;
      elements['leaderboard-list'].replaceChildren();
      elements['leaderboard-message'].textContent = 'Kết nối máy chủ để xem bảng điểm.';
    }
  }

  async function finishRun() {
    const completed = run;
    completed.finished = true;
    completed.foodEaten = game.foodEaten;
    completed.endReason = game.status === 'won' ? mode === 'hunt' ? 'completed' : 'board_filled' : 'collision';
    completed.levelResults = mode === 'hunt' ? structuredClone(game.completedLevels) : [];
    elements['score-message'].textContent = session.player.kind === 'guest' ? 'Chơi khách: kết quả không được lưu.' : 'Đang kiểm tra thành tích…';
    try {
      const result = await session.saveRun(completed);
      if (run !== completed) return;
      if (!result.saved) {
        elements['score-message'].textContent = result.reason === 'guest' ? 'Chơi khách: kết quả không được lưu.'
          : result.reason === 'player_changed' ? 'Người chơi đã đổi. Kết quả cũ không được lưu sang tên mới.'
            : 'Hệ số điểm chưa được cấu hình. Kết quả này chưa được lưu.';
        return;
      }
      elements['score-message'].textContent = result.leaderboard.qualified
        ? `Đã lưu. Kỷ lục của bạn đang ở hạng ${result.leaderboard.rank} trong Top 10.` : 'Đã lưu thành tích. Kỷ lục của bạn chưa vào Top 10.';
      void refreshLeaderboard();
    } catch (error) {
      if (run !== completed) return;
      elements['score-message'].textContent = error.code === 'UNAUTHENTICATED'
        ? 'Phiên đã hết hạn. Chọn lại tên trước lượt tiếp theo.' : 'Chưa lưu được thành tích. Kết nối hoặc cấu hình game cần được kiểm tra.';
    }
  }

  async function choosePlayer(asGuest) {
    busy(true);
    elements['player-message'].textContent = '';
    try {
      if (asGuest) await session.selectGuest();
      else await session.selectName(elements['player-name'].value);
      stopClock();
      mode = document.querySelector('input[name="mode"]:checked').value;
      const huntRules = session.rules?.hunt?.levels?.length ? session.rules.hunt : globalThis.HuntRules;
      game = mode === 'hunt' ? new HuntGame({ rules: huntRules }) : new ClassicGame();
      run = null; hasEntered = true; lastUiState = ''; animFrame = 0;
      elements['player-display'].textContent = session.player.user?.username ?? 'Khách';
      elements['player-policy'].textContent = asGuest ? 'Khách không được lưu điểm.' : 'Có thể ghi danh khi điểm đủ cao.';
      elements['mode-title'].textContent = mode === 'hunt' ? 'The Hunt' : 'Classic';
      elements['mode-description'].textContent = mode === 'hunt' ? 'Săn hết mồi. Tìm cổng ra. Giữ nguyên chiều dài.' : 'Ăn mồi, dài thêm. Cẩn thận với tường.';
      elements['mode-tag'].textContent = mode === 'hunt' ? 'THE HUNT · 2 MÀN' : 'CLASSIC · TƯỜNG BAO';
      elements['hunt-stats'].hidden = mode !== 'hunt';
      elements['portal-legend'].hidden = mode !== 'hunt';
      elements['food-label'].textContent = mode === 'hunt' ? 'Mồi đã bắt' : 'Mồi đã ăn';
      document.querySelector('.swatch.food').parentElement.lastChild.textContent = mode === 'hunt' ? 'Mồi · di chuyển và né rắn' : 'Mồi · ăn để dài thêm';
      elements['demo-note'].textContent = mode === 'hunt'
        ? 'Chuột: 100 điểm · Ếch: 150 điểm. Phải đi qua cổng mới được tính điểm màn.'
        : 'Hệ số điểm Classic chưa chốt. Số mồi đã ăn không phải điểm chính thức.';
      elements['score-message'].textContent = asGuest ? 'Lượt chơi khách không được lưu điểm.' : '';
      elements['player-gate'].hidden = true; elements['game-layout'].hidden = false;
      render(); board.focus({ preventScroll: true }); void refreshLeaderboard();
    } catch (error) {
      elements['player-message'].textContent = error.code === 'VALIDATION_ERROR' ? 'Tên cần 2–30 ký tự: chữ, số, khoảng trắng hoặc _ . -. Bắt đầu bằng chữ hoặc số.'
        : error.code === 'NAME_UNAVAILABLE' ? 'Tên này đang thuộc một tài khoản cũ. Hãy chọn tên khác.'
          : error.code === 'RATE_LIMITED' ? 'Bạn đã thử quá nhiều lần. Hãy chờ một chút hoặc chơi khách.'
            : 'Chơi có tên cần máy chủ. Chạy demo trên localhost hoặc chọn chơi khách.';
    } finally { busy(false); }
  }

  elements['player-form'].addEventListener('submit', (event) => { event.preventDefault(); void choosePlayer(false); });
  elements['guest-play'].addEventListener('click', () => { void choosePlayer(true); });
  elements['refresh-leaderboard'].addEventListener('click', () => { void refreshLeaderboard(); });
  elements['change-player'].addEventListener('click', () => {
    if (game.status === 'running') togglePause();
    elements['player-gate'].hidden = false; elements['game-layout'].hidden = true;
    elements['cancel-player'].hidden = false;
    elements['player-name'].value = session.player.user?.username ?? '';
    elements['player-message'].textContent = 'Chọn lại tên hoặc chế độ sẽ bắt đầu lượt mới.';
    elements['player-name'].focus();
  });
  elements['cancel-player'].addEventListener('click', () => {
    elements['player-gate'].hidden = true; elements['game-layout'].hidden = false;
    document.querySelector(`input[name="mode"][value="${mode}"]`).checked = true;
    board.focus({ preventScroll: true });
  });

  function pauseWhenAway() {
    if (game.status === 'running') togglePause();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseWhenAway(); });
  window.addEventListener('blur', pauseWhenAway);

  busy(true);
  Promise.allSettled([session.restore(), session.loadRules()]).then(() => {
    if (session.player?.user) elements['player-name'].value = session.player.user.username;
    busy(false);
  });
  render();
})();
