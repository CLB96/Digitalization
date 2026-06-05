import { useRef, useState, MouseEvent } from 'react'
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

  function getImageCoords(e: MouseEvent): { x: number; y: number } {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const scaleX = imageWidth / rect.width
    const scaleY = imageHeight / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  function handleClick(e: MouseEvent) {
    const coords = getImageCoords(e)
    if (!p1) { setP1(coords); return }
    if (!p2) { setP2(coords); return }
    setP1(coords); setP2(null)
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

  function toPercent(pt: { x: number; y: number }) {
    return { left: `${(pt.x / imageWidth) * 100}%`, top: `${(pt.y / imageHeight) * 100}%` }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: '1px solid var(--glass-border)', flexShrink: 0 }}>
        <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>← Volver</button>
        <span style={{ fontWeight: 600 }}>
          {!p1 ? 'Haz clic en el primer punto de referencia' : !p2 ? 'Haz clic en el segundo punto' : '¿Cuánto mide esa distancia?'}
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Image canvas area */}
        <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: 'crosshair' }}
          onClick={handleClick}>
          {rawImage && (
            <img src={rawImage.src} alt="referencia"
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', userSelect: 'none' }} />
          )}
          {p1 && (
            <div style={{ position: 'absolute', ...toPercent(p1), transform: 'translate(-50%,-50%)',
              width: 12, height: 12, borderRadius: '50%', background: 'var(--color-rose)',
              border: '2px solid white', pointerEvents: 'none' }} />
          )}
          {p2 && (
            <div style={{ position: 'absolute', ...toPercent(p2), transform: 'translate(-50%,-50%)',
              width: 12, height: 12, borderRadius: '50%', background: 'var(--color-rose)',
              border: '2px solid white', pointerEvents: 'none' }} />
          )}
        </div>

        {/* Right panel */}
        {bothPoints && (
          <div className="glass" style={{ width: 200, padding: '1rem', display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0, borderRadius: 0 }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Medida real de la línea marcada</p>
            <input
              type="number" min="0" step="any" placeholder="Ej: 30"
              value={realValue} onChange={e => setRealValue(e.target.value)}
              style={{ background: 'var(--color-surface)', border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-sm)', padding: '8px', color: 'white', width: '100%' }} />
            <select value={unit} onChange={e => setUnit(e.target.value as ScaleUnit)}
              style={{ background: 'var(--color-surface)', border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-sm)', padding: '8px', color: 'white' }}>
              <option value="mm">mm</option>
              <option value="cm">cm</option>
              <option value="m">m</option>
              <option value="in">pulgadas</option>
            </select>
            <Button onClick={confirm} disabled={!realValue}>Confirmar escala</Button>
          </div>
        )}
      </div>
    </div>
  )
}
