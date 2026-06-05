import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type?: 'error' | 'success' | 'info'
  onDone: () => void
}

export function Toast({ message, type = 'info', onDone }: ToastProps) {
  const [visible, setVisible] = useState(true)
  const color = type === 'error' ? 'var(--color-error)' : type === 'success' ? 'var(--color-success)' : 'var(--color-primary)'

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); setTimeout(onDone, 300) }, 3500)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: `translateX(-50%) translateY(${visible ? 0 : 80}px)`,
      background: 'var(--color-surface)', border: `1px solid ${color}`,
      borderRadius: 'var(--radius-md)', padding: '10px 20px',
      color: 'white', fontSize: '0.875rem', zIndex: 200,
      transition: 'transform 0.3s ease', whiteSpace: 'nowrap',
    }}>
      {message}
    </div>
  )
}
