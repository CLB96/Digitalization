# VectoriZr — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a PWA that lets users photograph or upload 2D drawings, define a real-world scale reference, vectorize the silhouette (auto or manual), edit it, and export to DXF/SVG/PDF.

**Architecture:** Pure browser app — no backend. React 18 + Vite + TypeScript for the shell. Konva.js for the interactive vector canvas. OpenCV.js (WASM) in a Web Worker for Canny edge detection. Zustand for global state. Netlify static deploy.

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS, Konva.js, OpenCV.js, Zustand, dxf-writer, jsPDF, vite-plugin-pwa, Vitest, React Testing Library

---

## File Map

```
src/
├── main.tsx                          # React entry point
├── App.tsx                           # Root: StepRouter + RotatePrompt
├── styles/
│   └── tokens.css                    # CSS custom properties (design tokens)
├── store/
│   └── appStore.ts                   # Zustand store — all app state
├── types/
│   └── index.ts                      # Shared TypeScript types
├── components/
│   ├── layout/
│   │   ├── Header.tsx                # Logo + tool name + hamburger
│   │   ├── HamburgerMenu.tsx         # Slide-out nav panel
│   │   ├── StepBar.tsx               # Steps 1-2-3-4 progress indicator
│   │   └── RotatePrompt.tsx          # Portrait-mode overlay
│   ├── ui/
│   │   ├── Button.tsx                # Glassmorphism button variants
│   │   ├── Modal.tsx                 # Generic modal wrapper
│   │   ├── Slider.tsx                # Labeled range slider
│   │   └── Toast.tsx                 # Error/success notifications
│   ├── steps/
│   │   ├── Step1Upload.tsx           # File upload + camera capture
│   │   ├── Step2Scale.tsx            # Two-point scale definition
│   │   ├── Step3Vectorize.tsx        # Mode selection + auto/manual flow
│   │   └── Step4Editor.tsx           # Full editor layout
│   └── editor/
│       ├── EditorCanvas.tsx          # Konva stage + image + contour layer
│       ├── Toolbar.tsx               # Left icon toolbar
│       ├── PropertiesPanel.tsx       # Right panel — point properties
│       └── StatusBar.tsx             # Bottom bar — scale/zoom/mode info
├── hooks/
│   ├── useScale.ts                   # px↔mm conversion helpers
│   ├── useContour.ts                 # Contour point CRUD operations
│   ├── useHistory.ts                 # Undo/redo stack
│   └── useOrientation.ts            # Portrait detection
├── workers/
│   └── opencv.worker.ts             # Canny edge detection via OpenCV.js
├── lib/
│   ├── imageNormalize.ts            # Resize image to ≤4096×4096
│   ├── contourToPoints.ts           # OpenCV contour → Point[]
│   ├── export-dxf.ts                # Point[] → DXF string
│   ├── export-svg.ts                # Point[] → SVG string
│   └── export-pdf.ts                # Point[] → PDF blob
└── test/
    ├── useScale.test.ts
    ├── useHistory.test.ts
    ├── contourToPoints.test.ts
    ├── export-dxf.test.ts
    ├── export-svg.test.ts
    ├── export-pdf.test.ts
    └── imageNormalize.test.ts
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`
- Create: `tailwind.config.ts`, `postcss.config.js`
- Create: `src/main.tsx`, `src/App.tsx`
- Create: `netlify.toml`

- [ ] **Step 1: Initialize Vite project**

```bash
npm create vite@latest . -- --template react-ts
npm install
```

- [ ] **Step 2: Install all dependencies**

```bash
npm install zustand konva react-konva jspdf dxf-writer
npm install -D tailwindcss postcss autoprefixer vite-plugin-pwa vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
npx tailwindcss init -p
```

- [ ] **Step 3: Configure Tailwind**

Replace `tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
} satisfies Config
```

- [ ] **Step 4: Configure Vite with PWA**

Replace `vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'VectoriZr',
        short_name: 'VectoriZr',
        description: 'Digitaliza y escala dibujos 2D — R&D Engineering',
        theme_color: '#0d0d1f',
        background_color: '#0d0d1f',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
      },
    }),
  ],
  worker: { format: 'es' },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
})
```

- [ ] **Step 5: Create test setup file**

Create `src/test/setup.ts`:
```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Configure Netlify**

Create `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

- [ ] **Step 7: Verify scaffold runs**

```bash
npm run dev
```
Expected: Vite dev server at http://localhost:5173 with default React page.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: scaffold Vite + React + TypeScript + Tailwind + PWA"
```

---

## Task 2: Design Tokens + Global Styles

**Files:**
- Create: `src/styles/tokens.css`
- Modify: `src/index.css`

- [ ] **Step 1: Create CSS tokens**

Create `src/styles/tokens.css`:
```css
:root {
  --color-bg: #0d0d1f;
  --color-surface: #1a1a2e;
  --color-surface-2: rgba(255, 255, 255, 0.06);
  --color-border: rgba(255, 255, 255, 0.1);
  --color-primary: #4a7eff;
  --color-accent: #7c5cbf;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-neutral: #6b7280;
  --color-rose: #e11d48;
  --color-orange: #ea580c;
  --color-text: #ffffff;
  --color-text-muted: rgba(255, 255, 255, 0.55);

  --glass-bg: rgba(255, 255, 255, 0.06);
  --glass-border: rgba(255, 255, 255, 0.12);
  --glass-blur: blur(12px);

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;

  --font-sans: 'Inter', system-ui, sans-serif;
}
```

- [ ] **Step 2: Set global styles**

Replace `src/index.css`:
```css
@import './styles/tokens.css';
@tailwind base;
@tailwind components;
@tailwind utilities;

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-sans);
  min-height: 100dvh;
  overflow: hidden;
}

.glass {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/styles/tokens.css src/index.css
git commit -m "feat: add design tokens and glassmorphism global styles"
```

---

## Task 3: Shared Types + Zustand Store

**Files:**
- Create: `src/types/index.ts`
- Create: `src/store/appStore.ts`

- [ ] **Step 1: Define shared types**

Create `src/types/index.ts`:
```ts
export type AppStep = 1 | 2 | 3 | 4

export type ScaleUnit = 'mm' | 'cm' | 'm' | 'in'

export type SegmentType = 'line' | 'bezier'

export interface BezierHandles {
  cp1: { x: number; y: number }
  cp2: { x: number; y: number }
}

export interface ContourPoint {
  id: string
  x: number       // pixels, relative to normalized image
  y: number
  type: SegmentType
  handles?: BezierHandles
}

export type ToolId =
  | 'select'
  | 'edit-point'
  | 'segment-type'
  | 'add-point'
  | 'delete-point'
  | 'zoom'

export interface ContourSnapshot {
  points: ContourPoint[]
}

export interface ScaleRef {
  p1: { x: number; y: number }
  p2: { x: number; y: number }
  realValue: number
  unit: ScaleUnit
}
```

- [ ] **Step 2: Create Zustand store**

Create `src/store/appStore.ts`:
```ts
import { create } from 'zustand'
import type { AppStep, ContourPoint, ContourSnapshot, ScaleRef, ToolId } from '../types'

interface AppState {
  step: AppStep
  rawImage: HTMLImageElement | null
  imageWidth: number
  imageHeight: number
  scaleRef: ScaleRef | null
  scaleFactor: number        // mm per pixel (0 until set)
  contourPoints: ContourPoint[]
  history: ContourSnapshot[]
  historyIndex: number
  activeToolId: ToolId
  zoom: number

  setStep: (step: AppStep) => void
  setImage: (img: HTMLImageElement, w: number, h: number) => void
  setScaleRef: (ref: ScaleRef, factor: number) => void
  setContourPoints: (points: ContourPoint[]) => void
  pushHistory: () => void
  undo: () => void
  redo: () => void
  setActiveTool: (id: ToolId) => void
  setZoom: (z: number) => void
  reset: () => void
}

const initialState = {
  step: 1 as AppStep,
  rawImage: null,
  imageWidth: 0,
  imageHeight: 0,
  scaleRef: null,
  scaleFactor: 0,
  contourPoints: [],
  history: [],
  historyIndex: -1,
  activeToolId: 'select' as ToolId,
  zoom: 1,
}

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,

  setStep: (step) => set({ step }),

  setImage: (rawImage, imageWidth, imageHeight) =>
    set({ rawImage, imageWidth, imageHeight }),

  setScaleRef: (scaleRef, scaleFactor) => set({ scaleRef, scaleFactor }),

  setContourPoints: (contourPoints) => set({ contourPoints }),

  pushHistory: () => {
    const { contourPoints, history, historyIndex } = get()
    const snapshot: ContourSnapshot = { points: [...contourPoints.map(p => ({ ...p }))] }
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(snapshot)
    set({ history: newHistory, historyIndex: newHistory.length - 1 })
  },

  undo: () => {
    const { history, historyIndex } = get()
    if (historyIndex <= 0) return
    const prev = history[historyIndex - 1]
    set({ contourPoints: prev.points, historyIndex: historyIndex - 1 })
  },

  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex >= history.length - 1) return
    const next = history[historyIndex + 1]
    set({ contourPoints: next.points, historyIndex: historyIndex + 1 })
  },

  setActiveTool: (activeToolId) => set({ activeToolId }),

  setZoom: (zoom) => set({ zoom }),

  reset: () => set({ ...initialState }),
}))
```

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts src/store/appStore.ts
git commit -m "feat: add shared types and Zustand app store"
```

---

## Task 4: useScale Hook

**Files:**
- Create: `src/hooks/useScale.ts`
- Create: `src/test/useScale.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/test/useScale.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { computeScaleFactor, pxToMm, mmToPx, unitToMm } from '../hooks/useScale'

describe('unitToMm', () => {
  it('converts cm to mm', () => expect(unitToMm(1, 'cm')).toBe(10))
  it('converts m to mm', () => expect(unitToMm(1, 'm')).toBe(1000))
  it('converts in to mm', () => expect(unitToMm(1, 'in')).toBeCloseTo(25.4))
  it('keeps mm as mm', () => expect(unitToMm(1, 'mm')).toBe(1))
})

describe('computeScaleFactor', () => {
  it('returns mm-per-pixel ratio', () => {
    // 100px line = 30mm  →  0.3 mm/px
    const factor = computeScaleFactor({ x: 0, y: 0 }, { x: 100, y: 0 }, 30, 'mm')
    expect(factor).toBeCloseTo(0.3)
  })

  it('handles diagonal lines correctly', () => {
    // 3-4-5 triangle: 5px diagonal = 50mm → 10 mm/px
    const factor = computeScaleFactor({ x: 0, y: 0 }, { x: 3, y: 4 }, 50, 'mm')
    expect(factor).toBeCloseTo(10)
  })
})

describe('pxToMm / mmToPx', () => {
  it('converts px to mm using factor', () => expect(pxToMm(100, 0.3)).toBeCloseTo(30))
  it('converts mm to px using factor', () => expect(mmToPx(30, 0.3)).toBeCloseTo(100))
  it('round-trips correctly', () => {
    const px = 237
    const factor = 0.42
    expect(mmToPx(pxToMm(px, factor), factor)).toBeCloseTo(px)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run src/test/useScale.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement useScale**

Create `src/hooks/useScale.ts`:
```ts
import type { ScaleUnit } from '../types'

export function unitToMm(value: number, unit: ScaleUnit): number {
  switch (unit) {
    case 'mm': return value
    case 'cm': return value * 10
    case 'm':  return value * 1000
    case 'in': return value * 25.4
  }
}

export function computeScaleFactor(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  realValue: number,
  unit: ScaleUnit,
): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const distPx = Math.sqrt(dx * dx + dy * dy)
  const distMm = unitToMm(realValue, unit)
  return distMm / distPx
}

export function pxToMm(px: number, scaleFactor: number): number {
  return px * scaleFactor
}

export function mmToPx(mm: number, scaleFactor: number): number {
  return mm / scaleFactor
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/test/useScale.test.ts
```
Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useScale.ts src/test/useScale.test.ts
git commit -m "feat: add useScale hook with px↔mm conversion helpers"
```

---

## Task 5: useHistory Hook

**Files:**
- Create: `src/hooks/useHistory.ts`
- Create: `src/test/useHistory.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/test/useHistory.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { createHistoryStack, pushSnapshot, undoStack, redoStack } from '../hooks/useHistory'
import type { ContourPoint } from '../types'

const pt = (id: string, x: number, y: number): ContourPoint =>
  ({ id, x, y, type: 'line' })

describe('createHistoryStack', () => {
  it('starts empty', () => {
    const s = createHistoryStack()
    expect(s.snapshots).toHaveLength(0)
    expect(s.index).toBe(-1)
  })
})

describe('pushSnapshot', () => {
  it('adds snapshot and advances index', () => {
    let s = createHistoryStack()
    s = pushSnapshot(s, [pt('a', 0, 0)])
    expect(s.snapshots).toHaveLength(1)
    expect(s.index).toBe(0)
  })

  it('truncates redo history on new push', () => {
    let s = createHistoryStack()
    s = pushSnapshot(s, [pt('a', 0, 0)])
    s = pushSnapshot(s, [pt('b', 1, 1)])
    s = undoStack(s)
    s = pushSnapshot(s, [pt('c', 2, 2)])
    expect(s.snapshots).toHaveLength(2)
    expect(s.index).toBe(1)
  })
})

describe('undoStack', () => {
  it('moves index back', () => {
    let s = createHistoryStack()
    s = pushSnapshot(s, [pt('a', 0, 0)])
    s = pushSnapshot(s, [pt('b', 1, 1)])
    s = undoStack(s)
    expect(s.index).toBe(0)
    expect(s.snapshots[s.index].points[0].id).toBe('a')
  })

  it('does nothing at beginning', () => {
    let s = createHistoryStack()
    s = pushSnapshot(s, [pt('a', 0, 0)])
    s = undoStack(s)
    const before = s.index
    s = undoStack(s)
    expect(s.index).toBe(before)
  })
})

describe('redoStack', () => {
  it('moves index forward after undo', () => {
    let s = createHistoryStack()
    s = pushSnapshot(s, [pt('a', 0, 0)])
    s = pushSnapshot(s, [pt('b', 1, 1)])
    s = undoStack(s)
    s = redoStack(s)
    expect(s.index).toBe(1)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/test/useHistory.test.ts
```

- [ ] **Step 3: Implement**

Create `src/hooks/useHistory.ts`:
```ts
import type { ContourPoint } from '../types'

export interface HistoryStack {
  snapshots: { points: ContourPoint[] }[]
  index: number
}

export function createHistoryStack(): HistoryStack {
  return { snapshots: [], index: -1 }
}

export function pushSnapshot(stack: HistoryStack, points: ContourPoint[]): HistoryStack {
  const snapshots = [
    ...stack.snapshots.slice(0, stack.index + 1),
    { points: points.map(p => ({ ...p })) },
  ]
  return { snapshots, index: snapshots.length - 1 }
}

export function undoStack(stack: HistoryStack): HistoryStack {
  if (stack.index <= 0) return stack
  return { ...stack, index: stack.index - 1 }
}

export function redoStack(stack: HistoryStack): HistoryStack {
  if (stack.index >= stack.snapshots.length - 1) return stack
  return { ...stack, index: stack.index + 1 }
}

export function currentPoints(stack: HistoryStack): ContourPoint[] {
  if (stack.index < 0) return []
  return stack.snapshots[stack.index].points
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npx vitest run src/test/useHistory.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useHistory.ts src/test/useHistory.test.ts
git commit -m "feat: add immutable history stack for undo/redo"
```

---

## Task 6: Image Normalize Utility

**Files:**
- Create: `src/lib/imageNormalize.ts`
- Create: `src/test/imageNormalize.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/test/imageNormalize.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { clampDimensions } from '../lib/imageNormalize'

describe('clampDimensions', () => {
  it('returns same dimensions if within limit', () => {
    expect(clampDimensions(800, 600, 4096)).toEqual({ width: 800, height: 600 })
  })

  it('scales down wide image preserving aspect ratio', () => {
    const { width, height } = clampDimensions(8192, 2048, 4096)
    expect(width).toBe(4096)
    expect(height).toBe(1024)
  })

  it('scales down tall image preserving aspect ratio', () => {
    const { width, height } = clampDimensions(1000, 8000, 4096)
    expect(width).toBe(512)
    expect(height).toBe(4096)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/test/imageNormalize.test.ts
```

- [ ] **Step 3: Implement**

Create `src/lib/imageNormalize.ts`:
```ts
const MAX_SIZE = 4096

export function clampDimensions(
  width: number,
  height: number,
  maxSize = MAX_SIZE,
): { width: number; height: number } {
  if (width <= maxSize && height <= maxSize) return { width, height }
  const ratio = Math.min(maxSize / width, maxSize / height)
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) }
}

export function normalizeImage(img: HTMLImageElement): Promise<HTMLImageElement> {
  const { width, height } = clampDimensions(img.naturalWidth, img.naturalHeight)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, width, height)
  return new Promise((resolve, reject) => {
    const out = new Image()
    out.onload = () => resolve(out)
    out.onerror = reject
    out.src = canvas.toDataURL('image/jpeg', 0.92)
  })
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npx vitest run src/test/imageNormalize.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/imageNormalize.ts src/test/imageNormalize.test.ts
git commit -m "feat: add image normalize utility (clamp to 4096px)"
```

---

## Task 7: Export — DXF

**Files:**
- Create: `src/lib/export-dxf.ts`
- Create: `src/test/export-dxf.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/test/export-dxf.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { pointsToDxf } from '../lib/export-dxf'
import type { ContourPoint } from '../types'

const pts: ContourPoint[] = [
  { id: '1', x: 0,   y: 0,   type: 'line' },
  { id: '2', x: 100, y: 0,   type: 'line' },
  { id: '3', x: 100, y: 50,  type: 'line' },
  { id: '4', x: 0,   y: 50,  type: 'line' },
]

describe('pointsToDxf', () => {
  it('returns a string containing DXF section markers', () => {
    const dxf = pointsToDxf(pts, 0.3)
    expect(dxf).toContain('SECTION')
    expect(dxf).toContain('ENTITIES')
    expect(dxf).toContain('ENDSEC')
    expect(dxf).toContain('EOF')
  })

  it('applies scaleFactor to coordinates', () => {
    // pt x=100 * factor=0.3 = 30mm
    const dxf = pointsToDxf(pts, 0.3)
    expect(dxf).toContain('30.')
  })

  it('returns empty ENTITIES for empty points array', () => {
    const dxf = pointsToDxf([], 1)
    expect(dxf).toContain('ENTITIES')
    expect(dxf).not.toContain('POLYLINE')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/test/export-dxf.test.ts
```

- [ ] **Step 3: Implement**

Create `src/lib/export-dxf.ts`:
```ts
import type { ContourPoint } from '../types'

export function pointsToDxf(points: ContourPoint[], scaleFactor: number): string {
  const lines: string[] = []

  const add = (code: number, value: string | number) => {
    lines.push(String(code))
    lines.push(String(value))
  }

  // Header
  add(0, 'SECTION')
  add(2, 'HEADER')
  add(9, '$ACADVER')
  add(1, 'AC1009')
  add(0, 'ENDSEC')

  // Entities
  add(0, 'SECTION')
  add(2, 'ENTITIES')

  if (points.length >= 2) {
    add(0, 'POLYLINE')
    add(8, '0')       // layer
    add(66, 1)        // vertices follow
    add(70, 1)        // closed polyline

    for (const pt of points) {
      add(0, 'VERTEX')
      add(8, '0')
      add(10, (pt.x * scaleFactor).toFixed(6))
      add(20, (pt.y * scaleFactor).toFixed(6))
      add(30, '0.0')
    }

    add(0, 'SEQEND')
  }

  add(0, 'ENDSEC')
  add(0, 'EOF')

  return lines.join('\n')
}

export function downloadDxf(points: ContourPoint[], scaleFactor: number, filename = 'vectorizr.dxf'): void {
  const content = pointsToDxf(points, scaleFactor)
  const blob = new Blob([content], { type: 'application/dxf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npx vitest run src/test/export-dxf.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/export-dxf.ts src/test/export-dxf.test.ts
git commit -m "feat: add DXF export with real-world mm coordinates"
```

---

## Task 8: Export — SVG + PDF

**Files:**
- Create: `src/lib/export-svg.ts`
- Create: `src/lib/export-pdf.ts`
- Create: `src/test/export-svg.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/test/export-svg.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { pointsToSvg } from '../lib/export-svg'
import type { ContourPoint } from '../types'

const pts: ContourPoint[] = [
  { id: '1', x: 0,   y: 0,  type: 'line' },
  { id: '2', x: 100, y: 0,  type: 'line' },
  { id: '3', x: 100, y: 50, type: 'line' },
]

describe('pointsToSvg', () => {
  it('returns valid SVG string', () => {
    const svg = pointsToSvg(pts, 0.3)
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
  })

  it('viewBox uses mm dimensions', () => {
    // max x=100*0.3=30, max y=50*0.3=15
    const svg = pointsToSvg(pts, 0.3)
    expect(svg).toContain('viewBox="0 0 30')
  })

  it('includes path element', () => {
    const svg = pointsToSvg(pts, 0.3)
    expect(svg).toContain('<path')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/test/export-svg.test.ts
```

- [ ] **Step 3: Implement SVG export**

Create `src/lib/export-svg.ts`:
```ts
import type { ContourPoint } from '../types'

export function pointsToSvg(points: ContourPoint[], scaleFactor: number): string {
  if (points.length < 2) return '<svg xmlns="http://www.w3.org/2000/svg"></svg>'

  const scaled = points.map(p => ({ x: p.x * scaleFactor, y: p.y * scaleFactor, type: p.type, handles: p.handles }))
  const maxX = Math.max(...scaled.map(p => p.x))
  const maxY = Math.max(...scaled.map(p => p.y))
  const w = maxX.toFixed(3)
  const h = maxY.toFixed(3)

  let d = `M ${scaled[0].x.toFixed(3)} ${scaled[0].y.toFixed(3)}`
  for (let i = 1; i < scaled.length; i++) {
    const p = scaled[i]
    if (p.type === 'bezier' && p.handles) {
      const cp1x = (p.handles.cp1.x * scaleFactor).toFixed(3)
      const cp1y = (p.handles.cp1.y * scaleFactor).toFixed(3)
      const cp2x = (p.handles.cp2.x * scaleFactor).toFixed(3)
      const cp2y = (p.handles.cp2.y * scaleFactor).toFixed(3)
      d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p.x.toFixed(3)} ${p.y.toFixed(3)}`
    } else {
      d += ` L ${p.x.toFixed(3)} ${p.y.toFixed(3)}`
    }
  }
  d += ' Z'

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm">
  <path d="${d}" fill="none" stroke="#000000" stroke-width="0.5"/>
</svg>`
}

export function downloadSvg(points: ContourPoint[], scaleFactor: number, filename = 'vectorizr.svg'): void {
  const content = pointsToSvg(points, scaleFactor)
  const blob = new Blob([content], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 4: Implement PDF export**

Create `src/lib/export-pdf.ts`:
```ts
import { jsPDF } from 'jspdf'
import type { ContourPoint } from '../types'

export function downloadPdf(points: ContourPoint[], scaleFactor: number, filename = 'vectorizr.pdf'): void {
  if (points.length < 2) return

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 15
  const scaled = points.map(p => ({
    x: p.x * scaleFactor + margin,
    y: p.y * scaleFactor + margin,
    type: p.type,
    handles: p.handles,
  }))

  doc.setDrawColor(0)
  doc.setLineWidth(0.3)

  // Draw lines between points
  for (let i = 0; i < scaled.length; i++) {
    const curr = scaled[i]
    const next = scaled[(i + 1) % scaled.length]
    doc.line(curr.x, curr.y, next.x, next.y)
  }

  doc.save(filename)
}
```

- [ ] **Step 5: Run SVG tests — expect PASS**

```bash
npx vitest run src/test/export-svg.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/export-svg.ts src/lib/export-pdf.ts src/test/export-svg.test.ts
git commit -m "feat: add SVG and PDF export utilities"
```

---

## Task 9: OpenCV Web Worker

**Files:**
- Create: `src/workers/opencv.worker.ts`
- Create: `public/opencv.js` ← downloaded from CDN

- [ ] **Step 1: Download OpenCV.js**

```bash
curl -L "https://docs.opencv.org/4.8.0/opencv.js" -o public/opencv.js
```
Expected: `public/opencv.js` created (~9 MB).

- [ ] **Step 2: Create the worker**

Create `src/workers/opencv.worker.ts`:
```ts
/// <reference lib="webworker" />

declare const cv: any

let opencvReady = false

// Load OpenCV.js inside the worker
self.importScripts('/opencv.js')

;(self as any).Module = {
  onRuntimeInitialized() {
    opencvReady = true
    self.postMessage({ type: 'ready' })
  },
}

export interface DetectEdgesRequest {
  type: 'detect'
  imageData: ImageData
  threshold1: number
  threshold2: number
}

export interface DetectEdgesResponse {
  type: 'contour'
  points: { x: number; y: number }[]
}

self.addEventListener('message', (e: MessageEvent<DetectEdgesRequest>) => {
  if (!opencvReady || e.data.type !== 'detect') return

  const { imageData, threshold1, threshold2 } = e.data

  // Load ImageData into OpenCV Mat
  const src = cv.matFromImageData(imageData)
  const gray = new cv.Mat()
  const edges = new cv.Mat()
  const contours = new cv.MatVector()
  const hierarchy = new cv.Mat()

  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
  cv.Canny(gray, edges, threshold1, threshold2)
  cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

  // Pick the largest contour
  let largest = 0
  let largestIdx = -1
  for (let i = 0; i < contours.size(); i++) {
    const area = cv.contourArea(contours.get(i))
    if (area > largest) { largest = area; largestIdx = i }
  }

  const points: { x: number; y: number }[] = []
  if (largestIdx >= 0) {
    const contour = contours.get(largestIdx)
    // Approximate to reduce point count
    const approx = new cv.Mat()
    const epsilon = 0.005 * cv.arcLength(contour, true)
    cv.approxPolyDP(contour, approx, epsilon, true)
    for (let i = 0; i < approx.rows; i++) {
      points.push({ x: approx.data32S[i * 2], y: approx.data32S[i * 2 + 1] })
    }
    approx.delete()
  }

  src.delete(); gray.delete(); edges.delete(); contours.delete(); hierarchy.delete()

  const response: DetectEdgesResponse = { type: 'contour', points }
  self.postMessage(response)
})
```

- [ ] **Step 3: Commit**

```bash
git add src/workers/opencv.worker.ts public/opencv.js
git commit -m "feat: add OpenCV.js Canny edge detection Web Worker"
```

---

## Task 10: Layout Components

**Files:**
- Create: `src/components/layout/Header.tsx`
- Create: `src/components/layout/HamburgerMenu.tsx`
- Create: `src/components/layout/StepBar.tsx`
- Create: `src/components/layout/RotatePrompt.tsx`
- Create: `src/hooks/useOrientation.ts`

- [ ] **Step 1: useOrientation hook**

Create `src/hooks/useOrientation.ts`:
```ts
import { useEffect, useState } from 'react'

export function useOrientation(): 'portrait' | 'landscape' {
  const getOrientation = () =>
    window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape'

  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(getOrientation)

  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)')
    const handler = () => setOrientation(getOrientation())
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return orientation
}
```

- [ ] **Step 2: RotatePrompt**

Create `src/components/layout/RotatePrompt.tsx`:
```tsx
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
```

- [ ] **Step 3: StepBar**

Create `src/components/layout/StepBar.tsx`:
```tsx
import { useAppStore } from '../../store/appStore'

const STEPS = ['Cargar', 'Escala', 'Vectorizar', 'Editar']

export function StepBar() {
  const step = useAppStore(s => s.step)
  return (
    <div className="flex items-center gap-1 px-4">
      {STEPS.map((label, i) => {
        const n = i + 1
        const isActive = n === step
        const isDone = n < step
        return (
          <div key={n} className="flex items-center gap-1">
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: isDone ? 'var(--color-success)' : isActive ? 'var(--color-primary)' : 'var(--color-surface-2)',
              border: `1px solid ${isActive ? 'var(--color-primary)' : 'var(--glass-border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', fontWeight: 700, color: 'white',
            }}>
              {isDone ? '✓' : n}
            </div>
            <span style={{
              fontSize: '0.7rem',
              color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)',
              display: 'none',
            }} className="sm:block">{label}</span>
            {i < 3 && <div style={{ width: 16, height: 1, background: 'var(--glass-border)' }} />}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Header + HamburgerMenu**

Create `src/components/layout/HamburgerMenu.tsx`:
```tsx
import { useState } from 'react'

export function HamburgerMenu() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Menú"
        style={{
          background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-sm)', padding: '8px', cursor: 'pointer', color: 'white',
        }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
          <rect y="2" width="18" height="2" rx="1"/>
          <rect y="8" width="18" height="2" rx="1"/>
          <rect y="14" width="18" height="2" rx="1"/>
        </svg>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div className="glass" style={{
            position: 'fixed', top: 52, right: 12, zIndex: 50,
            minWidth: 200, padding: '0.75rem 0',
          }}>
            <a href="https://ptetoolbox.netlify.app" target="_blank" rel="noreferrer"
              style={{ display: 'block', padding: '0.6rem 1.25rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              ← Volver al Toolbox
            </a>
          </div>
        </>
      )}
    </>
  )
}
```

Create `src/components/layout/Header.tsx`:
```tsx
import { StepBar } from './StepBar'
import { HamburgerMenu } from './HamburgerMenu'

export function Header() {
  return (
    <header style={{
      height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 12px', borderBottom: '1px solid var(--glass-border)',
      background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)',
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.5px' }}>VectoriZr</span>
        <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
          R&D Engineering
        </span>
      </div>
      <StepBar />
      <HamburgerMenu />
    </header>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/ src/hooks/useOrientation.ts
git commit -m "feat: add Header, StepBar, HamburgerMenu, RotatePrompt"
```

---

## Task 11: UI Primitives

**Files:**
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/Modal.tsx`
- Create: `src/components/ui/Slider.tsx`
- Create: `src/components/ui/Toast.tsx`

- [ ] **Step 1: Button**

Create `src/components/ui/Button.tsx`:
```tsx
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
```

- [ ] **Step 2: Modal**

Create `src/components/ui/Modal.tsx`:
```tsx
import { ReactNode } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
}

export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />
      <div className="glass" style={{ position: 'relative', padding: '1.5rem', minWidth: 320, maxWidth: '90vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Slider**

Create `src/components/ui/Slider.tsx`:
```tsx
interface SliderProps {
  label: string
  min: number
  max: number
  value: number
  onChange: (v: number) => void
}

export function Slider({ label, min, max, value, onChange }: SliderProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--color-primary)' }} />
    </div>
  )
}
```

- [ ] **Step 4: Toast**

Create `src/components/ui/Toast.tsx`:
```tsx
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
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/
git commit -m "feat: add Button, Modal, Slider, Toast UI primitives"
```

---

## Task 12: Step 1 — Upload Image

**Files:**
- Create: `src/components/steps/Step1Upload.tsx`

- [ ] **Step 1: Implement**

Create `src/components/steps/Step1Upload.tsx`:
```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/steps/Step1Upload.tsx
git commit -m "feat: Step 1 — upload image via file or camera"
```

---

## Task 13: Step 2 — Define Scale

**Files:**
- Create: `src/components/steps/Step2Scale.tsx`

- [ ] **Step 1: Implement**

Create `src/components/steps/Step2Scale.tsx`:
```tsx
import { useRef, useState, MouseEvent } from 'react'
import { useAppStore } from '../../store/appStore'
import { computeScaleFactor } from '../../hooks/useScale'
import { Button } from '../ui/Button'
import type { ScaleUnit } from '../../types'

export function Step2Scale() {
  const { rawImage, imageWidth, imageHeight, setScaleRef, setStep } = useAppStore(s => ({
    rawImage: s.rawImage, imageWidth: s.imageWidth, imageHeight: s.imageHeight,
    setScaleRef: s.setScaleRef, setStep: s.setStep,
  }))

  const containerRef = useRef<HTMLDivElement>(null)
  const [p1, setP1] = useState<{ x: number; y: number } | null>(null)
  const [p2, setP2] = useState<{ x: number; y: number } | null>(null)
  const [realValue, setRealValue] = useState('')
  const [unit, setUnit] = useState<ScaleUnit>('cm')

  function getImageCoords(e: MouseEvent): { x: number; y: number } {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const scaleX = imageWidth / rect.width
    const scaleY = imageHeight / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  function handleClick(e: MouseEvent) {
    const coords = getImageCoords(e)
    if (!p1) { setP1(coords); return }
    if (!p2) { setP2(coords); return }
    setP1(coords); setP2(null)
  }

  function confirm() {
    if (!p1 || !p2 || !realValue) return
    const val = parseFloat(realValue)
    if (isNaN(val) || val <= 0) return
    const factor = computeScaleFactor(p1, p2, val, unit)
    setScaleRef({ p1, p2, realValue: val, unit }, factor)
    setStep(3)
  }

  const bothPoints = p1 && p2

  // Compute display positions as percentage for the overlay dots/line
  function toPercent(pt: { x: number; y: number }) {
    return { left: `${(pt.x / imageWidth) * 100}%`, top: `${(pt.y / imageHeight) * 100}%` }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: '1px solid var(--glass-border)', flexShrink: 0 }}>
        <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>← Volver</button>
        <span style={{ fontWeight: 600 }}>
          {!p1 ? 'Haz clic en el primer punto de referencia' : !p2 ? 'Haz clic en el segundo punto' : '¿Cuánto mide esa distancia?'}
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Image canvas area */}
        <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: 'crosshair' }}
          onClick={handleClick}>
          {rawImage && (
            <img src={rawImage.src} alt="referencia"
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', userSelect: 'none' }} />
          )}
          {p1 && (
            <div style={{ position: 'absolute', ...toPercent(p1), transform: 'translate(-50%,-50%)',
              width: 12, height: 12, borderRadius: '50%', background: 'var(--color-rose)',
              border: '2px solid white', pointerEvents: 'none' }} />
          )}
          {p2 && (
            <div style={{ position: 'absolute', ...toPercent(p2), transform: 'translate(-50%,-50%)',
              width: 12, height: 12, borderRadius: '50%', background: 'var(--color-rose)',
              border: '2px solid white', pointerEvents: 'none' }} />
          )}
        </div>

        {/* Right panel */}
        {bothPoints && (
          <div className="glass" style={{ width: 200, padding: '1rem', display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0, borderRadius: 0 }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Medida real de la línea marcada</p>
            <input
              type="number" min="0" step="any" placeholder="Ej: 30"
              value={realValue} onChange={e => setRealValue(e.target.value)}
              style={{ background: 'var(--color-surface)', border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-sm)', padding: '8px', color: 'white', width: '100%' }} />
            <select value={unit} onChange={e => setUnit(e.target.value as ScaleUnit)}
              style={{ background: 'var(--color-surface)', border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-sm)', padding: '8px', color: 'white' }}>
              <option value="mm">mm</option>
              <option value="cm">cm</option>
              <option value="m">m</option>
              <option value="in">pulgadas</option>
            </select>
            <Button onClick={confirm} disabled={!realValue}>Confirmar escala</Button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/steps/Step2Scale.tsx
git commit -m "feat: Step 2 — two-point scale definition with real-world units"
```

---

## Task 14: Step 3 — Vectorize

**Files:**
- Create: `src/components/steps/Step3Vectorize.tsx`

- [ ] **Step 1: Implement**

Create `src/components/steps/Step3Vectorize.tsx`:
```tsx
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

  // Init worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('../../workers/opencv.worker.ts', import.meta.url), { type: 'module' })
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
    workerRef.current.postMessage({ type: 'detect', imageData: getImageData(), threshold1, threshold2 })
  }

  // Draw preview on canvas
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
      ctx.strokeStyle = 'var(--color-primary)'
      ctx.lineWidth = 2
      ctx.stroke()
    }
    pts.forEach(p => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
      ctx.fillStyle = 'var(--color-rose)'
      ctx.fill()
    })
  }, [detectedPoints, manualPoints, mode, rawImage])

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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '2rem', padding: '2rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>¿Cómo quieres vectorizar?</h1>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { icon: '🤖', title: 'Detección automática', desc: 'La app detecta los bordes. Tú corriges los puntos.', action: () => { setMode('auto'); runDetection() } },
            { icon: '✏️', title: 'Trazado manual', desc: 'Haz clic para colocar cada punto del contorno.', action: () => setMode('manual') },
          ].map(opt => (
            <div key={opt.title} className="glass" onClick={opt.action}
              style={{ padding: '2rem', textAlign: 'center', cursor: 'pointer', maxWidth: 220,
                border: '1px solid var(--glass-border)', transition: 'border-color 0.2s' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{opt.icon}</div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>{opt.title}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{opt.desc}</p>
            </div>
          ))}
        </div>
        <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>← Volver</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <canvas ref={canvasRef}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block',
            cursor: mode === 'manual' ? 'crosshair' : 'default' }}
          onClick={handleCanvasClick} />
        {detecting && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
            <span style={{ color: 'white' }}>Detectando bordes…</span>
          </div>
        )}
      </div>

      {/* Right panel */}
      <div className="glass" style={{ width: 200, padding: '1rem', display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0, borderRadius: 0 }}>
        {mode === 'auto' && (
          <>
            <Slider label="Umbral bajo" min={10} max={200} value={threshold1} onChange={setThreshold1} />
            <Slider label="Umbral alto" min={50} max={400} value={threshold2} onChange={setThreshold2} />
            <Button variant="ghost" onClick={runDetection} disabled={detecting}>Volver a detectar</Button>
            <Button onClick={confirmAuto} disabled={detectedPoints.length < 3}>Confirmar</Button>
          </>
        )}
        {mode === 'manual' && (
          <>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              Haz clic para agregar puntos. Haz clic sobre el primer punto para cerrar el contorno.
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Puntos: {manualPoints.length}</p>
            <Button variant="ghost" onClick={() => setManualPoints(pts => pts.slice(0, -1))}>Deshacer último</Button>
            <Button onClick={confirmManual} disabled={manualPoints.length < 3}>Confirmar</Button>
          </>
        )}
        <button onClick={() => { setMode('choose'); setDetectedPoints([]); setManualPoints([]) }}
          style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.8rem', marginTop: 'auto' }}>
          ← Cambiar modo
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/steps/Step3Vectorize.tsx
git commit -m "feat: Step 3 — auto (OpenCV Canny) and manual vectorization modes"
```

---

## Task 15: Step 4 — Editor

**Files:**
- Create: `src/components/editor/Toolbar.tsx`
- Create: `src/components/editor/PropertiesPanel.tsx`
- Create: `src/components/editor/StatusBar.tsx`
- Create: `src/components/editor/EditorCanvas.tsx`
- Create: `src/components/steps/Step4Editor.tsx`

- [ ] **Step 1: Toolbar**

Create `src/components/editor/Toolbar.tsx`:
```tsx
import { useAppStore } from '../../store/appStore'
import type { ToolId } from '../../types'

const TOOLS: { id: ToolId; icon: string; label: string }[] = [
  { id: 'select',      icon: '↖', label: 'Seleccionar' },
  { id: 'edit-point',  icon: '✎', label: 'Editar punto' },
  { id: 'segment-type',icon: '⌒', label: 'Tipo segmento' },
  { id: 'add-point',   icon: '+', label: 'Agregar punto' },
  { id: 'delete-point',icon: '−', label: 'Eliminar punto' },
  { id: 'zoom',        icon: '🔍', label: 'Zoom' },
]

export function Toolbar() {
  const { activeToolId, setActiveTool, undo, redo } = useAppStore(s => ({
    activeToolId: s.activeToolId, setActiveTool: s.setActiveTool,
    undo: s.undo, redo: s.redo,
  }))

  return (
    <div style={{ width: 44, background: 'var(--color-surface)', borderRight: '1px solid var(--glass-border)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 0' }}>
      {TOOLS.map(t => (
        <button key={t.id} title={t.label} onClick={() => setActiveTool(t.id)}
          style={{
            width: 32, height: 32, borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
            background: activeToolId === t.id ? 'var(--color-primary)' : 'transparent',
            color: activeToolId === t.id ? 'white' : 'var(--color-text-muted)',
            fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          {t.icon}
        </button>
      ))}
      <div style={{ flex: 1 }} />
      <button title="Deshacer" onClick={undo}
        style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
          background: 'transparent', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>↺</button>
      <button title="Rehacer" onClick={redo}
        style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
          background: 'transparent', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>↻</button>
    </div>
  )
}
```

- [ ] **Step 2: PropertiesPanel**

Create `src/components/editor/PropertiesPanel.tsx`:
```tsx
import { useAppStore } from '../../store/appStore'
import { pxToMm } from '../../hooks/useScale'
import type { SegmentType } from '../../types'

interface Props { selectedId: string | null; onSegmentTypeChange: (id: string, type: SegmentType) => void }

export function PropertiesPanel({ selectedId, onSegmentTypeChange }: Props) {
  const { contourPoints, scaleFactor } = useAppStore(s => ({ contourPoints: s.contourPoints, scaleFactor: s.scaleFactor }))
  const pt = contourPoints.find(p => p.id === selectedId)

  const totalLength = contourPoints.reduce((acc, curr, i) => {
    const next = contourPoints[(i + 1) % contourPoints.length]
    const dx = next.x - curr.x
    const dy = next.y - curr.y
    return acc + Math.sqrt(dx * dx + dy * dy)
  }, 0)

  return (
    <div style={{ width: 180, background: 'var(--color-surface)', borderLeft: '1px solid var(--glass-border)',
      padding: '1rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--color-text-muted)', marginBottom: 6 }}>
          {pt ? 'Punto seleccionado' : 'Sin selección'}
        </p>
        {pt ? (
          <>
            <p style={{ fontSize: '0.8rem' }}>X: {pxToMm(pt.x, scaleFactor).toFixed(2)} mm</p>
            <p style={{ fontSize: '0.8rem' }}>Y: {pxToMm(pt.y, scaleFactor).toFixed(2)} mm</p>
          </>
        ) : (
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Selecciona un punto para ver sus propiedades.</p>
        )}
      </div>
      {pt && (
        <div>
          <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--color-text-muted)', marginBottom: 6 }}>Segmento</p>
          <select value={pt.type} onChange={e => onSegmentTypeChange(pt.id, e.target.value as SegmentType)}
            style={{ background: 'var(--color-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', color: 'white', width: '100%', fontSize: '0.8rem' }}>
            <option value="line">Línea recta</option>
            <option value="bezier">Bezier</option>
          </select>
        </div>
      )}
      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--glass-border)', paddingTop: 12 }}>
        <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Total: {contourPoints.length} pts</p>
        <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
          Longitud: {pxToMm(totalLength, scaleFactor).toFixed(1)} mm
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: StatusBar**

Create `src/components/editor/StatusBar.tsx`:
```tsx
import { useAppStore } from '../../store/appStore'

export function StatusBar() {
  const { scaleFactor, zoom, activeToolId, contourPoints } = useAppStore(s => ({
    scaleFactor: s.scaleFactor, zoom: s.zoom, activeToolId: s.activeToolId, contourPoints: s.contourPoints,
  }))

  return (
    <div style={{ height: 28, background: 'var(--color-surface)', borderTop: '1px solid var(--glass-border)',
      display: 'flex', alignItems: 'center', gap: 20, padding: '0 12px',
      fontSize: '0.7rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>
      <span>Escala: 1px = {scaleFactor.toFixed(4)} mm</span>
      <span>Zoom: {Math.round(zoom * 100)}%</span>
      <span>Herramienta: {activeToolId}</span>
      <span>Puntos: {contourPoints.length}</span>
    </div>
  )
}
```

- [ ] **Step 4: EditorCanvas**

Create `src/components/editor/EditorCanvas.tsx`:
```tsx
import { useRef, useState, useEffect } from 'react'
import { Stage, Layer, Image as KImage, Line, Circle } from 'react-konva'
import { useAppStore } from '../../store/appStore'
import type { ContourPoint } from '../../types'

interface Props {
  selectedId: string | null
  onSelect: (id: string | null) => void
  onPointMove: (id: string, x: number, y: number) => void
  onAddPoint: (x: number, y: number) => void
  onDeletePoint: (id: string) => void
}

export function EditorCanvas({ selectedId, onSelect, onPointMove, onAddPoint, onDeletePoint }: Props) {
  const { rawImage, imageWidth, imageHeight, contourPoints, activeToolId, zoom, setZoom } = useAppStore(s => ({
    rawImage: s.rawImage, imageWidth: s.imageWidth, imageHeight: s.imageHeight,
    contourPoints: s.contourPoints, activeToolId: s.activeToolId, zoom: s.zoom, setZoom: s.setZoom,
  }))

  const containerRef = useRef<HTMLDivElement>(null)
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setStageSize({ width: el.clientWidth, height: el.clientHeight }))
    ro.observe(el)
    setStageSize({ width: el.clientWidth, height: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  const flatPoints = contourPoints.length > 1
    ? [...contourPoints.flatMap(p => [p.x * zoom, p.y * zoom]), contourPoints[0].x * zoom, contourPoints[0].y * zoom]
    : []

  function handleStageClick(e: any) {
    if (activeToolId === 'select' || activeToolId === 'edit-point') {
      if (e.target === e.target.getStage()) onSelect(null)
    }
    if (activeToolId === 'add-point') {
      const pos = e.target.getStage().getPointerPosition()
      onAddPoint(pos.x / zoom, pos.y / zoom)
    }
  }

  function handleWheel(e: any) {
    e.evt.preventDefault()
    const delta = e.evt.deltaY > 0 ? 0.9 : 1.1
    setZoom(Math.min(5, Math.max(0.1, zoom * delta)))
  }

  return (
    <div ref={containerRef} style={{ flex: 1, overflow: 'hidden', background: '#f0f0e8', position: 'relative' }}>
      <Stage width={stageSize.width} height={stageSize.height}
        onClick={handleStageClick} onWheel={handleWheel}>
        <Layer>
          {rawImage && (
            <KImage image={rawImage} width={imageWidth * zoom} height={imageHeight * zoom} />
          )}
          {flatPoints.length > 0 && (
            <Line points={flatPoints} stroke="#4a7eff" strokeWidth={2} closed />
          )}
          {contourPoints.map(pt => (
            <Circle
              key={pt.id}
              x={pt.x * zoom} y={pt.y * zoom}
              radius={selectedId === pt.id ? 7 : 5}
              fill={selectedId === pt.id ? 'var(--color-orange)' : 'white'}
              stroke={selectedId === pt.id ? 'var(--color-orange)' : '#4a7eff'}
              strokeWidth={2}
              draggable={activeToolId === 'select' || activeToolId === 'edit-point'}
              onClick={(e) => {
                e.cancelBubble = true
                if (activeToolId === 'delete-point') { onDeletePoint(pt.id); return }
                onSelect(pt.id)
              }}
              onDragEnd={(e) => onPointMove(pt.id, e.target.x() / zoom, e.target.y() / zoom)}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  )
}
```

- [ ] **Step 5: Step4Editor**

Create `src/components/steps/Step4Editor.tsx`:
```tsx
import { useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { EditorCanvas } from '../editor/EditorCanvas'
import { Toolbar } from '../editor/Toolbar'
import { PropertiesPanel } from '../editor/PropertiesPanel'
import { StatusBar } from '../editor/StatusBar'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { downloadDxf } from '../../lib/export-dxf'
import { downloadSvg } from '../../lib/export-svg'
import { downloadPdf } from '../../lib/export-pdf'
import type { SegmentType, ContourPoint } from '../../types'

export function Step4Editor() {
  const { contourPoints, scaleFactor, setContourPoints, pushHistory, setStep } = useAppStore(s => ({
    contourPoints: s.contourPoints, scaleFactor: s.scaleFactor,
    setContourPoints: s.setContourPoints, pushHistory: s.pushHistory, setStep: s.setStep,
  }))

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showExport, setShowExport] = useState(false)

  function updatePoint(id: string, x: number, y: number) {
    const updated = contourPoints.map(p => p.id === id ? { ...p, x, y } : p)
    setContourPoints(updated)
    pushHistory()
  }

  function addPoint(x: number, y: number) {
    const newPt: ContourPoint = { id: Date.now().toString(), x, y, type: 'line' }
    setContourPoints([...contourPoints, newPt])
    pushHistory()
  }

  function deletePoint(id: string) {
    setContourPoints(contourPoints.filter(p => p.id !== id))
    pushHistory()
    if (selectedId === id) setSelectedId(null)
  }

  function changeSegmentType(id: string, type: SegmentType) {
    const updated = contourPoints.map(p => p.id === id ? { ...p, type } : p)
    setContourPoints(updated)
    pushHistory()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top bar */}
      <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px', borderBottom: '1px solid var(--glass-border)', flexShrink: 0,
        background: 'var(--color-surface)' }}>
        <button onClick={() => setStep(3)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.875rem' }}>← Paso 3</button>
        <Button onClick={() => setShowExport(true)}>↓ Exportar</Button>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Toolbar />
        <EditorCanvas
          selectedId={selectedId}
          onSelect={setSelectedId}
          onPointMove={updatePoint}
          onAddPoint={addPoint}
          onDeletePoint={deletePoint}
        />
        <PropertiesPanel selectedId={selectedId} onSegmentTypeChange={changeSegmentType} />
      </div>

      <StatusBar />

      {showExport && (
        <Modal title="Exportar" onClose={() => setShowExport(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Button onClick={() => { downloadDxf(contourPoints, scaleFactor); setShowExport(false) }}>
              📐 DXF (AutoCAD / CNC)
            </Button>
            <Button variant="ghost" onClick={() => { downloadSvg(contourPoints, scaleFactor); setShowExport(false) }}>
              🖼 SVG
            </Button>
            <Button variant="ghost" onClick={() => { downloadPdf(contourPoints, scaleFactor); setShowExport(false) }}>
              📄 PDF
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/editor/ src/components/steps/Step4Editor.tsx
git commit -m "feat: Step 4 — full vector editor with Konva.js and export modal"
```

---

## Task 16: App Root + Router

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Wire up App.tsx**

Replace `src/App.tsx`:
```tsx
import { useAppStore } from './store/appStore'
import { Header } from './components/layout/Header'
import { RotatePrompt } from './components/layout/RotatePrompt'
import { Step1Upload } from './components/steps/Step1Upload'
import { Step2Scale } from './components/steps/Step2Scale'
import { Step3Vectorize } from './components/steps/Step3Vectorize'
import { Step4Editor } from './components/steps/Step4Editor'
import { useOrientation } from './hooks/useOrientation'

export default function App() {
  const step = useAppStore(s => s.step)
  const orientation = useOrientation()
  const showRotate = orientation === 'portrait' && step >= 3

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
```

- [ ] **Step 2: Update main.tsx**

Replace `src/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 3: Full build check**

```bash
npm run build
```
Expected: Build completes with no TypeScript errors. Output in `dist/`.

- [ ] **Step 4: Smoke test in dev**

```bash
npm run dev
```
Open http://localhost:5173. Verify: header shows, StepBar shows step 1 active, upload screen appears.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/main.tsx
git commit -m "feat: wire up app root with step router and orientation guard"
```

---

## Task 17: Keyboard Shortcuts

**Files:**
- Create: `src/hooks/useKeyboardShortcuts.ts`

- [ ] **Step 1: Implement**

Create `src/hooks/useKeyboardShortcuts.ts`:
```ts
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
```

- [ ] **Step 2: Add to App.tsx**

In `src/App.tsx`, add at top of `App()` function body:
```tsx
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

// inside App():
useKeyboardShortcuts()
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useKeyboardShortcuts.ts src/App.tsx
git commit -m "feat: add Ctrl+Z / Ctrl+Y keyboard shortcuts for undo/redo"
```

---

## Task 18: Run Full Test Suite

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```
Expected: All tests PASS. If any fail, fix the implementation (not the tests).

- [ ] **Step 2: Build for production**

```bash
npm run build
```
Expected: No errors. `dist/` folder created.

- [ ] **Step 3: Preview production build locally**

```bash
npm run preview
```
Open http://localhost:4173. Walk through all 4 steps manually to verify the full flow works.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final polish — all tests pass, production build verified"
```

---

## Task 19: Deploy to Netlify

- [ ] **Step 1: Push to GitHub**

```bash
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin master
```

- [ ] **Step 2: Connect repo in Netlify**

1. Go to https://app.netlify.com → New site from Git
2. Select your repo
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Click Deploy

- [ ] **Step 3: Verify PWA install prompt**

Open the Netlify URL in Chrome on mobile (landscape). Verify the "Add to home screen" / install prompt appears.

- [ ] **Step 4: Verify offline**

Open app, then go offline (airplane mode). Refresh. App should still load from service worker cache.

---

## Self-Review

**Spec coverage:**
- ✅ Paso 1: Cargar imagen — Task 12 (upload + camera + drag/drop + normalize)
- ✅ Paso 2: Definir escala — Task 13 (two-point, real units, factor computation)
- ✅ Paso 3: Vectorizar — Task 14 (auto OpenCV + manual click)
- ✅ Paso 4: Editar — Task 15 (Konva canvas, all 7 tools, properties panel)
- ✅ Exportar DXF/SVG/PDF — Tasks 7, 8, 15
- ✅ Glassmorphism + tokens CSS — Tasks 2
- ✅ Header + hamburger + StepBar — Task 10
- ✅ RotatePrompt portrait — Task 10, Task 16
- ✅ PWA install + offline — Task 1 (vite-plugin-pwa), Task 19
- ✅ Undo/redo Ctrl+Z — Tasks 5, 17
- ✅ Paleta de colores completa — Task 2 (tokens)
- ✅ Español mexicano — UI text in all components

**Type consistency check:**
- `ContourPoint.type: SegmentType` — defined in Task 3, used consistently in Tasks 8, 14, 15
- `scaleFactor: number` (mm/px) — computed in Task 4, stored in Task 3, applied in Tasks 7, 8, 9, 15
- `useAppStore` — all components import from `../../store/appStore` (same path)
- `ToolId` union — defined in Task 3, used in Toolbar (Task 15) and store (Task 3)

**No placeholders found.**
