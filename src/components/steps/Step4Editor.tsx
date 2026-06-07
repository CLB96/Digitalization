import { useState } from 'react'
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
    setContourPoints, addNewPath, removePathAt, pushHistory, setStep,
  } = useAppStore(useShallow(s => ({
    contourPoints: s.contourPoints, paths: s.paths, scaleFactor: s.scaleFactor,
    setContourPoints: s.setContourPoints, addNewPath: s.addNewPath,
    removePathAt: s.removePathAt, pushHistory: s.pushHistory, setStep: s.setStep,
  })))

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showExport, setShowExport] = useState(false)

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
            <Button onClick={() => { downloadDxf(contourPoints, scaleFactor, paths); setShowExport(false) }}>
              📐 DXF (AutoCAD / CNC)
            </Button>
            <Button variant="ghost" onClick={() => { downloadSvg(contourPoints, scaleFactor, paths); setShowExport(false) }}>
              🖼 SVG
            </Button>
            <Button variant="ghost" onClick={() => { downloadPdf(contourPoints, scaleFactor, paths); setShowExport(false) }}>
              📄 PDF
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
