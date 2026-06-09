import { useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { HelpModal } from './HelpModal'

const menuItem = (onClick: () => void, icon: string, label: string, danger = false) => (
  <button
    key={label}
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: 10,
      width: '100%', padding: '0.6rem 1.25rem',
      background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
      color: danger ? 'var(--color-error)' : 'var(--color-text-muted)',
      fontSize: '0.875rem',
      transition: 'background 0.1s',
    }}
    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
  >
    <span style={{ width: 18, textAlign: 'center', fontSize: '1rem' }}>{icon}</span>
    {label}
  </button>
)

const divider = () => (
  <div style={{ height: 1, background: 'var(--glass-border)', margin: '4px 0' }} />
)

export function HamburgerMenu() {
  const [open, setOpen]         = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const reset = useAppStore(s => s.reset)

  function close() { setOpen(false) }

  function handleReset() {
    close()
    if (window.confirm('¿Iniciar una nueva vectorización? Se perderán los cambios no exportados.')) {
      reset()
    }
  }

  function handleHelp() {
    close()
    setShowHelp(true)
  }

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Menú"
        style={{
          background: 'rgba(15, 15, 35, 0.88)', border: '1px solid rgba(255,255,255,0.22)',
          borderRadius: 'var(--radius-sm)', padding: '8px', cursor: 'pointer', color: 'white',
          backdropFilter: 'blur(8px)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
          <rect y="2"  width="18" height="2" rx="1"/>
          <rect y="8"  width="18" height="2" rx="1"/>
          <rect y="14" width="18" height="2" rx="1"/>
        </svg>
      </button>

      {open && (
        <>
          <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div className="glass" style={{
            position: 'fixed', top: 52, right: 12, zIndex: 50,
            minWidth: 220, padding: '6px 0',
          }}>
            {menuItem(handleHelp, '📖', 'Manual de usuario')}
            {divider()}
            {menuItem(() => { close(); window.open('https://ptetoolbox.netlify.app', '_blank') }, '←', 'Volver al Toolbox')}
            {divider()}
            {menuItem(handleReset, '🗑️', 'Nueva vectorización', true)}
          </div>
        </>
      )}

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </>
  )
}
