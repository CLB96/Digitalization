import { useState } from 'react'
import { Modal } from '../ui/Modal'

interface Props { onClose: () => void }

type Tab = 'flujo' | 'herramientas' | 'atajos' | 'consejos'

const TAB_LABELS: { id: Tab; label: string }[] = [
  { id: 'flujo',        label: '🚀 Flujo' },
  { id: 'herramientas', label: '🛠 Herramientas' },
  { id: 'atajos',       label: '⌨️ Atajos' },
  { id: 'consejos',     label: '💡 Consejos' },
]

const sectionTitle = (text: string) => (
  <p style={{
    fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px',
    color: 'var(--color-primary)', fontWeight: 700, marginBottom: 10, marginTop: 18,
  }}>{text}</p>
)

const row = (icon: string, title: string, desc: string) => (
  <div key={title} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
    <span style={{ fontSize: '1.1rem', flexShrink: 0, width: 22, textAlign: 'center' }}>{icon}</span>
    <div>
      <p style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 2 }}>{title}</p>
      <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{desc}</p>
    </div>
  </div>
)

const kbd = (key: string) => (
  <span style={{
    display: 'inline-block', padding: '1px 6px', borderRadius: 4,
    background: 'rgba(255,255,255,0.1)', border: '1px solid var(--glass-border)',
    fontFamily: 'monospace', fontSize: '0.78rem', margin: '0 2px',
  }}>{key}</span>
)

function TabFlujo() {
  return (
    <div>
      {sectionTitle('Cómo funciona VectoriZr')}
      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 14 }}>
        La app convierte fotografías de piezas físicas en vectores listos para CNC o corte láser en 4 pasos.
      </p>

      {row('📂', 'Paso 1 — Cargar imagen',
        'Sube una foto clara de la pieza sobre un fondo contrastante. Acepta JPG, PNG y WebP. Cuanto más nítida sea la foto y mayor el contraste, mejor será el resultado.')}
      {row('📏', 'Paso 2 — Definir escala',
        'Marca dos puntos sobre la imagen cuya distancia real conoces (por ejemplo, los extremos de una regla). Ingresa la medida real en mm, cm, m o pulgadas. Esto permite que el DXF exportado tenga las medidas reales de la pieza.')}
      {row('🔍', 'Paso 3 — Vectorizar',
        'La app detecta el contorno automáticamente usando análisis de imagen. Puedes ajustar el umbral para incluir o excluir detalles. Si el resultado no es perfecto, puedes corregirlo en el paso siguiente.')}
      {row('✏️', 'Paso 4 — Editar y exportar',
        'Edita los puntos del contorno con precisión: muévelos, agrégalos, elimínalos o cambia los segmentos a curvas Bezier. Al terminar, exporta como DXF (AutoCAD/CNC), SVG o PDF.')}
    </div>
  )
}

function TabHerramientas() {
  return (
    <div>
      {sectionTitle('Herramientas del editor')}
      {row('☝️', 'Seleccionar',
        'Selecciona y arrastra puntos existentes para reposicionarlos. También permite mover toda la vista arrastrando el canvas.')}
      {row('✏️', 'Editar punto',
        'Igual que seleccionar pero especializado en edición. Haz click en un punto para ver sus coordenadas en el panel derecho y ajustar sus propiedades.')}
      {row('〜', 'Tipo de segmento',
        'Click sobre cualquier punto para alternar entre segmento recto (línea) y curva Bezier. Los puntos Bezier se muestran en morado. Las curvas usan interpolación Catmull-Rom automática.')}
      {row('●', 'Agregar punto',
        'Click en cualquier lugar del canvas (incluyendo sobre la foto) para insertar un nuevo punto al final del trazo activo.')}
      {row('⬜', 'Eliminar punto',
        'Click sobre un punto existente para eliminarlo del trazo.')}
      {row('📐', 'Medir distancia',
        '1er click = punto A. 2do click = punto B. Muestra la distancia real en mm entre ambos puntos. El 3er click reinicia la medición. Útil para validar antes de exportar.')}
      {row('🔍', 'Zoom',
        'También puedes usar la rueda del mouse para hacer zoom centrado en el cursor, y arrastrar el canvas para mover la vista en cualquier modo.')}

      {sectionTitle('Trazos múltiples')}
      {row('＋', 'Nuevo trazo',
        'Guarda el trazo activo actual y empieza uno nuevo. Útil para piezas con huecos o contornos interiores. Al exportar se incluyen todos los trazos.')}
    </div>
  )
}

function TabAtaljos() {
  const rows: [string, string][] = [
    ['Rueda del mouse', 'Zoom centrado en el cursor'],
    ['Click + arrastrar', 'Mover la vista (en modo seleccionar o zoom)'],
    ['Click en punto', 'Seleccionar punto'],
    ['Arrastrar punto', 'Mover punto (seleccionar o editar)'],
    ['Ctrl + Z', 'Deshacer'],
    ['Ctrl + Y / Ctrl + Shift + Z', 'Rehacer'],
  ]
  return (
    <div>
      {sectionTitle('Atajos de teclado y ratón')}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(([key, desc]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flexShrink: 0, minWidth: 180 }}>
              {key.split(' / ').map((k, i) => (
                <span key={k}>{i > 0 && <span style={{ color: 'var(--color-text-muted)', margin: '0 4px' }}>/</span>}{kbd(k)}</span>
              ))}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{desc}</p>
          </div>
        ))}
      </div>

      {sectionTitle('Botones del editor')}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {([
          ['↺ / ↻ (barra lateral)', 'Deshacer / Rehacer'],
          ['+ Nuevo trazo (barra superior)', 'Guarda el trazo actual y empieza uno nuevo'],
          ['↓ Exportar', 'Abre el panel de exportación (DXF / SVG / PDF)'],
        ] as [string, string][]).map(([key, desc]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flexShrink: 0, minWidth: 180 }}>{kbd(key)}</div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function TabConsejos() {
  return (
    <div>
      {sectionTitle('Para mejores resultados')}
      {row('📸', 'Fotografía adecuada',
        'Usa fondo blanco o negro con buena iluminación y sin sombras fuertes. La pieza debe contrastar claramente con el fondo. Evita fotos en ángulo — usa vista cenital (desde arriba).')}
      {row('📏', 'Escala precisa',
        'Coloca una regla o pieza de referencia conocida en la foto junto a la pieza. Cuanto más larga sea la referencia que elijas, más precisa será la escala.')}
      {row('🎯', 'Umbral de vectorización',
        'En el paso 3, si el contorno detectado tiene ruido o le faltan partes, ajusta el umbral. Valores más bajos capturan más detalles; valores más altos dan contornos más limpios.')}
      {row('✏️', 'Edición de puntos',
        'Menos puntos = contorno más suave para CNC. Elimina puntos redundantes en zonas rectas. Usa Bezier solo en curvas reales, no en segmentos casi rectos.')}
      {row('📐', 'Valida antes de exportar',
        'Usa la herramienta de medición para verificar dimensiones clave antes de exportar. Compara con las medidas reales de la pieza.')}
      {row('🗂️', 'Trazos múltiples',
        'Para piezas con agujeros, usa "Nuevo trazo" para cada contorno interior. En el DXF exportado, cada trazo aparece como una polilínea independiente.')}
    </div>
  )
}

export function HelpModal({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('flujo')

  return (
    <Modal title="Manual de usuario" onClose={onClose}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 16,
        borderBottom: '1px solid var(--glass-border)', paddingBottom: 12,
        flexWrap: 'wrap',
      }}>
        {TAB_LABELS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              padding: '5px 12px', borderRadius: 'var(--radius-sm)', border: 'none',
              cursor: 'pointer', fontSize: '0.78rem', fontWeight: activeTab === id ? 700 : 400,
              background: activeTab === id ? 'var(--color-primary)' : 'transparent',
              color: activeTab === id ? 'white' : 'var(--color-text-muted)',
              transition: 'background 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxHeight: '55vh', overflowY: 'auto', paddingRight: 4 }}>
        {activeTab === 'flujo'        && <TabFlujo />}
        {activeTab === 'herramientas' && <TabHerramientas />}
        {activeTab === 'atajos'       && <TabAtaljos />}
        {activeTab === 'consejos'     && <TabConsejos />}
      </div>
    </Modal>
  )
}
