import { useRef, useState, useEffect } from 'react'
import { Stage, Layer, Image as KImage, Line, Circle } from 'react-konva'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '../../store/appStore'

interface Props {
  selectedId: string | null
  onSelect: (id: string | null) => void
  onPointMove: (id: string, x: number, y: number) => void
  onAddPoint: (x: number, y: number) => void
  onDeletePoint: (id: string) => void
}

export function EditorCanvas({ selectedId, onSelect, onPointMove, onAddPoint, onDeletePoint }: Props) {
  const {
    rawImage, imageWidth, imageHeight, contourPoints, paths,
    activeToolId, zoom, stagePos, setZoom, setStagePos,
  } = useAppStore(useShallow(s => ({
    rawImage: s.rawImage, imageWidth: s.imageWidth, imageHeight: s.imageHeight,
    contourPoints: s.contourPoints, paths: s.paths,
    activeToolId: s.activeToolId, zoom: s.zoom, stagePos: s.stagePos,
    setZoom: s.setZoom, setStagePos: s.setStagePos,
  })))

  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<any>(null)
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 })

  // Observe container size
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setStageSize({ width: el.clientWidth, height: el.clientHeight })
    })
    ro.observe(el)
    setStageSize({ width: el.clientWidth, height: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // ── Non-passive wheel listener so preventDefault works ───────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (ev: WheelEvent) => {
      ev.preventDefault()
      const stage = stageRef.current
      if (!stage) return
      const scaleBy = ev.deltaY < 0 ? 1.12 : 0.9
      const oldScale = stage.scaleX() as number
      const pointer = stage.getPointerPosition() as { x: number; y: number } | null
      if (!pointer) return
      const newScale = Math.min(10, Math.max(0.1, oldScale * scaleBy))
      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      }
      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      }
      setZoom(newScale)
      setStagePos(newPos)
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [setZoom, setStagePos])

  // ── Zoom toward pointer (Konva onWheel — kept for touch pinch) ───────
  // ── Stage click ───────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleStageClick(e: any) {
    const stage = e.target.getStage()
    if (activeToolId === 'select' || activeToolId === 'edit-point') {
      if (e.target === stage) onSelect(null)
    }
    if (activeToolId === 'add-point') {
      const pos = stage.getPointerPosition()
      if (pos) {
        // Convert from stage coordinates to image coordinates
        const imgX = (pos.x - stagePos.x) / zoom
        const imgY = (pos.y - stagePos.y) / zoom
        onAddPoint(imgX, imgY)
      }
    }
  }

  // ── Stage drag end (panning) ──────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleDragEnd(e: any) {
    setStagePos({ x: e.target.x(), y: e.target.y() })
  }

  // Cursor based on tool
  const cursor = activeToolId === 'add-point' ? 'crosshair'
    : activeToolId === 'delete-point' ? 'not-allowed'
    : activeToolId === 'zoom' ? 'zoom-in'
    : 'grab'

  // ── Helpers to build flat point arrays (in image px) ─────────────────
  function flatPts(pts: { x: number; y: number }[]): number[] {
    if (pts.length < 2) return []
    return [
      ...pts.flatMap(p => [p.x, p.y]),
      pts[0].x, pts[0].y,
    ]
  }

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
          {rawImage && (
            <KImage image={rawImage} width={imageWidth} height={imageHeight} />
          )}

          {/* Finalized separate paths (dimmed blue) */}
          {paths.map((path, pi) => (
            <Line
              key={`path-${pi}`}
              points={flatPts(path)}
              stroke="rgba(74,158,255,0.5)"
              strokeWidth={1.5 / zoom}
              closed
              dash={[6 / zoom, 3 / zoom]}
            />
          ))}

          {/* Active path contour */}
          {flatPts(contourPoints).length > 0 && (
            <Line
              points={flatPts(contourPoints)}
              stroke="#4a7eff"
              strokeWidth={2 / zoom}
              closed
            />
          )}

          {/* Active path points */}
          {contourPoints.map(pt => (
            <Circle
              key={pt.id}
              x={pt.x}
              y={pt.y}
              radius={(selectedId === pt.id ? 7 : 5) / zoom}
              fill={selectedId === pt.id ? '#ea580c' : 'white'}
              stroke={selectedId === pt.id ? '#ea580c' : '#4a7eff'}
              strokeWidth={2 / zoom}
              draggable={activeToolId === 'select' || activeToolId === 'edit-point'}
              onClick={(e) => {
                e.cancelBubble = true
                if (activeToolId === 'delete-point') { onDeletePoint(pt.id); return }
                onSelect(pt.id)
              }}
              onDragEnd={(e) => onPointMove(pt.id, e.target.x(), e.target.y())}
            />
          ))}
        </Layer>
      </Stage>

      {/* Zoom level indicator */}
      <div style={{
        position: 'absolute', bottom: 8, left: 8,
        background: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.7)',
        fontSize: '0.68rem', padding: '3px 8px', borderRadius: 4, pointerEvents: 'none',
      }}>
        {Math.round(zoom * 100)}% · Rueda = zoom · Arrastrar = mover
      </div>
    </div>
  )
}
