# Selected Work — hover preview clips

The Selected Work section's floating hover card (`.worx__float`, `index.html`
`#work`) crossfades from each project's poster into its preview when the row is
hovered or focused. The sticky panel on the left (`.worx__panel`) is idle-only
and never reacts to hover.

**Only two rows use a clip.** `data-preview` on the row's `<a>` is the switch:
rows that carry it play the mp4 below, rows that don't cycle their three stills
from `../shots/<slug>/` instead. That keeps the page to two live video decoders
next to the hero flipbook — four previews plus the two background plates was
seven, and that combination froze both. A missing file just leaves the poster
showing (see the `error` handler in `main.js`'s work-index IIFE), but that's a
fallback, not the current state.

| file | project | row |
|---|---|---|
| `meridian.mp4` | The Meridian | 01 — clip |
| `sonnwerk.mp4` | Sonnwerk | 02 — clip |
| — | SR Urologie | 03 — stills, no `data-preview` |
| — | Education Hub | 04 — stills, no `data-preview` |

`sr-urologie.mp4` and `education-hub.mp4` were deleted when rows 03/04 moved to
stills. They are in git history if a future row wants a clip again — but adding
one back means re-checking the decoder budget above, not just restoring a file.

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
  it doesn't stutter while looping under `loop` playback. Both clips loop; no
  row carries `data-preview-loop="false"` any more.

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
arrows. On desktop the float reads the SAME `data-shots` list off the row's
sibling `.worx__media` for rows 03/04 and cycles it at 1100ms per shot — one
source of truth, one image cache, and no extra attribute on the page.
Derived from `assets-in/work-shots/**` (1920×1080 PNG) at 1000×562 / `-q:v 80`.
Slug mapping is not 1:1 with the source folder names: `urologie` →
`sr-urologie`, `edu4students` → `education-hub`.
