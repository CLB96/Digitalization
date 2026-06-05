import { useState } from 'react'
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
  const { contourPoints, scaleFactor, setContourPoints, pushHistory, setStep } = useAppStore(s => ({
    contourPoints: s.contourPoints, scaleFactor: s.scaleFactor,
    setContourPoints: s.setContourPoints, pushHistory: s.pushHistory, setStep: s.setStep,
  }))

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showExport, setShowExport] = useState(false)

  function updatePoint(id: string, x: number, y: number) {
    const updated = contourPoints.map(p => p.id === id ? { ...p, x, y } : p)
    setContourPoints(updated)
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
    const updated = contourPoints.map(p => p.id === id ? { ...p, type } : p)
    setContourPoints(updated)
    pushHistory()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top bar */}
      <div style={{
        height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px', borderBottom: '1px solid var(--glass-border)', flexShrink: 0,
        background: 'var(--color-surface)',
      }}>
        <button
          onClick={() => setStep(3)}
          style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.875rem' }}
        >
          ← Paso 3
        </button>
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
        />
        <PropertiesPanel selectedId={selectedId} onSegmentTypeChange={changeSegmentType} />
      </div>

      <StatusBar />

      {showExport && (
        <Modal title="Exportar" onClose={() => setShowExport(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Button onClick={() => { downloadDxf(contourPoints, scaleFactor); setShowExport(false) }}>
              📐 DXF (AutoCAD / CNC)
            </Button>
            <Button variant="ghost" onClick={() => { downloadSvg(contourPoints, scaleFactor); setShowExport(false) }}>
              🖼 SVG
            </Button>
            <Button variant="ghost" onClick={() => { downloadPdf(contourPoints, scaleFactor); setShowExport(false) }}>
              📄 PDF
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
