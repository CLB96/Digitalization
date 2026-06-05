import { useEffect, useRef, useState, MouseEvent } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '../../store/appStore'
import { Button } from '../ui/Button'
import { Slider } from '../ui/Slider'
import type { ContourPoint } from '../../types'

type Mode = 'choose' | 'auto' | 'manual'

/** Convert click coordinates accounting for objectFit: contain letterboxing */
function canvasClickToImageCoords(
  e: MouseEvent<HTMLCanvasElement>,
  imageWidth: number,
  imageHeight: number,
): { x: number; y: number } | null {
  const rect = e.currentTarget.getBoundingClientRect()
  const scaleRatio = Math.min(rect.width / imageWidth, rect.height / imageHeight)
  const renderedW = imageWidth * scaleRatio
  const renderedH = imageHeight * scaleRatio
  const offsetX = (rect.width - renderedW) / 2
  const offsetY = (rect.height - renderedH) / 2
  const x = (e.clientX - rect.left - offsetX) / scaleRatio
  const y = (e.clientY - rect.top - offsetY) / scaleRatio
  if (x < 0 || y < 0 || x > imageWidth || y > imageHeight) return null
  return { x, y }
}

export function Step3Vectorize() {
  const { rawImage, imageWidth, imageHeight, setContourPoints, pushHistory, setStep } = useAppStore(useShallow(s => ({
    rawImage: s.rawImage, imageWidth: s.imageWidth, imageHeight: s.imageHeight,
    setContourPoints: s.setContourPoints, pushHistory: s.pushHistory, setStep: s.setStep,
  })))

  const [mode, setMode] = useState<Mode>('choose')
  const [threshold1, setThreshold1] = useState(50)
  const [threshold2, setThreshold2] = useState(150)
  const [detecting, setDetecting] = useState(false)
  const [detectedPoints, setDetectedPoints] = useState<{ x: number; y: number }[]>([])
  const [manualPoints, setManualPoints] = useState<{ x: number; y: number }[]>([])
  const workerRef = useRef<Worker | null>(null)
  const workerReady = useRef(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Init worker once
  useEffect(() => {
    const worker = new Worker(new URL('../../workers/opencv.worker.ts', import.meta.url))
    workerRef.current = worker
    worker.onmessage = (e) => {
      if (e.data.type === 'ready') {
        workerReady.current = true
        // If auto mode was already selected, run now
        if (mode === 'auto') runDetection()
      }
      if (e.data.type === 'contour') {
        setDetectedPoints(e.data.points)
        setDetecting(false)
      }
    }
    return () => worker.terminate()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function getImageData(): ImageData {
    const offscreen = document.createElement('canvas')
    offscreen.width = imageWidth
    offscreen.height = imageHeight
    offscreen.getContext('2d')!.drawImage(rawImage!, 0, 0)
    return offscreen.getContext('2d')!.getImageData(0, 0, imageWidth, imageHeight)
  }

  function runDetection() {
    if (!rawImage || !workerRef.current || !workerReady.current) return
    setDetecting(true)
    workerRef.current.postMessage({
      type: 'detect',
      imageData: getImageData(),
      threshold1,
      threshold2,
    })
  }

  function handleAutoMode() {
    setMode('auto')
    // Worker may already be ready; if so, run immediately
    if (workerReady.current) runDetection()
    // Otherwise worker will trigger runDetection on 'ready' message
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
      ctx.lineWidth = Math.max(2, imageWidth / 300)
      ctx.stroke()
    }
    pts.forEach((p, i) => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, Math.max(4, imageWidth / 200), 0, Math.PI * 2)
      ctx.fillStyle = i === 0 && pts.length > 1 ? '#ea580c' : '#e11d48'
      ctx.fill()
    })
  }, [detectedPoints, manualPoints, mode, rawImage, imageWidth, imageHeight])

  function handleCanvasClick(e: MouseEvent<HTMLCanvasElement>) {
    if (mode !== 'manual') return
    const coords = canvasClickToImageCoords(e, imageWidth, imageHeight)
    if (!coords) return
    const { x, y } = coords

    // Close contour if clicking near first point (in screen space)
    if (manualPoints.length > 2) {
      const rect = e.currentTarget.getBoundingClientRect()
      const scaleRatio = Math.min(rect.width / imageWidth, rect.height / imageHeight)
      const renderedW = imageWidth * scaleRatio
      const renderedH = imageHeight * scaleRatio
      const offsetX = (rect.width - renderedW) / 2
      const offsetY = (rect.height - renderedH) / 2
      const firstScreenX = manualPoints[0].x * scaleRatio + offsetX
      const firstScreenY = manualPoints[0].y * scaleRatio + offsetY
      const dx = (e.clientX - rect.left) - firstScreenX
      const dy = (e.clientY - rect.top) - firstScreenY
      if (Math.sqrt(dx * dx + dy * dy) < 18) {
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
              action: handleAutoMode,
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
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#111' }}>
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
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)',
            gap: 12,
          }}>
            <div style={{ width: 40, height: 40, border: '3px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: 'white', fontSize: '0.9rem' }}>Detectando bordes con OpenCV…</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
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
            <Button variant="ghost" onClick={runDetection} disabled={detecting || !workerReady.current}>
              {detecting ? 'Detectando…' : 'Volver a detectar'}
            </Button>
            <Button onClick={confirmAuto} disabled={detectedPoints.length < 3}>
              Confirmar ({detectedPoints.length} pts)
            </Button>
          </>
        )}
        {mode === 'manual' && (
          <>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              Haz clic para agregar puntos. El primer punto se muestra en <strong style={{ color: '#ea580c' }}>naranja</strong>. Haz clic cerca de él para cerrar el contorno.
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              Puntos: {manualPoints.length}
            </p>
            <Button variant="ghost" onClick={() => setManualPoints(pts => pts.slice(0, -1))} disabled={manualPoints.length === 0}>
              Deshacer último
            </Button>
            <Button variant="ghost" onClick={() => setManualPoints([])}>
              Limpiar todo
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
