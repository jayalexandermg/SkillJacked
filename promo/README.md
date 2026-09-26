# SkillJacked promo video

A 32 s, 16-bar (120 BPM), 1920×1080 looping product video, built as code.
`src/promo.html` is a single page whose every style is computed in `seek(t)`:
closed-form looping springs, a beat-grid timeline, seeded particles, a
screen-space cursor. Nothing depends on wall-clock time, so any frame
renders identically.

```bash
node build.js                      # inline fonts + data → dist/skilljacked-promo.html
python3 sound.py dist/sfx.wav      # synthesized UI-sound layer on the same grid

# Needs playwright-core and an ffmpeg with libx264 (PW_CORE / FFMPEG / CHROME env
# vars override the defaults). One chunk = 120 output frames = 2 s.
node render.js stills out/ 0.35,0.85            # PNG stills at given times
node render.js chunk c00.mp4 0 120               # 8 subframes/frame, tmix-blended
SUB=16 node render.js chunk c05.mp4 600 720      # 16 for fast-camera chunks (5, 6, 13)
```

Concatenate chunks with ffmpeg's concat demuxer (`-c copy`), then mux
`dist/sfx.wav` for the sound version.

Content is real: `data/` holds the skills from an actual CLI run, and every
on-screen string is product copy. The result viewer reflects the redesigned
viewer, limited to live capabilities (Claude / Cursor / Windsurf, copy,
download).
