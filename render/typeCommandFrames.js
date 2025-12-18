// render/typeCommandFrames.js

const { Canvas } = require("skia-canvas");
const fs = require("fs");
const path = require("path");

/* ===============================
   GLOBAL CONFIG
   =============================== */
const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;

const TERMINAL_HEIGHT = Math.floor(HEIGHT * 0.4);
const PANEL_HEIGHT = HEIGHT - TERMINAL_HEIGHT;
const EXPLANATION_TOP_PADDING = 60;

const OUTPUT_DIR = "output/typing";

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const FONT_SIZE = 58;
const EXPLANATION_FONT_SIZE = 50;

const CURSOR_BLINK_MS = 1000;
const POST_TYPE_PAUSE_MS = 3000;
const EXPLANATION_FADE_MS = 2000;
const EXPLANATION_HOLD_MS = 4000;
const FRAMES_PER_CHAR = 6;
const TERMINAL_PROMPT = "sleepy@tsp ~ % ";
const PANEL_OPACITY = 0.6;
const EXPLANATION_MAX_WIDTH = Math.floor(WIDTH * 0.75);
const EXPLANATION_LINE_HEIGHT = Math.floor(EXPLANATION_FONT_SIZE * 1.6);

/* ===============================
   SHARED FRAME COUNTER
   =============================== */
let frameIndex = 1;

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine ? currentLine + " " + words[i] : words[i];

    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/* ===============================
   FRAME RENDERER
   =============================== */
async function renderFrame(
  text,
  showCursor,
  explanationOpacity = 0,
  explanationText = ""
) {
  const canvas = new Canvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#0D0D0D";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Terminal text
  ctx.fillStyle = "#E6EDF3";
  ctx.font = `${FONT_SIZE}px JetBrains Mono`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  const startX = 80;
  const startY = 80;

  ctx.fillText(`${TERMINAL_PROMPT}${text}`, startX, startY);

  // Cursor
  if (showCursor) {
    ctx.fillStyle = "#3FB950";
    const textWidth = ctx.measureText(`${TERMINAL_PROMPT}${text}`).width;

    ctx.fillText("|", startX + textWidth, startY);
  }

  // Explanation panel
  if (explanationOpacity > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${PANEL_OPACITY * explanationOpacity})`;
    ctx.fillRect(0, TERMINAL_HEIGHT, WIDTH, HEIGHT - TERMINAL_HEIGHT);

    ctx.fillStyle = `rgba(201, 209, 217, ${explanationOpacity})`;
    ctx.font = `${EXPLANATION_FONT_SIZE}px JetBrains Mono`;
    ctx.textAlign = "center";

    const panelTop = TERMINAL_HEIGHT;

    const explanationY = panelTop + EXPLANATION_TOP_PADDING;

    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const lines = wrapText(ctx, explanationText, EXPLANATION_MAX_WIDTH);

    // Optional: limit max lines (prevents wall of text)
    const MAX_LINES = 6;
    const visibleLines = lines.slice(0, MAX_LINES);

    // Center the block vertically from explanationY
    let textY = explanationY;

    for (let i = 0; i < visibleLines.length; i++) {
      ctx.fillText(visibleLines[i], WIDTH / 2, textY);
      textY += EXPLANATION_LINE_HEIGHT;
    }
  }

  const buffer = await canvas.png;

  fs.writeFileSync(
    path.join(OUTPUT_DIR, `frame_${String(frameIndex++).padStart(6, "0")}.png`),
    buffer
  );
}

/* ===============================
   COMMAND SEQUENCE RENDERER
   =============================== */
async function renderCommandSequence(commandText, explanationText) {
  // 1. Type command
  for (let i = 1; i <= commandText.length; i++) {
    for (let f = 0; f < FRAMES_PER_CHAR; f++) {
      await renderFrame(commandText.slice(0, i), true);
    }
  }

  // 2. Cursor blink pause
  const framesPerHalfBlink = Math.floor((CURSOR_BLINK_MS / 2 / 1000) * FPS);
  const blinkCycles = Math.floor(POST_TYPE_PAUSE_MS / CURSOR_BLINK_MS);

  for (let i = 0; i < blinkCycles; i++) {
    for (let f = 0; f < framesPerHalfBlink; f++) {
      await renderFrame(commandText, true);
    }
    for (let f = 0; f < framesPerHalfBlink; f++) {
      await renderFrame(commandText, false);
    }
  }

  // 3. Explanation fade-in
  const fadeFrames = Math.floor((EXPLANATION_FADE_MS / 1000) * FPS);

  for (let i = 0; i <= fadeFrames; i++) {
    await renderFrame(commandText, false, i / fadeFrames, explanationText);
  }

  // 4. Hold explanation
  const holdFrames = Math.floor((EXPLANATION_HOLD_MS / 1000) * FPS);

  for (let i = 0; i < holdFrames; i++) {
    await renderFrame(commandText, false, 1, explanationText);
  }
}

/* ===============================
   EXPORTS
   =============================== */
module.exports = {
  renderCommandSequence,
};
