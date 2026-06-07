import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '../../store/appStore'
import type { ToolId } from '../../types'

function IcHand() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 11V8a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/>
      <path d="M14 10V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4"/>
      <path d="M10 10.5V5a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v9"/>
      <path d="M18 11a2 2 0 1 1 4 0v1a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8 2 2 0 1 1 4 0"/>
    </svg>
  )
}

function IcPencil() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 2L14 5L5 14L1 15L2 11Z"/>
      <line x1="9.5" y1="3.5" x2="12.5" y2="6.5"/>
    </svg>
  )
}

function IcBezier() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeLinecap="round">
      <path d="M2 14 C 4 2, 12 2, 14 14" strokeWidth="1.4"/>
      <circle cx="2" cy="14" r="1.8" fill="currentColor" stroke="none"/>
      <circle cx="14" cy="14" r="1.8" fill="currentColor" stroke="none"/>
      <line x1="2" y1="14" x2="4" y2="3" strokeDasharray="2 1.5" strokeWidth="0.9"/>
      <line x1="14" y1="14" x2="12" y2="3" strokeDasharray="2 1.5" strokeWidth="0.9"/>
      <circle cx="4" cy="3" r="1.2" fill="currentColor" stroke="none"/>
      <circle cx="12" cy="3" r="1.2" fill="currentColor" stroke="none"/>
    </svg>
  )
}

function IcDot() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <circle cx="7" cy="7" r="4.5"/>
    </svg>
  )
}

function IcEraser() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12L7.5 5L13 10L10 13H5Z" fill="currentColor" fillOpacity="0.25"/>
      <path d="M3 12L7.5 5L13 10L10 13H5L3 12Z"/>
      <line x1="0.5" y1="14.5" x2="15.5" y2="14.5" strokeWidth="1.2"/>
    </svg>
  )
}

function IcRuler() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeLinecap="round">
      <rect x="1" y="5" width="14" height="6" rx="1" strokeWidth="1.2"/>
      <line x1="4"  y1="5" x2="4"  y2="8.5" strokeWidth="1"/>
      <line x1="7"  y1="5" x2="7"  y2="7"   strokeWidth="1"/>
      <line x1="10" y1="5" x2="10" y2="8.5" strokeWidth="1"/>
      <line x1="13" y1="5" x2="13" y2="7"   strokeWidth="1"/>
    </svg>
  )
}

function IcZoom() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <circle cx="6.5" cy="6.5" r="4.5"/>
      <line x1="10" y1="10" x2="14.5" y2="14.5"/>
    </svg>
  )
}

const TOOLS: { id: ToolId; Icon: () => JSX.Element; label: string }[] = [
  { id: 'select',       Icon: IcHand,    label: 'Seleccionar (S)' },
  { id: 'edit-point',   Icon: IcPencil,  label: 'Editar punto (E)' },
  { id: 'segment-type', Icon: IcBezier,  label: 'Tipo de segmento — click en punto para alternar línea/curva' },
  { id: 'add-point',    Icon: IcDot,     label: 'Agregar punto (A)' },
  { id: 'delete-point', Icon: IcEraser,  label: 'Eliminar punto (D)' },
  { id: 'measure',      Icon: IcRuler,   label: 'Medir distancia — 2 clicks para medir' },
  { id: 'zoom',         Icon: IcZoom,    label: 'Zoom (Z)' },
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
      {TOOLS.map(({ id, Icon, label }) => (
        <button
          key={id}
          title={label}
          onClick={() => setActiveTool(id)}
          style={{
            width: 32, height: 32, borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
            background: activeToolId === id ? 'var(--color-primary)' : 'transparent',
            color: activeToolId === id ? 'white' : 'var(--color-text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}
        >
          <Icon />
        </button>
      ))}
      <div style={{ flex: 1 }} />
      <button title="Deshacer (Ctrl+Z)" onClick={undo}
        style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
          background: 'transparent', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>↺</button>
      <button title="Rehacer (Ctrl+Y)" onClick={redo}
        style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
          background: 'transparent', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>↻</button>
    </div>
  )
}
