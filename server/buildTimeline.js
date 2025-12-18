const fs = require("fs");

const FPS = 30;
const TRANSCRIPT_PATH = "server/data/transcript.json";

function secondsToFrames(seconds) {
  return Math.max(1, Math.round(seconds * FPS));
}

function buildTimeline() {
  const transcript = JSON.parse(
    fs.readFileSync(TRANSCRIPT_PATH, "utf8")
  );

  const timeline = [];

  for (const seg of transcript.segments) {
    const durationSec = seg.end - seg.start;

    timeline.push({
      text: seg.text,
      frames: secondsToFrames(durationSec)
    });
  }

  return timeline;
}

module.exports = { buildTimeline };
