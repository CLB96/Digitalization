import { create } from 'zustand'
import type { AppStep, ContourPoint, ContourSnapshot, ScaleRef, ToolId } from '../types'

interface AppState {
  step: AppStep
  rawImage: HTMLImageElement | null
  imageWidth: number
  imageHeight: number
  scaleRef: ScaleRef | null
  scaleFactor: number
  /** Active (currently editable) path */
  contourPoints: ContourPoint[]
  /** Finalized separate paths (each is an independent closed/open contour) */
  paths: ContourPoint[][]
  history: ContourSnapshot[]
  historyIndex: number
  activeToolId: ToolId
  zoom: number
  stagePos: { x: number; y: number }

  setStep: (step: AppStep) => void
  setImage: (img: HTMLImageElement, w: number, h: number) => void
  setScaleRef: (ref: ScaleRef, factor: number) => void
  setContourPoints: (points: ContourPoint[]) => void
  /** Finalize current active path and start a new empty one */
  addNewPath: () => void
  /** Remove a finalized path by index */
  removePathAt: (index: number) => void
  /** Replace all paths and active contour at once */
  setPaths: (paths: ContourPoint[][], active?: ContourPoint[]) => void
  pushHistory: () => void
  undo: () => void
  redo: () => void
  setActiveTool: (id: ToolId) => void
  setZoom: (z: number) => void
  setStagePos: (pos: { x: number; y: number }) => void
  exported: boolean
  setExported: (v: boolean) => void
  reset: () => void
}

const initialState = {
  step: 1 as AppStep,
  rawImage: null,
  imageWidth: 0,
  imageHeight: 0,
  scaleRef: null,
  scaleFactor: 0,
  contourPoints: [] as ContourPoint[],
  paths: [] as ContourPoint[][],
  history: [] as ContourSnapshot[],
  historyIndex: -1,
  activeToolId: 'select' as ToolId,
  zoom: 1,
  stagePos: { x: 0, y: 0 },
  exported: false,
}

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,

  setStep: (step) => set({ step }),

  setImage: (rawImage, imageWidth, imageHeight) =>
    set({ rawImage, imageWidth, imageHeight }),

  setScaleRef: (scaleRef, scaleFactor) => set({ scaleRef, scaleFactor }),

  setContourPoints: (contourPoints) => set({ contourPoints }),

  addNewPath: () => {
    const { contourPoints, paths } = get()
    if (contourPoints.length < 2) return
    set({
      paths: [...paths, contourPoints.map(p => ({ ...p }))],
      contourPoints: [],
      history: [],
      historyIndex: -1,
    })
  },

  removePathAt: (index) => {
    const { paths } = get()
    set({ paths: paths.filter((_, i) => i !== index) })
  },

  setPaths: (paths, active = []) => set({ paths, contourPoints: active }),

  pushHistory: () => {
    const { contourPoints, history, historyIndex } = get()
    const snapshot: ContourSnapshot = { points: contourPoints.map(p => ({ ...p })) }
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(snapshot)
    set({ history: newHistory, historyIndex: newHistory.length - 1 })
  },

  undo: () => {
    const { history, historyIndex } = get()
    if (historyIndex <= 0) return
    set({ contourPoints: history[historyIndex - 1].points, historyIndex: historyIndex - 1 })
  },

  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex >= history.length - 1) return
    set({ contourPoints: history[historyIndex + 1].points, historyIndex: historyIndex + 1 })
  },

  setActiveTool: (activeToolId) => set({ activeToolId }),

  setZoom: (zoom) => set({ zoom }),

  setStagePos: (stagePos) => set({ stagePos }),

  setExported: (exported) => set({ exported }),

  reset: () => set({ ...initialState }),
}))
