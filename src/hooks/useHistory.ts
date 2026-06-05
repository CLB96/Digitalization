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
