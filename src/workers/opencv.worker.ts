/// <reference lib="webworker" />

declare const cv: any

let opencvReady = false

// Module MUST be set before importScripts
;(self as any).Module = {
  onRuntimeInitialized() {
    opencvReady = true
    self.postMessage({ type: 'ready' })
  },
}

;(self as any).importScripts('/opencv.js')

export interface DetectEdgesRequest {
  type: 'detect'
  imageData: ImageData
  /** 0 = Otsu threshold (recommended), 1 = Canny edges */
  method: number
  threshold1: number
  threshold2: number
}

export interface DetectEdgesResponse {
  type: 'contour'
  points: { x: number; y: number }[]
}

self.addEventListener('message', (e: MessageEvent<DetectEdgesRequest>) => {
  if (!opencvReady || e.data.type !== 'detect') return

  const { imageData, method, threshold1, threshold2 } = e.data

  const src = cv.matFromImageData(imageData)
  const gray = new cv.Mat()
  const blurred = new cv.Mat()
  const binary = new cv.Mat()
  const contours = new cv.MatVector()
  const hierarchy = new cv.Mat()

  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

  // Blur to reduce noise — kernel size should be odd and proportional to image
  const blurK = 7
  cv.GaussianBlur(gray, blurred, new cv.Size(blurK, blurK), 0)

  if (method === 1) {
    // Canny — user-controlled thresholds (good for sketches / line drawings)
    cv.Canny(blurred, binary, threshold1, threshold2)
  } else {
    // Otsu threshold — best for objects with clear contrast against background
    // (dark pattern on light table, or vice-versa)
    cv.threshold(blurred, binary, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU)

    // Morphological closing to fill gaps in the contour
    const kernel = cv.getStructuringElement(
      cv.MORPH_ELLIPSE,
      new cv.Size(9, 9),
    )
    cv.morphologyEx(binary, binary, cv.MORPH_CLOSE, kernel)
    cv.morphologyEx(binary, binary, cv.MORPH_OPEN, kernel)
    kernel.delete()
  }

  cv.findContours(binary, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

  // Pick the contour with the largest area (ignoring very small noise)
  let largestArea = 0
  let largestIdx = -1
  const minArea = (imageData.width * imageData.height) * 0.005 // at least 0.5% of image area

  for (let i = 0; i < contours.size(); i++) {
    const area = cv.contourArea(contours.get(i))
    if (area > largestArea && area > minArea) {
      largestArea = area
      largestIdx = i
    }
  }

  // If Otsu found nothing big enough, retry with inverted binary (light object on dark bg)
  if (largestIdx < 0 && method === 0) {
    const invertedBinary = new cv.Mat()
    cv.bitwise_not(binary, invertedBinary)
    const contours2 = new cv.MatVector()
    const hierarchy2 = new cv.Mat()
    cv.findContours(invertedBinary, contours2, hierarchy2, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    for (let i = 0; i < contours2.size(); i++) {
      const area = cv.contourArea(contours2.get(i))
      if (area > largestArea && area > minArea) {
        largestArea = area
        largestIdx = i
        // Swap so we use contours2 below
        const tmp = contours; (e.data as any)._altContours = contours2
        void tmp
      }
    }
    hierarchy2.delete()
    invertedBinary.delete()
  }

  const points: { x: number; y: number }[] = []

  if (largestIdx >= 0) {
    // Use smaller epsilon for more accurate approximation
    const epsilon = 0.002 * cv.arcLength(contours.get(largestIdx), true)
    const approx = new cv.Mat()
    cv.approxPolyDP(contours.get(largestIdx), approx, epsilon, true)
    for (let i = 0; i < approx.rows; i++) {
      points.push({ x: approx.data32S[i * 2], y: approx.data32S[i * 2 + 1] })
    }
    approx.delete()
  }

  src.delete(); gray.delete(); blurred.delete(); binary.delete()
  contours.delete(); hierarchy.delete()

  const response: DetectEdgesResponse = { type: 'contour', points }
  self.postMessage(response)
})
