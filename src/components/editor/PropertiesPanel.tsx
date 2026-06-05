import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '../../store/appStore'
import { pxToMm } from '../../hooks/useScale'
import type { SegmentType } from '../../types'

interface Props {
  selectedId: string | null
  onSegmentTypeChange: (id: string, type: SegmentType) => void
}

export function PropertiesPanel({ selectedId, onSegmentTypeChange }: Props) {
  const { contourPoints, scaleFactor } = useAppStore(useShallow(s => ({
    contourPoints: s.contourPoints,
    scaleFactor: s.scaleFactor,
  })))
  const pt = contourPoints.find(p => p.id === selectedId)

  const totalLength = contourPoints.reduce((acc, curr, i) => {
    const next = contourPoints[(i + 1) % contourPoints.length]
    const dx = next.x - curr.x
    const dy = next.y - curr.y
    return acc + Math.sqrt(dx * dx + dy * dy)
  }, 0)

  return (
    <div style={{
      width: 180, background: 'var(--color-surface)', borderLeft: '1px solid var(--glass-border)',
      padding: '1rem', display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div>
        <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--color-text-muted)', marginBottom: 6 }}>
          {pt ? 'Punto seleccionado' : 'Sin selección'}
        </p>
        {pt ? (
          <>
            <p style={{ fontSize: '0.8rem' }}>X: {pxToMm(pt.x, scaleFactor).toFixed(2)} mm</p>
            <p style={{ fontSize: '0.8rem' }}>Y: {pxToMm(pt.y, scaleFactor).toFixed(2)} mm</p>
          </>
        ) : (
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            Selecciona un punto para ver sus propiedades.
          </p>
        )}
      </div>
      {pt && (
        <div>
          <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--color-text-muted)', marginBottom: 6 }}>
            Segmento
          </p>
          <select
            value={pt.type}
            onChange={e => onSegmentTypeChange(pt.id, e.target.value as SegmentType)}
            style={{
              background: 'var(--color-bg)', border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-sm)', padding: '4px 8px', color: 'white',
              width: '100%', fontSize: '0.8rem',
            }}
          >
            <option value="line">Línea recta</option>
            <option value="bezier">Bezier</option>
          </select>
        </div>
      )}
      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--glass-border)', paddingTop: 12 }}>
        <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
          Total: {contourPoints.length} pts
        </p>
        <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
          Longitud: {pxToMm(totalLength, scaleFactor).toFixed(1)} mm
        </p>
      </div>
    </div>
  )
}
