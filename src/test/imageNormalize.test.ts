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
