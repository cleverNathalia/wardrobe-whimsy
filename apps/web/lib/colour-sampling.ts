/**
 * Turning a tap on a photo into one colour.
 *
 * Kept free of the DOM so the maths can be tested on its own: callers pass
 * the raw RGBA bytes from a canvas, as `getImageData` returns them.
 */

/** 2 either side of the tapped pixel: a 5×5 square. */
export const SAMPLE_RADIUS = 2

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`
}

/**
 * The average colour of a small square around (x, y), as hex.
 *
 * One pixel on a photo is noisy — JPEG blocks, sensor grain, a stray thread —
 * so a tap reads a little neighbourhood instead. The square is clipped at the
 * image edges rather than wrapping, and fully transparent pixels are skipped,
 * since they have no colour of their own.
 *
 * Returns null when there is nothing to average, e.g. a tap on a wholly
 * transparent area of a cut-out.
 */
export function averageColourAt(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  radius = SAMPLE_RADIUS
): string | null {
  const cx = Math.min(width - 1, Math.max(0, Math.round(x)))
  const cy = Math.min(height - 1, Math.max(0, Math.round(y)))

  let r = 0
  let g = 0
  let b = 0
  let count = 0

  for (let py = Math.max(0, cy - radius); py <= Math.min(height - 1, cy + radius); py++) {
    for (let px = Math.max(0, cx - radius); px <= Math.min(width - 1, cx + radius); px++) {
      const i = (py * width + px) * 4
      if (data[i + 3] === 0) continue
      r += data[i]
      g += data[i + 1]
      b += data[i + 2]
      count++
    }
  }

  return count === 0 ? null : rgbToHex(r / count, g / count, b / count)
}
