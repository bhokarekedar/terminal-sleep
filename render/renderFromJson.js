// render/renderFromJson.js

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { renderCommandSequence, renderExplanationHold, getCommandAnimationFrames } = require("./typeCommandFrames");

function secondsToFrames(seconds, fps) {
  return Math.max(1, Math.round(seconds * fps));
}

/* ===============================
   CONFIG
   =============================== */
const DATA_PATH = "data/git_commands.json";
const FRAMES_DIR = "output/typing";


const FPS = 30;

/* ===============================
   LOAD DATA
   =============================== */
const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
const VIDEO_ID = data.videoId || `video_${Date.now()}`;

const OUTPUT_VIDEO = path.join(
  "output",
  "videos",
  `${VIDEO_ID}.mp4`
);
const AUDIO_PATH = "server/audio/git_commands_narration.wav";

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

  // 1️⃣ Render frames for each command
const timeline = data.timeline;
const fps = data.fps || FPS;


for (const block of timeline) {
  const durationSeconds = block.end - block.start;
  const totalFrames = secondsToFrames(durationSeconds, fps);

  console.log(`▶ Rendering block: ${block.id} (${block.type})`);

  let remainingFrames = totalFrames;

  // 1️⃣ Command animation (counts toward timeline time)
  if (block.type === "command" && block.command) {
    const animationFrames =
      getCommandAnimationFrames(block.command);

    await renderCommandSequence(block.command, "");

    remainingFrames -= animationFrames;
  }

  // 2️⃣ Hold explanation for remaining time only
  if (remainingFrames > 0) {
    await renderExplanationHold(
      block.command || "",
      block.text,
      remainingFrames
    );
  }
}



  console.log("🟢 All frames rendered");

  // 2️⃣ Assemble video
  console.log("🎞 Assembling video with FFmpeg...");

  const ffmpegCmd = `
ffmpeg -y \
-framerate ${FPS} \
-i ${FRAMES_DIR}/frame_%06d.png \
-c:v libx264 \
-pix_fmt yuv420p \
-profile:v high \
-level 4.2 \
-movflags +faststart \
${OUTPUT_VIDEO}
`;

  execSync(ffmpegCmd, { stdio: "inherit" });

  console.log("✅ Video created:", OUTPUT_VIDEO);
console.log("🔊 Muxing audio with video...");

const muxCmd = `
ffmpeg -y \
-i ${OUTPUT_VIDEO} \
-i ${AUDIO_PATH} \
-c:v copy \
-c:a aac \
-shortest \
${FINAL_VIDEO}
`;

execSync(muxCmd, { stdio: "inherit" });

console.log("🎉 Final video with audio created:", FINAL_VIDEO);

  // 3️⃣ Cleanup
  console.log("🧹 Cleaning frame files...");

  for (const file of fs.readdirSync(FRAMES_DIR)) {
    if (file.endsWith(".png")) {
      fs.unlinkSync(path.join(FRAMES_DIR, file));
    }
  }

  console.log("🌙 Render pipeline finished successfully");
})();
