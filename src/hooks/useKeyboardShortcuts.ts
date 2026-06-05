import { useEffect } from 'react'
import { useAppStore } from '../store/appStore'

export function useKeyboardShortcuts() {
  const { undo, redo, step } = useAppStore(s => ({ undo: s.undo, redo: s.redo, step: s.step }))

  useEffect(() => {
    if (step !== 4) return
    function handler(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && e.key === 'z') { e.preventDefault(); undo() }
      if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [step, undo, redo])
}
