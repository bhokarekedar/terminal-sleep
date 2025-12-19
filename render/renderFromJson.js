// render/renderFromJson.js

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const {
  renderCommandSequence,
  renderExplanationHold,
  getCommandAnimationFrames, 
  getTypingFrames
} = require("./typeCommandFrames");

/* ===============================
   HELPERS
   =============================== */
function secondsToFrames(seconds, fps) {
  return Math.max(1, Math.ceil(seconds * fps));
}

function buildTypingAudioFilter(events) {
  return events
    .map(
      (e, i) =>
        `[2:a]atrim=0:${e.duration},adelay=${Math.floor(
          e.start * 1000
        )}|${Math.floor(e.start * 1000)},volume=0.6[a${i}]`
    )
    .join(";");
}


/* ===============================
   CONFIG
   =============================== */
const DATA_PATH = "data/git_commands.json";
const FRAMES_DIR = "output/typing";

const FPS = 30;

const NARRATION_AUDIO = "server/audio/git_commands_narration.wav";
const TYPING_AUDIO = "server/audio/bgMusic/typing.wav";

/* ===============================
   LOAD DATA
   =============================== */
const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));

const VIDEO_ID = data.videoId || `video_${Date.now()}`;
const fps = data.fps || FPS;

const OUTPUT_VIDEO = path.join(
  "output",
  "videos",
  `${VIDEO_ID}.mp4`
);

const FINAL_VIDEO = path.join(
  "output",
  "videos",
  `${VIDEO_ID}_final.mp4`
);

/* ===============================
   MAIN
   =============================== */
(async () => {
  console.log("🟢 Starting render pipeline");

  const timeline = data.timeline;
  const typingAudioEvents = [];

  /* ===============================
     RENDER FRAMES
     =============================== */
  for (const block of timeline) {
    const durationSeconds = block.end - block.start;
    const totalFrames = secondsToFrames(durationSeconds, fps);

    console.log(`▶ Rendering block: ${block.id} (${block.type})`);

    let remainingFrames = totalFrames;

    // ── Command typing animation ──
    if (block.type === "command" && block.command) {
const animationFrames = Math.min(
  getCommandAnimationFrames(block.command),
  totalFrames
);

const typingFrames = getTypingFrames(block.command);

typingAudioEvents.push({
  start: block.start,
  duration: typingFrames / fps
});

      // render typing animation ONCE
const usedFrames = await renderCommandSequence(
  block.command,
  totalFrames
);

remainingFrames = totalFrames - usedFrames;
    }

    // ── Explanation / narration hold ──
    if (remainingFrames > 0) {
      await renderExplanationHold(
        block.command || "",
        block.text,
        remainingFrames
      );
    }
  }

  console.log("🟢 All frames rendered");

  /* ===============================
     CREATE SILENT VIDEO
     =============================== */
  console.log("🎞 Assembling silent video...");

  const renderCmd = `
ffmpeg -y \
-framerate ${fps} \
-i ${FRAMES_DIR}/frame_%06d.png \
-c:v libx264 \
-pix_fmt yuv420p \
-profile:v high \
-level 4.2 \
-movflags +faststart \
${OUTPUT_VIDEO}
`;

  execSync(renderCmd, { stdio: "inherit" });

  console.log("✅ Silent video created:", OUTPUT_VIDEO);

  /* ===============================
     MUX AUDIO (NARRATION + TYPING)
     =============================== */
  console.log("🔊 Muxing narration and typing audio...");


let filterGraph = "";

if (typingAudioEvents.length > 0) {
  const typingChains = buildTypingAudioFilter(typingAudioEvents);
  const typingLabels = typingAudioEvents
    .map((_, i) => `[a${i}]`)
    .join("");

  filterGraph = `
${typingChains};
[1:a]${typingLabels}amix=inputs=${typingAudioEvents.length + 1}:normalize=0[mixed]
`;
} else {
  // No typing audio → just pass narration through
  filterGraph = `[1:a]anull[mixed]`;
}

const muxCmd = `
ffmpeg -y \
-i ${OUTPUT_VIDEO} \
-i ${NARRATION_AUDIO} \
-i ${TYPING_AUDIO} \
-filter_complex "${filterGraph}" \
-map 0:v \
-map "[mixed]" \
-c:v copy \
-c:a aac \
${FINAL_VIDEO}
`;

execSync(muxCmd, { stdio: "inherit" });

console.log("🎉 Final video created:", FINAL_VIDEO);


  /* ===============================
     CLEANUP
     =============================== */
  console.log("🧹 Cleaning up frame files...");

  for (const file of fs.readdirSync(FRAMES_DIR)) {
    if (file.endsWith(".png")) {
      fs.unlinkSync(path.join(FRAMES_DIR, file));
    }
  }

  console.log("🌙 Render pipeline finished successfully");
})();
