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
