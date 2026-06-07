import { useState } from 'react'
import { StepBar } from './StepBar'
import { HamburgerMenu } from './HamburgerMenu'

function LogoWithFallback() {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <span style={{
        fontWeight: 900, fontSize: '0.65rem', letterSpacing: '0.5px',
        color: 'var(--color-primary)', userSelect: 'none',
      }}>
        CJLB
      </span>
    )
  }

  return (
    <img
      src="/logo.png"
      alt="R&D Engineering"
      onError={() => setFailed(true)}
      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
    />
  )
}

export function Header() {
  return (
    <header style={{
      height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 10px', borderBottom: '1px solid var(--glass-border)',
      background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)',
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30,
    }}>
      {/* Brand — logo + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
        {/* Logo square */}
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: '#111',
          border: '1px solid rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', position: 'relative',
        }}>
          <LogoWithFallback />
        </div>

        {/* Name */}
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
          <span style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.3px', color: 'var(--color-primary)' }}>
            VectoriZr
          </span>
          <span style={{ fontSize: '0.58rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            R&amp;D Engineering
          </span>
        </div>
      </div>

      <StepBar />
      <HamburgerMenu />
    </header>
  )
}
