import { useCallback, useEffect, useRef, useState } from 'react'
import { AttributionControl, LngLatBounds, Map as MapLibreMap, Marker } from 'maplibre-gl'
import '@/utils/maplibre'
import {
  GOOGLE_MAPS_KEY,
  MAPTILER_KEY as KEY,
  googleHybridSource,
  hybridStyleUrl,
  streetTilesSource,
} from '@/config/maps'
import { Box, Home, Layers, Maximize, Minimize, Minus, Plus, Printer, Ruler, Share2, Undo2, X } from 'lucide-react'
import { centroid, distanceMetres, formatDistance, lineMetres } from '@/utils/geo'
import { buildLayoutGeoJson } from '@/components/viewer/layoutGeoJson'
import Compass from '@/components/viewer/Compass'
import {
  BLOCK_LAYERS,
  CLICKABLE_LAYERS,
  ESRI_IMAGERY,
  FLAT_ONLY_LAYERS,
  IMAGERY_SOURCE,
  LAYERS,
  MEASURE_LAYERS,
  MEASURE_SOURCE,
  NEARBY_LAYERS,
  NEARBY_SOURCE,
  ROAD_LAYERS,
  ROADS_MIN_ZOOM,
  SOURCE,
  addIcons,
  measureGeoJson,
  nearbyGeoJson,
} from '@/components/viewer/mapStyle'

const OVERLAY_SOURCE = 'plan-drawing'
const STREET_LAYER = 'street-map'
const SCREEN_PX_PER_METRE = 96 / 0.0254 // a CSS pixel is 1/96 inch
const ORBIT_DEG_PER_PX = 0.35 // a drag across a laptop screen turns the map about 360°
const ORBIT_PITCH_PER_PX = 0.25
const MAX_PITCH = 75
const CLICK_TOLERANCE_PX = 4

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
const SMALL_BUTTON =
  'inline-flex size-10 cursor-pointer items-center justify-center rounded-lg bg-card/90 text-white backdrop-blur transition-colors hover:bg-border'

// Zoom, position and map scale for the readout, as a surveyor's map shows them. MapLibre's zoom
// counts 512 px tiles, so a pixel covers 78,271.5 m x cos(latitude) / 2^zoom of ground.
function readoutFor(map, lngLat = map.getCenter()) {
  const zoom = map.getZoom()
  const metresPerPx = (78271.517 * Math.cos((lngLat.lat * Math.PI) / 180)) / 2 ** zoom
  return { zoom, lat: lngLat.lat, lng: lngLat.lng, scale: Math.round(metresPerPx * SCREEN_PX_PER_METRE) }
}

// A picture of the map as it is now, on its own page with the project's name, ready to print
function printMap(map, title) {
  const win = window.open('', '_blank') // opened now, while the click still counts, or it is blocked
  if (!win) return
  map.once('render', () => {
    // Read in the same frame it was drawn in, before the browser clears the canvas
    const image = map.getCanvas().toDataURL('image/png')
    const doc = win.document
    doc.title = title
    doc.body.style.cssText = 'margin:24px;font-family:system-ui,sans-serif;color:#1f2d3d'
    const heading = doc.createElement('h1')
    heading.textContent = title
    heading.style.cssText = 'margin:0 0 4px;font-size:22px'
    const date = doc.createElement('p')
    date.textContent = new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })
    date.style.cssText = 'margin:0 0 12px;font-size:12px;color:#5b6b7b'
    const picture = doc.createElement('img')
    picture.style.cssText = 'width:100%;border:1px solid #ccd5de'
    picture.onload = () => win.print()
    picture.src = image
    const credit = doc.createElement('p')
    credit.textContent = map.getContainer().querySelector('.maplibregl-ctrl-attrib-inner')?.textContent ?? ''
    credit.style.cssText = 'font-size:10px;color:#5b6b7b'
    doc.body.append(heading, date, picture, credit)
  })
  map.triggerRepaint()
}

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
  highlight = null,
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
  const is3DRef = useRef(false) // read by the map's click, hover and drag listeners
  // The 3D selection, for a buildings layer that finishes loading after it was made
  const selectionRef = useRef({
    block: selectedBlock,
    tower: selectedPlot?.number,
    floor: selectedFloor,
    amenity: selectedAmenity,
  })

  const openedOnSelection = useRef(Boolean(selectedPlot || selectedBlock))

  const [ready, setReady] = useState(false) // true once the map style and layers are loaded
  const [heading, setHeading] = useState(0)
  const [is3D, setIs3D] = useState(false)
  const [basemap, setBasemap] = useState('satellite') // 'satellite' | 'street'
  const basemapRef = useRef('satellite') // for the street layer, which is added once imagery is ready
  const [measuring, setMeasuring] = useState(false)
  const measuringRef = useRef(false) // for the click listener, which is bound once
  const [measurePoints, setMeasurePoints] = useState([])
  const [fullscreen, setFullscreen] = useState(false)
  const [readout, setReadout] = useState(null) // zoom, position and scale under the pointer

  useEffect(() => {
    selectRef.current = onSelectPlot
    selectBlockRef.current = onSelectBlock
  }, [onSelectPlot, onSelectBlock])

  // Zoom so the whole layout is in view, keeping the map's turn and tilt unless told otherwise
  const fitProject = useCallback(
    (map, duration = 600, bearing = map.getBearing(), pitch = map.getPitch()) => {
      map.fitBounds(projectBounds(project), {
        padding: 80,
        bearing,
        pitch,
        duration,
        animate: duration > 0,
        curve: 1.6,
        essential: false,
      })
    },
    [project],
  )

  const introRunning = useRef(false) // the opening flight down to the site

  // Turning the map mid-flight would leave it stranded zoomed out over the city, so the flight
  // jumps to its end first
  const finishIntro = useCallback(
    (map) => {
      if (!introRunning.current) return
      introRunning.current = false
      map.stop()
      fitProject(map, 0)
    },
    [fitProject],
  )

  const pointNorth = () => {
    const map = mapRef.current
    if (!map) return
    finishIntro(map)
    map.easeTo({ bearing: 0, duration: 600 })
  }

  const turnTo = (bearing) => {
    const map = mapRef.current
    if (!map) return
    finishIntro(map)
    map.jumpTo({ bearing })
  }

  // 1. Create the map once, and remove it when the page closes
  useEffect(() => {
    if (!KEY) return

    // Like a drone shot: open on the region and fly down to the site, unless the link opened a flat
    const flyIn = !openedOnSelection.current
    const map = new MapLibreMap({
      container: containerRef.current,
      style: hybridStyleUrl(KEY),
      center: project.location,
      zoom: flyIn ? 9 : 17,
      maxZoom: 21,
      maxPitch: 75,
      attributionControl: false,
    })
    map.addControl(new AttributionControl({ compact: true }), 'bottom-left')

    // Google's satellite photo and roads, asked for while the style loads (null without a key or
    // if Google refuses, and the map falls back to Esri's imagery)
    const googleSource = GOOGLE_MAPS_KEY ? googleHybridSource(GOOGLE_MAPS_KEY).catch(() => null) : null

    map.on('load', () => {
      const styleLayerIds = map.getStyle().layers.map((layer) => layer.id)
      Promise.resolve(googleSource).then((google) => {
        if (mapRef.current !== map) return // the page closed while waiting
        // Layer ids are MapTiler's hybrid style; each step is skipped if the style changes
        const styleLayer = (id) => (map.getLayer(id) ? id : undefined)
        if (google) {
          // Google's photo with Google's own roads and names: the style's layers are all put away
          map.addSource(IMAGERY_SOURCE, google)
          map.addLayer({ id: 'imagery', type: 'raster', source: IMAGERY_SOURCE }, styleLayer(styleLayerIds[0]))
          styleLayerIds.forEach((id) => map.setLayoutProperty(id, 'visibility', 'none'))
        } else {
          // Current imagery in place of the style's own photo, and the real roads drawn as tarmac
          map.addSource(IMAGERY_SOURCE, ESRI_IMAGERY)
          map.addLayer({ id: 'imagery', type: 'raster', source: IMAGERY_SOURCE }, styleLayer('Tunnel'))
          if (styleLayer('Satellite')) map.setLayoutProperty('Satellite', 'visibility', 'none')
          if (styleLayer('Road')) map.setLayerZoomRange('Road', 0, ROADS_MIN_ZOOM)
          if (map.getSource('maptiler_planet')) {
            ROAD_LAYERS.forEach((layer) => map.addLayer(layer, styleLayer('Road labels')))
          }
        }
        // The street map, for the Satellite / Street switch: over the photo and its roads, under
        // the layout (whose layers were added while the imagery was on its way)
        map.addSource(STREET_LAYER, streetTilesSource(KEY))
        map.addLayer(
          {
            id: STREET_LAYER,
            type: 'raster',
            source: STREET_LAYER,
            layout: { visibility: basemapRef.current === 'street' ? 'visible' : 'none' },
          },
          styleLayer(OVERLAY_SOURCE) ?? styleLayer(LAYERS[0].id),
        )
      })
      addIcons(map)

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
      LAYERS.forEach((layer) => map.addLayer(layer))
      // The brochure's nearby places, pinned with their distance once the map pulls back
      if (project.nearby?.length) {
        map.addSource(NEARBY_SOURCE, {
          type: 'geojson',
          data: nearbyGeoJson(project.nearby, project.location, distanceMetres),
        })
        NEARBY_LAYERS.forEach((layer) => map.addLayer(layer))
      }
      map.addSource(MEASURE_SOURCE, { type: 'geojson', data: measureGeoJson([]) })
      MEASURE_LAYERS.forEach((layer) => map.addLayer(layer))

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
        // While measuring, every click is a point on the line
        if (measuringRef.current) {
          setMeasurePoints((points) => [...points, event.lngLat.toArray()])
          return
        }
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
        setReadout(readoutFor(map, event.lngLat))
        if (measuringRef.current) return // the crosshair stays
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
      // Without a pointer on the map (a phone, or a zoom button) the readout follows the centre
      map.on('moveend', () => setReadout(readoutFor(map)))

      fitProject(map, flyIn ? 5500 : 600)
      if (flyIn) {
        introRunning.current = true
        map.once('moveend', () => (introRunning.current = false))
      }
      setReady(true)
    })
    map.on('rotate', () => setHeading(map.getBearing()))

    // Dragging with the mouse turns the map round its centre, a full 360°; in 3D, dragging up and
    // down also tilts it. Shift + drag pans. Touch keeps the usual gestures (two fingers to turn).
    map.boxZoom.disable() // Shift + drag is the pan now
    const canvas = map.getCanvasContainer()
    let orbit = null
    const onOrbitMove = (event) => {
      const dx = event.clientX - orbit.x
      const dy = event.clientY - orbit.y
      if (!orbit.moved && Math.hypot(dx, dy) < CLICK_TOLERANCE_PX) return
      orbit.moved = true
      map.jumpTo({
        bearing: orbit.bearing - dx * ORBIT_DEG_PER_PX,
        pitch: is3DRef.current ? Math.min(MAX_PITCH, Math.max(0, orbit.pitch - dy * ORBIT_PITCH_PER_PX)) : 0,
      })
    }
    // The browser still sends a click when a turning drag ends; swallow it so it selects nothing
    const swallowClick = (event) => event.stopPropagation()
    const onOrbitEnd = () => {
      window.removeEventListener('mousemove', onOrbitMove)
      window.removeEventListener('mouseup', onOrbitEnd)
      map.dragPan.enable()
      if (orbit?.moved) {
        canvas.addEventListener('click', swallowClick, { capture: true, once: true })
        setTimeout(() => canvas.removeEventListener('click', swallowClick, true), 0)
      }
      orbit = null
    }
    const onOrbitStart = (event) => {
      if (event.button !== 0 || event.shiftKey) return
      finishIntro(map)
      map.dragPan.disable() // before MapLibre's own handler sees this press
      orbit = { x: event.clientX, y: event.clientY, bearing: map.getBearing(), pitch: map.getPitch(), moved: false }
      window.addEventListener('mousemove', onOrbitMove)
      window.addEventListener('mouseup', onOrbitEnd)
    }
    canvas.addEventListener('mousedown', onOrbitStart, true)

    mapRef.current = map
    // Development-only test hook (tree-shaken from production builds), like the explorer's
    // window.__ira3d: lets automated QA find the buildings on screen and click them.
    if (import.meta.env.DEV) window.__spacerMap = { map, buildings: () => buildingsRef.current }
    return () => {
      if (import.meta.env.DEV) delete window.__spacerMap
      onOrbitEnd()
      canvas.removeEventListener('mousedown', onOrbitStart, true)
      map.remove()
      mapRef.current = null
      buildingsRef.current = null
      setReady(false)
    }
  }, [project, fitProject, finishIntro])

  // 2. Push the layout to the map whenever colours or the selection change
  useEffect(() => {
    if (!ready) return
    mapRef.current
      .getSource(SOURCE)
      .setData(buildLayoutGeoJson(project, { colorMode, selectedPlot, selectedBlock, highlight }))
  }, [ready, project, colorMode, selectedPlot, selectedBlock, highlight])

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

  // 5. Satellite or street map under the layout
  useEffect(() => {
    basemapRef.current = basemap
    if (ready && mapRef.current.getLayer(STREET_LAYER)) {
      mapRef.current.setLayoutProperty(STREET_LAYER, 'visibility', basemap === 'street' ? 'visible' : 'none')
    }
  }, [ready, basemap])

  // 6. The measured line
  useEffect(() => {
    if (ready) mapRef.current.getSource(MEASURE_SOURCE).setData(measureGeoJson(measurePoints))
  }, [ready, measurePoints])

  const stopMeasuring = useCallback(() => {
    measuringRef.current = false
    setMeasuring(false)
    setMeasurePoints([])
    if (mapRef.current) mapRef.current.getCanvas().style.cursor = ''
  }, [])

  const toggleMeasuring = () => {
    if (!ready) return
    if (measuring) {
      stopMeasuring()
      return
    }
    measuringRef.current = true
    setMeasuring(true)
    mapRef.current.getCanvas().style.cursor = 'crosshair'
  }

  // Escape puts the ruler away
  useEffect(() => {
    if (!measuring) return
    const onKey = (event) => event.key === 'Escape' && stopMeasuring()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [measuring, stopMeasuring])

  // The whole page goes full screen, so the panels and buttons come along
  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen?.().catch(() => {})
  }

  const zoomBy = (delta) => {
    if (!ready) return
    finishIntro(mapRef.current)
    mapRef.current.easeTo({ zoom: mapRef.current.getZoom() + delta, duration: 300 })
  }

  const print = () => {
    if (ready) printMap(mapRef.current, `${project.name} · ${project.city}`)
  }

  // Flat shapes in 2D. In 3D, projects with buildings show them; others raise their plots.
  const set3D = (on) => {
    const map = mapRef.current
    const buildings = buildingsRef.current
    buildings?.setVisible(on)
    if (!on) buildings?.setHover(null)
    is3DRef.current = on
    map.setLayoutProperty('plots-3d', 'visibility', on && !buildings ? 'visible' : 'none')
    // Flat tiles and numbers would sit under or float over the buildings, so they rest until 2D returns
    FLAT_ONLY_LAYERS.forEach((id) => map.setLayoutProperty(id, 'visibility', on ? 'none' : 'visible'))
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
    fitProject(mapRef.current, 600, 0, 0)
  }

  if (!KEY) return <MissingKey />

  return (
    <>
      {/* MapTiler's CSS makes the map element position: relative, so the wrapper does the sizing */}
      <div className="absolute inset-0">
        <div ref={containerRef} className="size-full" />
      </div>

      <div className="absolute top-24 left-5">
        <Compass heading={heading} onClick={pointNorth} onRotate={turnTo} />
      </div>

      {/* Map tools under the compass; phones zoom and pan with their fingers instead */}
      <div role="toolbar" aria-label="Map tools" className="absolute top-48 left-6 hidden flex-col gap-1.5 md:flex">
        <button type="button" onClick={() => zoomBy(1)} title="Zoom in" className={SMALL_BUTTON}>
          <Plus size={18} />
        </button>
        <button type="button" onClick={() => zoomBy(-1)} title="Zoom out" className={SMALL_BUTTON}>
          <Minus size={18} />
        </button>
        <button
          type="button"
          onClick={() => setBasemap(basemap === 'satellite' ? 'street' : 'satellite')}
          title={basemap === 'satellite' ? 'Show the street map' : 'Show the satellite photo'}
          aria-pressed={basemap === 'street'}
          className={`${SMALL_BUTTON} ${basemap === 'street' ? 'text-brand' : ''}`}
        >
          <Layers size={18} />
        </button>
        <button
          type="button"
          onClick={toggleMeasuring}
          title={measuring ? 'Stop measuring' : 'Measure a distance'}
          aria-pressed={measuring}
          className={`${SMALL_BUTTON} ${measuring ? 'text-brand' : ''}`}
        >
          <Ruler size={18} />
        </button>
        <button type="button" onClick={print} title="Print the map" className={SMALL_BUTTON}>
          <Printer size={18} />
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          title={fullscreen ? 'Leave full screen' : 'Full screen'}
          className={SMALL_BUTTON}
        >
          {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
      </div>

      {measuring && (
        <div
          role="status"
          className="absolute top-32 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full bg-card/95 py-1.5 pr-1.5 pl-4 text-sm backdrop-blur"
        >
          <Ruler size={16} className="text-brand" />
          <span className="font-semibold tabular-nums">
            {measurePoints.length < 2 ? 'Click points on the map' : formatDistance(lineMetres(measurePoints))}
          </span>
          <button
            type="button"
            onClick={() => setMeasurePoints((points) => points.slice(0, -1))}
            disabled={!measurePoints.length}
            title="Remove the last point"
            className="cursor-pointer rounded-full p-1.5 text-muted-foreground hover:text-white disabled:cursor-default disabled:opacity-40"
          >
            <Undo2 size={16} />
          </button>
          <button
            type="button"
            onClick={stopMeasuring}
            title="Stop measuring"
            className="cursor-pointer rounded-full p-1.5 text-muted-foreground hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {readout && (
        <p className="pointer-events-none absolute bottom-12 left-5 hidden gap-3 rounded-md bg-black/60 px-2.5 py-1 text-[11px] text-white/85 tabular-nums backdrop-blur md:flex">
          <span>Zoom {readout.zoom.toFixed(2)}</span>
          <span>Lat {readout.lat.toFixed(5)}</span>
          <span>Long {readout.lng.toFixed(5)}</span>
          <span>Scale 1:{readout.scale.toLocaleString('en-IN')}</span>
        </p>
      )}

      <div
        className={`absolute bottom-44 flex flex-col gap-2 transition-[right] md:bottom-36 ${
          sidePanelOpen ? 'right-5 md:right-104' : 'right-5'
        }`}
      >
        <button
          type="button"
          onClick={toggle3D}
          aria-pressed={is3D}
          title={is3D ? 'Back to 2D' : 'View in 3D (drag to turn and tilt, Shift + drag to move)'}
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
