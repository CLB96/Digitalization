import { useAppStore } from '../../store/appStore'

export function StatusBar() {
  const { scaleFactor, zoom, activeToolId, contourPoints } = useAppStore(s => ({
    scaleFactor: s.scaleFactor, zoom: s.zoom,
    activeToolId: s.activeToolId, contourPoints: s.contourPoints,
  }))

  return (
    <div style={{
      height: 28, background: 'var(--color-surface)', borderTop: '1px solid var(--glass-border)',
      display: 'flex', alignItems: 'center', gap: 20, padding: '0 12px',
      fontSize: '0.7rem', color: 'var(--color-text-muted)', flexShrink: 0,
    }}>
      <span>Escala: 1px = {scaleFactor.toFixed(4)} mm</span>
      <span>Zoom: {Math.round(zoom * 100)}%</span>
      <span>Herramienta: {activeToolId}</span>
      <span>Puntos: {contourPoints.length}</span>
    </div>
  )
}
