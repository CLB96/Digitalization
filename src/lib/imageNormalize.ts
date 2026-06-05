const MAX_SIZE = 4096

export function clampDimensions(
  width: number,
  height: number,
  maxSize = MAX_SIZE,
): { width: number; height: number } {
  if (width <= maxSize && height <= maxSize) return { width, height }
  const ratio = Math.min(maxSize / width, maxSize / height)
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) }
}

export function normalizeImage(img: HTMLImageElement): Promise<HTMLImageElement> {
  const { width, height } = clampDimensions(img.naturalWidth, img.naturalHeight)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, width, height)
  return new Promise((resolve, reject) => {
    const out = new Image()
    out.onload = () => resolve(out)
    out.onerror = reject
    out.src = canvas.toDataURL('image/jpeg', 0.92)
  })
}
