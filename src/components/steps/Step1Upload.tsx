import { useRef, useState, DragEvent } from 'react'
import { useAppStore } from '../../store/appStore'
import { normalizeImage } from '../../lib/imageNormalize'
import { Button } from '../ui/Button'
import { Toast } from '../ui/Toast'

export function Step1Upload() {
  const setImage = useAppStore(s => s.setImage)
  const setStep = useAppStore(s => s.setStep)
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function loadFile(file: File) {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      setError('Formato no válido. Usa JPG, PNG o PDF.')
      return
    }
    setLoading(true)
    try {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.src = url
      await new Promise<void>((res, rej) => {
        img.onload = () => res()
        img.onerror = () => rej(new Error('No se pudo cargar la imagen'))
      })
      const normalized = await normalizeImage(img)
      URL.revokeObjectURL(url)
      setImage(normalized, normalized.naturalWidth, normalized.naturalHeight)
      setStep(2)
    } catch {
      setError('No se pudo procesar el archivo. Intenta con otro.')
    } finally {
      setLoading(false)
    }
  }

  async function openCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      const video = document.createElement('video')
      video.srcObject = stream
      await video.play()
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d')!.drawImage(video, 0, 0)
      stream.getTracks().forEach(t => t.stop())
      const img = new Image()
      img.src = canvas.toDataURL('image/jpeg', 0.92)
      await new Promise<void>(res => { img.onload = () => res() })
      const normalized = await normalizeImage(img)
      setImage(normalized, normalized.naturalWidth, normalized.naturalHeight)
      setStep(2)
    } catch {
      setError('No se pudo acceder a la cámara. Revisa los permisos.')
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) loadFile(file)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '2rem', padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Cargar imagen</h1>
      <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', maxWidth: 400 }}>
        Sube una foto o archivo de tu dibujo. Asegúrate de que incluya una referencia de medida (regla, cinta, etc.).
      </p>
      <div
        className="glass"
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          width: '100%', maxWidth: 480, padding: '3rem 2rem',
          textAlign: 'center', cursor: 'pointer',
          border: `2px dashed ${dragging ? 'var(--color-primary)' : 'var(--glass-border)'}`,
          borderRadius: 'var(--radius-lg)', transition: 'border-color 0.2s',
        }}
        onClick={() => fileRef.current?.click()}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          Arrastra tu imagen aquí o <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>haz clic para seleccionar</span>
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: 8 }}>JPG, PNG, PDF</p>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
          style={{ display: 'none' }} onChange={e => e.target.files?.[0] && loadFile(e.target.files[0])} />
      </div>
      <Button variant="ghost" onClick={openCamera} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        📷 Tomar foto
      </Button>
      {loading && <p style={{ color: 'var(--color-text-muted)' }}>Procesando imagen…</p>}
      {error && <Toast message={error} type="error" onDone={() => setError(null)} />}
    </div>
  )
}
