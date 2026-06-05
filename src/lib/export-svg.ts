import type { ContourPoint } from '../types'

function pathD(points: ContourPoint[], scaleFactor: number): string {
  const s = points.map(p => ({ x: p.x * scaleFactor, y: p.y * scaleFactor, type: p.type, handles: p.handles }))
  let d = `M ${s[0].x.toFixed(3)} ${s[0].y.toFixed(3)}`
  for (let i = 1; i < s.length; i++) {
    const p = s[i]
    if (p.type === 'bezier' && p.handles) {
      d += ` C ${(p.handles.cp1.x * scaleFactor).toFixed(3)} ${(p.handles.cp1.y * scaleFactor).toFixed(3)}`
        + ` ${(p.handles.cp2.x * scaleFactor).toFixed(3)} ${(p.handles.cp2.y * scaleFactor).toFixed(3)}`
        + ` ${p.x.toFixed(3)} ${p.y.toFixed(3)}`
    } else {
      d += ` L ${p.x.toFixed(3)} ${p.y.toFixed(3)}`
    }
  }
  return d + ' Z'
}

export function pointsToSvg(
  active: ContourPoint[],
  scaleFactor: number,
  extraPaths: ContourPoint[][] = [],
): string {
  const allPaths = [...extraPaths, ...(active.length >= 2 ? [active] : [])]
  if (allPaths.length === 0) return '<svg xmlns="http://www.w3.org/2000/svg"></svg>'

  const allPoints = allPaths.flat()
  const maxX = Math.max(...allPoints.map(p => p.x * scaleFactor))
  const maxY = Math.max(...allPoints.map(p => p.y * scaleFactor))
  const w = maxX.toFixed(3)
  const h = maxY.toFixed(3)

  const pathTags = allPaths
    .filter(pts => pts.length >= 2)
    .map(pts => `  <path d="${pathD(pts, scaleFactor)}" fill="none" stroke="#000000" stroke-width="0.5"/>`)
    .join('\n')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm">\n${pathTags}\n</svg>`
}

export function downloadSvg(
  active: ContourPoint[],
  scaleFactor: number,
  extraPaths: ContourPoint[][] = [],
  filename = 'vectorizr.svg',
): void {
  const content = pointsToSvg(active, scaleFactor, extraPaths)
  const blob = new Blob([content], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
