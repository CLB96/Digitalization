import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
}

export function Button({ variant = 'primary', style, ...props }: ButtonProps) {
  const bg = variant === 'primary' ? 'var(--color-primary)'
    : variant === 'danger' ? 'var(--color-error)'
    : 'var(--glass-bg)'
  const border = variant === 'ghost' ? '1px solid var(--glass-border)' : 'none'

  return (
    <button
      {...props}
      style={{
        background: bg, border, borderRadius: 'var(--radius-sm)',
        color: 'white', padding: '8px 16px', fontSize: '0.875rem',
        fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s',
        ...style,
      }}
    />
  )
}
