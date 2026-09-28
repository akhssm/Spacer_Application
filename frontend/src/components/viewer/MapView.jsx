import { useCallback, useEffect, useRef, useState } from 'react'
import { AttributionControl, LngLatBounds, Map as MapLibreMap, Marker } from 'maplibre-gl'
import '@/utils/maplibre'
import { MAPTILER_KEY as KEY, hybridStyleUrl } from '@/config/maps'
import { Box, Home, Share2 } from 'lucide-react'
import { centroid } from '@/utils/geo'
import { buildLayoutGeoJson } from '@/components/viewer/layoutGeoJson'
import Compass from '@/components/viewer/Compass'

const SOURCE = 'layout'
const OVERLAY_SOURCE = 'plan-drawing'
const IS_UNIT = ['any', ['==', ['get', 'kind'], 'plot'], ['==', ['get', 'kind'], 'amenity']]
const IS_BOUNDARY = ['==', ['get', 'kind'], 'boundary']
const IS_BLOCK = ['==', ['get', 'kind'], 'block']
const IS_RAISED = ['all', IS_UNIT, ['>', ['get', 'height'], 0]]

// How the layout is drawn. Each layer reads colours, opacities and labels from the GeoJSON properties.
const LAYERS = [
  { id: 'boundary-fill', type: 'fill', filter: IS_BOUNDARY, paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.06 } },
  {
    id: 'boundary-line',
    type: 'line',
    filter: IS_BOUNDARY,
    paint: { 'line-color': '#ffffff', 'line-opacity': 0.6, 'line-width': 1.5 },
  },
  {
    id: 'plots-fill',
    type: 'fill',
    filter: IS_UNIT,
    paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': ['get', 'fillOpacity'] },
  },
  // Darkens the blocks that are not chosen; invisible otherwise, but still clickable
  {
    id: 'blocks-dim',
    type: 'fill',
    filter: IS_BLOCK,
    paint: { 'fill-color': '#0a0a0a', 'fill-opacity': ['case', ['get', 'dim'], 0.62, 0] },
  },
  {
    id: 'blocks-line',
    type: 'line',
    filter: IS_BLOCK,
    paint: { 'line-color': '#75c217', 'line-width': 2.5, 'line-opacity': ['case', ['get', 'selected'], 1, 0] },
  },
  {
    id: 'plots-3d',
    type: 'fill-extrusion',
    filter: IS_RAISED,
    layout: { visibility: 'none' },
    paint: {
      'fill-extrusion-color': ['get', 'fill'],
      'fill-extrusion-height': ['get', 'height'],
      'fill-extrusion-opacity': 0.9,
    },
  },
  {
    id: 'plots-line',
    type: 'line',
    filter: IS_UNIT,
    paint: {
      'line-color': ['case', ['get', 'selected'], '#75c217', '#ffffff'],
      'line-width': ['case', ['get', 'selected'], 3, 1],
      'line-opacity': ['case', ['get', 'selected'], 1, ['get', 'outlineOpacity']],
    },
  },
  {
    id: 'plots-label',
    type: 'symbol',
    filter: IS_UNIT,
    layout: {
      'text-field': ['get', 'label'],
      'text-size': ['get', 'labelSize'],
      'text-font': ['Open Sans Bold'],
      'text-allow-overlap': true,
      'text-max-width': 8,
    },
    paint: {
      'text-color': ['get', 'labelColour'],
      'text-opacity': ['get', 'labelOpacity'],
      'text-halo-color': 'rgba(0, 0, 0, 0.75)',
      'text-halo-width': ['get', 'labelHalo'],
    },
  },
]
const CLICKABLE_LAYERS = ['plots-fill', 'plots-3d']
const BLOCK_LAYERS = ['blocks-dim']

// How far (in zoom levels) the 3D camera stays back from a chosen block, to keep its surroundings
const BLOCK_CONTEXT_ZOOM = 0.6

function projectBounds(project) {
  const bounds = new LngLatBounds()
  const rings = [project.layout.boundary, ...project.layout.plots.map((plot) => plot.polygon)]
  rings.filter(Boolean).forEach((ring) => ring.forEach((point) => bounds.extend(point)))
  if (bounds.isEmpty()) bounds.extend(project.location)
  return bounds
}

// Frame bounds in 3D without flattening or turning the view: the camera keeps its pitch and
// bearing, and backs off by `zoomBack` levels. Room is left for the side panel or bottom sheet.
function ease3D(map, bounds, zoomBack) {
  const desktop = window.innerWidth >= 768
  const camera = map.cameraForBounds(bounds, {
    bearing: map.getBearing(),
    padding: {
      top: 80,
      bottom: desktop ? 80 : Math.round(window.innerHeight * 0.45),
      left: 40,
      right: desktop ? 440 : 40,
    },
  })
  if (!camera) return
  map.easeTo({ center: camera.center, zoom: camera.zoom - zoomBack, duration: 800 })
}

// Where the map should keep its centre when a side panel covers part of it
const panelOffset = () => (window.innerWidth >= 768 ? [-200, -40] : [0, -140])

const ROUND_BUTTON =
  'inline-flex size-12 cursor-pointer items-center justify-center rounded-full bg-card/90 text-white backdrop-blur transition-colors hover:bg-border'

// Shown until a MapTiler key is added to .env.local
function MissingKey() {
  return (
    <div className="absolute inset-0 flex items-center justify-center px-5">
      <div className="max-w-md rounded-lg border border-border bg-card p-6 text-sm leading-6 text-muted-foreground">
        <p className="mb-2 font-bold text-foreground">The satellite map isn't available right now</p>
        <p>
          The map needs an imagery key, and none is set for this site. Search, info, brochure and gallery still work.
        </p>
        <p className="mt-3 text-xs">
          For developers: set <code className="text-foreground">VITE_MAPTILER_KEY</code> in{' '}
          <code className="text-foreground">.env.local</code> (see <code className="text-foreground">.env.example</code>
          ) and restart the dev server.
        </p>
      </div>
    </div>
  )
}

// The live satellite map with the project's layout drawn on it.
function MapView({
  project,
  colorMode,
  selectedPlot,
  selectedBlock,
  selectedFloor,
  selectedAmenity,
  onSelectPlot,
  onSelectBlock,
  userPosition,
  onShare,
  sidePanelOpen = false,
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const buildingsRef = useRef(null) // the three.js layer, when the project has buildings
  const userMarkerRef = useRef(null)
  const pannedToUser = useRef(false)
  // Latest handlers, so the map's click listener is bound once
  const selectRef = useRef(onSelectPlot)
  const selectBlockRef = useRef(onSelectBlock)
  const is3DRef = useRef(false) // read by the map's click and hover listeners
  // The 3D selection, for a buildings layer that finishes loading after it was made
  const selectionRef = useRef({
    block: selectedBlock,
    tower: selectedPlot?.number,
    floor: selectedFloor,
    amenity: selectedAmenity,
  })

  const [ready, setReady] = useState(false) // true once the map style and layers are loaded
  const [heading, setHeading] = useState(0)
  const [is3D, setIs3D] = useState(false)

  useEffect(() => {
    selectRef.current = onSelectPlot
    selectBlockRef.current = onSelectBlock
  }, [onSelectPlot, onSelectBlock])

  // Zoom so the whole layout is in view
  const fitProject = useCallback(
    (map) => {
      map.fitBounds(projectBounds(project), { padding: 80, duration: 600 })
    },
    [project],
  )

  // 1. Create the map once, and remove it when the page closes
  useEffect(() => {
    if (!KEY) return

    const map = new MapLibreMap({
      container: containerRef.current,
      style: hybridStyleUrl(KEY),
      center: project.location,
      zoom: 17,
      maxPitch: 75,
      attributionControl: false,
    })
    map.addControl(new AttributionControl({ compact: true }), 'bottom-left')

    map.on('load', () => {
      // The plan drawing, if the project has one, sits under everything else
      const { overlay } = project.layout
      if (overlay) {
        map.addSource(OVERLAY_SOURCE, { type: 'image', url: overlay.url, coordinates: overlay.coordinates })
        map.addLayer({
          id: 'plan-drawing',
          type: 'raster',
          source: OVERLAY_SOURCE,
          paint: { 'raster-opacity': 0.96, 'raster-fade-duration': 0 },
        })
      }

      map.addSource(SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      LAYERS.forEach((layer) => map.addLayer({ ...layer, source: SOURCE }))

      // Real buildings for the 3D view, when the project has block footprints or a model.
      // three.js is large, so it is only downloaded for projects that need it.
      if (project.layout.blocks?.length || project.model?.url) {
        import('@/components/viewer/buildings3d').then(({ createBuildingsLayer }) => {
          if (mapRef.current !== map) return // the page closed while loading
          buildingsRef.current = createBuildingsLayer(project)
          map.addLayer(buildingsRef.current)
          buildingsRef.current.setSelection(selectionRef.current)
        })
      }

      // What is under the pointer in 3D ({ block, tower, floor } or { amenity }), when the
      // buildings are showing
      const pickBuilding = (point) => (is3DRef.current ? (buildingsRef.current?.pick(point) ?? null) : null)
      const plotByNumber = (number) => project.layout.plots.find((p) => p.number === number) ?? null

      // A click on a plot selects it, a click on a block chooses that block,
      // and a click anywhere else clears the plot selection. In 3D the buildings
      // stand above their footprints: a click on a tower's residential part selects
      // that tower ON THAT FLOOR (the same plot a 2D click selects, plus the storey
      // the click landed on); its stilt or roof selects the tower alone; the
      // clubhouse (or the pool on it) selects that amenity; and a block's shared
      // corridor or cores choose the block.
      map.on('click', (event) => {
        const building = pickBuilding(event.point)
        if (building?.amenity) {
          selectRef.current(plotByNumber(building.amenity))
          return
        }
        if (building?.tower) {
          selectRef.current(plotByNumber(building.tower), building.floor)
          return
        }
        if (building) {
          selectBlockRef.current(building.block)
          return
        }
        const hits = map.queryRenderedFeatures(event.point, { layers: CLICKABLE_LAYERS })
        if (hits.length) {
          selectRef.current(project.layout.plots.find((p) => p.number === hits[0].properties.number) || null)
          return
        }
        const blockHits = map.queryRenderedFeatures(event.point, { layers: BLOCK_LAYERS })
        if (blockHits.length) {
          selectBlockRef.current(blockHits[0].properties.name)
          return
        }
        selectRef.current(null)
      })
      map.on('mousemove', (event) => {
        const building = pickBuilding(event.point)
        buildingsRef.current?.setHover(
          building?.amenity ? { amenity: building.amenity } : building?.tower ? building : null,
        )
        const hits = building
          ? [building]
          : map.queryRenderedFeatures(event.point, { layers: [...CLICKABLE_LAYERS, ...BLOCK_LAYERS] })
        map.getCanvas().style.cursor = hits.length ? 'pointer' : ''
      })
      map.getCanvas().addEventListener('mouseleave', () => buildingsRef.current?.setHover(null))

      fitProject(map)
      setReady(true)
    })
    map.on('rotate', () => setHeading(map.getBearing()))

    mapRef.current = map
    // Development-only test hook (tree-shaken from production builds), like the explorer's
    // window.__ira3d: lets automated QA find the buildings on screen and click them.
    if (import.meta.env.DEV) window.__spacerMap = { map, buildings: () => buildingsRef.current }
    return () => {
      if (import.meta.env.DEV) delete window.__spacerMap
      map.remove()
      mapRef.current = null
      buildingsRef.current = null
      setReady(false)
    }
  }, [project, fitProject])

  // 2. Push the layout to the map whenever colours or the selection change
  useEffect(() => {
    if (!ready) return
    mapRef.current.getSource(SOURCE).setData(buildLayoutGeoJson(project, { colorMode, selectedPlot, selectedBlock }))
  }, [ready, project, colorMode, selectedPlot, selectedBlock])

  // 3. Move to a plot when it is chosen from search or by a click
  useEffect(() => {
    if (ready && selectedPlot) {
      mapRef.current.easeTo({ center: centroid(selectedPlot.polygon), offset: panelOffset() })
    }
  }, [ready, selectedPlot])

  // 2b. Tint the selected tower (and band its chosen floor) or amenity on the 3D buildings
  const selectedTower = selectedAmenity ? undefined : selectedPlot?.number
  useEffect(() => {
    selectionRef.current = {
      block: selectedBlock,
      tower: selectedTower,
      floor: selectedFloor,
      amenity: selectedAmenity,
    }
    buildingsRef.current?.setSelection(selectionRef.current)
  }, [selectedBlock, selectedTower, selectedFloor, selectedAmenity])

  // 3b. Zoom to a block when it is chosen (a chosen tower is framed by 3 instead). In 3D the
  // camera keeps its tilt and heading and stays back a little, so the rest of the site is
  // still in view around the block.
  const framedBlock = useRef(null)
  useEffect(() => {
    if (!ready) return
    const map = mapRef.current
    const previous = framedBlock.current
    framedBlock.current = selectedBlock
    if (selectedTower) return
    if (!selectedBlock) {
      if (previous && is3DRef.current) ease3D(map, projectBounds(project), 0)
      return
    }
    const block = project.layout.blocks?.find((b) => b.name === selectedBlock)
    if (!block) return
    const bounds = new LngLatBounds()
    block.polygon.forEach((point) => bounds.extend(point))
    if (is3DRef.current) {
      ease3D(map, bounds, BLOCK_CONTEXT_ZOOM)
      return
    }
    const desktop = window.innerWidth >= 768
    map.fitBounds(bounds, {
      padding: { top: 90, bottom: desktop ? 120 : 260, left: 40, right: desktop ? 440 : 40 },
      duration: 700,
    })
  }, [ready, project, selectedBlock, selectedTower])

  // 4. Show where the visitor is, and go there the first time GPS reports it
  useEffect(() => {
    if (!ready) return
    const map = mapRef.current

    if (!userPosition) {
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
      pannedToUser.current = false
      return
    }

    if (!userMarkerRef.current) {
      const dot = document.createElement('span')
      dot.className =
        'block size-4 rounded-full border-2 border-white bg-status-reserved shadow-[0_0_0_6px_rgba(63,131,209,0.35)]'
      dot.title = 'You are here'
      userMarkerRef.current = new Marker({ element: dot }).setLngLat(userPosition).addTo(map)
    } else {
      userMarkerRef.current.setLngLat(userPosition)
    }

    if (!pannedToUser.current) {
      map.easeTo({ center: userPosition })
      pannedToUser.current = true
    }
  }, [ready, userPosition])

  // Flat shapes in 2D. In 3D, projects with buildings show them; others raise their plots.
  const set3D = (on) => {
    const map = mapRef.current
    const buildings = buildingsRef.current
    buildings?.setVisible(on)
    if (!on) buildings?.setHover(null)
    is3DRef.current = on
    map.setLayoutProperty('plots-3d', 'visibility', on && !buildings ? 'visible' : 'none')
    map.setLayoutProperty('plots-fill', 'visibility', on ? 'none' : 'visible')
    // Flat numbers would float on top of the buildings, so they rest until 2D returns
    map.setPaintProperty(
      'plots-label',
      'text-opacity',
      on && buildings ? ['case', ['==', ['get', 'kind'], 'plot'], 0, ['get', 'labelOpacity']] : ['get', 'labelOpacity'],
    )
    setIs3D(on)
  }

  const toggle3D = () => {
    if (!ready) return
    const on = !is3D
    set3D(on)
    const map = mapRef.current
    map.easeTo({
      pitch: on ? 62 : 0,
      bearing: on && buildingsRef.current ? -35 : map.getBearing(),
      zoom: on ? Math.max(map.getZoom(), 17.6) : map.getZoom(),
      duration: 900,
    })
  }

  const goHome = () => {
    if (!ready) return
    set3D(false)
    mapRef.current.easeTo({ pitch: 0, bearing: 0, duration: 600 })
    fitProject(mapRef.current)
  }

  if (!KEY) return <MissingKey />

  return (
    <>
      {/* MapTiler's CSS makes the map element position: relative, so the wrapper does the sizing */}
      <div className="absolute inset-0">
        <div ref={containerRef} className="size-full" />
      </div>

      <div className="absolute top-24 left-5">
        <Compass heading={heading} onReset={() => mapRef.current?.easeTo({ bearing: 0 })} />
      </div>

      <div
        className={`absolute bottom-40 flex flex-col gap-2 transition-[right] md:bottom-48 ${
          sidePanelOpen ? 'right-5 md:right-104' : 'right-5'
        }`}
      >
        <button
          type="button"
          onClick={toggle3D}
          aria-pressed={is3D}
          title={is3D ? 'Back to 2D' : 'View in 3D (drag with the right mouse button or two fingers to rotate)'}
          className={`${ROUND_BUTTON} ${is3D ? 'text-brand' : ''}`}
        >
          <Box size={18} />
        </button>
        <button type="button" onClick={goHome} title="Show the whole layout" className={ROUND_BUTTON}>
          <Home size={18} />
        </button>
        <button type="button" onClick={onShare} title="Share this link" className={ROUND_BUTTON}>
          <Share2 size={18} />
        </button>
      </div>
    </>
  )
}

export default MapView
