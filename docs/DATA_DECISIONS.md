# Data decisions (IRA Towers)

> Carried over from the Spacer_app repository. The generated data and images under `frontend/src/data/generated/` and
> `frontend/public/assets/` were produced there by its Python extraction scripts (`npm run assets:extract`,
> `geometry:*`, `tours:placeholders`) from the brochure PDF. Neither the scripts nor the PDF are part of this
> frontend repository, so the commands below refer to that repository. See [MIGRATION.md](MIGRATION.md).

**Source of truth:** `docs/Latest_Broucher.pdf` (24 pages). The site must not invent, round, or
"fix" brochure data. Where the brochure is inconsistent, both values are kept and the conflict is
recorded as an explicit exception in the data layer.

## Recorded brochure inconsistencies (unresolved — do not correct)

| # | Topic | Brochure says | Conflict | Decision |
|---|---|---|---|---|
| 1 | Block C unit count | 154 units (p3) | Typical floor plan has 14 flats/floor × 10 floors (C+S+10) = 140 | Keep **154** as the declared count. Generated count (140) is reported as a known mismatch, not auto-reconciled. |
| 2 | Block C flat numbering | Area statement lists flat **13** (3BHK, West, 1840 sft) (p12) | Master plan labels the same position **12 A** (p6) | Keep both as an explicit data exception on that stack. |
| 3 | Clubhouse area | **18,600 sft** (p3, p21) | Master plan label reads **18,648 sft** (p6) | Headline/project value = 18,600 sft. Master-plan label preserves 18,648 sft. |

## Provisional conventions

- **Apartment IDs:** `{Block}-{FF}{SS}`, e.g. `A-0101` = Block A, floor 01, flat 01.
  Marked **provisional**. The brochure does not define a numbering scheme.
- **Availability:** every apartment is `unknown`. UI shows **Enquire**.
- **Price:** `unknown` (not in brochure). UI shows **Enquire**.

- **Floor numbering:** residential floors are numbered 01–10 above the stilt. The brochure says
  only "C+S+10", so this numbering is provisional too.

## How the data layer applies these (Phase 1)

- Code: `frontend/src/data/` (types, exceptions, blocks, project, generator, validator). Entry point: `@/data`.
- Floors and apartments are **generated** from each block's typical-floor area statement:
  A 11 × 10 = 110, B 11 × 10 = 110, C 14 × 10 = **140**, for a total of **360**.
  Declared counts (110 / 110 / 154 = 374) are stored separately and never padded.
- `npm test` runs `validateProjectData`. It must report **no errors** and exactly these
  **known mismatches**, each tied to an exception above:
  1. Block C: declared 154 vs generated 140 (`block-c-unit-count`)
  2. Total: declared 374 vs generated 360 (`block-c-unit-count`)
  3. Block C flat 13 labelled "12 A" on the master plan (`block-c-flat-13-label`)
  4. Clubhouse 18,600 vs 18,648 sft (`clubhouse-area`)
- Area statements (p10–12) and master-plan tiles (p6) are transcribed **separately** and
  cross-checked, so a typo in either one fails the tests.

## Floor plans (Phase 4)

- **Flat regions** on each typical floor plan (p10–12) come from
  `scripts/extract_floor_plan_geometry.py` (`npm run geometry:floorplans`). The script uses the red
  flat tags and "BHK / SFT" badges printed on the plan. Flats are matched to the master-plan tiles by
  column and top-to-bottom order. The printed tag and badge of all 36 flats were checked by eye
  against that matching. Tests validate counts, bounds, overlaps and the badge/tag containment.
- **Room names and sizes** (`frontend/src/data/rooms.js`) were transcribed **verbatim** from each flat, read
  individually at native resolution, with covered labels zoomed and confirmed. They are shown
  exactly as printed. Tests check that each flat's bedroom count (incl. M.BEDROOM) equals its
  area-statement BHK, and that every flat has a kitchen and a WC per bedroom.
- **Printed quirks kept as-is:** C-13 Drawing `14'1"X11"3"` (typo, also in `brochureTypos`);
  C-08 bedrooms `…X11'0"`; B-07 kitchen `10'7"x15'8"`. Balconies and wash areas print a width
  only.
- **Flat 13 / "12 A":** the floor-plan tag on p12 also prints **13**. It is recorded as a third
  statement on the exception. The discrepancy with the master plan is still kept, not resolved.
- Every residential floor uses the same typical plan. The drawing does not change per floor, only
  the provisional apartment ID.

## Schematic 3D (Phase 5)

- The 3D view is a **diagram, not an architectural model**, and it says so on screen ("Schematic ·
  not to scale", plus notes in the panel).
- **Footprints:** the master-plan tile rectangles (p6), with the master plan itself as the ground.
- **Levels:** C+S+10 (p3) becomes one stilt storey (no flats) and floors 01–10. The **storey height
  is a uniform illustrative constant.** The brochure gives no heights or drawing scale, so none are
  implied.
- **Not modelled:** the cellar, and the clubhouse's height (it is shown as its footprint).
- **Block C:** one box per generated apartment (14 × 10 = 140). The declared 154 is kept in the
  panel, not modelled.
- IDs, floor numbering, exceptions and "Enquire" are the same as in 2D. The 3D view is another
  view of the same URL state (`?view=3d`).

## Brochure spellings kept verbatim

Recorded in `brochureTypos` (`frontend/src/data/project.js`). They are not auto-corrected; the client
decides how to display them: "Amenties" (p18, 20, 21), "Jhonson" (p20), "BLANCE" (p22),
C-13 Drawing `14'1"X11"3"` (p12).

## Assets

- Extracted by `npm run assets:extract` (Python 3 + PyMuPDF + Pillow) into
  `frontend/public/assets/brochure/`, with a typed manifest in `frontend/src/data/generated/brochureAssets.js`.
- Output is WebP (or SVG for the vector logo), in responsive widths, **never upscaled**.
  Assets below 1600 px are flagged `lowResolution`.
- The master plan is exported from the **published page render**. The raw base raster in the PDF
  has stale unit labels (Block B shows Block A's sizes) hidden under vector overlays, so it must
  never be used.
- Rights flags: `project`, `verify` (appears to be a project render or third-party mark),
  `stock-unverified` (lifestyle photography; the licence needs confirming before launch), and
  `decorative`.

## "From plan to tower" (3D view)

A four-stage timeline over the schematic 3D view (`frontend/src/components/explore/three/story.js`). Every
stage shows brochure material only: 01 the flats of every floor as lines over the master plan (p6,
C+S+10 p3); 02 the existing schematic massing, rising floor by floor (still not to scale); 03 each
flat's own crop of the typical floor plan (p10–12) on the roof of its stack, fitted inside the tile
and never stretched; 04 the brochure's artistic impressions, day (p5) and dusk (p14), shown at their
published size with the "Artistic impression" label. No facade, height or material is invented.

## Virtual tour (sample interiors — not brochure data)

- The brochure has no interiors. The tour shows **one sample per BHK type** (`sample-2bhk`,
  `sample-3bhk` in `frontend/src/components/explore/tour/tours.js`) for every apartment of that type, always
  labelled "Representative sample interior — not {apartment}'s final design".
- **Rooms and connections come only from the walkthrough clips** in `docs/2bhk` and `docs/3bhk`
  (one ~10 s, 1280×720 clip per room; each scene cites its clip and what it shows). The clips are
  fixed-camera videos and are not used as media. Every clip carries a ✦ mark in the bottom-right
  corner, which looks like an AI-video watermark — treat them as mood references, not as designs.
  - 2 BHK: living, dining, kitchen, master bedroom, bedroom 2, toilet 1, toilet 2 (the two
    bathroom clips are near-identical and may show the same room). No balcony/wash clip.
  - 3 BHK: living & dining (one space in the clip), kitchen, master bedroom, bedroom 2, bedroom 3,
    toilet 1, balcony. No separate dining, drawing, second/third toilet, dress, powder or wash clip.
  - In-scene arrows only where the clip shows the next room: 2 BHK living ↔ dining, living →
    kitchen, dining ↔ kitchen; 3 BHK living ↔ kitchen, living ↔ balcony.
  - The 3 BHK balcony clip shows a lounge balcony far larger than any balcony the brochure prints
    (4'–5' wide).
- **Pins are the printed room labels**, OCR'd from the p10–12 rasters (`npm run geometry:rooms`,
  `frontend/src/data/roomAnchors.js`). Every printed room of all 36 flats is matched once; same-named
  rooms are told apart by the size printed under each label.
- **Room numbering is ours**: bedrooms after the master bedroom are "Bedroom 2, 3" and toilets
  "Toilet 1–3", in the order `rooms.js` lists them. The brochure numbers none. Which printed
  toilet a sample bathroom stands for is therefore a convention, not a fact.
- C-14 prints no LIVING (only DRAWING and DINING); its drawing room carries the 3 BHK
  "Living & dining" scene.
- **Media is PLACEHOLDER** (`npm run tours:placeholders`) at the final paths
  `frontend/public/tours/{tour}/{scene}-{4k|preview|thumb}.webp`. Replace the files with the real
  equirectangular renders (4096×2048, 512×256, 400×225), then set `media: "final"` and calibrate
  each scene's `initialView`, `northOffset` and link yaw/pitch — all placeholders today.

## Out of scope for now

No backend, authentication, CMS or database. All data is static and typed in the repo.
