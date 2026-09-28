# src/assets

Images and fonts **imported from code** go here, so Vite fingerprints and bundles them
(`import logo from '@/assets/logo.svg'`).

Most media in this app is **not** here on purpose:

- `public/assets/brochure/` holds the IRA Towers brochure images. They are referenced by URL
  from the generated manifest (`src/data/generated/brochureAssets.js`), which lists every
  responsive variant, so they must keep stable paths.
- `public/tours/` holds the virtual-tour panoramas, also referenced by URL.
- `public/sample/brochure/` holds the Green Meadows sample brochure pages.
- Fonts come from `@fontsource` packages, imported in `src/styles/index.css`.
- Logos (the Spacer mark, the IRA wordmark) are inline SVG components so they can follow the theme colours.
