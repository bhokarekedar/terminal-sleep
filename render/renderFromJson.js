// render/renderFromJson.js

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { renderCommandSequence } = require("./typeCommandFrames");

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
/* ===============================
   MAIN
   =============================== */
(async () => {
  console.log("🟢 Starting render pipeline");

  // 1️⃣ Render frames for each command
  for (const entry of data.commands) {
    console.log(`▶ Rendering command: ${entry.command}`);
    await renderCommandSequence(entry.command, entry.explanation);
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

  // 3️⃣ Cleanup
  console.log("🧹 Cleaning frame files...");

  for (const file of fs.readdirSync(FRAMES_DIR)) {
    if (file.endsWith(".png")) {
      fs.unlinkSync(path.join(FRAMES_DIR, file));
    }
  }

  console.log("🌙 Render pipeline finished successfully");
})();
