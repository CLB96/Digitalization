import type { ContourPoint } from '../types'

export function pointsToSvg(points: ContourPoint[], scaleFactor: number): string {
  if (points.length < 2) return '<svg xmlns="http://www.w3.org/2000/svg"></svg>'

  const scaled = points.map(p => ({
    x: p.x * scaleFactor,
    y: p.y * scaleFactor,
    type: p.type,
    handles: p.handles,
  }))
  const maxX = Math.max(...scaled.map(p => p.x))
  const maxY = Math.max(...scaled.map(p => p.y))
  const w = maxX.toFixed(3)
  const h = maxY.toFixed(3)

  let d = `M ${scaled[0].x.toFixed(3)} ${scaled[0].y.toFixed(3)}`
  for (let i = 1; i < scaled.length; i++) {
    const p = scaled[i]
    if (p.type === 'bezier' && p.handles) {
      const cp1x = (p.handles.cp1.x * scaleFactor).toFixed(3)
      const cp1y = (p.handles.cp1.y * scaleFactor).toFixed(3)
      const cp2x = (p.handles.cp2.x * scaleFactor).toFixed(3)
      const cp2y = (p.handles.cp2.y * scaleFactor).toFixed(3)
      d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p.x.toFixed(3)} ${p.y.toFixed(3)}`
    } else {
      d += ` L ${p.x.toFixed(3)} ${p.y.toFixed(3)}`
    }
  }
  d += ' Z'

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm">
  <path d="${d}" fill="none" stroke="#000000" stroke-width="0.5"/>
</svg>`
}

export function downloadSvg(points: ContourPoint[], scaleFactor: number, filename = 'vectorizr.svg'): void {
  const content = pointsToSvg(points, scaleFactor)
  const blob = new Blob([content], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
