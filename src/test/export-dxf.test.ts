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
    const dxf = pointsToDxf(pts, 0.3)
    expect(dxf).toContain('30.')
  })
  it('returns empty ENTITIES for empty points array', () => {
    const dxf = pointsToDxf([], 1)
    expect(dxf).toContain('ENTITIES')
    expect(dxf).not.toContain('POLYLINE')
  })
  it('includes extra paths as separate POLYLINE entities', () => {
    const extra: ContourPoint[] = [
      { id: 'a', x: 10, y: 10, type: 'line' },
      { id: 'b', x: 20, y: 10, type: 'line' },
      { id: 'c', x: 20, y: 20, type: 'line' },
    ]
    const dxf = pointsToDxf(pts, 0.3, [extra])
    // Should have two POLYLINE entries
    expect(dxf.split('POLYLINE').length - 1).toBe(2)
  })
})
