import { useRef, useState, MouseEvent, WheelEvent, CSSProperties } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '../../store/appStore'
import { computeScaleFactor } from '../../hooks/useScale'
import { Button } from '../ui/Button'
import type { ScaleUnit } from '../../types'

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
  const [rotation, setRotation] = useState(0) // 0 | 90 | 180 | 270

  // After rotation, effective display dimensions flip on 90/270
  const rotated = rotation === 90 || rotation === 270
  const effectiveW = rotated ? imageHeight : imageWidth
  const effectiveH = rotated ? imageWidth : imageHeight

  /** Convert click on the <img> element to original image pixel coordinates */
  function getImageCoords(e: MouseEvent<HTMLImageElement>): { x: number; y: number } {
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = (e.clientX - rect.left) / rect.width   // 0..1 in display space
    const relY = (e.clientY - rect.top) / rect.height

    // Unrotate back to original image coordinates
    switch (rotation) {
      case 90:  return { x: relY * imageWidth,          y: (1 - relX) * imageHeight }
      case 180: return { x: (1 - relX) * imageWidth,    y: (1 - relY) * imageHeight }
      case 270: return { x: (1 - relY) * imageWidth,    y: relX * imageHeight }
      default:  return { x: relX * imageWidth,           y: relY * imageHeight }
    }
  }

  /** Convert original image coordinates → display percentage (after rotation) */
  function toDisplayPercent(pt: { x: number; y: number }): { left: string; top: string } {
    const relX = pt.x / imageWidth
    const relY = pt.y / imageHeight
    switch (rotation) {
      case 90:  return { left: `${(1 - relY) * 100}%`, top: `${relX * 100}%` }
      case 180: return { left: `${(1 - relX) * 100}%`, top: `${(1 - relY) * 100}%` }
      case 270: return { left: `${relY * 100}%`,        top: `${(1 - relX) * 100}%` }
      default:  return { left: `${relX * 100}%`,        top: `${relY * 100}%` }
    }
  }

  function handleImgClick(e: MouseEvent<HTMLImageElement>) {
    const coords = getImageCoords(e)
    if (!p1) { setP1(coords); return }
    if (!p2) { setP2(coords); return }
    setP1(coords); setP2(null) // third click resets
  }

  function handleWheel(e: WheelEvent<HTMLDivElement>) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.85 : 1.18
    setZoom(z => Math.min(8, Math.max(0.3, z * delta)))
  }

  function rotate(dir: 'cw' | 'ccw') {
    setRotation(r => (r + (dir === 'cw' ? 90 : 270)) % 360)
    setP1(null); setP2(null) // reset points when rotating
  }

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
      {/* Top toolbar */}
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
          <button onClick={() => setZoom(1)} style={{ ...iconBtnStyle, fontSize: '0.6rem', width: 36 }} title="Restablecer zoom">1:1</button>
          <div style={{ width: 1, height: 20, background: 'var(--glass-border)', margin: '0 4px' }} />
          <button onClick={() => rotate('ccw')} style={iconBtnStyle} title="Rotar izquierda">↺</button>
          <button onClick={() => rotate('cw')} style={iconBtnStyle} title="Rotar derecha">↻</button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Scrollable image area */}
        <div
          ref={containerRef}
          onWheel={handleWheel}
          style={{
            flex: 1, overflow: 'auto', position: 'relative',
            background: '#0a0a18',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start',
          }}
        >
          <div style={{
            margin: 'auto',
            position: 'relative', flexShrink: 0, lineHeight: 0,
            // Extra padding so dots near edges are visible
            padding: 0,
          }}>
            {rawImage && (
              <img
                src={rawImage.src}
                alt="referencia"
                draggable={false}
                onClick={handleImgClick}
                style={{
                  display: 'block', userSelect: 'none',
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: 'center',
                  width: `${effectiveW * zoom}px`,
                  height: `${effectiveH * zoom}px`,
                  objectFit: 'fill',
                  cursor: 'crosshair',
                }}
              />
            )}

            {/* Overlay: dots and line */}
            {rawImage && (p1 || p2) && (
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
