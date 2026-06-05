import { useRef, useState, useEffect, MouseEvent, WheelEvent, CSSProperties } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '../../store/appStore'
import { computeScaleFactor } from '../../hooks/useScale'
import { Button } from '../ui/Button'
import type { ScaleUnit } from '../../types'

/** Rotate image by angle using an offscreen canvas. Returns data URL and new w/h. */
function rotateImageData(
  img: HTMLImageElement,
  srcW: number,
  srcH: number,
  angleDeg: number,
): { dataUrl: string; w: number; h: number } {
  const rad = (angleDeg * Math.PI) / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  const newW = Math.round(srcW * cos + srcH * sin)
  const newH = Math.round(srcW * sin + srcH * cos)

  const canvas = document.createElement('canvas')
  canvas.width = newW
  canvas.height = newH
  const ctx = canvas.getContext('2d')!
  ctx.translate(newW / 2, newH / 2)
  ctx.rotate(rad)
  ctx.drawImage(img, -srcW / 2, -srcH / 2, srcW, srcH)
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.92), w: newW, h: newH }
}

export function Step2Scale() {
  const { rawImage, imageWidth, imageHeight, setScaleRef, setStep } = useAppStore(useShallow(s => ({
    rawImage: s.rawImage, imageWidth: s.imageWidth, imageHeight: s.imageHeight,
    setScaleRef: s.setScaleRef, setStep: s.setStep,
  })))

  const containerRef = useRef<HTMLDivElement>(null)
  const [p1, setP1] = useState<{ x: number; y: number } | null>(null)
  const [p2, setP2] = useState<{ x: number; y: number } | null>(null)
  const [realValue, setRealValue] = useState('')
  const [unit, setUnit] = useState<ScaleUnit>('cm')
  const [zoom, setZoom] = useState(1)

  // Rotation state: cumulative degrees (0, 90, 180, 270, ...)
  const [rotation, setRotation] = useState(0)
  // Rotated image cache: {dataUrl, w, h} for current rotation
  const [rotated, setRotated] = useState<{ dataUrl: string; w: number; h: number } | null>(null)

  // Recompute rotated image whenever rawImage or rotation changes
  useEffect(() => {
    if (!rawImage) { setRotated(null); return }
    if (rotation === 0) {
      setRotated({ dataUrl: rawImage.src, w: imageWidth, h: imageHeight })
    } else {
      setRotated(rotateImageData(rawImage, imageWidth, imageHeight, rotation))
    }
    setP1(null); setP2(null)
  }, [rawImage, rotation, imageWidth, imageHeight])

  // Current display dimensions
  const dispW = rotated?.w ?? imageWidth
  const dispH = rotated?.h ?? imageHeight

  /** Map click on displayed <img> → original image pixel coordinates */
  function getImageCoords(e: MouseEvent<HTMLImageElement>): { x: number; y: number } {
    const rect = e.currentTarget.getBoundingClientRect()
    // Coordinates in the *rotated* image space
    const rx = ((e.clientX - rect.left) / rect.width) * dispW
    const ry = ((e.clientY - rect.top) / rect.height) * dispH
    // Unrotate back to original image coordinates
    const normalAngle = ((rotation % 360) + 360) % 360
    switch (normalAngle) {
      case 90:  return { x: ry * (imageWidth / dispH), y: (dispW - rx) * (imageHeight / dispW) }
      case 180: return { x: (dispW - rx) * (imageWidth / dispW), y: (dispH - ry) * (imageHeight / dispH) }
      case 270: return { x: (dispH - ry) * (imageWidth / dispH), y: rx * (imageHeight / dispW) }
      default:  return { x: rx, y: ry }
    }
  }

  /** Map original image pixel coords → display percentage in rotated image */
  function toDisplayPercent(pt: { x: number; y: number }): { left: string; top: string } {
    const rx = pt.x / imageWidth  // 0..1 in original
    const ry = pt.y / imageHeight
    const normalAngle = ((rotation % 360) + 360) % 360
    switch (normalAngle) {
      case 90:  return { left: `${(1 - ry) * 100}%`, top: `${rx * 100}%` }
      case 180: return { left: `${(1 - rx) * 100}%`, top: `${(1 - ry) * 100}%` }
      case 270: return { left: `${ry * 100}%`, top: `${(1 - rx) * 100}%` }
      default:  return { left: `${rx * 100}%`, top: `${ry * 100}%` }
    }
  }

  function handleImgClick(e: MouseEvent<HTMLImageElement>) {
    const coords = getImageCoords(e)
    if (!p1) { setP1(coords); return }
    if (!p2) { setP2(coords); return }
    setP1(coords); setP2(null)
  }

  function handleWheel(e: WheelEvent<HTMLDivElement>) {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 1.18 : 0.85
    setZoom(z => Math.min(8, Math.max(0.3, z * delta)))
  }

  function rotateCW() { setRotation(r => r + 90) }
  function rotateCCW() { setRotation(r => r - 90) }

  function confirm() {
    if (!p1 || !p2 || !realValue) return
    const val = parseFloat(realValue)
    if (isNaN(val) || val <= 0) return
    const factor = computeScaleFactor(p1, p2, val, unit)
    setScaleRef({ p1, p2, realValue: val, unit }, factor)
    setStep(3)
  }

  const bothPoints = p1 && p2

  const iconBtnStyle: CSSProperties = {
    background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)', color: 'white', cursor: 'pointer',
    width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.95rem', padding: 0, flexShrink: 0,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{
        padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid var(--glass-border)', flexShrink: 0, flexWrap: 'wrap',
      }}>
        <button onClick={() => setStep(1)}
          style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}>
          ← Volver
        </button>
        <span style={{ fontWeight: 600, fontSize: '0.88rem', flex: 1, minWidth: 160 }}>
          {!p1 ? '① Clic en el primer punto de la referencia'
            : !p2 ? '② Clic en el segundo punto'
            : '③ Ingresa la medida real'}
        </span>
        {/* Zoom controls */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button onClick={() => setZoom(z => Math.max(0.3, z * 0.8))} style={iconBtnStyle} title="Alejar">−</button>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', minWidth: 36, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={() => setZoom(z => Math.min(8, z * 1.2))} style={iconBtnStyle} title="Acercar">+</button>
          <button onClick={() => setZoom(1)} style={{ ...iconBtnStyle, fontSize: '0.6rem', width: 36 }} title="1:1">1:1</button>
          <div style={{ width: 1, height: 20, background: 'var(--glass-border)', margin: '0 4px' }} />
          <button onClick={rotateCCW} style={iconBtnStyle} title="Rotar izquierda">↺</button>
          <button onClick={rotateCW} style={iconBtnStyle} title="Rotar derecha">↻</button>
          {rotation !== 0 && (
            <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
              {((rotation % 360) + 360) % 360}°
            </span>
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Scrollable image area */}
        <div
          ref={containerRef}
          onWheel={handleWheel}
          style={{
            flex: 1, overflow: 'auto',
            background: '#0a0a18',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start',
          }}
        >
          <div style={{ margin: 'auto', position: 'relative', lineHeight: 0, flexShrink: 0 }}>
            {rotated && (
              <img
                src={rotated.dataUrl}
                alt="referencia"
                draggable={false}
                onClick={handleImgClick}
                style={{
                  display: 'block', userSelect: 'none',
                  width: `${dispW * zoom}px`,
                  height: `${dispH * zoom}px`,
                  cursor: 'crosshair',
                }}
              />
            )}

            {/* Overlay: dots and connecting line */}
            {rotated && (p1 || p2) && (
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                {p1 && (() => {
                  const pos = toDisplayPercent(p1)
                  return (
                    <div style={{
                      position: 'absolute', left: pos.left, top: pos.top,
                      transform: 'translate(-50%,-50%)',
                      width: 14, height: 14, borderRadius: '50%',
                      background: 'var(--color-rose)', border: '2px solid white',
                      boxShadow: '0 0 8px rgba(0,0,0,0.9)',
                    }} />
                  )
                })()}
                {p2 && (() => {
                  const pos = toDisplayPercent(p2)
                  return (
                    <div style={{
                      position: 'absolute', left: pos.left, top: pos.top,
                      transform: 'translate(-50%,-50%)',
                      width: 14, height: 14, borderRadius: '50%',
                      background: 'var(--color-rose)', border: '2px solid white',
                      boxShadow: '0 0 8px rgba(0,0,0,0.9)',
                    }} />
                  )
                })()}
                {p1 && p2 && (() => {
                  const d1 = toDisplayPercent(p1)
                  const d2 = toDisplayPercent(p2)
                  const x1 = parseFloat(d1.left)
                  const y1 = parseFloat(d1.top)
                  const x2 = parseFloat(d2.left)
                  const y2 = parseFloat(d2.top)
                  const lenPct = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
                  const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI
                  return (
                    <div style={{
                      position: 'absolute', left: d1.left, top: d1.top,
                      width: `${lenPct}%`, height: 2,
                      background: 'var(--color-rose)', opacity: 0.85,
                      transformOrigin: '0 50%',
                      transform: `rotate(${angle}deg)`,
                    }} />
                  )
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Right panel — measurement input */}
        {bothPoints && (
          <div className="glass" style={{
            width: 200, padding: '1rem', display: 'flex', flexDirection: 'column',
            gap: 12, flexShrink: 0, borderRadius: 0,
          }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Medida real de la línea marcada
            </p>
            <input
              type="number" min="0" step="any" placeholder="Ej: 30"
              value={realValue} onChange={e => setRealValue(e.target.value)}
              autoFocus
              style={{
                background: 'var(--color-surface)', border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-sm)', padding: '8px', color: 'white', width: '100%',
                fontSize: '1rem',
              }}
            />
            <select
              value={unit} onChange={e => setUnit(e.target.value as ScaleUnit)}
              style={{
                background: 'var(--color-surface)', border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-sm)', padding: '8px', color: 'white',
              }}
            >
              <option value="mm">mm</option>
              <option value="cm">cm</option>
              <option value="m">m</option>
              <option value="in">pulgadas</option>
            </select>
            <Button onClick={confirm} disabled={!realValue}>Confirmar escala</Button>
            <button
              onClick={() => { setP1(null); setP2(null) }}
              style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              Volver a marcar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
