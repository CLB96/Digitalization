import { useAppStore } from '../../store/appStore'

const STEPS = ['Cargar', 'Escala', 'Vectorizar', 'Editar']

export function StepBar() {
  const step = useAppStore(s => s.step)
  return (
    <div className="flex items-center gap-1 px-4">
      {STEPS.map((label, i) => {
        const n = i + 1
        const isActive = n === step
        const isDone = n < step
        return (
          <div key={n} className="flex items-center gap-1">
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: isDone ? 'var(--color-success)' : isActive ? 'var(--color-primary)' : 'var(--color-surface-2)',
              border: `1px solid ${isActive ? 'var(--color-primary)' : 'var(--glass-border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', fontWeight: 700, color: 'white',
            }}>
              {isDone ? '✓' : n}
            </div>
            <span style={{
              fontSize: '0.7rem',
              color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)',
              display: 'none',
            }} className="sm:block">{label}</span>
            {i < 3 && <div style={{ width: 16, height: 1, background: 'var(--glass-border)' }} />}
          </div>
        )
      })}
    </div>
  )
}
