# Selected Work — hover preview clips

The Selected Work section's sticky video window (`.worx__panel`, `index.html`
`#work`) crossfades from each project's poster into a short preview clip when
its row is hovered/focused. All four clips below are live — a missing file
just leaves the poster showing (see the `error` handler in `main.js`'s
work-index IIFE), but that's a fallback, not the current state.

| file | project |
|---|---|
| `meridian.mp4` | The Meridian |
| `sonnwerk.mp4` | Sonnwerk |
| `sr-urologie.mp4` | SR Urologie |
| `education-hub.mp4` | Education Hub |

## Spec

- **Resolution**: ~1000×625 (16:10, matches the panel's `plate__frame--land`
  aspect ratio — a portrait source gets center-cropped, so prefer a landscape
  capture of the live site).
- **Length**: 4–6s.
- **Format**: silent H.264 mp4 (no audio track needed — the player is always
  muted).
- **Size**: ~1MB target, similar budget to `../builder.mp4` / `../closer.mp4`.
- **Loop**: per the one-continuous-video house rule
  (`CLAUDE.md` rule 3 / `playbook/LEARNINGS.md` #014) — no hard cut inside the
  clip, and the loop join should be frame-locked (last frame ≈ first frame) so
  it doesn't stutter while looping under `loop` playback. All four clips loop;
  no row carries `data-preview-loop="false"` any more.

## Provenance

`meridian.mp4` and `sonnwerk.mp4` are re-encodes of the agency site's own work
loops (`lab/005-agency/public/works/<slug>/loop.mp4`, 1440×810/6s), scaled to
the spec above:

```
ffmpeg -i loop.mp4 -an -vf "scale=1000:562:flags=lanczos" \
       -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -movflags +faststart out.mp4
```

Sonnwerk uses `-crf 28` — grass and horse coat are the worst case for x264 and
crf 23 put it at 2.3MB, over budget.

## Still shots — `../shots/<slug>/0{1,2,3}.webp`

The mobile carousel (`.worx__media`, `<1000px`) steps through these with
arrows; the desktop hover float still uses `../posters/` + the clips above.
Derived from `assets-in/work-shots/**` (1920×1080 PNG) at 1000×562 / `-q:v 80`.
Slug mapping is not 1:1 with the source folder names: `urologie` →
`sr-urologie`, `edu4students` → `education-hub`.
