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
    const factor = computeScaleFactor({ x: 0, y: 0 }, { x: 100, y: 0 }, 30, 'mm')
    expect(factor).toBeCloseTo(0.3)
  })
  it('handles diagonal lines correctly', () => {
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
