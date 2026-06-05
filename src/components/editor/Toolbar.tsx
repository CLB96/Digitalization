import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '../../store/appStore'
import type { ToolId } from '../../types'

const TOOLS: { id: ToolId; icon: string; label: string }[] = [
  { id: 'select',       icon: '↖', label: 'Seleccionar' },
  { id: 'edit-point',   icon: '✎', label: 'Editar punto' },
  { id: 'segment-type', icon: '⌒', label: 'Tipo segmento' },
  { id: 'add-point',    icon: '+', label: 'Agregar punto' },
  { id: 'delete-point', icon: '−', label: 'Eliminar punto' },
  { id: 'zoom',         icon: '🔍', label: 'Zoom' },
]

export function Toolbar() {
  const { activeToolId, setActiveTool, undo, redo } = useAppStore(useShallow(s => ({
    activeToolId: s.activeToolId, setActiveTool: s.setActiveTool,
    undo: s.undo, redo: s.redo,
  })))

  return (
    <div style={{
      width: 44, background: 'var(--color-surface)', borderRight: '1px solid var(--glass-border)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 0',
    }}>
      {TOOLS.map(t => (
        <button
          key={t.id}
          title={t.label}
          onClick={() => setActiveTool(t.id)}
          style={{
            width: 32, height: 32, borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
            background: activeToolId === t.id ? 'var(--color-primary)' : 'transparent',
            color: activeToolId === t.id ? 'white' : 'var(--color-text-muted)',
            fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {t.icon}
        </button>
      ))}
      <div style={{ flex: 1 }} />
      <button title="Deshacer" onClick={undo}
        style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
          background: 'transparent', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>↺</button>
      <button title="Rehacer" onClick={redo}
        style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
          background: 'transparent', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>↻</button>
    </div>
  )
}
