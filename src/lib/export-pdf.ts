import { jsPDF } from 'jspdf'
import type { ContourPoint } from '../types'

export function downloadPdf(
  active: ContourPoint[],
  scaleFactor: number,
  extraPaths: ContourPoint[][] = [],
  filename = 'vectorizr.pdf',
): void {
  const allPaths = [...extraPaths, ...(active.length >= 2 ? [active] : [])]
  if (allPaths.length === 0) return

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 15

  doc.setDrawColor(0)
  doc.setLineWidth(0.3)

  allPaths.forEach(path => {
    if (path.length < 2) return
    const scaled = path.map(p => ({
      x: p.x * scaleFactor + margin,
      y: p.y * scaleFactor + margin,
    }))
    for (let i = 0; i < scaled.length; i++) {
      const curr = scaled[i]
      const next = scaled[(i + 1) % scaled.length]
      doc.line(curr.x, curr.y, next.x, next.y)
    }
  })

  doc.save(filename)
}
