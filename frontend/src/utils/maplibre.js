// One-time MapLibre setup, imported by every map component (the IRA Towers location map and the
// Spacer project viewer), so the app ships one map library and one worker.

import { setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// MapLibre 6 resolves its worker next to its own module, which a bundler moves — hand it Vite's URL.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

setWorkerUrl(workerUrl)
