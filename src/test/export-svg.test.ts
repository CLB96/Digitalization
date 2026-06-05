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
    const svg = pointsToSvg(pts, 0.3)
    expect(svg).toContain('viewBox="0 0 30')
  })
  it('includes path element', () => {
    const svg = pointsToSvg(pts, 0.3)
    expect(svg).toContain('<path')
  })
  it('includes multiple path elements for extra paths', () => {
    const extra: ContourPoint[] = [
      { id: 'a', x: 10, y: 10, type: 'line' },
      { id: 'b', x: 20, y: 10, type: 'line' },
      { id: 'c', x: 20, y: 20, type: 'line' },
    ]
    const svg = pointsToSvg(pts, 0.3, [extra])
    expect(svg.split('<path').length - 1).toBe(2)
  })
})
