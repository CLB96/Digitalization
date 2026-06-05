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
