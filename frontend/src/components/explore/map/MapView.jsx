import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AttributionControl, Map as MapLibreMap, Marker } from 'maplibre-gl'
import '@/utils/maplibre'
import { apartmentId } from '@/data'
import { formatSft } from '@/data/summaries'
import { cn } from '@/utils/cn'
import { fitPadding } from '@/components/explore/map/camera'
import { buildFlatLabels, buildFlats, flatKey } from '@/components/explore/map/flats'
import { QR_PIN } from '@/components/explore/map/georef'
import {
  MAP_COLORS as C,
  activeBlock,
  buildAreas,
  buildLabels,
  buildOutsideMask,
  buildSite,
  selectionBounds,
  selectionFromKey,
  selectionKey,
  siteBounds,
} from '@/components/explore/map/layers'

/** Imperative camera API handed to the controls. */
/**
 * Elements the map labels must not sit under (panels, docks, the control column), marked by the
 * page with this attribute. Labels are hidden while they overlap one — never the selected label.
 */
export const MAP_OBSTACLE_ATTR = 'data-map-obstacle'

const TILT_PITCH = 55

/**
 * Venture emphasis: everything outside the indicative boundary is darkened by a vector mask (the
 * imagery itself is never altered), with a soft shadow feathered just outside the boundary line.
 */
const VENTURE_MASK = { outsideOpacity: 0.62, featherWidth: 18, featherOpacity: 0.55 }
const NONE = ['==', ['get', 'key'], '__none__']
const byKey = (key) => (key ? ['==', ['get', 'key'], key] : NONE)

function mapStyle(apiKey) {
  return {
    version: 8,
    sources: {
      // Direct tile template (not a TileJSON URL): the site layers never wait on the imagery provider.
      satellite: {
        type: 'raster',
        tiles: [`https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=${encodeURIComponent(apiKey)}`],
        tileSize: 512,
        maxzoom: 19,
        attribution:
          '<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener">&copy; MapTiler</a> ' +
          '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">&copy; OpenStreetMap contributors</a>',
      },
      outside: { type: 'geojson', data: buildOutsideMask() },
      site: { type: 'geojson', data: buildSite() },
      areas: { type: 'geojson', data: buildAreas() },
      flats: { type: 'geojson', data: buildFlats() },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': C.navy950 } },
      { id: 'satellite', type: 'raster', source: 'satellite', paint: { 'raster-fade-duration': 200 } },
      // Dim everything outside the site so the eye settles on IRA Towers.
      {
        id: 'outside-dim',
        type: 'fill',
        source: 'outside',
        paint: { 'fill-color': C.navy950, 'fill-opacity': VENTURE_MASK.outsideOpacity },
      },
      {
        // The site ring is counter-clockwise, so a positive offset pushes this shadow outside it.
        id: 'outside-feather',
        type: 'line',
        source: 'site',
        paint: {
          'line-color': C.navy950,
          'line-width': VENTURE_MASK.featherWidth,
          'line-offset': VENTURE_MASK.featherWidth / 2,
          'line-blur': VENTURE_MASK.featherWidth,
          'line-opacity': VENTURE_MASK.featherOpacity,
        },
      },
      {
        id: 'areas-fill',
        type: 'fill',
        source: 'areas',
        paint: {
          'fill-color': ['match', ['get', 'kind'], 'lawn', C.leaf500, 'play', C.sun400, 'pool', C.pool, C.sand200],
          'fill-opacity': ['match', ['get', 'kind'], 'lawn', 0.22, 'play', 0.3, 'pool', 0.55, 0.32],
        },
      },
      {
        id: 'areas-hover',
        type: 'fill',
        source: 'areas',
        filter: NONE,
        paint: { 'fill-color': C.sun400, 'fill-opacity': 0.22 },
      },
      {
        id: 'areas-selected',
        type: 'fill',
        source: 'areas',
        filter: NONE,
        // A selected block shows its flats on top, so its own fill stays light.
        paint: { 'fill-color': C.sun400, 'fill-opacity': ['match', ['get', 'kind'], 'block', 0.14, 0.42] },
      },
      {
        id: 'areas-line',
        type: 'line',
        source: 'areas',
        filter: ['in', ['get', 'kind'], ['literal', ['block', 'clubhouse']]],
        paint: {
          'line-color': C.white,
          'line-opacity': 0.85,
          'line-width': ['interpolate', ['linear'], ['zoom'], 16, 1, 20, 2.5],
        },
      },
      {
        id: 'amenities-line',
        type: 'line',
        source: 'areas',
        filter: ['in', ['get', 'kind'], ['literal', ['lawn', 'play', 'pool']]],
        paint: {
          'line-color': ['match', ['get', 'kind'], 'lawn', C.leaf500, 'pool', C.pool, C.sun400],
          'line-opacity': 0.7,
          'line-width': 1,
        },
      },
      {
        id: 'areas-selected-line',
        type: 'line',
        source: 'areas',
        filter: NONE,
        paint: { 'line-color': C.sun400, 'line-width': 3 },
      },
      // Flats of the active block (master-plan tiles), muted until one is selected.
      {
        id: 'flats-fill',
        type: 'fill',
        source: 'flats',
        filter: NONE,
        paint: { 'fill-color': C.sand200, 'fill-opacity': 0.5 },
      },
      {
        id: 'flats-hover',
        type: 'fill',
        source: 'flats',
        filter: NONE,
        paint: { 'fill-color': C.sun400, 'fill-opacity': 0.45 },
      },
      {
        id: 'flats-line',
        type: 'line',
        source: 'flats',
        filter: NONE,
        paint: {
          'line-color': C.white,
          'line-opacity': 0.6,
          'line-width': ['interpolate', ['linear'], ['zoom'], 17, 0.5, 20, 1.5],
        },
      },
      {
        id: 'flats-selected-fill',
        type: 'fill',
        source: 'flats',
        filter: NONE,
        paint: { 'fill-color': C.sun400, 'fill-opacity': 0.92 },
      },
      {
        id: 'flats-selected-line',
        type: 'line',
        source: 'flats',
        filter: NONE,
        layout: { 'line-join': 'miter' },
        paint: { 'line-color': C.white, 'line-width': 2.5, 'line-dasharray': [2, 1.5] },
      },
      {
        id: 'site-glow',
        type: 'line',
        source: 'site',
        paint: { 'line-color': C.gold300, 'line-width': 10, 'line-blur': 8, 'line-opacity': 0.35 },
      },
      {
        id: 'site-line',
        type: 'line',
        source: 'site',
        layout: { 'line-join': 'round' },
        paint: { 'line-color': C.gold300, 'line-width': 2, 'line-dasharray': [3, 2] },
      },
    ],
  }
}

/** Fit padding for the map's current size: panels + breathing room, never leaving a sliver of map. */
const padding = (map, i, extra = 48) => {
  const c = map.getContainer()
  return fitPadding(i, extra, c.clientWidth, c.clientHeight)
}

const fitExtra = (s) => (s.kind === 'flat' ? 96 : 72)
// Flats stop at 19.8: beyond the imagery's native zoom (19) the satellite image turns soft.
const fitMaxZoom = (s) => (s.kind === 'flat' ? 19.8 : 19.2)

const INTERACTIVE_LAYERS = ['flats-fill', 'areas-fill']

/** Topmost selectable feature key under a point: a visible flat first, then areas. */
function keyAt(map, point) {
  const f = map
    .queryRenderedFeatures([point.x, point.y], { layers: INTERACTIVE_LAYERS })
    .find((x) => x.layer.id === 'flats-fill' || x.properties.selectable)
  return f ? String(f.properties.key) : undefined
}

/** Push the selection into the layer filters (idempotent; also run once the style has loaded). */
function syncSelection(map, selection, highlight = 'all') {
  const block = activeBlock(selection)
  const flat = selection?.kind === 'flat' ? flatKey(selection.blockId, selection.flatNo) : undefined
  const areaKey = block ? `block-${block}` : selectionKey(selection)
  const blockFlats = block ? ['==', ['get', 'blockId'], block] : NONE
  map.setFilter('areas-selected', byKey(areaKey))
  map.setFilter('areas-selected-line', byKey(areaKey))
  map.setFilter('flats-fill', blockFlats)
  map.setFilter('flats-line', blockFlats)
  map.setFilter('flats-selected-fill', byKey(flat))
  map.setFilter('flats-selected-line', byKey(flat))
  // Other flats step back while one is selected.
  const base = flat ? 0.28 : 0.5
  // A BHK highlight fades the other flat type right back (the selected flat keeps its own layer).
  map.setPaintProperty(
    'flats-fill',
    'fill-opacity',
    highlight === 'all' ? base : ['case', ['==', ['get', 'bhk'], highlight], base + 0.15, 0.1],
  )
}

export default function MapView({
  apiKey,
  selection,
  insets,
  reducedMotion,
  onSelect,
  onReady,
  onFatal,
  onImageryError,
  highlight = 'all',
}) {
  const container = useRef(null)
  const mapRef = useRef(null)
  const styleReady = useRef(false)
  const [labels, setLabels] = useState([])
  const [flatLabels, setFlatLabels] = useState([])
  const [hovered, setHovered] = useState()
  const selectedKey = selectionKey(selection)
  const markerNodes = useRef([])
  const clearLabels = useRef(() => {})

  // Latest props for long-lived map listeners.
  const latest = useRef({ onSelect, onReady, onFatal, onImageryError, insets, reducedMotion, selection, highlight })
  useEffect(() => {
    latest.current = { onSelect, onReady, onFatal, onImageryError, insets, reducedMotion, selection, highlight }
  })

  // Create the map once.
  useEffect(() => {
    const el = container.current
    if (!el) return
    let map
    try {
      map = new MapLibreMap({
        container: el,
        style: mapStyle(apiKey),
        center: QR_PIN,
        zoom: latest.current.reducedMotion ? 17.5 : 15,
        minZoom: 3,
        maxZoom: 20.5,
        maxPitch: 70,
        attributionControl: false,
        cancelPendingTileRequestsWhileZooming: true,
      })
    } catch (e) {
      latest.current.onFatal(e instanceof Error ? e.message : 'the map could not be started')
      return
    }
    mapRef.current = map
    // Imagery credits must stay visible: bottom-left, lifted above any bottom dock (see container style).
    map.addControl(new AttributionControl({ compact: true }), 'bottom-left')

    // Imagery health: a 401/403 means the key was rejected; repeated failures before any tile has
    // loaded mean the provider is unreachable. Either way the site layers keep working underneath.
    let imageryFailed = false
    let imageryLoaded = false
    let imageryErrors = 0
    map.on('data', (e) => {
      if (e.sourceId === 'satellite' && e.tile) imageryLoaded = true
    })
    map.on('error', (e) => {
      const err = e.error
      const fromImagery =
        e.sourceId === 'satellite' || `${err.message ?? ''} ${err.url ?? ''}`.includes('api.maptiler.com')
      if (!fromImagery) return console.error('[location map]', e.error)
      if (imageryFailed) return
      if (err.status === 401 || err.status === 403) {
        imageryFailed = true
        latest.current.onImageryError('The imagery key was rejected')
      } else if (!imageryLoaded && ++imageryErrors >= 4) {
        imageryFailed = true
        latest.current.onImageryError('The imagery service could not be reached')
      }
    })
    map.on('webglcontextlost', () => latest.current.onFatal('the graphics context was lost'))

    // Labels: DOM markers whose content React renders through portals (brand fonts, real buttons).
    const markers = buildLabels().map((label) => {
      const node = document.createElement('div')
      node.className = 'ira-map-label'
      return {
        label,
        el: node,
        marker: new Marker({ element: node, anchor: 'center' }).setLngLat(label.lngLat).addTo(map),
      }
    })
    setLabels(markers.map(({ label, el }) => ({ label, el })))
    const flatMarkers = buildFlatLabels().map((label) => {
      const node = document.createElement('div')
      node.className = 'ira-map-label'
      return {
        label,
        el: node,
        marker: new Marker({ element: node, anchor: 'center' }).setLngLat(label.lngLat).addTo(map),
      }
    })
    setFlatLabels(flatMarkers.map(({ label, el }) => ({ label, el })))
    markerNodes.current = [...markers, ...flatMarkers].map((m) => m.el)

    // Hide labels that sit under a panel, dock or the control column (checked once per frame while
    // the camera moves). The selected label always stays visible.
    let frame = 0
    const runClear = () => {
      frame = 0
      const obstacles = [...document.querySelectorAll(`[${MAP_OBSTACLE_ATTR}]`)]
        .map((o) => o.getBoundingClientRect())
        .filter((r) => r.width && r.height)
      for (const node of markerNodes.current) {
        const chip = node.firstElementChild
        if (!chip) continue
        node.style.visibility = ''
        if (chip.getAttribute('aria-pressed') === 'true') continue
        const r = chip.getBoundingClientRect()
        const covered = obstacles.some(
          (o) => r.left < o.right && r.right > o.left && r.top < o.bottom && r.bottom > o.top,
        )
        if (covered) node.style.visibility = 'hidden'
      }
    }
    clearLabels.current = () => {
      if (!frame) frame = requestAnimationFrame(runClear)
    }
    map.on('move', () => clearLabels.current())
    map.on('resize', () => clearLabels.current())

    const userDot = document.createElement('div')
    userDot.className = 'ira-map-label'
    userDot.innerHTML =
      '<span class="relative flex size-4"><span class="absolute inline-flex size-full animate-ping rounded-full bg-sky-400 opacity-60"></span><span class="relative inline-flex size-4 rounded-full border-2 border-white bg-sky-500 shadow"></span></span>'
    userDot.setAttribute('aria-label', 'Your location')
    const userMarker = new Marker({ element: userDot, anchor: 'center' })

    map.on('click', (e) => {
      if (e.originalEvent.target?.closest('.ira-map-label')) return
      const key = keyAt(map, e.point)
      latest.current.onSelect(key ? selectionFromKey(key) : undefined)
    })
    map.on('mousemove', (e) => {
      if (!styleReady.current) return
      const key = keyAt(map, e.point)
      map.getCanvas().style.cursor = key ? 'pointer' : ''
      setHovered(key)
    })
    map.on('mouseout', () => setHovered(undefined))

    const home = (animate = true) =>
      map.fitBounds(siteBounds(), {
        padding: padding(map, latest.current.insets),
        bearing: 0,
        pitch: 0,
        duration: animate && !latest.current.reducedMotion ? 1600 : 0,
      })

    // "style.load" (not "load"): "load" also waits for the first imagery tiles, which may never come.
    map.once('style.load', () => {
      styleReady.current = true
      syncSelection(map, latest.current.selection, latest.current.highlight)
      // Cinematic arrival: from the neighbourhood down onto the site — or straight onto the
      // selection restored from the URL (deep link / refresh).
      const restored = latest.current.selection
      map.fitBounds(restored ? selectionBounds(restored) : siteBounds(), {
        padding: padding(map, latest.current.insets, restored ? fitExtra(restored) : 48),
        // Only set when restoring: an explicit `maxZoom: undefined` overrides MapLibre's default.
        ...(restored ? { maxZoom: fitMaxZoom(restored) } : {}),
        duration: latest.current.reducedMotion ? 0 : 2600,
        essential: false,
      })
      latest.current.onReady({
        zoomIn: () => map.zoomIn(),
        zoomOut: () => map.zoomOut(),
        resetNorth: () => map.easeTo({ bearing: 0, duration: latest.current.reducedMotion ? 0 : 500 }),
        home: () => home(),
        setTilted: (tilted) =>
          map.easeTo({ pitch: tilted ? TILT_PITCH : 0, duration: latest.current.reducedMotion ? 0 : 700 }),
        fitTo: (bounds) =>
          map.fitBounds(bounds, {
            padding: padding(map, latest.current.insets, 64),
            maxZoom: 17.5,
            duration: latest.current.reducedMotion ? 0 : 1600,
          }),
        setUserLocation: (lngLat) => {
          if (lngLat) userMarker.setLngLat(lngLat).addTo(map)
          else userMarker.remove()
        },
        onCamera: (listener) => {
          const fire = () => listener({ bearing: map.getBearing(), pitch: map.getPitch() })
          map.on('rotate', fire)
          map.on('pitch', fire)
          fire()
          return () => {
            map.off('rotate', fire)
            map.off('pitch', fire)
          }
        },
      })
    })

    return () => {
      if (frame) cancelAnimationFrame(frame)
      clearLabels.current = () => {}
      markers.forEach((m) => m.marker.remove())
      flatMarkers.forEach((m) => m.marker.remove())
      userMarker.remove()
      map.remove()
      mapRef.current = null
      styleReady.current = false
    }
  }, [apiKey])

  // Selection and hover highlight (re-applied on load, see above).
  const block = activeBlock(selection)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !styleReady.current) return
    syncSelection(map, latest.current.selection, highlight)
  }, [selectedKey, highlight])

  // Panels open and close without the camera moving: re-check labels now and after they animate in.
  useEffect(() => {
    clearLabels.current()
    const t = setTimeout(() => clearLabels.current(), 450)
    return () => clearTimeout(t)
  })
  useEffect(() => {
    const map = mapRef.current
    if (!map || !styleReady.current) return
    const h = hovered !== selectedKey ? hovered : undefined
    const onFlat = h?.startsWith('flat-')
    map.setFilter('areas-hover', byKey(onFlat || h === `block-${block}` ? undefined : h))
    map.setFilter('flats-hover', byKey(onFlat ? h : undefined))
  }, [hovered, selectedKey, block])

  // Bring a newly selected block / flat / amenity into view (keeping bearing and tilt). Keyed on
  // the selection key, so choosing a floor for the same flat does not move the camera.
  useEffect(() => {
    const map = mapRef.current
    const current = latest.current.selection
    if (!map || !current) return
    map.fitBounds(selectionBounds(current), {
      padding: padding(map, latest.current.insets, fitExtra(current)),
      maxZoom: fitMaxZoom(current),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
      duration: latest.current.reducedMotion ? 0 : 1100,
    })
  }, [selectedKey])

  return (
    <>
      {/* MapLibre's (unlayered) CSS forces position: relative on the container, so size it from a wrapper. */}
      <div className="absolute inset-0">
        <div
          ref={container}
          role="region"
          aria-label="Satellite map of the IRA Towers site"
          style={{ '--map-inset-bottom': `${insets.bottom}px` }}
          className="size-full [&_.maplibregl-ctrl-bottom-left]:bottom-(--map-inset-bottom) [&_.maplibregl-ctrl-bottom-left]:transition-[bottom]"
        />
      </div>
      {labels.map(({ label, el }) =>
        createPortal(
          // The active block's name gives way to its flats (the panel names the block), and minor
          // amenity labels step back while a flat is being looked at.
          label.key === `block-${block}` || (label.tone === 'amenity' && selection?.kind === 'flat') ? null : (
            <LabelChip
              label={label}
              selected={selectionKey(label.selection) === selectedKey}
              hovered={selectionKey(label.selection) === hovered}
              onClick={() => onSelect(label.selection)}
            />
          ),
          el,
          label.key,
        ),
      )}
      {flatLabels.map(({ label, el }) =>
        createPortal(
          label.blockId === block ? (
            <FlatChip
              label={label}
              selection={selection?.kind === 'flat' ? selection : undefined}
              hovered={label.key === hovered}
              muted={highlight !== 'all' && label.bhk !== highlight}
              onClick={() => onSelect({ kind: 'flat', blockId: label.blockId, flatNo: label.flatNo })}
            />
          ) : null,
          el,
          label.key,
        ),
      )}
    </>
  )
}

function LabelChip({ label, selected, hovered, onClick }) {
  const block = label.tone === 'block'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={label.subtitle ? `${label.title}, ${label.subtitle}` : label.title}
      className={cn(
        'touch-target flex flex-col items-center rounded-full border shadow-float backdrop-blur-md transition-[background-color,color,transform,box-shadow] duration-200',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun-400',
        block ? 'px-3.5 py-1.5' : label.tone === 'feature' ? 'px-3 py-1' : 'px-2.5 py-0.5',
        selected
          ? 'scale-105 border-sun-400 bg-sun-400 text-navy-950'
          : cn('border-white/20 bg-navy-950/80 text-white hover:border-sun-400/70', hovered && 'border-sun-400/70'),
      )}
    >
      <span
        className={cn(
          'leading-tight whitespace-nowrap',
          block
            ? 'font-display text-base'
            : label.tone === 'feature'
              ? 'text-xs font-medium tracking-wide'
              : 'text-[0.7rem]',
        )}
      >
        {label.title}
      </span>
      {label.subtitle && (
        <span
          className={cn(
            'font-numeric text-[0.65rem] leading-tight tracking-wider',
            selected ? 'text-navy-950/70' : 'text-white/60',
          )}
        >
          {label.subtitle}
        </span>
      )}
    </button>
  )
}

const pad2 = (n) => String(n).padStart(2, '0')

/**
 * Flat number on each tile of the active block; the selected flat shows its details inside the
 * tile instead (apartment ID once a floor is chosen). No dimensions are drawn: overall flat sizes
 * are not published (see measurements.js).
 */
function FlatChip({ label, selection, hovered, muted, onClick }) {
  const selected = selection?.blockId === label.blockId && selection.flatNo === label.flatNo
  const id =
    selected && selection.level !== undefined ? apartmentId(label.blockId, selection.level, label.flatNo) : undefined
  const details = `${label.bhk} BHK · ${formatSft(label.areaSft)} sft · ${label.facing}`
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`Block ${label.blockId} flat ${pad2(label.flatNo)}, ${details}${id ? `, apartment ${id}` : ''}`}
      className={cn(
        'flex min-h-7 min-w-7 flex-col items-center justify-center rounded-md px-1 leading-tight whitespace-nowrap transition-[opacity,color] duration-200',
        'focus-visible:outline-2 focus-visible:outline-sun-400',
        selected
          ? 'text-navy-950'
          : cn(
              'font-numeric text-[0.85rem] font-medium text-white [text-shadow:0_1px_3px_rgb(2_31_45/0.9)] lg:text-[0.7rem] lg:font-normal',
              muted && !hovered ? 'opacity-30' : selection && !hovered ? 'opacity-55' : 'opacity-95',
              hovered && 'text-sun-400',
            ),
      )}
    >
      {selected ? (
        <>
          {/* Two lines only, so the text stays inside small tiles; facing is in the panel. */}
          <span className="font-numeric text-sm font-semibold tracking-wide">{id ?? `Flat ${pad2(label.flatNo)}`}</span>
          <span className="text-[0.62rem] font-medium">
            {label.bhk} BHK · {formatSft(label.areaSft)} sft
          </span>
        </>
      ) : (
        pad2(label.flatNo)
      )}
    </button>
  )
}
