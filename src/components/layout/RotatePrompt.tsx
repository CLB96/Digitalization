export function RotatePrompt() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'var(--color-bg)' }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'spin 2s linear infinite' }}>
        📱
      </div>
      <p style={{ color: 'var(--color-text)', fontSize: '1.1rem', textAlign: 'center', padding: '0 2rem' }}>
        Rota tu dispositivo para usar el editor
      </p>
      <style>{`@keyframes spin { 0%,100%{transform:rotate(-15deg)} 50%{transform:rotate(15deg)} }`}</style>
    </div>
  )
}
