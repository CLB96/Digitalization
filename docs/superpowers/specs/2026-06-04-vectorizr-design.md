# VectoriZr — Documento de Diseño

**Fecha:** 2026-06-04
**Estado:** Aprobado para implementación
**Plataforma:** PWA — deploy en Netlify
**Idioma de la UI:** Español mexicano (tú/usted)

---

## 1. Propósito

VectoriZr es una herramienta web progresiva (PWA) que permite digitalizar dibujos o siluetas 2D fotografiados o escaneados, escalarlos con base en una referencia de medida conocida y exportarlos en formatos CAD y gráficos (DXF, SVG, PDF).

Casos de uso principales:
- Digitalizar patrones de corte en papel (costura, tela, cuero)
- Digitalizar croquis técnicos o piezas trazadas a mano
- Vectorizar siluetas y formas artísticas para uso en CNC, plotter o diseño

---

## 2. Identidad Visual y Diseño

La app forma parte del ecosistema de herramientas de **R&D Engineering** (ptetoolbox.netlify.app) y debe mantener coherencia visual con el resto de la suite.

### Estilo
- **Glassmorphism** oscuro: fondos con `backdrop-filter: blur()` + transparencia
- Typography: misma familia que ptetoolbox.netlify.app
- Cards con borde semitransparente (`rgba(255,255,255,0.1)`)

### Paleta de tokens CSS (compartida con toda la suite R&D Engineering)

| Token | Valor | Uso |
|-------|-------|-----|
| `--color-bg` | `#0d0d1f` | Fondo principal |
| `--color-surface` | `#1a1a2e` | Cards y paneles |
| `--color-primary` | `#4a7eff` | Acción principal, botones primarios |
| `--color-accent` | `#7c5cbf` | Violeta, acentos secundarios |
| `--color-success` | `#22c55e` | Estados completado / activo |
| `--color-warning` | `#f59e0b` | Alertas, estado vencido |
| `--color-error` | `#ef4444` | Errores, estado bloqueado |
| `--color-neutral` | `#6b7280` | Texto secundario, estado pendiente |
| `--color-rose` | `#e11d48` | Puntos de escala, alertas críticas de UI |
| `--color-orange` | `#ea580c` | Handles Bezier, punto seleccionado activo |

### Header
- Logo R&D Engineering (igual que en el resto de apps)
- Nombre de la herramienta activa
- Botón hamburguesa para navegación/configuración

### Orientación
- **Desktop / tablet landscape:** layout completo con panel lateral
- **Móvil portrait:** pantalla de "Rota tu dispositivo" — la app requiere landscape para el editor
- **Móvil landscape / iPad:** funciona completo

---

## 3. Flujo de la Aplicación

El usuario avanza por 4 pasos lineales. Puede retroceder a cualquier paso anterior sin perder el trabajo.

```
[1. Cargar imagen] → [2. Definir escala] → [3. Vectorizar] → [4. Editar y exportar]
```

### Paso 1 — Cargar imagen
- Botón **"Subir archivo"**: abre selector de archivos, acepta JPG, PNG, PDF
- Botón **"Tomar foto"**: activa la cámara del dispositivo (API `getUserMedia`)
- Soporte de arrastrar y soltar (drag & drop) en desktop
- La imagen se normaliza a un canvas interno (máx. 4096×4096 px) antes de procesar

### Paso 2 — Definir escala
- La imagen cargada se muestra a pantalla completa
- El usuario hace clic en **dos puntos** sobre un objeto de medida conocida (regla, cinta métrica, etc.)
- Se muestra una línea roja entre los dos puntos con la pregunta: *"¿Cuánto mide esta distancia?"*
- El usuario ingresa el valor numérico y selecciona la unidad (mm, cm, m, in)
- La app calcula el factor de escala: `escala = distanciaReal / distanciaEnPixeles`
- Este factor queda almacenado en el estado global y se aplica a toda exportación posterior

### Paso 3 — Elegir modo de vectorización

El usuario elige entre dos modos:

**Modo A — Detección automática:**
1. OpenCV.js (en Web Worker) procesa la imagen con filtro Canny para detectar bordes
2. Se extraen los contornos y se convierten a puntos (array de coordenadas)
3. El usuario ve el contorno detectado superpuesto a la imagen
4. Puede ajustar el umbral de sensibilidad con un slider antes de confirmar
5. Pasa al editor (Paso 4) con los puntos generados automáticamente

**Modo B — Trazado manual:**
1. El usuario hace clic sobre la imagen para colocar puntos del contorno uno a uno
2. Los puntos se conectan en orden con líneas/curvas en tiempo real
3. Para cerrar el contorno, hace clic sobre el primer punto
4. Pasa al editor (Paso 4) con los puntos que trazó

### Paso 4 — Editar y exportar

#### Layout: Panel lateral (Opción B)
- **Barra izquierda (iconos):** herramientas activas
- **Canvas central:** imagen de fondo + contorno vectorial editable
- **Panel derecho:** propiedades del punto/segmento seleccionado
- **Barra superior:** botones de deshacer/rehacer + botón de exportar
- **Barra de estado inferior:** escala activa, zoom, modo, conteo de puntos

#### Herramientas disponibles
| Icono | Herramienta | Función |
|-------|------------|---------|
| ↖ | Seleccionar / Mover | Mover puntos arrastrando |
| ✎ | Editar punto | Seleccionar y reposicionar puntos individuales |
| ⌒ | Tipo de segmento | Alternar entre línea recta y curva Bezier |
| + | Agregar punto | Insertar punto en un segmento existente |
| − | Eliminar punto | Eliminar punto seleccionado |
| 🔍 | Zoom | Zoom in/out con rueda del mouse o pellizco |
| ↺ | Deshacer | Ctrl+Z / botón |
| ↻ | Rehacer | Ctrl+Y / botón |

#### Panel de propiedades (derecha)
- Coordenadas X, Y del punto seleccionado (en mm reales)
- Tipo de segmento: Línea recta / Bezier
- Si es Bezier: handles visibles y arrastrables en el canvas
- Información global: total de puntos, longitud del contorno en mm

#### Exportación
Al hacer clic en "Exportar", se muestra un modal con tres opciones:
1. **DXF** (primario) — genera archivo DXF con entidades `POLYLINE`/`SPLINE`, con las coordenadas ya convertidas a mm reales usando el factor de escala
2. **SVG** — exporta el path SVG con viewBox en mm reales
3. **PDF** — genera PDF tamaño carta/A4 con el contorno a escala real (1:1) usando jsPDF

---

## 4. Arquitectura Técnica

### Stack

| Capa | Tecnología | Propósito |
|------|-----------|-----------|
| Framework | React 18 + Vite | Base de la SPA/PWA |
| Lenguaje | TypeScript | Tipado estricto |
| Estilos | Tailwind CSS + CSS custom properties | UI glassmorphism |
| Editor vectorial | Konva.js | Canvas interactivo con nodos |
| Procesamiento imagen | OpenCV.js (WASM) | Detección de bordes (Canny) |
| Threading | Web Workers | Procesamiento sin bloquear UI |
| Exportación DXF | dxf-writer | Genera archivos DXF v0/R12 |
| Exportación PDF | jsPDF | Genera PDF con escala correcta |
| PWA | vite-plugin-pwa | Service worker + manifest |
| Deploy | Netlify | Hosting estático con HTTPS |

### Estructura de archivos
```
src/
├── components/
│   ├── layout/         # Header, Hamburger, RotatePrompt
│   ├── steps/          # Step1Upload, Step2Scale, Step3Vectorize, Step4Editor
│   ├── editor/         # Canvas, Toolbar, PropertiesPanel, StatusBar
│   └── ui/             # Button, Modal, Slider, Toast
├── hooks/
│   ├── useScale.ts     # Factor de escala y conversiones px ↔ mm
│   ├── useContour.ts   # Estado del contorno (puntos, tipo de segmento)
│   └── useHistory.ts   # Undo/redo stack
├── workers/
│   └── opencv.worker.ts  # OpenCV.js Canny edge detection
├── lib/
│   ├── export-dxf.ts   # Conversión contorno → DXF
│   ├── export-svg.ts   # Conversión contorno → SVG
│   └── export-pdf.ts   # Conversión contorno → PDF
└── store/
    └── appStore.ts     # Estado global (Zustand)
```

### Estado global (Zustand)
```typescript
interface AppState {
  step: 1 | 2 | 3 | 4
  imageData: ImageData | null
  scaleFactor: number        // mm por pixel
  scaleUnit: 'mm' | 'cm' | 'm' | 'in'
  contourPoints: Point[]     // [{x, y, type: 'line' | 'bezier', handles?}]
  history: ContourSnapshot[] // para undo/redo
  activeToolId: ToolId
}
```

### Flujo de datos
```
Imagen/Foto
  → Canvas API (normalizar resolución)
  → Web Worker: OpenCV.js Canny
  → Array de puntos (px)
  → useScale: convertir a mm reales
  → Konva.js: render editable
  → Exportadores: dxf-writer / SVG / jsPDF
```

---

## 5. Gestión de Orientación

- En portrait mobile: se muestra un overlay a pantalla completa con mensaje "*Rota tu dispositivo para usar el editor*" + ícono animado
- Detección: `window.matchMedia('(orientation: portrait)')` + listener en resize
- El overlay no bloquea los pasos 1 y 2 (cargar + escala), solo el editor (pasos 3 y 4)

---

## 6. Comportamiento PWA

- **Instalable:** manifest con nombre "VectoriZr", ícono, pantalla de inicio
- **Offline:** service worker cachea assets y OpenCV.js WASM después de primera carga
- **Cámara:** acceso vía `getUserMedia`, solo se solicita el permiso al hacer clic en "Tomar foto"
- **Archivos:** FileReader API para leer archivos locales, sin upload a servidor

---

## 7. Consideraciones de UX

- **Privacidad total:** ninguna imagen sale del dispositivo del usuario
- **Sin registro:** la app no requiere cuenta ni login
- **Progreso visual:** barra de pasos (1-2-3-4) siempre visible en el header
- **Feedback de procesamiento:** spinner/progress durante la detección OpenCV (puede tardar 1-3 segundos en imágenes grandes)
- **Errores claros:** si la cámara es denegada, si el archivo es inválido, si no se detectaron contornos — mensajes en español mexicano con acción sugerida

---

## 8. Lo que está fuera del alcance (v1)

- Múltiples capas (una silueta por sesión en v1)
- Guardar proyecto para continuar después (no hay persistencia entre sesiones)
- OCR de cotas o texto en la imagen
- Escala automática por tamaño de papel (se agrega en v2 si hay demanda)
- Edición colaborativa
