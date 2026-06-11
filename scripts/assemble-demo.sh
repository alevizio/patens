#!/usr/bin/env bash
# Assemble the CDP screencast frames from scripts/record-demo.mjs into the
# delivery assets per docs/launch/demo-gif-storyboard.md §compression.
#   /tmp/patens-demo/frames/*.jpg + meta.json (real frame timestamps)
#   -> static/demo/patens-30s.mp4 (+ .webm + poster jpg + raw master)
set -euo pipefail

SRC=/tmp/patens-demo
REPO="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$REPO/static/demo"
mkdir -p "$OUT"

# Frames arrive at the browser's compositor cadence (variable dt), so build
# an ffmpeg concat list with per-frame durations from the real timestamps.
python3 - "$SRC" <<'PY'
import json, sys, os
src = sys.argv[1]
meta = json.load(open(os.path.join(src, 'meta.json')))
ts = meta['frames']
frames = sorted(os.listdir(os.path.join(src, 'frames')))
assert len(frames) == len(ts), f"{len(frames)} frames vs {len(ts)} timestamps"
with open(os.path.join(src, 'concat.txt'), 'w') as f:
    for i, name in enumerate(frames):
        f.write(f"file 'frames/{name}'\n")
        dur = (ts[i+1] - ts[i]) if i+1 < len(ts) else 1/30
        f.write(f"duration {max(dur, 1/120):.6f}\n")
    f.write(f"file 'frames/{frames[-1]}'\n")
print(f"concat list: {len(frames)} frames, {ts[-1]-ts[0]:.2f}s real time")
PY

# Raw 1920x1080 master (press-kit asset; storyboard wants the raw MOV too).
ffmpeg -y -loglevel error -f concat -safe 0 -i "$SRC/concat.txt" \
  -vf "fps=30,format=yuv420p" -c:v libx264 -preset slow -crf 17 \
  -movflags +faststart "$SRC/patens-demo-master-raw.mp4"

# Loop seam (storyboard 0:28-0:30): 1s fade from the final hold back to
# the cold-state first frame, so the clip loops seamlessly.
ffmpeg -y -loglevel error -i "$SRC/patens-demo-master-raw.mp4" -frames:v 1 "$SRC/first-frame.png"
RAW_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SRC/patens-demo-master-raw.mp4")
OFFSET=$(python3 -c "print(f'{$RAW_DUR - 1.3:.2f}')")
ffmpeg -y -loglevel error -i "$SRC/patens-demo-master-raw.mp4" \
  -loop 1 -t 1.4 -i "$SRC/first-frame.png" \
  -filter_complex "[0:v]settb=AVTB,fps=30[main];[1:v]scale=1920:1080,format=yuv420p,settb=AVTB,fps=30[still];[main][still]xfade=transition=fade:duration=1.0:offset=$OFFSET[v]" \
  -map "[v]" -c:v libx264 -preset slow -crf 17 -movflags +faststart \
  "$SRC/patens-demo-master-1080.mp4"

# Delivery MP4 — 1280x720, 30fps, <4MB target.
ffmpeg -y -loglevel error -i "$SRC/patens-demo-master-1080.mp4" \
  -vf "fps=30,scale=1280:-2:flags=lanczos" -c:v libx264 -preset slow -crf 23 \
  -movflags +faststart -an "$OUT/patens-30s.mp4"

# WebM (VP9) fallback — <3MB target.
ffmpeg -y -loglevel error -i "$SRC/patens-demo-master-1080.mp4" \
  -vf "fps=30,scale=1280:-2:flags=lanczos" -c:v libvpx-vp9 -crf 30 -b:v 1400k -row-mt 1 \
  -an "$OUT/patens-30s.webm"

# Poster — the closing hold (finished glyph), just before the loop fade.
# Sells the outcome better than the empty cold-state first frame.
ffmpeg -y -loglevel error -ss 30.2 -i "$OUT/patens-30s.mp4" -frames:v 1 -q:v 3 \
  "$OUT/patens-30s-poster.jpg"

ls -la "$OUT"
echo "---"
for f in "$OUT"/patens-30s.mp4 "$OUT"/patens-30s.webm; do
  echo "$f: $(du -h "$f" | cut -f1) · $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")s"
done
