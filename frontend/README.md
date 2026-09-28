# Spacer Application · frontend

React 19 + Vite single-page app that merges two earlier repositories:

- **Spacer** (from `akhssm/Spacer_Land`): the platform's landing page and its interactive project viewer.
- **IRA Towers** (from `SwamyJupudi/Spacer_app`): the project website, explorer, location map and virtual tour.

Frontend only. There is no backend: project data is static JavaScript in `src/data`, served to
components by `src/services`. See [`../docs/MIGRATION.md`](../docs/MIGRATION.md) for how the two
repositories were merged.

## Getting started

```bash
npm install
cp .env.example .env.local   # optional: add a MapTiler key for the satellite maps
npm run dev
```

| Script | What it does |
|---|---|
| `npm run dev` | dev server with hot reload |
| `npm run build` | production build into `dist/` |
| `npm run preview` | serve the production build |
| `npm test` | Vitest: brochure data validation, URL and filter logic, project service |
| `npm run lint` | oxlint |
| `npm run format` | Prettier |

Without `VITE_MAPTILER_KEY` the two satellite maps show a fallback message; everything else works.

## Routes

| Path | Layout | Page |
|---|---|---|
| `/` | Spacer | landing page: hero, demos, features, pricing, requirements, testimonials, FAQ |
| `/p/:shortCode` | Viewer | project viewer, e.g. `/p/demo` (Green Meadows) and `/p/ira-towers` |
| `/ira-towers` | IRA site | brochure storytelling home in ten chapters |
| `/ira-towers/apartments` | IRA site | every apartment, filterable (URL-synced), side-by-side comparison |
| `/ira-towers/explore/map` | Explorer | satellite location map |
| `/ira-towers/explore/:block?/:floor?/:apartment?` | Explorer | 2D master plan, floor plans, schematic 3D (`?view=3d`), virtual tour (`?view=tour`) |

All URLs are built with the helpers in `src/routes/paths.js`.

## Structure

```
src/
├── App.jsx, main.jsx
├── assets/        bundled imports (brochure media lives in public/, see assets/README.md)
├── components/
│   ├── ui/        shared primitives: Button, Badge, Dialog, Sheet, Tabs, Accordion, ButtonLink, SectionHeading
│   ├── motion/    Reveal (scroll fade-in, reduced-motion aware)
│   ├── media/     BrochureImage, ImageLightbox
│   ├── brochure/  BrochureFlipbook (any brochure; IRA's by default)
│   ├── gallery/   GalleryViewer (any image set; IRA's albums by default)
│   ├── spacer/    Spacer landing sections, navbar, footer, logo
│   ├── viewer/    Spacer viewer: map, panels, compare, 3D buildings layer
│   ├── site/      IRA site header, footer, wordmark
│   ├── home/      IRA home chapters and sections
│   ├── explore/   IRA explorer: master plan, floor plans, map, 3D, tour
│   └── apartments/ IRA apartments list and filters
├── config/        site navigation, map key
├── data/          IRA brochure data (tested), data/spacer/ for Spacer content and projects
├── hooks/         useMediaQuery, useViewportSize, useDocumentTitle, useDocumentTheme
├── layouts/       SpacerLayout, ViewerLayout, SiteLayout, ExplorerLayout
├── pages/         spacer/, ira-towers/, NotFoundPage
├── routes/        router, paths
├── services/      projects (Spacer project data), enquiry (IRA enquiry e-mail)
├── styles/        index.css: design tokens for both themes
└── utils/         cn, motion, geo, inventory, rooms, maplibre
```

## Design system

One token set in `src/styles/index.css` with two themes filling the same semantic contract
(`background`, `card`, `primary`, `muted-foreground`, `brand`, …):

- **IRA Towers** (default): navy, gold and sun yellow sampled from the brochure; `.dark` for the explorer.
- **Spacer** (`.dark.theme-spacer`): black and lime, as on spacer.land.

Each layout applies its theme to `<html>` with `useDocumentTheme`, so dialogs rendered into
`<body>` match. Components use the semantic classes (`bg-card`, `text-muted-foreground`,
`bg-brand`), never raw colours, so the same component works in both themes.

## Data rules

IRA Towers data follows the brochure exactly, including recorded inconsistencies: see
[`../docs/DATA_DECISIONS.md`](../docs/DATA_DECISIONS.md). The Spacer viewer's availability
for its demo projects is generated sample data and is labelled as such on screen.
