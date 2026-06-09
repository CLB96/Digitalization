import { useRef, useState, useEffect } from 'react'
import { Stage, Layer, Group, Image as KImage, Line, Circle, Path, Text } from 'react-konva'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '../../store/appStore'
import { pxToMm } from '../../hooks/useScale'
import type { ContourPoint } from '../../types'

interface Props {
  selectedId: string | null
  onSelect: (id: string | null) => void
  onPointMove: (id: string, x: number, y: number) => void
  onAddPoint: (x: number, y: number) => void
  onDeletePoint: (id: string) => void
  onToggleSegmentType: (id: string) => void
  /** Increment to trigger a fit-to-screen / center reset */
  centerTrigger?: number
}

/** Build an SVG path string supporting line and bezier segments (Catmull-Rom → cubic bezier). */
function buildPath(pts: ContourPoint[], closed = true): string {
  if (pts.length < 2) return ''
  const n = pts.length
  let d = `M ${pts[0].x} ${pts[0].y}`
  const limit = closed ? n : n - 1
  for (let i = 0; i < limit; i++) {
    const curr = pts[i]
    const next = pts[(i + 1) % n]
    if (curr.type === 'bezier') {
      const prev = pts[(i - 1 + n) % n]
      const nn   = pts[(i + 2) % n]
      const t = 0.35
      d += ` C ${curr.x + (next.x - prev.x) * t} ${curr.y + (next.y - prev.y) * t} ${next.x - (nn.x - curr.x) * t} ${next.y - (nn.y - curr.y) * t} ${next.x} ${next.y}`
    } else {
      d += ` L ${next.x} ${next.y}`
    }
  }
  if (closed) d += ' Z'
  return d
}

/**
 * Convert a point in Konva stage-space (after pan/zoom, before group rotation)
 * back to image-pixel coordinates, accounting for the Group's rotation around
 * the image center.
 */
function stageToImageCoords(
  sx: number, sy: number,
  imgW: number, imgH: number,
  rotDeg: number,
): { x: number; y: number } {
  const cx = imgW / 2, cy = imgH / 2
  const dx = sx - cx, dy = sy - cy
  const norm = ((rotDeg % 360) + 360) % 360
  switch (norm) {
    case 90:  return { x: cx + dy,  y: cy - dx }
    case 180: return { x: cx - dx,  y: cy - dy }
    case 270: return { x: cx - dy,  y: cy + dx }
    default:  return { x: sx, y: sy }
  }
}

export function EditorCanvas({
  selectedId, onSelect, onPointMove, onAddPoint, onDeletePoint, onToggleSegmentType,
  centerTrigger,
}: Props) {
  const {
    rawImage, imageWidth, imageHeight, contourPoints, paths,
    activeToolId, zoom, stagePos, scaleFactor, imageRotation,
    setZoom, setStagePos, setActiveTool,
  } = useAppStore(useShallow(s => ({
    rawImage: s.rawImage, imageWidth: s.imageWidth, imageHeight: s.imageHeight,
    contourPoints: s.contourPoints, paths: s.paths,
    activeToolId: s.activeToolId, zoom: s.zoom, stagePos: s.stagePos,
    scaleFactor: s.scaleFactor, imageRotation: s.imageRotation,
    setZoom: s.setZoom, setStagePos: s.setStagePos, setActiveTool: s.setActiveTool,
  })))

  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef     = useRef<any>(null)
  const [stageSize, setStageSize]   = useState({ width: 800, height: 600 })
  const [measurePts, setMeasurePts] = useState<{ x: number; y: number }[]>([])

  // ── Refs so native handlers always see fresh values ───────────────────────
  const activeToolIdRef   = useRef(activeToolId)
  const stagePosRef       = useRef(stagePos)
  const zoomRef           = useRef(zoom)
  const imageRotationRef  = useRef(imageRotation)
  const imageWidthRef     = useRef(imageWidth)
  const imageHeightRef    = useRef(imageHeight)
  const stageSizeRef      = useRef(stageSize)
  const onAddPointRef     = useRef(onAddPoint)
  const setMeasurePtsRef  = useRef(setMeasurePts)
  const blockClickRef     = useRef(false)

  useEffect(() => { activeToolIdRef.current  = activeToolId  }, [activeToolId])
  useEffect(() => { stagePosRef.current      = stagePos      }, [stagePos])
  useEffect(() => { zoomRef.current          = zoom          }, [zoom])
  useEffect(() => { imageRotationRef.current = imageRotation }, [imageRotation])
  useEffect(() => { imageWidthRef.current    = imageWidth    }, [imageWidth])
  useEffect(() => { imageHeightRef.current   = imageHeight   }, [imageHeight])
  useEffect(() => { stageSizeRef.current     = stageSize     }, [stageSize])
  useEffect(() => { onAddPointRef.current    = onAddPoint    }, [onAddPoint])
  useEffect(() => { setMeasurePtsRef.current = setMeasurePts }, [setMeasurePts])

  // Fit image to canvas whenever centerTrigger increments
  useEffect(() => {
    if (centerTrigger === undefined || centerTrigger === 0) return
    const sw = stageSizeRef.current.width
    const sh = stageSizeRef.current.height
    if (!sw || !sh || !imageWidth || !imageHeight) return
    const padding = 40
    const fitZoom = Math.min(
      (sw - padding * 2) / imageWidth,
      (sh - padding * 2) / imageHeight,
    )
    const newZoom = Math.min(10, Math.max(0.05, fitZoom))
    setZoom(newZoom)
    setStagePos({
      x: (sw - imageWidth * newZoom) / 2,
      y: (sh - imageHeight * newZoom) / 2,
    })
  }, [centerTrigger, imageWidth, imageHeight, setZoom, setStagePos])

  // Reset measure points when leaving the measure tool
  useEffect(() => {
    if (activeToolId !== 'measure') setMeasurePts([])
  }, [activeToolId])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const toolMap: Record<string, string> = {
        s: 'select', e: 'edit-point', a: 'add-point',
        d: 'delete-point', m: 'measure', z: 'zoom',
      }
      const tool = toolMap[e.key.toLowerCase()]
      if (tool) setActiveTool(tool as Parameters<typeof setActiveTool>[0])
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setActiveTool])

  // Observe container size
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setStageSize({ width: el.clientWidth, height: el.clientHeight }))
    ro.observe(el)
    setStageSize({ width: el.clientWidth, height: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // Non-passive wheel for zoom-to-cursor
  // The Stage has no CSS rotation, so stage.getPointerPosition() is always correct.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (ev: WheelEvent) => {
      ev.preventDefault()
      const stage = stageRef.current
      if (!stage) return
      const scaleBy  = ev.deltaY < 0 ? 1.12 : 0.9
      const oldScale = stage.scaleX() as number
      const pointer  = stage.getPointerPosition() as { x: number; y: number } | null
      if (!pointer) return
      const newScale = Math.min(10, Math.max(0.1, oldScale * scaleBy))
      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      }
      setZoom(newScale)
      setStagePos({
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      })
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [setZoom, setStagePos])

  // ── Native DOM click — handles add-point and measure on ALL canvas areas ──
  // Converts: screen → stage-space → image-space (accounting for group rotation).
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handler = (ev: MouseEvent) => {
      if (blockClickRef.current) {
        blockClickRef.current = false
        return
      }

      const tool = activeToolIdRef.current
      if (tool !== 'add-point' && tool !== 'measure') return

      const rect = container.getBoundingClientRect()
      const pointerX = ev.clientX - rect.left
      const pointerY = ev.clientY - rect.top

      // Screen → stage-space (undo pan + zoom)
      const pos = stagePosRef.current
      const z   = zoomRef.current
      const stageX = (pointerX - pos.x) / z
      const stageY = (pointerY - pos.y) / z

      // Stage-space → image-space (undo group rotation)
      const { x: imgX, y: imgY } = stageToImageCoords(
        stageX, stageY,
        imageWidthRef.current, imageHeightRef.current,
        imageRotationRef.current,
      )

      if (tool === 'add-point') {
        onAddPointRef.current(imgX, imgY)
      }
      if (tool === 'measure') {
        setMeasurePtsRef.current(prev =>
          prev.length >= 2 ? [{ x: imgX, y: imgY }] : [...prev, { x: imgX, y: imgY }]
        )
      }
    }

    container.addEventListener('click', handler)
    return () => container.removeEventListener('click', handler)
  }, [])

  // Stage click — only for deselection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleStageClick(e: any) {
    const isStage = e.target === e.target.getStage()
    if (!isStage) return
    if (activeToolId === 'select' || activeToolId === 'edit-point') onSelect(null)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleDragEnd(e: any) {
    setStagePos({ x: e.target.x(), y: e.target.y() })
  }

  const cursorMap: Record<string, string> = {
    'add-point':    'crosshair',
    'delete-point': 'cell',
    'segment-type': 'pointer',
    'measure':      'crosshair',
    'zoom':         'zoom-in',
  }
  const cursor = cursorMap[activeToolId] ?? 'grab'

  // Measure overlay values
  const distPx = measurePts.length === 2
    ? Math.sqrt((measurePts[1].x - measurePts[0].x) ** 2 + (measurePts[1].y - measurePts[0].y) ** 2)
    : 0
  const distMm = pxToMm(distPx, scaleFactor)
  const midX   = measurePts.length === 2 ? (measurePts[0].x + measurePts[1].x) / 2 : 0
  const midY   = measurePts.length === 2 ? (measurePts[0].y + measurePts[1].y) / 2 : 0

  // Group rotates around the image center
  const groupProps = imageRotation !== 0 ? {
    rotation: imageRotation,
    x: imageWidth / 2,
    y: imageHeight / 2,
    offsetX: imageWidth / 2,
    offsetY: imageHeight / 2,
  } : {}

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, overflow: 'hidden', background: '#1a1a2e', position: 'relative', cursor }}
    >
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        x={stagePos.x}
        y={stagePos.y}
        scaleX={zoom}
        scaleY={zoom}
        draggable={activeToolId === 'select' || activeToolId === 'zoom'}
        onClick={handleStageClick}
        onDragEnd={handleDragEnd}
      >
        <Layer>
          {/* Single Group that applies rotation around the image center.
              All content lives inside so Konva hit-testing stays correct. */}
          <Group {...groupProps}>
            {/* Background image */}
            {rawImage && (
              <KImage image={rawImage} width={imageWidth} height={imageHeight} listening={false} />
            )}

            {/* Finalized paths */}
            {paths.map((path, pi) => (
              <Path
                key={`path-${pi}`}
                data={buildPath(path)}
                stroke="rgba(74,158,255,0.5)"
                strokeWidth={1.5 / zoom}
                fill="transparent"
                dash={[6 / zoom, 3 / zoom]}
                listening={false}
              />
            ))}

            {/* Active path contour */}
            {contourPoints.length >= 2 && (
              <Path
                data={buildPath(contourPoints)}
                stroke="#4a7eff"
                strokeWidth={2 / zoom}
                fill="transparent"
                listening={false}
              />
            )}

            {/* Active path points */}
            {contourPoints.map(pt => (
              <Circle
                key={pt.id}
                x={pt.x}
                y={pt.y}
                radius={(selectedId === pt.id ? 7 : 5) / zoom}
                fill={
                  pt.type === 'bezier'
                    ? (selectedId === pt.id ? '#a855f7' : 'rgba(168,85,247,0.7)')
                    : (selectedId === pt.id ? '#ea580c' : 'white')
                }
                stroke={selectedId === pt.id ? (pt.type === 'bezier' ? '#a855f7' : '#ea580c') : '#4a7eff'}
                strokeWidth={2 / zoom}
                draggable={activeToolId === 'select' || activeToolId === 'edit-point'}
                onMouseDown={() => {
                  if (activeToolId === 'add-point') blockClickRef.current = true
                }}
                onClick={(e) => {
                  e.cancelBubble = true
                  if (activeToolId === 'delete-point')  { onDeletePoint(pt.id);       return }
                  if (activeToolId === 'segment-type')  { onToggleSegmentType(pt.id); return }
                  onSelect(pt.id)
                }}
                onDragEnd={(e) => onPointMove(pt.id, e.target.x(), e.target.y())}
              />
            ))}

            {/* Measure overlay */}
            {measurePts.length >= 1 && (
              <Circle x={measurePts[0].x} y={measurePts[0].y} radius={4 / zoom} fill="#fbbf24" listening={false} />
            )}
            {measurePts.length === 2 && (
              <>
                <Line
                  points={[measurePts[0].x, measurePts[0].y, measurePts[1].x, measurePts[1].y]}
                  stroke="#fbbf24" strokeWidth={1.5 / zoom} dash={[5 / zoom, 3 / zoom]} listening={false}
                />
                <Circle x={measurePts[1].x} y={measurePts[1].y} radius={4 / zoom} fill="#fbbf24" listening={false} />
                <Text
                  x={midX} y={midY - 14 / zoom}
                  text={`${distMm.toFixed(2)} mm`}
                  fontSize={11 / zoom} fill="#fbbf24" fontStyle="bold"
                  listening={false}
                />
              </>
            )}
          </Group>
        </Layer>
      </Stage>

      {/* Zoom indicator */}
      <div style={{
        position: 'absolute', bottom: 8, left: 8,
        background: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.7)',
        fontSize: '0.68rem', padding: '3px 8px', borderRadius: 4, pointerEvents: 'none',
      }}>
        {Math.round(zoom * 100)}% · Rueda = zoom · Arrastrar = mover
      </div>

      {/* Measure hint */}
      {activeToolId === 'measure' && (
        <div style={{
          position: 'absolute', bottom: 8, right: 8,
          background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)',
          color: '#fbbf24', fontSize: '0.68rem', padding: '3px 8px', borderRadius: 4, pointerEvents: 'none',
        }}>
          {measurePts.length === 0 && 'Haz click en el punto inicial'}
          {measurePts.length === 1 && 'Haz click en el punto final'}
          {measurePts.length === 2 && `Distancia: ${distMm.toFixed(2)} mm · Click para nueva medición`}
        </div>
      )}

      {/* Keyboard shortcut hint */}
      <div style={{
        position: 'absolute', top: 8, right: 8,
        background: 'rgba(0,0,0,0.45)', color: 'rgba(255,255,255,0.45)',
        fontSize: '0.6rem', padding: '3px 8px', borderRadius: 4, pointerEvents: 'none',
        lineHeight: 1.6,
      }}>
        S Selec · E Editar · A Agregar · D Borrar · M Medir · Z Zoom
      </div>
    </div>
  )
}
