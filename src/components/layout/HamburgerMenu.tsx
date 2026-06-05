import { useState } from 'react'

export function HamburgerMenu() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Menú"
        style={{
          background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-sm)', padding: '8px', cursor: 'pointer', color: 'white',
        }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
          <rect y="2" width="18" height="2" rx="1"/>
          <rect y="8" width="18" height="2" rx="1"/>
          <rect y="14" width="18" height="2" rx="1"/>
        </svg>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div className="glass" style={{
            position: 'fixed', top: 52, right: 12, zIndex: 50,
            minWidth: 200, padding: '0.75rem 0',
          }}>
            <a href="https://ptetoolbox.netlify.app" target="_blank" rel="noreferrer"
              style={{ display: 'block', padding: '0.6rem 1.25rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              ← Volver al Toolbox
            </a>
          </div>
        </>
      )}
    </>
  )
}
