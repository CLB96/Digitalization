import { useEffect, useRef, useState, MouseEvent } from 'react'
import { useAppStore } from '../../store/appStore'
import { Button } from '../ui/Button'
import { Slider } from '../ui/Slider'
import type { ContourPoint } from '../../types'

type Mode = 'choose' | 'auto' | 'manual'

export function Step3Vectorize() {
  const { rawImage, imageWidth, imageHeight, setContourPoints, pushHistory, setStep } = useAppStore(s => ({
    rawImage: s.rawImage, imageWidth: s.imageWidth, imageHeight: s.imageHeight,
    setContourPoints: s.setContourPoints, pushHistory: s.pushHistory, setStep: s.setStep,
  }))

  const [mode, setMode] = useState<Mode>('choose')
  const [threshold1, setThreshold1] = useState(50)
  const [threshold2, setThreshold2] = useState(150)
  const [detecting, setDetecting] = useState(false)
  const [detectedPoints, setDetectedPoints] = useState<{ x: number; y: number }[]>([])
  const [manualPoints, setManualPoints] = useState<{ x: number; y: number }[]>([])
  const workerRef = useRef<Worker | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../../workers/opencv.worker.ts', import.meta.url),
      { type: 'module' }
    )
    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'ready') runDetection()
      if (e.data.type === 'contour') {
        setDetectedPoints(e.data.points)
        setDetecting(false)
      }
    }
    return () => workerRef.current?.terminate()
  }, [])

  function getImageData(): ImageData {
    const canvas = document.createElement('canvas')
    canvas.width = imageWidth
    canvas.height = imageHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(rawImage!, 0, 0)
    return ctx.getImageData(0, 0, imageWidth, imageHeight)
  }

  function runDetection() {
    if (!rawImage || !workerRef.current) return
    setDetecting(true)
    workerRef.current.postMessage({
      type: 'detect',
      imageData: getImageData(),
      threshold1,
      threshold2,
    })
  }

  // Draw image + contour overlay on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !rawImage) return
    const ctx = canvas.getContext('2d')!
    canvas.width = imageWidth
    canvas.height = imageHeight
    ctx.drawImage(rawImage, 0, 0)

    const pts = mode === 'manual' ? manualPoints : detectedPoints
    if (pts.length > 1) {
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
      ctx.closePath()
      ctx.strokeStyle = '#4a7eff'
      ctx.lineWidth = 2
      ctx.stroke()
    }
    pts.forEach(p => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#e11d48'
      ctx.fill()
    })
  }, [detectedPoints, manualPoints, mode, rawImage, imageWidth, imageHeight])

  function handleCanvasClick(e: MouseEvent<HTMLCanvasElement>) {
    if (mode !== 'manual') return
    const rect = e.currentTarget.getBoundingClientRect()
    const scaleX = imageWidth / rect.width
    const scaleY = imageHeight / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    // Close contour if clicking near first point
    if (manualPoints.length > 2) {
      const dx = x - manualPoints[0].x
      const dy = y - manualPoints[0].y
      if (Math.sqrt(dx * dx + dy * dy) < 15 * scaleX) {
        confirmManual()
        return
      }
    }
    setManualPoints(pts => [...pts, { x, y }])
  }

  function confirmAuto() {
    const pts: ContourPoint[] = detectedPoints.map((p, i) => ({
      id: String(i), x: p.x, y: p.y, type: 'line',
    }))
    setContourPoints(pts)
    pushHistory()
    setStep(4)
  }

  function confirmManual() {
    const pts: ContourPoint[] = manualPoints.map((p, i) => ({
      id: String(i), x: p.x, y: p.y, type: 'line',
    }))
    setContourPoints(pts)
    pushHistory()
    setStep(4)
  }

  if (mode === 'choose') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', gap: '2rem', padding: '2rem',
      }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>¿Cómo quieres vectorizar?</h1>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            {
              icon: '🤖',
              title: 'Detección automática',
              desc: 'La app detecta los bordes. Tú corriges los puntos.',
              action: () => setMode('auto'),
            },
            {
              icon: '✏️',
              title: 'Trazado manual',
              desc: 'Haz clic para colocar cada punto del contorno.',
              action: () => setMode('manual'),
            },
          ].map(opt => (
            <div
              key={opt.title}
              className="glass"
              onClick={opt.action}
              style={{
                padding: '2rem', textAlign: 'center', cursor: 'pointer', maxWidth: 220,
                border: '1px solid var(--glass-border)', transition: 'border-color 0.2s',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{opt.icon}</div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>{opt.title}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{opt.desc}</p>
            </div>
          ))}
        </div>
        <button
          onClick={() => setStep(2)}
          style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
        >
          ← Volver
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Canvas area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%', height: '100%', objectFit: 'contain', display: 'block',
            cursor: mode === 'manual' ? 'crosshair' : 'default',
          }}
          onClick={handleCanvasClick}
        />
        {detecting && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)',
          }}>
            <span style={{ color: 'white' }}>Detectando bordes…</span>
          </div>
        )}
      </div>

      {/* Right panel */}
      <div className="glass" style={{
        width: 200, padding: '1rem', display: 'flex', flexDirection: 'column',
        gap: 12, flexShrink: 0, borderRadius: 0,
      }}>
        {mode === 'auto' && (
          <>
            <Slider label="Umbral bajo" min={10} max={200} value={threshold1} onChange={setThreshold1} />
            <Slider label="Umbral alto" min={50} max={400} value={threshold2} onChange={setThreshold2} />
            <Button variant="ghost" onClick={runDetection} disabled={detecting}>
              Volver a detectar
            </Button>
            <Button onClick={confirmAuto} disabled={detectedPoints.length < 3}>
              Confirmar
            </Button>
          </>
        )}
        {mode === 'manual' && (
          <>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              Haz clic para agregar puntos. Haz clic sobre el primer punto para cerrar el contorno.
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              Puntos: {manualPoints.length}
            </p>
            <Button variant="ghost" onClick={() => setManualPoints(pts => pts.slice(0, -1))}>
              Deshacer último
            </Button>
            <Button onClick={confirmManual} disabled={manualPoints.length < 3}>
              Confirmar
            </Button>
          </>
        )}
        <button
          onClick={() => { setMode('choose'); setDetectedPoints([]); setManualPoints([]) }}
          style={{
            background: 'none', border: 'none', color: 'var(--color-text-muted)',
            cursor: 'pointer', fontSize: '0.8rem', marginTop: 'auto',
          }}
        >
          ← Cambiar modo
        </button>
      </div>
    </div>
  )
}
