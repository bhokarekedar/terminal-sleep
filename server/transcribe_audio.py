# transcribe_audio.py
from faster_whisper import WhisperModel
import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
AUDIO_PATH = os.path.join(BASE_DIR, "audio/git_commands_narration.wav")
OUTPUT_JSON = os.path.join(BASE_DIR, "data/transcript.json")

# Model choice:
# tiny   → fastest, lower accuracy
# small  → best balance (RECOMMENDED)
# medium → slower, very accurate
model = WhisperModel(
    "small",
    compute_type="int8"
)

segments, info = model.transcribe(
    AUDIO_PATH,
    beam_size=5,
    vad_filter=True
)

result = {
    "language": info.language,
    "duration": round(info.duration, 2),
    "segments": []
}

for seg in segments:
    result["segments"].append({
        "start": round(seg.start, 3),
        "end": round(seg.end, 3),
        "text": seg.text.strip()
    })

os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)

with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2, ensure_ascii=False)


print("✅ Transcription complete")
print(f"📄 Saved to {OUTPUT_JSON}")
