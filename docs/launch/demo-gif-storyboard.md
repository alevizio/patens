# 30-second demo GIF — frame-by-frame storyboard

The single most important asset for the launch. Goes at the top of
the README, on `/press`, in the Show HN top comment, in the
Bluesky / X intro post, in `og-default-2026.png`, and on the
`patens.design` home above-the-fold (mobile fallback for the
in-browser editor demo).

> **Bottom line.** A first-time viewer needs to come away knowing
> three things: (1) you can draw, (2) the audit teaches, (3) the
> output is a real OpenType font. Everything else is detail.

---

## Constraints

- **Length**: 28–32 seconds. Loops cleanly at the end.
- **Format**: MP4 (H.264) + WebM (VP9). Pre-generate a poster PNG
  for the README + OG image fallback.
- **Resolution**: 1920×1080 capture, deliver at 1280×720 in the
  README (retina-display crisp; under 4 MB encoded).
- **Sound**: Silent. Browsers mute autoplay, and the launch
  surfaces (Show HN, social) won't play sound. No captions are
  needed if the visuals carry the story.
- **No cursor flourishes.** Native cursor only. No click-pulse
  rings, no keyboard-shortcut overlay, no "watch this →"
  pointer. The tool sells itself.
- **No background music.** Same reason.
- **No webcam, no narrator.** The maintainer isn't on camera in
  the launch.

---

## Setup before recording

Pre-stage so the recording is one continuous take, not a stitched
edit. Edits introduce jank.

1. **Browser**: Chrome stable, 1920×1080 window, devtools closed.
   Hide bookmarks bar. Browser zoom at 100%.
2. **OS chrome**: Hide the dock. Hide the menu bar (macOS
   System Settings → Desktop & Dock → Automatically hide). One
   workspace, no other apps.
3. **Demo project**: Open `https://patens.design/project/demo/edit`
   in a fresh private window so localStorage is empty. Wait for
   the editor to settle (Pyodide etc. lazy-loaded by now;
   first-paint is clean).
4. **Glyph for the demo**: Pre-select the **lowercase `a`** in the
   glyph browser. It's the most-recognisable letterform, it has
   real audit findings (spacing-cap-mismatch, anchor-drift),
   and it's the one type designers obsess over.
5. **Wacom / stylus**: If recording the draw step from a real
   tablet, set the pressure curve to default. If using mouse,
   pre-record the stroke and play it back as a saved sketch.
6. **Window for the export**: Have Finder open in the background
   pinned to `~/Downloads` — at the end the OTF flyout looks
   alive when the file pops in.
7. **Recording tool**: ScreenStudio (macOS, free, no watermark)
   at 60fps. Cmd+Shift+5 quick-export to MP4. Then `ffmpeg -i
   in.mp4 -vf "fps=30,scale=1280:-1:flags=lanczos" -c:v libvpx-vp9
   -b:v 2M out.webm`.

---

## The 30 seconds — frame by frame

Times are cumulative seconds from frame 1. The arc:

> draw → trace → audit → fix → kerning → export

### 0:00 — 0:03 · Land in the editor (3s)

- **Frame**: Editor cold-state with the `a` glyph selected, empty
  canvas (no stroke yet), the brush tool active, the right
  sidebar showing the glyph's metrics.
- **Action**: 1.5s of stillness. Lets the viewer's eye orient.
- **Subtle motion**: Cursor enters the canvas from the bottom-
  right corner and moves toward the centre.

### 0:03 — 0:08 · Draw (5s)

- **Frame**: The canvas fills the centre. Right sidebar still
  visible.
- **Action**: One continuous stroke draws the lowercase `a` —
  bowl + stem in a single gesture (or two strokes if recorded
  with a stylus). Pressure-sensitive line tapers naturally at
  the entrance + exit.
- **What sells it**: The sketch looks like a *drawing*, not a
  vector. Designers recognise the texture immediately.

### 0:08 — 0:11 · Trace to vector (3s)

- **Frame**: The sketch is on the canvas.
- **Action**: Click "Trace" in the toolbar (or press `T`). The
  sketch fades by 50% and the Bézier contour blooms in over it,
  anchor points pulsing on for ~400ms.
- **What sells it**: A clean curve appears *from* the sketch.
  This is the moment that earns "wait, did you really write
  curve-fitting from scratch?"

### 0:11 — 0:17 · Open audit (6s)

- **Frame**: Click the **Audit** tab (top nav). Panel slides in
  from the right with 3–5 findings already populated. Each row
  has a severity badge (e.g. `Warn`, `Info`) + a one-line
  description.
- **Action**:
  - 0:11–0:13 — panel slides in, eyes scan the list.
  - 0:13–0:15 — hover on the first finding (say,
    `sidebearing-tight-stem-bowl`). A teaching tooltip
    appears with the rule + a recommended fix.
  - 0:15–0:17 — click **"Apply fix"**. The sidebearing slider
    in the right panel ticks from 28 → 42. The metrics update
    in real time. The audit row dims to `✓ resolved`.
- **What sells it**: The audit module is *teaching*, not
  scolding. The fix is one click. The metrics update visibly.

### 0:17 — 0:23 · Kerning peek (6s)

- **Frame**: Switch to the **Spacing** tab (or press `K`).
- **Action**:
  - 0:17–0:19 — the spacing surface appears with "Vav" or
    "Ave" pre-loaded. The default kerning shows the gap.
  - 0:19–0:21 — drag the kerning slider for the (V, a) pair
    from 0 to −80. The two glyphs visibly tuck together.
  - 0:21–0:23 — a small `+1 kern pair` chip animates in at
    the bottom-right. Move on.
- **What sells it**: Direct manipulation, no dialog, no
  feature-coding required. The change is the click.

### 0:23 — 0:28 · Export (5s)

- **Frame**: Click **Export → OpenType (.otf)** in the top
  right.
- **Action**:
  - 0:23–0:25 — the export-shape progress bar fills (real,
    don't fake it — buildFont() runs in ~120ms for the demo
    project, so it'll be near-instant).
  - 0:25–0:27 — the downloaded `Patens-Demo.otf` lands in
    `~/Downloads`. Finder briefly flashes the new file (already
    set up in the background).
  - 0:27–0:28 — close beat: the editor returns to the canvas,
    centred on the now-finished `a`.
- **What sells it**: A real font file lands on disk. Not a
  preview, not a render — a `.otf` you could install right now.

### 0:28 — 0:30 · Loop seam (2s)

- **Frame**: Hold on the finished `a` with the metrics visible
  and the audit panel showing `0 findings`. A subtle 1-second
  fade to the cold-state frame from 0:00.
- **Action**: Loop seamlessly back to frame 1.
- **What sells it**: Loop-stillness reads as "the work is
  done" — opposite of frantic.

---

## What deliberately isn't in this GIF

These are good features, but they fight the narrative arc of a
30-second clip.

- **Multi-master / variable axes.** Visually impressive but the
  story is harder to convey in 3 seconds. Save for a separate
  10-second loop on `/learn/variable-fonts`.
- **AI suggestions.** Lead with the audit, not the AI — per the
  standing positioning. Show the human curve-drawing, not the
  AI inferring kerns.
- **Pyodide / fontTools.** Internal plumbing; users don't care.
- **Cloud share.** The story is "your machine," not "share to a
  URL." Cloud share gets its own loop on `/share` if needed.
- **Toolbar labels / shortcut overlays.** Add no information for
  a viewer not using the tool yet.

---

## Compression + delivery checklist

After recording, before publishing:

```sh
# 1. Trim hard to the 28–32s window.
ffmpeg -i raw.mov -ss 00:00:00 -to 00:00:30 -c copy trimmed.mp4

# 2. Re-encode at delivery resolution + frame rate.
ffmpeg -i trimmed.mp4 -vf "fps=30,scale=1280:-1:flags=lanczos" \
       -c:v libx264 -preset slow -crf 23 -movflags +faststart \
       static/demo/patens-30s.mp4

# 3. WebM variant for broader browser fallback.
ffmpeg -i trimmed.mp4 -vf "fps=30,scale=1280:-1:flags=lanczos" \
       -c:v libvpx-vp9 -b:v 2M -row-mt 1 \
       static/demo/patens-30s.webm

# 4. Poster frame — first frame, JPEG for OG image fallback.
ffmpeg -i trimmed.mp4 -ss 00:00:00 -frames:v 1 \
       static/demo/patens-30s-poster.jpg

# Target sizes: MP4 < 4 MB, WebM < 3 MB, JPEG < 200 KB.
```

Then wire into the README + `/press` + `og-default-2026.png` +
the Show HN top comment.

---

## Where each variant lands

| Surface | Asset | Notes |
|---|---|---|
| `README.md` (top, after badges) | `static/demo/patens-30s.mp4` via GitHub-hosted upload | GitHub auto-renders MP4 inline. Don't link to YouTube — friction. |
| `patens.design` home (hero) | MP4 + WebM `<video autoplay muted loop playsinline>` | Mobile fallback uses the poster JPEG. |
| `/press` | Embedded + downloadable | Both formats + the raw 1920×1080 MOV as press-kit asset. |
| Show HN top comment | Direct MP4 link | HN renders inline since 2024. |
| Bluesky / X | MP4 only, ≤256 MB | Re-encode to 720p for upload if Twitter compression destroys it. |
| `og-default-2026.png` | Poster JPEG as the OG image | Already 1200×630 — crop poster, don't re-render. |

---

## Why this beats a screenshot gallery

Three screenshots can show you the surfaces. They can't show you
the *gesture* — that the audit panel is one click, that the
sidebearing edit is one drag, that the export is one keystroke.
That's the entire pitch.

Type designers have seen a hundred Figma-style "look at my UI"
shots. Most have never seen a glyph drawn with a real cursor in
a browser and exported to a real OTF in 30 seconds. The motion
is the proof.
