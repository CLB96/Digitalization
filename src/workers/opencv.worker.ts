/// <reference lib="webworker" />

declare const cv: any

let opencvReady = false

// Module MUST be set before importScripts so OpenCV calls onRuntimeInitialized correctly
;(self as any).Module = {
  onRuntimeInitialized() {
    opencvReady = true
    self.postMessage({ type: 'ready' })
  },
}

// Load OpenCV.js after Module is defined
;(self as any).importScripts('/opencv.js')

export interface DetectEdgesRequest {
  type: 'detect'
  imageData: ImageData
  threshold1: number
  threshold2: number
}

export interface DetectEdgesResponse {
  type: 'contour'
  points: { x: number; y: number }[]
}

self.addEventListener('message', (e: MessageEvent<DetectEdgesRequest>) => {
  if (!opencvReady || e.data.type !== 'detect') return

  const { imageData, threshold1, threshold2 } = e.data

  const src = cv.matFromImageData(imageData)
  const gray = new cv.Mat()
  const edges = new cv.Mat()
  const contours = new cv.MatVector()
  const hierarchy = new cv.Mat()

  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
  cv.Canny(gray, edges, threshold1, threshold2)
  cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

  // Pick the largest contour
  let largest = 0
  let largestIdx = -1
  for (let i = 0; i < contours.size(); i++) {
    const area = cv.contourArea(contours.get(i))
    if (area > largest) { largest = area; largestIdx = i }
  }

  const points: { x: number; y: number }[] = []
  if (largestIdx >= 0) {
    const contour = contours.get(largestIdx)
    const approx = new cv.Mat()
    const epsilon = 0.005 * cv.arcLength(contour, true)
    cv.approxPolyDP(contour, approx, epsilon, true)
    for (let i = 0; i < approx.rows; i++) {
      points.push({ x: approx.data32S[i * 2], y: approx.data32S[i * 2 + 1] })
    }
    approx.delete()
  }

  src.delete(); gray.delete(); edges.delete(); contours.delete(); hierarchy.delete()

  const response: DetectEdgesResponse = { type: 'contour', points }
  self.postMessage(response)
})
