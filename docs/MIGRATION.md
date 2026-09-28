# Merging Spacer_Land and Spacer_app into Spacer_Application

Branch: `feature/merge-frontend` (from `main`). Frontend only: no server, API, database or auth code
was added, and the Express/MongoDB backend of Spacer_Land was replaced by static frontend data.

## 1. What each repository contained

| | **Spacer_Land** (`akhssm/Spacer_Land`) | **Spacer_app** (`SwamyJupudi/Spacer_app`) |
|---|---|---|
| Product | Spacer platform (spacer.land): marketing site plus a project viewer for any project | IRA Towers project website, built only from the brochure |
| Stack | React 19, JSX, Vite, Tailwind 4, react-router-dom, `@maptiler/sdk`, three.js, `page-flip` | React 19, TypeScript, Vite, Tailwind 4, shadcn (Base UI), react-router, framer-motion, maplibre-gl, React Three Fiber, Vitest |
| Backend | Express + MongoDB (`server/`): projects, plots, units, seed script | none (static typed data) |
| Size | ~3.5k lines client + ~1.1k server | ~26k lines (≈11k generated data), 156 tests |

## 2. Feature comparison

| Feature | Spacer_Land | Spacer_app | Kept in Spacer_Application |
|---|---|---|---|
| Spacer landing page (hero, statement, demos, 20 features, pricing, delivery, requirements, testimonials, FAQ, CTA, footer) | ✅ | — | ✅ `/` |
| IRA storytelling home (10 brochure chapters, stats, chapter rail) | — | ✅ | ✅ `/ira-towers` |
| Project viewer on satellite map (status/zone colours, block chips, legend) | ✅ | — | ✅ `/p/:shortCode` |
| Inventory by floor (block grid, per-flat floor list) | ✅ (API) | — | ✅ sample data, labelled |
| Compare flats side by side | ✅ | — | ✅ viewer **and** new IRA Apartments page |
| Live GPS / "locate me" | ✅ | ✅ | both kept (different pages) |
| Satellite location map for IRA | ✅ (traced polygons) | ✅ (brochure-georeferenced, URL state, search) | Spacer_app's for the IRA site; Spacer_Land's tracing for the viewer |
| 3D | three.js buildings on the map | R3F schematic 3D + "plan to tower" story | both (different purposes) |
| Brochure viewer | `page-flip` | custom flipbook with zoom, spreads, phone swipe | **Spacer_app's**, generalized to any brochure |
| Gallery | simple, props-driven | albums, zoom, thumbnails, rights rules | **Spacer_app's**, generalized to any image set |
| Master plan / floor plan explorer | — | ✅ | ✅ |
| Virtual tour | — | ✅ | ✅ |
| Apartments list | — | placeholder ("Phase 6") | ✅ **built**: filters, search, sort, paging, compare |
| Enquiry | WhatsApp / mailto | pre-filled e-mail | both |
| Scroll reveal | IntersectionObserver `Reveal` | framer-motion `Reveal` | **Spacer_app's** (reduced-motion aware) |
| FAQ accordion | `<details>` | shadcn Accordion | shared **Accordion** |
| Buttons | `ButtonLink` | shadcn `Button` | `ButtonLink` rebuilt on `buttonVariants` |
| 404 | redirect to `/` | page | page for both sites |
| API status page (`/status`) | ✅ | — | ❌ removed (it checked the backend) |
| Data validation tests | — | ✅ 156 | ✅ + 15 new |

## 3. Conflicts and how they were resolved

| Conflict | Resolution |
|---|---|
| Two products in one repo | Spacer owns `/`; IRA Towers is mounted at `/ira-towers`. All URLs come from `src/routes/paths.js` (`IRA_BASE`). |
| TypeScript vs JavaScript | Target is JSX. Spacer_app's types were stripped mechanically (`ts-blank-space`, safe because it compiled with `erasableSyntaxOnly`), then Prettier. Runtime code is unchanged: all 156 original tests pass. The domain types are kept as reference in `docs/ira-towers-data-model.d.ts`. |
| Backend API | `src/services/projects.js` serves the same project shape from static data. Units are generated in the browser, as the seed script did. |
| Duplicate IRA data (rooms, areas, BHK typed by hand in Spacer_Land) | The viewer now derives every flat detail from Spacer_app's brochure data layer. Only Spacer_Land's map polygons are kept. |
| Unit IDs `B-606` (Spacer_Land) vs `B-0606` (Spacer_app) | Spacer_app's documented `{Block}-{FF}{SS}` scheme everywhere; "C-12A" is flat 13, as the data decisions record. A test checks that all 360 viewer units exist on the IRA site. |
| Availability: sample statuses vs "unknown, show Enquire" | The IRA site keeps "Enquire" (brochure rule). The viewer keeps its sample inventory, flagged `inventory: 'sample'` and labelled on screen. |
| Clubhouse 18,648 vs 18,600 sft | Viewer uses the recorded headline value (18,600). |
| Missing images in Spacer_Land (`/projects/ira-towers/...` never committed) | Replaced with Spacer_app's brochure assets; flat plans drawn with `FlatPlanCrop` from the brochure's floor plans. The master-plan map overlay was dropped (its alignment was fitted to an image that isn't available). |
| Colour tokens (`text-muted` meant grey text in one, a background in the other) | One semantic token set with an IRA theme and a `.theme-spacer` theme. |
| Two map libraries | `maplibre-gl` only; the viewer map and 3D layer were ported from `@maptiler/sdk`. Shared setup in `utils/maplibre.js` and `config/maps.js`. |
| `react-router-dom` vs `react-router` | `react-router` (v7). |
| FAQ said "not made for apartments" while demoing an apartment project | Wording updated to include apartment projects. |

## 4. Folder structure

See [`frontend/README.md`](../frontend/README.md#structure). Beyond the requested folders there are
`config/` (navigation, map key) and `data/` (static project data, which replaces the database).

## 5. Migration steps, in order

1. Branched `feature/merge-frontend` from `main`.
2. Converted Spacer_app to JSX, formatted it, and moved it into the target structure with a script
   that rewrote every `@/` import. Ran its tests: all passed.
3. Mounted the IRA site under `/ira-towers`; added `parseExplore` so URL parsing works with the prefix.
4. Built the shared design tokens with IRA and Spacer themes, and `useDocumentTheme` for layouts.
5. Ported Spacer_Land's landing page onto the tokens, shared `Reveal`, `Accordion` and buttons; added a
   responsive navbar with a mobile menu.
6. Replaced the API with `services/projects.js` and static project data (IRA Towers, Green Meadows).
7. Generalized the flipbook and gallery; ported the viewer map to MapLibre; reused `FlatPlanCrop`.
8. Built the IRA Apartments page, reusing the viewer's `ComparePanel` (now theme-aware, with an `inventory` option).
9. Added tests, ran lint, build and a browser check of every route at desktop and phone widths.

## 6. Files

**Removed** (Vite template): `src/App.css`, `src/index.css`, `src/main.jsx` (rewritten), `src/assets/hero.png`,
`src/assets/react.svg`, `src/assets/vite.svg`, `public/icons.svg`.

**Modified**: `index.html`, `package.json`, `package-lock.json`, `vite.config.js`, `README.md`, `public/favicon.svg` (Spacer mark).

**Created**:

- `src/App.jsx`, `src/main.jsx`, `src/styles/index.css`
- From Spacer_app (converted, moved): `components/{ui,media,motion,site,home,explore,brochure,gallery}`,
  `data/**`, `hooks/useMediaQuery.js`, `hooks/useViewportSize.js`, `layouts/{SiteLayout,ExplorerLayout}.jsx`,
  `pages/ira-towers/{HomePage,ExplorePage,MapExplorerPage}.jsx`, `routes/{router,paths,RouteFallback}`,
  `services/enquiry.js`, `utils/{cn,motion}.js`, `config/site.js`, and their tests
- From Spacer_Land (ported): `components/spacer/*` (14), `components/viewer/{MapView,Panels,ComparePanel,Compass,layoutGeoJson,buildings3d}`,
  `components/ui/{ButtonLink,SectionHeading}.jsx`, `pages/spacer/{HomePage,ViewerPage}.jsx`,
  `data/spacer/siteContent.js`, `utils/{geo,inventory,rooms}.js`
- New: `services/projects.js`, `data/spacer/projects/{iraTowers,iraTowersGeometry,greenMeadows}.js`,
  `layouts/{SpacerLayout,ViewerLayout}.jsx`, `hooks/{useDocumentTitle,useDocumentTheme}.js`,
  `config/maps.js`, `utils/maplibre.js`, `components/apartments/*`, `pages/ira-towers/ApartmentsPage.jsx`
  (replaces the placeholder), `pages/NotFoundPage.jsx`, `services/projects.test.js`,
  `components/apartments/apartmentQuery.test.js`, `src/assets/README.md`
- `public/assets/` and `public/tours/` (Spacer_app media), `public/sample/brochure/` (Spacer_Land),
  `public/favicon-ira-towers.svg`, `.env.example`, `.prettierrc.json`
- `docs/MIGRATION.md`, `docs/DATA_DECISIONS.md`, `docs/ira-towers-data-model.d.ts`

**Not carried over**: Spacer_Land `server/` and `scripts/brochure-pages.py`; Spacer_app's Python
extraction scripts and ESLint/TypeScript config (the target uses oxlint).

## 7. Verification checklist

- [x] `npm test`: 22 test files, 171 tests pass (156 original + 15 new), 1 skipped as in the original
- [x] `npm run build` succeeds
- [x] `npm run lint`: no errors; warnings are inherited from the source repos (shadcn files export
      helpers; one `setState` in an effect in the IRA map; a ref read in a click handler in the viewer)
- [x] Every route loads in Chrome with no console or page errors, at 1440×900 and 390×844, with no
      horizontal scrolling: `/`, `/p/demo`, `/p/ira-towers`, `/p/unknown`, `/ira-towers`,
      `/ira-towers/apartments`, `/ira-towers/explore`, `/ira-towers/explore/A/03/A-0305`,
      `/ira-towers/explore/map`, `/ira-towers/nope`
- [x] Interactions checked: apartment filters update the URL; compare two apartments; viewer search →
      flat panel → floor → tour link; Green Meadows brochure; IRA gallery albums on a phone; FAQ; mobile menu;
      theme switches between Spacer and IRA pages
- [ ] Satellite maps with a real `VITE_MAPTILER_KEY` (not tested: no key was available; both maps show their fallback)
- [ ] Brochure and lifestyle image rights confirmed with V4 Ventures before publishing (flagged in Spacer_app)
- [ ] Spacer placeholders filled in: price, sales e-mail, phone, WhatsApp, testimonials (`data/spacer/siteContent.js`)
