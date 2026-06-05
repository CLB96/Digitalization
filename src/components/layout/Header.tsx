import { StepBar } from './StepBar'
import { HamburgerMenu } from './HamburgerMenu'

export function Header() {
  return (
    <header style={{
      height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 12px', borderBottom: '1px solid var(--glass-border)',
      background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)',
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.5px' }}>VectoriZr</span>
        <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
          R&D Engineering
        </span>
      </div>
      <StepBar />
      <HamburgerMenu />
    </header>
  )
}
