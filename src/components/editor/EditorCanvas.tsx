import { useRef, useState, useEffect } from 'react'
import { Stage, Layer, Image as KImage, Line, Circle, Path, Text } from 'react-konva'
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
}

/** Build an SVG path string supporting both line and bezier segments (Catmull-Rom → cubic bezier). */
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
      const cp1x = curr.x + (next.x - prev.x) * t
      const cp1y = curr.y + (next.y - prev.y) * t
      const cp2x = next.x - (nn.x   - curr.x) * t
      const cp2y = next.y - (nn.y   - curr.y) * t
      d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${next.x} ${next.y}`
    } else {
      d += ` L ${next.x} ${next.y}`
    }
  }
  if (closed) d += ' Z'
  return d
}

export function EditorCanvas({
  selectedId, onSelect, onPointMove, onAddPoint, onDeletePoint, onToggleSegmentType,
}: Props) {
  const {
    rawImage, imageWidth, imageHeight, contourPoints, paths,
    activeToolId, zoom, stagePos, scaleFactor, setZoom, setStagePos,
  } = useAppStore(useShallow(s => ({
    rawImage: s.rawImage, imageWidth: s.imageWidth, imageHeight: s.imageHeight,
    contourPoints: s.contourPoints, paths: s.paths,
    activeToolId: s.activeToolId, zoom: s.zoom, stagePos: s.stagePos,
    scaleFactor: s.scaleFactor, setZoom: s.setZoom, setStagePos: s.setStagePos,
  })))

  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef     = useRef<any>(null)
  const [stageSize, setStageSize]   = useState({ width: 800, height: 600 })
  const [measurePts, setMeasurePts] = useState<{ x: number; y: number }[]>([])

  // Reset measure points when leaving the measure tool
  useEffect(() => {
    if (activeToolId !== 'measure') setMeasurePts([])
  }, [activeToolId])

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleStageClick(e: any) {
    const stage = e.target.getStage()
    const isStage = e.target === stage

    if (activeToolId === 'select' || activeToolId === 'edit-point') {
      if (isStage) onSelect(null)
    }

    if (activeToolId === 'add-point') {
      const pos = stage.getPointerPosition()
      if (pos) {
        onAddPoint((pos.x - stagePos.x) / zoom, (pos.y - stagePos.y) / zoom)
      }
    }

    if (activeToolId === 'measure') {
      const pos = stage.getPointerPosition()
      if (pos) {
        const pt = { x: (pos.x - stagePos.x) / zoom, y: (pos.y - stagePos.y) / zoom }
        setMeasurePts(prev => prev.length >= 2 ? [pt] : [...prev, pt])
      }
    }
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

  // Measure distance
  const distPx = measurePts.length === 2
    ? Math.sqrt((measurePts[1].x - measurePts[0].x) ** 2 + (measurePts[1].y - measurePts[0].y) ** 2)
    : 0
  const distMm = pxToMm(distPx, scaleFactor)
  const midX = measurePts.length === 2 ? (measurePts[0].x + measurePts[1].x) / 2 : 0
  const midY = measurePts.length === 2 ? (measurePts[0].y + measurePts[1].y) / 2 : 0

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
          {/* Background image */}
          {rawImage && <KImage image={rawImage} width={imageWidth} height={imageHeight} />}

          {/* Finalized paths */}
          {paths.map((path, pi) => (
            <Path
              key={`path-${pi}`}
              data={buildPath(path)}
              stroke="rgba(74,158,255,0.5)"
              strokeWidth={1.5 / zoom}
              fill="transparent"
              dash={[6 / zoom, 3 / zoom]}
            />
          ))}

          {/* Active path contour */}
          {contourPoints.length >= 2 && (
            <Path
              data={buildPath(contourPoints)}
              stroke="#4a7eff"
              strokeWidth={2 / zoom}
              fill="transparent"
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
              onClick={(e) => {
                e.cancelBubble = true
                if (activeToolId === 'delete-point')   { onDeletePoint(pt.id); return }
                if (activeToolId === 'segment-type')   { onToggleSegmentType(pt.id); return }
                onSelect(pt.id)
              }}
              onDragEnd={(e) => onPointMove(pt.id, e.target.x(), e.target.y())}
            />
          ))}

          {/* Measure tool overlay */}
          {measurePts.length >= 1 && (
            <Circle x={measurePts[0].x} y={measurePts[0].y} radius={4 / zoom} fill="#fbbf24" />
          )}
          {measurePts.length === 2 && (
            <>
              <Line
                points={[measurePts[0].x, measurePts[0].y, measurePts[1].x, measurePts[1].y]}
                stroke="#fbbf24"
                strokeWidth={1.5 / zoom}
                dash={[5 / zoom, 3 / zoom]}
              />
              <Circle x={measurePts[1].x} y={measurePts[1].y} radius={4 / zoom} fill="#fbbf24" />
              <Text
                x={midX}
                y={midY - 14 / zoom}
                text={`${distMm.toFixed(2)} mm`}
                fontSize={11 / zoom}
                fill="#fbbf24"
                fontStyle="bold"
                offsetX={0}
              />
            </>
          )}
        </Layer>
      </Stage>

      {/* Zoom level */}
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
    </div>
  )
}
