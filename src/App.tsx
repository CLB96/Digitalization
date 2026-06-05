import { useAppStore } from './store/appStore'
import { Header } from './components/layout/Header'
import { RotatePrompt } from './components/layout/RotatePrompt'
import { Step1Upload } from './components/steps/Step1Upload'
import { Step2Scale } from './components/steps/Step2Scale'
import { Step3Vectorize } from './components/steps/Step3Vectorize'
import { Step4Editor } from './components/steps/Step4Editor'
import { useOrientation } from './hooks/useOrientation'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

export default function App() {
  const step = useAppStore(s => s.step)
  const orientation = useOrientation()
  const showRotate = orientation === 'portrait' && step >= 3

  useKeyboardShortcuts()

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {showRotate && <RotatePrompt />}
      <Header />
      <main style={{ flex: 1, marginTop: 52, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {step === 1 && <Step1Upload />}
        {step === 2 && <Step2Scale />}
        {step === 3 && <Step3Vectorize />}
        {step === 4 && <Step4Editor />}
      </main>
    </div>
  )
}
