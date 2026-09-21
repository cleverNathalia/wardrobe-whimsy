import { BASE_ITEM_FRACTION, type CollagePlacement } from './collage'
import type { OutfitItemWithClothingItem } from './wardrobe-types'

/**
 * Exported width in pixels. Height follows the stage's 3:4 ratio, giving
 * 1200×1600 — large enough to print or post without being wasteful.
 */
export const EXPORT_WIDTH = 1200
export const EXPORT_HEIGHT = (EXPORT_WIDTH * 4) / 3

/**
 * Item photos are served from our own Drive proxy, so they are same-origin and
 * the canvas stays untainted — `toBlob` would throw otherwise. `<img>` sends
 * cookies for same-origin requests, which the proxy needs since it is behind
 * `requireUser()`.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Could not load ${src}`))
    image.src = src
  })
}

/**
 * Redraws the collage onto a canvas and hands back a PNG.
 *
 * Deliberately a redraw from the stored geometry rather than a screenshot of
 * the DOM: the numbers are the same ones the editor and the preview use, so
 * the export matches what is on screen without a rasterising dependency, and
 * it renders at full resolution instead of whatever size the stage happened
 * to be.
 *
 * The background is left transparent, which is what makes the export useful
 * for items that have been through background removal.
 */
export async function renderCollageToPng(
  placements: CollagePlacement[],
  items: OutfitItemWithClothingItem[]
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = EXPORT_WIDTH
  canvas.height = EXPORT_HEIGHT

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser cannot render the collage to an image')

  const itemsById = new Map(items.map((item) => [item.clothingItemId, item]))
  const ordered = [...placements].sort((a, b) => a.zIndex - b.zIndex)

  // The DOM draws each item in a square box whose width is a fraction of the
  // stage, so the export uses the same box and the same object-contain fit.
  const boxSize = BASE_ITEM_FRACTION * EXPORT_WIDTH

  for (const placement of ordered) {
    const item = itemsById.get(placement.clothingItemId)
    if (!item) continue

    const image = await loadImage(item.clothingItem.imageUrl)

    const fit = Math.min(boxSize / image.naturalWidth, boxSize / image.naturalHeight)
    const drawWidth = image.naturalWidth * fit
    const drawHeight = image.naturalHeight * fit

    ctx.save()
    ctx.translate(placement.positionX * EXPORT_WIDTH, placement.positionY * EXPORT_HEIGHT)
    ctx.rotate((placement.rotation * Math.PI) / 180)
    ctx.scale(placement.scale, placement.scale)
    ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
    ctx.restore()
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Could not encode the collage'))
    }, 'image/png')
  })
}

/** Turns an outfit name into something safe to hand a filesystem. */
export function collageFilename(outfitName: string): string {
  const slug = outfitName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${slug || 'collage'}-collage.png`
}

/** Saves a blob to the user's downloads and cleans up the object URL. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  URL.revokeObjectURL(url)
}
