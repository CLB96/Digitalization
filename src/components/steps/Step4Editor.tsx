import { useState, CSSProperties } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '../../store/appStore'
import { EditorCanvas } from '../editor/EditorCanvas'
import { Toolbar } from '../editor/Toolbar'
import { PropertiesPanel } from '../editor/PropertiesPanel'
import { StatusBar } from '../editor/StatusBar'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { downloadDxf } from '../../lib/export-dxf'
import { downloadSvg } from '../../lib/export-svg'
import { downloadPdf } from '../../lib/export-pdf'
import type { SegmentType, ContourPoint } from '../../types'

export function Step4Editor() {
  const {
    contourPoints, paths, scaleFactor,
    zoom, imageRotation,
    setContourPoints, addNewPath, removePathAt, pushHistory, setStep,
    setZoom, setImageRotation, setExported, reset,
  } = useAppStore(useShallow(s => ({
    contourPoints: s.contourPoints, paths: s.paths, scaleFactor: s.scaleFactor,
    zoom: s.zoom, imageRotation: s.imageRotation,
    setContourPoints: s.setContourPoints, addNewPath: s.addNewPath,
    removePathAt: s.removePathAt, pushHistory: s.pushHistory, setStep: s.setStep,
    setZoom: s.setZoom, setImageRotation: s.setImageRotation,
    setExported: s.setExported, reset: s.reset,
  })))

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showExport, setShowExport]   = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [exportedFormat, setExportedFormat] = useState('')

  function handleExportDone(format: string) {
    setShowExport(false)
    setExportedFormat(format)
    setExported(true)
    setShowSuccess(true)
  }

  /** All paths combined for export */
  const allPaths = [...paths, ...(contourPoints.length > 1 ? [contourPoints] : [])]

  function updatePoint(id: string, x: number, y: number) {
    setContourPoints(contourPoints.map(p => p.id === id ? { ...p, x, y } : p))
    pushHistory()
  }

  function addPoint(x: number, y: number) {
    const newPt: ContourPoint = { id: Date.now().toString(), x, y, type: 'line' }
    setContourPoints([...contourPoints, newPt])
    pushHistory()
  }

  function deletePoint(id: string) {
    setContourPoints(contourPoints.filter(p => p.id !== id))
    pushHistory()
    if (selectedId === id) setSelectedId(null)
  }

  function changeSegmentType(id: string, type: SegmentType) {
    setContourPoints(contourPoints.map(p => p.id === id ? { ...p, type } : p))
    pushHistory()
  }

  function toggleSegmentType(id: string) {
    setContourPoints(contourPoints.map(p =>
      p.id === id ? { ...p, type: p.type === 'line' ? 'bezier' : 'line' } : p
    ))
    pushHistory()
  }

  function handleAddNewPath() {
    if (contourPoints.length < 2) return
    addNewPath()
    setSelectedId(null)
  }

  const iconBtn: CSSProperties = {
    background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)', color: 'white', cursor: 'pointer',
    width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.85rem', padding: 0, flexShrink: 0,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top bar */}
      <div style={{
        height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px', borderBottom: '1px solid var(--glass-border)', flexShrink: 0,
        background: 'var(--color-surface)', gap: 8,
      }}>
        <button
          onClick={() => setStep(3)}
          style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.875rem', flexShrink: 0 }}
        >
          ← Paso 3
        </button>

        {/* Path management */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Trazos: {allPaths.length} ({allPaths.reduce((a, p) => a + p.length, 0)} pts)
          </span>
          <Button
            variant="ghost"
            onClick={handleAddNewPath}
            disabled={contourPoints.length < 2}
            style={{ fontSize: '0.78rem', padding: '4px 10px' }}
            title="Guarda el trazo actual y empieza uno nuevo"
          >
            + Nuevo trazo
          </Button>
        </div>

        {/* Zoom + rotation controls */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
          <button onClick={() => setZoom(Math.max(0.1, zoom * 0.8))} style={iconBtn} title="Alejar">−</button>
          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', minWidth: 34, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={() => setZoom(Math.min(10, zoom * 1.2))} style={iconBtn} title="Acercar">+</button>
          <button onClick={() => setZoom(1)} style={{ ...iconBtn, width: 30, fontSize: '0.58rem' }} title="1:1">1:1</button>
          <div style={{ width: 1, height: 18, background: 'var(--glass-border)', margin: '0 2px' }} />
          <button onClick={() => setImageRotation(((imageRotation - 90) % 360 + 360) % 360)} style={iconBtn} title="Rotar izquierda">↺</button>
          <button onClick={() => setImageRotation((imageRotation + 90) % 360)} style={iconBtn} title="Rotar derecha">↻</button>
          {imageRotation !== 0 && (
            <span style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>{imageRotation}°</span>
          )}
        </div>

        <Button onClick={() => setShowExport(true)}>↓ Exportar</Button>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Toolbar />
        <EditorCanvas
          selectedId={selectedId}
          onSelect={setSelectedId}
          onPointMove={updatePoint}
          onAddPoint={addPoint}
          onDeletePoint={deletePoint}
          onToggleSegmentType={toggleSegmentType}
        />
        <PropertiesPanel selectedId={selectedId} onSegmentTypeChange={changeSegmentType} />
      </div>

      <StatusBar />

      {/* Paths list panel — shown when there are finalized paths */}
      {paths.length > 0 && (
        <div style={{
          borderTop: '1px solid var(--glass-border)', background: 'var(--color-surface)',
          padding: '6px 12px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>Trazos guardados:</span>
          {paths.map((path, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'rgba(74,158,255,0.15)', border: '1px solid rgba(74,158,255,0.3)',
              borderRadius: 4, padding: '2px 8px', fontSize: '0.72rem',
            }}>
              <span style={{ color: 'var(--color-primary)' }}>Trazo {i + 1}</span>
              <span style={{ color: 'var(--color-text-muted)' }}>({path.length} pts)</span>
              <button
                onClick={() => removePathAt(i)}
                title="Eliminar trazo"
                style={{
                  background: 'none', border: 'none', color: 'var(--color-error)',
                  cursor: 'pointer', fontSize: '0.8rem', padding: '0 2px', lineHeight: 1,
                }}
              >✕</button>
            </div>
          ))}
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>
            · Trazo activo: {contourPoints.length} pts
          </span>
        </div>
      )}

      {showExport && (
        <Modal title={`Exportar — ${allPaths.length} trazo(s)`} onClose={() => setShowExport(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
              Se exportarán todos los trazos ({allPaths.length} en total).
            </p>
            <Button onClick={() => { downloadDxf(contourPoints, scaleFactor, paths); handleExportDone('DXF') }}>
              📐 DXF (AutoCAD / CNC)
            </Button>
            <Button variant="ghost" onClick={() => { downloadSvg(contourPoints, scaleFactor, paths); handleExportDone('SVG') }}>
              🖼 SVG
            </Button>
            <Button variant="ghost" onClick={() => { downloadPdf(contourPoints, scaleFactor, paths); handleExportDone('PDF') }}>
              📄 PDF
            </Button>
          </div>
        </Modal>
      )}

      {showSuccess && (
        <Modal title="" onClose={() => setShowSuccess(false)}>
          <div style={{ textAlign: 'center', padding: '0.5rem 1rem 1rem' }}>
            {/* Animated checkmark */}
            <div style={{
              width: 76, height: 76, borderRadius: '50%',
              background: 'var(--color-success)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem',
              animation: 'pop-in 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>

            <h3 style={{
              fontSize: '1.15rem', fontWeight: 700, marginBottom: 8,
              animation: 'fade-up 0.35s 0.2s both',
            }}>
              ¡Exportación exitosa!
            </h3>
            <p style={{
              fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem',
              animation: 'fade-up 0.35s 0.3s both',
            }}>
              Tu vectorización fue exportada como <strong style={{ color: 'var(--color-primary)' }}>{exportedFormat}</strong> correctamente.
            </p>

            <div style={{
              display: 'flex', gap: 10, justifyContent: 'center',
              animation: 'fade-up 0.35s 0.4s both',
            }}>
              <Button
                onClick={() => setShowSuccess(false)}
                style={{ minWidth: 140 }}
              >
                Continuar editando
              </Button>
              <Button
                variant="ghost"
                onClick={() => reset()}
                style={{ minWidth: 140 }}
              >
                Ir al inicio
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
