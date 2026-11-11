/**
 * SNORLAX TETRIS (잠만보 테트리스)
 * Pure Vanilla JavaScript (No Frameworks, No External APIs)
 */

(() => {
  'use strict';

  // ==========================================
  // 1. Constants & Configuration
  // ==========================================
  const COLS = 10;
  const ROWS = 20;
  const BLOCK_SIZE = 30; // 10 * 30 = 300px, 20 * 30 = 600px

  // Snorlax Crop Coordinates from 512x512 image
  // sx, sy, sw, sh
  const SNORLAX_BODY_CROP = { sx: 45, sy: 60, sw: 420, sh: 390 };
  const SNORLAX_FACE_CROP = { sx: 145, sy: 60, sw: 220, sh: 200 };

  // Palette inspired by Snorlax & Moonlit Night
  const PALETTE = {
    teal: '#1b3b4f',
    tealDark: '#0e2330',
    cream: '#fef3c7',
    creamDark: '#d97706',
    treeRed: '#dc2626',
    moonBlue: '#38bdf8',
    purple: '#a855f7',
    green: '#10b981',
    yellow: '#facc15'
  };

  // Mode 1: Snorlax Character Pieces (잠만보 캐릭터 모드)
  const SNORLAX_PIECES = {
    SITTING: {
      name: '앉은 잠만보',
      shape: [
        [1, 1],
        [1, 1]
      ],
      color: '#38bdf8'
    },
    SLEEPING: {
      name: '누워 자는 잠만보',
      shape: [
        [1, 1, 1],
        [1, 1, 1]
      ],
      color: '#0ea5e9'
    },
    LONG: {
      name: '길쭉 잠만보',
      shape: [
        [1, 1, 1, 1]
      ],
      color: '#22d3ee'
    },
    MINI: {
      name: '미니 잠만보',
      shape: [
        [1, 1]
      ],
      color: '#facc15'
    },
    BABY: {
      name: '먹고자',
      shape: [
        [1]
      ],
      color: '#fb923c'
    },
    STRETCH: {
      name: '기지개 잠만보',
      shape: [
        [0, 1, 0],
        [1, 1, 1]
      ],
      color: '#c084fc'
    },
    ROLL: {
      name: '뒹굴 잠만보',
      shape: [
        [1, 0],
        [1, 1]
      ],
      color: '#4ade80'
    }
  };

  // Mode 2: Classic 7 Tetromino Pieces (클래식 7블록 모드)
  const CLASSIC_PIECES = {
    I: {
      name: 'I 잠만보',
      shape: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],
      color: '#06b6d4'
    },
    O: {
      name: 'O 잠만보',
      shape: [
        [1, 1],
        [1, 1]
      ],
      color: '#eab308'
    },
    T: {
      name: 'T 잠만보',
      shape: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
      ],
      color: '#a855f7'
    },
    S: {
      name: 'S 잠만보',
      shape: [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
      ],
      color: '#22c55e'
    },
    Z: {
      name: 'Z 잠만보',
      shape: [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
      ],
      color: '#ef4444'
    },
    J: {
      name: 'J 잠만보',
      shape: [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
      ],
      color: '#3b82f6'
    },
    L: {
      name: 'L 잠만보',
      shape: [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
      ],
      color: '#f97316'
    }
  };

  // Scoring table
  const LINE_POINTS = [0, 100, 300, 500, 800];

  // Control timing
  const DAS_DELAY = 150;
  const ARR_INTERVAL = 45;
  const SOFT_DROP_INTERVAL = 40;

  // ==========================================
  // 2. DOM Elements & Image
  // ==========================================
  const boardCanvas = document.getElementById('boardCanvas');
  const boardCtx = boardCanvas.getContext('2d');
  const boardContainer = document.getElementById('boardContainer');

  const nextCanvas = document.getElementById('nextCanvas');
  const nextCtx = nextCanvas.getContext('2d');

  const scoreDisplay = document.getElementById('scoreDisplay');
  const levelDisplay = document.getElementById('levelDisplay');
  const linesDisplay = document.getElementById('linesDisplay');

  const pauseBtn = document.getElementById('pauseBtn');
  const pauseBtnIcon = document.getElementById('pauseBtnIcon');
  const pauseBtnText = document.getElementById('pauseBtnText');
  const restartBtn = document.getElementById('restartBtn');

  const pauseOverlay = document.getElementById('pauseOverlay');
  const overlayResumeBtn = document.getElementById('overlayResumeBtn');

  const gameOverOverlay = document.getElementById('gameOverOverlay');
  const overlayRestartBtn = document.getElementById('overlayRestartBtn');
  const finalScoreDisplay = document.getElementById('finalScoreDisplay');
  const finalStatsDisplay = document.getElementById('finalStatsDisplay');

  const modeToggleBtn = document.getElementById('modeToggleBtn');
  const modeBtnText = document.getElementById('modeBtnText');
  const modeBtnIcon = document.getElementById('modeBtnIcon');

  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundBtnText = document.getElementById('soundBtnText');
  const soundBtnIcon = document.getElementById('soundBtnIcon');

  // Load User's Snorlax Image
  const snorlaxImg = new Image();
  snorlaxImg.src = 'snorlax.png';
  snorlaxImg.onload = () => {
    render();
    renderNextPiece();
  };

  // ==========================================
  // 3. Audio Engine (Web Audio API Synthesizer)
  // ==========================================
  let soundEnabled = true;
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(freq, type = 'sine', duration = 0.08, gainVal = 0.15) {
    if (!soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  function playMoveSound() {
    playTone(260, 'sine', 0.04, 0.08);
  }

  function playRotateSound() {
    playTone(420, 'triangle', 0.07, 0.12);
  }

  function playDropSound() {
    // Heavy "쿵!" bass impact sound
    if (!soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.18);

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch (e) {}
  }

  function playClearSound() {
    // Cheerful arpeggio
    if (!soundEnabled) return;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      setTimeout(() => {
        playTone(freq, 'sine', 0.12, 0.18);
      }, i * 60);
    });
  }

  function playGameOverSound() {
    if (!soundEnabled) return;
    [392.00, 349.23, 311.13, 261.63].forEach((freq, i) => {
      setTimeout(() => {
        playTone(freq, 'triangle', 0.2, 0.15);
      }, i * 110);
    });
  }

  // ==========================================
  // 4. Game State Variables
  // ==========================================
  let currentMode = 'SNORLAX_CHARACTER'; // 'SNORLAX_CHARACTER' | 'CLASSIC_7BAG'

  let board = [];
  let score = 0;
  let level = 1;
  let linesCleared = 0;

  let gameState = 'PLAYING'; // 'PLAYING' | 'PAUSED' | 'GAMEOVER'

  let bag = [];
  let currentPiece = null;
  let nextPiece = null;

  let animationFrameId = null;
  let lastTime = 0;
  let dropCounter = 0;
  let clearingLines = null;
  let clearTimer = 0;

  // Floating Zzz sleep particles
  const zzzParticles = [];

  // Key tracking
  const keyState = {
    ArrowLeft: { isDown: false, timeout: null, interval: null },
    ArrowRight: { isDown: false, timeout: null, interval: null },
    ArrowDown: false
  };

  let isSpacePressed = false;
  let isRotatePressed = false;

  // ==========================================
  // 5. Helper Functions
  // ==========================================

  function getDropInterval(lvl) {
    const calculated = 800 * Math.pow(0.85, lvl - 1);
    return Math.max(100, Math.round(calculated));
  }

  function createEmptyBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  }

  function getActivePieceSet() {
    return currentMode === 'SNORLAX_CHARACTER' ? SNORLAX_PIECES : CLASSIC_PIECES;
  }

  function generateShuffledBag() {
    const pieceSet = getActivePieceSet();
    const keys = Object.keys(pieceSet);
    const newBag = [...keys];
    for (let i = newBag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newBag[i], newBag[j]] = [newBag[j], newBag[i]];
    }
    return newBag;
  }

  function getNextPieceFromBag() {
    if (bag.length === 0) {
      bag = generateShuffledBag();
    }
    const pieceSet = getActivePieceSet();
    const key = bag.shift();
    const config = pieceSet[key] || Object.values(pieceSet)[0];

    return {
      key: key,
      name: config.name,
      shape: config.shape.map(row => [...row]),
      color: config.color,
      x: 0,
      y: 0
    };
  }

  function checkCollision(shape, px, py) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const boardX = px + c;
          const boardY = py + r;

          if (boardX < 0 || boardX >= COLS) return true;
          if (boardY >= ROWS) return true;
          if (boardY >= 0 && board[boardY][boardX] !== 0) return true;
        }
      }
    }
    return false;
  }

  function rotateMatrix(matrix) {
    const N = matrix.length;
    const M = matrix[0].length;
    // Handle non-square matrices (e.g. 3x2 -> 2x3)
    const result = Array.from({ length: M }, () => Array(N).fill(0));
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < M; c++) {
        result[c][N - 1 - r] = matrix[r][c];
      }
    }
    return result;
  }

  function getGhostY() {
    if (!currentPiece) return 0;
    let gy = currentPiece.y;
    while (!checkCollision(currentPiece.shape, currentPiece.x, gy + 1)) {
      gy++;
    }
    return gy;
  }

  // ==========================================
  // 6. Game Mechanics
  // ==========================================

  function spawnPiece() {
    if (!nextPiece) {
      nextPiece = getNextPieceFromBag();
    }
    currentPiece = nextPiece;
    nextPiece = getNextPieceFromBag();

    const shape = currentPiece.shape;
    currentPiece.x = Math.floor((COLS - shape[0].length) / 2);

    let topOccupied = 0;
    for (let r = 0; r < shape.length; r++) {
      if (shape[r].some(v => v !== 0)) {
        topOccupied = r;
        break;
      }
    }
    currentPiece.y = -topOccupied;

    if (checkCollision(currentPiece.shape, currentPiece.x, currentPiece.y)) {
      handleGameOver();
      return false;
    }

    // Spawn a sleepy Zzz particle above Snorlax
    spawnZzzParticle(currentPiece.x + shape[0].length / 2, Math.max(0, currentPiece.y));

    renderNextPiece();
    return true;
  }

  function moveHorizontal(dir) {
    if (gameState !== 'PLAYING' || !currentPiece || clearingLines) return false;
    if (!checkCollision(currentPiece.shape, currentPiece.x + dir, currentPiece.y)) {
      currentPiece.x += dir;
      playMoveSound();
      render();
      return true;
    }
    return false;
  }

  function rotateCurrentPiece() {
    if (gameState !== 'PLAYING' || !currentPiece || clearingLines) return;

    // 1x1 block doesn't need rotation
    if (currentPiece.shape.length === 1 && currentPiece.shape[0].length === 1) return;

    const rotated = rotateMatrix(currentPiece.shape);
    const kicks = [
      [0, 0],
      [-1, 0],
      [1, 0],
      [-2, 0],
      [2, 0],
      [0, -1]
    ];

    for (let i = 0; i < kicks.length; i++) {
      const [offsetX, offsetY] = kicks[i];
      if (!checkCollision(rotated, currentPiece.x + offsetX, currentPiece.y + offsetY)) {
        currentPiece.shape = rotated;
        currentPiece.x += offsetX;
        currentPiece.y += offsetY;
        playRotateSound();
        render();
        return;
      }
    }
  }

  function dropStep() {
    if (gameState !== 'PLAYING' || !currentPiece || clearingLines) return false;

    if (!checkCollision(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) {
      currentPiece.y++;
      dropCounter = 0;
      render();
      return true;
    } else {
      lockPiece();
      return false;
    }
  }

  function hardDrop() {
    if (gameState !== 'PLAYING' || !currentPiece || clearingLines) return;

    const targetY = getGhostY();
    currentPiece.y = targetY;

    // Screen shake on heavy Snorlax landing (쿵!)
    triggerScreenShake();
    playDropSound();

    lockPiece();
  }

  function triggerScreenShake() {
    boardContainer.classList.remove('shake');
    void boardContainer.offsetWidth; // trigger reflow
    boardContainer.classList.add('shake');
    setTimeout(() => {
      boardContainer.classList.remove('shake');
    }, 180);
  }

  function lockPiece() {
    const shape = currentPiece.shape;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const boardY = currentPiece.y + r;
          const boardX = currentPiece.x + c;
          if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
            board[boardY][boardX] = {
              color: currentPiece.color,
              pieceKey: currentPiece.key,
              isSnorlax: true
            };
          }
        }
      }
    }

    currentPiece = null;
    checkLineClears();
  }

  function checkLineClears() {
    const fullRows = [];
    for (let r = 0; r < ROWS; r++) {
      if (board[r].every(cell => cell !== 0)) {
        fullRows.push(r);
      }
    }

    if (fullRows.length > 0) {
      clearingLines = fullRows;
      clearTimer = 160;
      playClearSound();
      render();
    } else {
      spawnPiece();
      render();
    }
  }

  function finalizeLineClears() {
    const numCleared = clearingLines.length;

    board = board.filter((_, idx) => !clearingLines.includes(idx));
    while (board.length < ROWS) {
      board.unshift(Array(COLS).fill(0));
    }

    const pointsGained = (LINE_POINTS[numCleared] || 0) * level;
    score += pointsGained;

    linesCleared += numCleared;
    level = Math.floor(linesCleared / 10) + 1;

    updateUI();

    clearingLines = null;
    spawnPiece();
    render();
  }

  function updateUI() {
    scoreDisplay.textContent = score.toLocaleString();
    levelDisplay.textContent = level;
    linesDisplay.textContent = linesCleared;
  }

  function handleGameOver() {
    gameState = 'GAMEOVER';
    stopInputRepeat();
    playGameOverSound();

    finalScoreDisplay.textContent = score.toLocaleString();
    finalStatsDisplay.textContent = `레벨 ${level} | ${linesCleared}줄 제거`;
    gameOverOverlay.style.display = 'flex';
    render();
  }

  function togglePause() {
    if (gameState === 'GAMEOVER') return;

    if (gameState === 'PLAYING') {
      gameState = 'PAUSED';
      stopInputRepeat();
      pauseBtn.classList.add('is-paused');
      pauseBtnIcon.textContent = '▶';
      pauseBtnText.textContent = '계속하기';
      pauseOverlay.style.display = 'flex';
    } else if (gameState === 'PAUSED') {
      gameState = 'PLAYING';
      lastTime = performance.now();
      pauseBtn.classList.remove('is-paused');
      pauseBtnIcon.textContent = '⏸';
      pauseBtnText.textContent = '일시정지';
      pauseOverlay.style.display = 'none';
    }
    render();
  }

  function forcePause() {
    if (gameState === 'PLAYING') {
      togglePause();
    }
  }

  function restartGame() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    stopInputRepeat();

    board = createEmptyBoard();
    score = 0;
    level = 1;
    linesCleared = 0;
    gameState = 'PLAYING';
    clearingLines = null;
    clearTimer = 0;
    dropCounter = 0;
    zzzParticles.length = 0;

    bag = [];
    currentPiece = null;
    nextPiece = null;

    updateUI();
    pauseOverlay.style.display = 'none';
    gameOverOverlay.style.display = 'none';
    pauseBtn.classList.remove('is-paused');
    pauseBtnIcon.textContent = '⏸';
    pauseBtnText.textContent = '일시정지';

    spawnPiece();

    lastTime = performance.now();
    animationFrameId = requestAnimationFrame(gameLoop);

    render();
  }

  function toggleGameMode() {
    if (currentMode === 'SNORLAX_CHARACTER') {
      currentMode = 'CLASSIC_7BAG';
      modeBtnIcon.textContent = '🧩';
      modeBtnText.textContent = '클래식 7블록 모드';
    } else {
      currentMode = 'SNORLAX_CHARACTER';
      modeBtnIcon.textContent = '🐻';
      modeBtnText.textContent = '잠만보 단독 낙하 모드';
    }
    restartGame();
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    if (soundEnabled) {
      soundBtnIcon.textContent = '🔊';
      soundBtnText.textContent = '효과음: 켜짐';
      playMoveSound();
    } else {
      soundBtnIcon.textContent = '🔇';
      soundBtnText.textContent = '효과음: 꺼짐';
    }
  }

  // ==========================================
  // 7. Zzz Sleep Particles
  // ==========================================
  function spawnZzzParticle(gridX, gridY) {
    zzzParticles.push({
      x: gridX * BLOCK_SIZE,
      y: gridY * BLOCK_SIZE,
      text: Math.random() > 0.4 ? 'Z' : 'z',
      size: 14 + Math.random() * 8,
      alpha: 0.9,
      vx: (Math.random() - 0.2) * 0.4,
      vy: -0.6 - Math.random() * 0.5,
      life: 1.0
    });
  }

  function updateZzzParticles(deltaTime) {
    for (let i = zzzParticles.length - 1; i >= 0; i--) {
      const p = zzzParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= deltaTime * 0.001;
      p.alpha = Math.max(0, p.life);
      if (p.life <= 0) {
        zzzParticles.splice(i, 1);
      }
    }
  }

  function drawZzzParticles(ctx) {
    ctx.save();
    ctx.font = 'bold 16px "Jua", "Outfit", sans-serif';
    ctx.textAlign = 'center';

    zzzParticles.forEach(p => {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = '#bae6fd';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
      ctx.fillText(p.text, p.x, p.y);
    });

    ctx.restore();
  }

  // ==========================================
  // 8. Rendering Engine (Snorlax Graphics)
  // ==========================================

  /**
   * Draw a single Snorlax block cell
   */
  function drawSnorlaxBlock(ctx, x, y, size, color, alpha = 1.0) {
    ctx.save();
    ctx.globalAlpha = alpha;

    const radius = 5;

    // Outer glow / background
    ctx.fillStyle = '#0a1926';
    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, size - 2, size - 2, radius);
    ctx.fill();

    // If Snorlax image is loaded, draw Snorlax inside the cell!
    if (snorlaxImg.complete && snorlaxImg.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, size - 4, size - 4, radius - 1);
      ctx.clip();
      ctx.drawImage(
        snorlaxImg,
        SNORLAX_BODY_CROP.sx,
        SNORLAX_BODY_CROP.sy,
        SNORLAX_BODY_CROP.sw,
        SNORLAX_BODY_CROP.sh,
        x + 1,
        y + 1,
        size - 2,
        size - 2
      );
      ctx.restore();
    } else {
      // Fallback: stylized Snorlax face (-_-)
      ctx.fillStyle = '#1b3b4f';
      ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2 + 2, size * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    // Border highlight
    ctx.strokeStyle = color || 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, size - 2, size - 2, radius);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draw Snorlax character spanning an active falling piece
   */
  function drawFallingSnorlax(ctx, piece, posX, posY, alpha = 1.0, isGhost = false) {
    ctx.save();
    ctx.globalAlpha = alpha;

    const shape = piece.shape;
    const numRows = shape.length;
    const numCols = shape[0].length;
    const totalW = numCols * BLOCK_SIZE;
    const totalH = numRows * BLOCK_SIZE;
    const originX = posX * BLOCK_SIZE;
    const originY = posY * BLOCK_SIZE;

    // Check if this piece is a 2x2 or 3x2 Snorlax block
    const isSnorlaxBox = (numCols === 2 && numRows === 2) || (numCols === 3 && numRows === 2);

    if (isGhost) {
      // Ghost Snorlax: dashed outline and soft tint
      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          if (shape[r][c]) {
            const bx = (posX + c) * BLOCK_SIZE;
            const by = (posY + r) * BLOCK_SIZE;

            ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
            ctx.beginPath();
            ctx.roundRect(bx + 1, by + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2, 5);
            ctx.fill();

            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 2]);
            ctx.beginPath();
            ctx.roundRect(bx + 1, by + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2, 5);
            ctx.stroke();
          }
        }
      }
    } else {
      // Active Snorlax:
      // If Snorlax image is loaded, draw Snorlax spanning the piece with clip!
      if (snorlaxImg.complete && snorlaxImg.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        for (let r = 0; r < numRows; r++) {
          for (let c = 0; c < numCols; c++) {
            if (shape[r][c]) {
              const bx = (posX + c) * BLOCK_SIZE;
              const by = (posY + r) * BLOCK_SIZE;
              ctx.roundRect(bx + 1, by + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2, 5);
            }
          }
        }
        ctx.clip();

        // Draw Snorlax across the bounding area
        ctx.drawImage(
          snorlaxImg,
          SNORLAX_BODY_CROP.sx,
          SNORLAX_BODY_CROP.sy,
          SNORLAX_BODY_CROP.sw,
          SNORLAX_BODY_CROP.sh,
          originX,
          originY,
          totalW,
          totalH
        );

        ctx.restore();

        // Stroke borders for each cell
        for (let r = 0; r < numRows; r++) {
          for (let c = 0; c < numCols; c++) {
            if (shape[r][c]) {
              const bx = (posX + c) * BLOCK_SIZE;
              const by = (posY + r) * BLOCK_SIZE;
              ctx.strokeStyle = piece.color || 'rgba(56, 189, 248, 0.7)';
              ctx.lineWidth = 1.5;
              ctx.setLineDash([]);
              ctx.beginPath();
              ctx.roundRect(bx + 1, by + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2, 5);
              ctx.stroke();
            }
          }
        }
      } else {
        // Fallback per-cell
        for (let r = 0; r < numRows; r++) {
          for (let c = 0; c < numCols; c++) {
            if (shape[r][c]) {
              const bx = (posX + c) * BLOCK_SIZE;
              const by = (posY + r) * BLOCK_SIZE;
              drawSnorlaxBlock(ctx, bx, by, BLOCK_SIZE, piece.color, alpha);
            }
          }
        }
      }
    }

    ctx.restore();
  }

  /**
   * Main Board Rendering
   */
  function render() {
    // 1. Board background
    boardCtx.fillStyle = '#040813';
    boardCtx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);

    // 2. Grid lines
    boardCtx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
    boardCtx.lineWidth = 1;
    for (let c = 1; c < COLS; c++) {
      boardCtx.beginPath();
      boardCtx.moveTo(c * BLOCK_SIZE + 0.5, 0);
      boardCtx.lineTo(c * BLOCK_SIZE + 0.5, ROWS * BLOCK_SIZE);
      boardCtx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      boardCtx.beginPath();
      boardCtx.moveTo(0, r * BLOCK_SIZE + 0.5);
      boardCtx.lineTo(COLS * BLOCK_SIZE, r * BLOCK_SIZE + 0.5);
      boardCtx.stroke();
    }

    // 3. Locked Snorlax Blocks on the Board
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = board[r][c];
        if (cell !== 0) {
          if (clearingLines && clearingLines.includes(r)) {
            // Line clear flash
            boardCtx.save();
            boardCtx.fillStyle = '#ffffff';
            boardCtx.shadowColor = '#38bdf8';
            boardCtx.shadowBlur = 18;
            boardCtx.fillRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            boardCtx.restore();
          } else {
            drawSnorlaxBlock(boardCtx, c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, cell.color);
          }
        }
      }
    }

    // 4. Ghost Snorlax
    if (gameState === 'PLAYING' && currentPiece && !clearingLines) {
      const ghostY = getGhostY();
      drawFallingSnorlax(boardCtx, currentPiece, currentPiece.x, ghostY, 0.45, true);
    }

    // 5. Active Falling Snorlax
    if (currentPiece && !clearingLines) {
      drawFallingSnorlax(boardCtx, currentPiece, currentPiece.x, currentPiece.y, 1.0, false);
    }

    // 6. Draw floating Zzz sleep particles
    drawZzzParticles(boardCtx);
  }

  /**
   * Render Next Snorlax Preview
   */
  function renderNextPiece() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (!nextPiece) return;

    const shape = nextPiece.shape;
    const numRows = shape.length;
    const numCols = shape[0].length;
    const previewSize = 22;

    const occupiedW = numCols * previewSize;
    const occupiedH = numRows * previewSize;

    const startX = Math.round((nextCanvas.width - occupiedW) / 2);
    const startY = Math.round((nextCanvas.height - occupiedH) / 2);

    // If Snorlax image is loaded, draw Snorlax across next piece
    if (snorlaxImg.complete && snorlaxImg.naturalWidth > 0) {
      nextCtx.save();
      nextCtx.beginPath();
      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          if (shape[r][c]) {
            const bx = startX + c * previewSize;
            const by = startY + r * previewSize;
            nextCtx.roundRect(bx + 1, by + 1, previewSize - 2, previewSize - 2, 4);
          }
        }
      }
      nextCtx.clip();

      nextCtx.drawImage(
        snorlaxImg,
        SNORLAX_BODY_CROP.sx,
        SNORLAX_BODY_CROP.sy,
        SNORLAX_BODY_CROP.sw,
        SNORLAX_BODY_CROP.sh,
        startX,
        startY,
        occupiedW,
        occupiedH
      );

      nextCtx.restore();

      // Border outline
      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          if (shape[r][c]) {
            const bx = startX + c * previewSize;
            const by = startY + r * previewSize;
            nextCtx.strokeStyle = nextPiece.color || '#38bdf8';
            nextCtx.lineWidth = 1.5;
            nextCtx.beginPath();
            nextCtx.roundRect(bx + 1, by + 1, previewSize - 2, previewSize - 2, 4);
            nextCtx.stroke();
          }
        }
      }
    } else {
      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          if (shape[r][c]) {
            const bx = startX + c * previewSize;
            const by = startY + r * previewSize;
            drawSnorlaxBlock(nextCtx, bx, by, previewSize, nextPiece.color);
          }
        }
      }
    }
  }

  // ==========================================
  // 9. Single Game Loop (requestAnimationFrame)
  // ==========================================
  let zzzSpawnTimer = 0;

  function gameLoop(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;

    if (gameState === 'PLAYING') {
      if (clearingLines) {
        clearTimer -= deltaTime;
        if (clearTimer <= 0) {
          finalizeLineClears();
        }
      } else {
        const currentDropInterval = keyState.ArrowDown ? SOFT_DROP_INTERVAL : getDropInterval(level);

        dropCounter += deltaTime;
        if (dropCounter >= currentDropInterval) {
          dropStep();
        }

        // Periodically spawn floating Zzz from falling Snorlax
        zzzSpawnTimer += deltaTime;
        if (zzzSpawnTimer >= 700 && currentPiece) {
          zzzSpawnTimer = 0;
          spawnZzzParticle(currentPiece.x + currentPiece.shape[0].length / 2, Math.max(0, currentPiece.y));
        }
      }

      updateZzzParticles(deltaTime);
    }

    render();
    animationFrameId = requestAnimationFrame(gameLoop);
  }

  // ==========================================
  // 10. Keyboard Controls
  // ==========================================
  function stopInputRepeat() {
    ['ArrowLeft', 'ArrowRight'].forEach(key => {
      const state = keyState[key];
      if (state.timeout) {
        clearTimeout(state.timeout);
        state.timeout = null;
      }
      if (state.interval) {
        clearInterval(state.interval);
        state.interval = null;
      }
      state.isDown = false;
    });
    keyState.ArrowDown = false;
    isSpacePressed = false;
    isRotatePressed = false;
  }

  function startHorizontalInput(key, dir) {
    const oppositeKey = key === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft';
    stopHorizontalInput(oppositeKey);

    const state = keyState[key];
    if (state.isDown) return;

    state.isDown = true;
    moveHorizontal(dir);

    if (state.timeout) clearTimeout(state.timeout);
    if (state.interval) clearInterval(state.interval);

    state.timeout = setTimeout(() => {
      if (state.isDown && gameState === 'PLAYING') {
        state.interval = setInterval(() => {
          if (state.isDown && gameState === 'PLAYING') {
            moveHorizontal(dir);
          } else {
            clearInterval(state.interval);
            state.interval = null;
          }
        }, ARR_INTERVAL);
      }
    }, DAS_DELAY);
  }

  function stopHorizontalInput(key) {
    const state = keyState[key];
    state.isDown = false;
    if (state.timeout) {
      clearTimeout(state.timeout);
      state.timeout = null;
    }
    if (state.interval) {
      clearInterval(state.interval);
      state.interval = null;
    }
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }

    if (e.key === 'p' || e.key === 'P') {
      togglePause();
      return;
    }

    if (gameState !== 'PLAYING') return;

    switch (e.key) {
      case 'ArrowLeft':
        startHorizontalInput('ArrowLeft', -1);
        break;

      case 'ArrowRight':
        startHorizontalInput('ArrowRight', 1);
        break;

      case 'ArrowDown':
        keyState.ArrowDown = true;
        if (!e.repeat) {
          dropStep();
        }
        break;

      case 'ArrowUp':
        if (!isRotatePressed) {
          isRotatePressed = true;
          rotateCurrentPiece();
        }
        break;

      case ' ':
        if (!isSpacePressed) {
          isSpacePressed = true;
          hardDrop();
        }
        break;
    }
  });

  window.addEventListener('keyup', (e) => {
    switch (e.key) {
      case 'ArrowLeft':
        stopHorizontalInput('ArrowLeft');
        break;

      case 'ArrowRight':
        stopHorizontalInput('ArrowRight');
        break;

      case 'ArrowDown':
        keyState.ArrowDown = false;
        break;

      case 'ArrowUp':
        isRotatePressed = false;
        break;

      case ' ':
        isSpacePressed = false;
        break;
    }
  });

  // ==========================================
  // 11. Buttons & Window Event Listeners
  // ==========================================
  pauseBtn.addEventListener('click', togglePause);
  overlayResumeBtn.addEventListener('click', togglePause);

  restartBtn.addEventListener('click', restartGame);
  overlayRestartBtn.addEventListener('click', restartGame);

  modeToggleBtn.addEventListener('click', toggleGameMode);
  soundToggleBtn.addEventListener('click', toggleSound);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      forcePause();
    }
  });

  window.addEventListener('blur', () => {
    forcePause();
  });

  // ==========================================
  // 12. Initialization
  // ==========================================
  restartGame();

})();
