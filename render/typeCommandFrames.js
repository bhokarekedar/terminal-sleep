// render/typeCommandFrames.js

const { Canvas } = require("skia-canvas");
const fs = require("fs");
const path = require("path");

/* ===============================
   CANVAS CONFIG
   =============================== */
const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;

const TERMINAL_HEIGHT = Math.floor(HEIGHT * 0.4);
const PANEL_HEIGHT = HEIGHT - TERMINAL_HEIGHT;

/* ===============================
   TYPOGRAPHY
   =============================== */
const TERMINAL_FONT_SIZE = 58;
const EXPLANATION_FONT_SIZE = 46;

const TERMINAL_COLOR = "#E6EDF3";
const EXPLANATION_COLOR = "rgba(201, 209, 217, 0.85)";
const BACKGROUND_COLOR = "#0B0D10";

const LINE_HEIGHT = Math.floor(EXPLANATION_FONT_SIZE * 1.55);
const MAX_TEXT_WIDTH = Math.floor(WIDTH * 0.72);

/* ===============================
   TIMING
   =============================== */
const CURSOR_BLINK_MS = 1000;
const POST_TYPE_PAUSE_MS = 2500;
const EXPLANATION_FADE_MS = 1800;
const EXPLANATION_HOLD_MS = 3500;
const FRAMES_PER_CHAR = 6;

/* ===============================
   TERMINAL
   =============================== */
const TERMINAL_PROMPT = "sleepy@tsp ~ % ";
const CURSOR_COLOR = "#3FB950";

/* ===============================
   OUTPUT
   =============================== */
const OUTPUT_DIR = "output/typing";
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

/* ===============================
   FRAME COUNTER
   =============================== */
let frameIndex = 1;

/* ===============================
   HELPERS
   =============================== */
function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }

  if (line) lines.push(line);
  return lines;
}

/* ===============================
   FRAME RENDER
   =============================== */
async function renderFrame(
  commandText,
  showCursor,
  explanationOpacity = 0,
  explanationText = ""
) {
  const canvas = new Canvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Terminal
  ctx.font = `${TERMINAL_FONT_SIZE}px JetBrains Mono`;
  ctx.fillStyle = TERMINAL_COLOR;
  ctx.textBaseline = "top";

  const terminalX = 80;
  const terminalY = 90;
  const fullText = `${TERMINAL_PROMPT}${commandText}`;

  ctx.fillText(fullText, terminalX, terminalY);

  // Cursor
  if (showCursor) {
    const w = ctx.measureText(fullText).width;
    ctx.fillStyle = CURSOR_COLOR;
    ctx.fillText("|", terminalX + w + 4, terminalY);
  }

  // Explanation panel
  if (explanationOpacity > 0) {
    ctx.fillStyle = `rgba(0,0,0,${0.55 * explanationOpacity})`;
    ctx.fillRect(0, TERMINAL_HEIGHT, WIDTH, PANEL_HEIGHT);

    ctx.font = `${EXPLANATION_FONT_SIZE}px JetBrains Mono`;
    ctx.fillStyle = `rgba(201,209,217,${explanationOpacity})`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const lines = wrapText(ctx, explanationText, MAX_TEXT_WIDTH).slice(0, 5);

    const totalHeight = lines.length * LINE_HEIGHT;
    let y = TERMINAL_HEIGHT + (PANEL_HEIGHT - totalHeight) / 2;

    for (const line of lines) {
      ctx.fillText(line, WIDTH / 2, y);
      y += LINE_HEIGHT;
    }
  }

  const buffer = await canvas.png;
  fs.writeFileSync(
    path.join(OUTPUT_DIR, `frame_${String(frameIndex++).padStart(6, "0")}.png`),
    buffer
  );
}

/* ===============================
   COMMAND SEQUENCE
   =============================== */
async function renderCommandSequence(commandText, maxFrames) {
  let used = 0;

  // typing
  for (let i = 1; i <= commandText.length && used < maxFrames; i++) {
    for (let f = 0; f < FRAMES_PER_CHAR && used < maxFrames; f++) {
      await renderFrame(commandText.slice(0, i), true);
      used++;
    }
  }

  // blink
  const blinkFrames = Math.floor((POST_TYPE_PAUSE_MS / 1000) * FPS);
  for (let i = 0; i < blinkFrames && used < maxFrames; i++) {
    await renderFrame(commandText, i % 2 === 0);
    used++;
  }

  return used;
}

async function renderExplanationHold(commandText, explanationText, frames) {
  const fadeFrames = Math.min(
    Math.floor((EXPLANATION_FADE_MS / 1000) * FPS),
    frames
  );

  // Fade-in phase
  for (let i = 0; i < fadeFrames; i++) {
    const opacity = i / fadeFrames;
    await renderFrame(commandText, false, opacity, explanationText);
  }

  // Full opacity hold
  for (let i = fadeFrames; i < frames; i++) {
    await renderFrame(commandText, false, 1, explanationText);
  }
}


function getCommandAnimationFrames(commandText) {
  const typingFrames = commandText.length * FRAMES_PER_CHAR;

  const blinkFrames =
    Math.floor((POST_TYPE_PAUSE_MS / 1000) * FPS);

  // ❌ DO NOT include fadeFrames anymore
  return typingFrames + blinkFrames;
}
function getTypingFrames(commandText) {
  return commandText.length * FRAMES_PER_CHAR;
}

/* ===============================
   EXPORT
   =============================== */
module.exports = { renderCommandSequence, renderExplanationHold, getCommandAnimationFrames, getTypingFrames };
