// render/renderFromJson.js

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { renderCommandSequence } = require("./typeCommandFrames");

/* ===============================
   PATHS
   =============================== */
const DATA_PATH = "data/git_commands.json";
const FRAMES_DIR = "output/typing";
const OUTPUT_VIDEO = "output/git_longform.mp4";
const FPS = 30;

/* ===============================
   LOAD DATA
   =============================== */
const data = JSON.parse(
  fs.readFileSync(DATA_PATH, "utf8")
);

/* ===============================
   MAIN EXECUTION
   =============================== */
(async () => {
  console.log("🟢 Starting render sequence");

  // 1. Render all frames
  for (const entry of data.commands) {
    console.log(`▶ Rendering: ${entry.command}`);
    await renderCommandSequence(
      entry.command,
      entry.explanation
    );
  }

  console.log("🟢 Frame rendering complete");

  // 2. Assemble video using FFmpeg
  console.log("🎞 Creating video via FFmpeg...");

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

  // 3. Cleanup frames
  console.log("🧹 Cleaning up frame files...");

  const files = fs.readdirSync(FRAMES_DIR);
  for (const file of files) {
    if (file.endsWith(".png")) {
      fs.unlinkSync(path.join(FRAMES_DIR, file));
    }
  }

  console.log("🧼 Frame cleanup complete");
  console.log("🌙 Rendering pipeline finished successfully");
})();
