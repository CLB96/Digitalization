import { jsPDF } from 'jspdf'
import type { ContourPoint } from '../types'

export function downloadPdf(points: ContourPoint[], scaleFactor: number, filename = 'vectorizr.pdf'): void {
  if (points.length < 2) return

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 15
  const scaled = points.map(p => ({
    x: p.x * scaleFactor + margin,
    y: p.y * scaleFactor + margin,
    type: p.type,
    handles: p.handles,
  }))

  doc.setDrawColor(0)
  doc.setLineWidth(0.3)

  for (let i = 0; i < scaled.length; i++) {
    const curr = scaled[i]
    const next = scaled[(i + 1) % scaled.length]
    doc.line(curr.x, curr.y, next.x, next.y)
  }

  doc.save(filename)
}
