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
