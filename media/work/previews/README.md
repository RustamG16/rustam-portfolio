# Selected Work — hover preview clips

The Selected Work section's sticky video window (`.worx__panel`, `index.html`
`#work`) crossfades from each project's poster into a short preview clip when
its row is hovered/focused. The clips referenced below don't exist yet — the
section ships working without them; a missing file just leaves the poster
showing (see the `error` handler in `main.js`'s work-index IIFE).

Drop these three files here to light the previews up. No code change needed —
`main.js` already points at these exact paths via each row's `data-preview`.

| file | project |
|---|---|
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
  it doesn't stutter while looping under `loop` playback.
