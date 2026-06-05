/// <reference lib="webworker" />

declare const cv: any

let opencvReady = false

;(self as any).Module = {
  onRuntimeInitialized() {
    opencvReady = true
    self.postMessage({ type: 'ready' })
  },
}
;(self as any).importScripts('/opencv.js')

// Local types — NOT exported so Vite keeps this as a classic (iife) script
interface DetectEdgesRequest {
  type: 'detect'
  imageData: ImageData
  method: number
  threshold1: number
  threshold2: number
}

interface DetectEdgesResponse {
  type: 'contour'
  points: { x: number; y: number }[]
}

/** Find the largest contour (by area) in a binary Mat. Returns index or -1. */
function findLargestContour(contours: any, minArea: number): number {
  let bestArea = minArea
  let bestIdx = -1
  for (let i = 0; i < contours.size(); i++) {
    const area = cv.contourArea(contours.get(i))
    if (area > bestArea) { bestArea = area; bestIdx = i }
  }
  return bestIdx
}

self.addEventListener('message', (e: MessageEvent<DetectEdgesRequest>) => {
  if (!opencvReady || e.data.type !== 'detect') return

  const { imageData, method, threshold1, threshold2 } = e.data
  const minArea = imageData.width * imageData.height * 0.005 // 0.5% of image

  const src = cv.matFromImageData(imageData)
  const gray = new cv.Mat()
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

  const blurred = new cv.Mat()
  cv.GaussianBlur(gray, blurred, new cv.Size(7, 7), 0)

  let points: { x: number; y: number }[] = []

  if (method === 1) {
    // ── Canny mode ────────────────────────────────────────────────────
    const edges = new cv.Mat()
    cv.Canny(blurred, edges, threshold1, threshold2)

    const contours = new cv.MatVector()
    const hierarchy = new cv.Mat()
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    const idx = findLargestContour(contours, minArea)
    if (idx >= 0) {
      const approx = new cv.Mat()
      cv.approxPolyDP(contours.get(idx), approx, 0.002 * cv.arcLength(contours.get(idx), true), true)
      for (let i = 0; i < approx.rows; i++) {
        points.push({ x: approx.data32S[i * 2], y: approx.data32S[i * 2 + 1] })
      }
      approx.delete()
    }

    edges.delete(); contours.delete(); hierarchy.delete()

  } else {
    // ── Otsu auto mode ────────────────────────────────────────────────
    // Try both polarities and pick the one that gives the largest contour
    const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(7, 7))

    function tryOtsu(invertFlag: number): { idx: number; contours: any; hierarchy: any } {
      const binary = new cv.Mat()
      // THRESH_BINARY_INV=1, THRESH_OTSU=8
      cv.threshold(blurred, binary, 0, 255, invertFlag + 8)

      // Close gaps, then open to remove noise
      cv.morphologyEx(binary, binary, cv.MORPH_CLOSE, kernel)
      cv.morphologyEx(binary, binary, cv.MORPH_OPEN, kernel)

      const c = new cv.MatVector()
      const h = new cv.Mat()
      cv.findContours(binary, c, h, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
      binary.delete()
      return { idx: findLargestContour(c, minArea), contours: c, hierarchy: h }
    }

    // THRESH_BINARY_INV = 1 (dark object on light background)
    const inv = tryOtsu(1)
    // THRESH_BINARY = 0 (light object on dark background)
    const normal = tryOtsu(0)

    // Pick whichever polarity gave the larger contour
    let chosen: { idx: number; contours: any; hierarchy: any }
    if (inv.idx >= 0 && normal.idx < 0) {
      chosen = inv
      normal.contours.delete(); normal.hierarchy.delete()
    } else if (normal.idx >= 0 && inv.idx < 0) {
      chosen = normal
      inv.contours.delete(); inv.hierarchy.delete()
    } else if (inv.idx >= 0 && normal.idx >= 0) {
      const areaInv = cv.contourArea(inv.contours.get(inv.idx))
      const areaNorm = cv.contourArea(normal.contours.get(normal.idx))
      if (areaInv >= areaNorm) {
        chosen = inv
        normal.contours.delete(); normal.hierarchy.delete()
      } else {
        chosen = normal
        inv.contours.delete(); inv.hierarchy.delete()
      }
    } else {
      // Neither found anything — fall back to Canny
      inv.contours.delete(); inv.hierarchy.delete()
      normal.contours.delete(); normal.hierarchy.delete()
      kernel.delete()

      const edges = new cv.Mat()
      cv.Canny(blurred, edges, 50, 150)
      const contours = new cv.MatVector()
      const hierarchy = new cv.Mat()
      cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
      chosen = { idx: findLargestContour(contours, 0), contours, hierarchy }
      edges.delete()
    }

    if (chosen.idx >= 0) {
      const contour = chosen.contours.get(chosen.idx)
      const epsilon = 0.002 * cv.arcLength(contour, true)
      const approx = new cv.Mat()
      cv.approxPolyDP(contour, approx, epsilon, true)
      for (let i = 0; i < approx.rows; i++) {
        points.push({ x: approx.data32S[i * 2], y: approx.data32S[i * 2 + 1] })
      }
      approx.delete()
    }

    chosen.contours.delete(); chosen.hierarchy.delete()
    if (kernel && !kernel.isDeleted()) kernel.delete()
  }

  src.delete(); gray.delete(); blurred.delete()

  self.postMessage({ type: 'contour', points } as DetectEdgesResponse)
})
