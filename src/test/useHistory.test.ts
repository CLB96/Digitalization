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
