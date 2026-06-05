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
  const { rawImage, imageWidth, imageHeight, contourPoints, activeToolId, zoom, setZoom } = useAppStore(useShallow(s => ({
    rawImage: s.rawImage, imageWidth: s.imageWidth, imageHeight: s.imageHeight,
    contourPoints: s.contourPoints, activeToolId: s.activeToolId, zoom: s.zoom, setZoom: s.setZoom,
  })))

  const containerRef = useRef<HTMLDivElement>(null)
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setStageSize({ width: el.clientWidth, height: el.clientHeight }))
    ro.observe(el)
    setStageSize({ width: el.clientWidth, height: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  const flatPoints = contourPoints.length > 1
    ? [
        ...contourPoints.flatMap(p => [p.x * zoom, p.y * zoom]),
        contourPoints[0].x * zoom,
        contourPoints[0].y * zoom,
      ]
    : []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleStageClick(e: any) {
    if (activeToolId === 'select' || activeToolId === 'edit-point') {
      if (e.target === e.target.getStage()) onSelect(null)
    }
    if (activeToolId === 'add-point') {
      const pos = e.target.getStage().getPointerPosition()
      if (pos) onAddPoint(pos.x / zoom, pos.y / zoom)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleWheel(e: any) {
    e.evt.preventDefault()
    const delta = e.evt.deltaY > 0 ? 0.9 : 1.1
    setZoom(Math.min(5, Math.max(0.1, zoom * delta)))
  }

  return (
    <div ref={containerRef} style={{ flex: 1, overflow: 'hidden', background: '#f0f0e8', position: 'relative' }}>
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        onClick={handleStageClick}
        onWheel={handleWheel}
      >
        <Layer>
          {rawImage && (
            <KImage image={rawImage} width={imageWidth * zoom} height={imageHeight * zoom} />
          )}
          {flatPoints.length > 0 && (
            <Line points={flatPoints} stroke="#4a7eff" strokeWidth={2} closed />
          )}
          {contourPoints.map(pt => (
            <Circle
              key={pt.id}
              x={pt.x * zoom}
              y={pt.y * zoom}
              radius={selectedId === pt.id ? 7 : 5}
              fill={selectedId === pt.id ? '#ea580c' : 'white'}
              stroke={selectedId === pt.id ? '#ea580c' : '#4a7eff'}
              strokeWidth={2}
              draggable={activeToolId === 'select' || activeToolId === 'edit-point'}
              onClick={(e) => {
                e.cancelBubble = true
                if (activeToolId === 'delete-point') { onDeletePoint(pt.id); return }
                onSelect(pt.id)
              }}
              onDragEnd={(e) => onPointMove(pt.id, e.target.x() / zoom, e.target.y() / zoom)}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  )
}
