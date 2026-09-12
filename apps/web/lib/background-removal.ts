/**
 * Client-side background removal.
 *
 * Runs entirely in the browser: the model is fetched from the Hugging Face CDN
 * on first use and cached by the browser thereafter, so there is no server, no
 * API key and no per-image cost. Nothing about the photo leaves the device
 * until the user saves the item.
 *
 * The model is BRIA RMBG-1.4, which is licensed for noncommercial use only —
 * the same terms as this project (see LICENSE.md). Anyone forking this for
 * commercial use must replace it, e.g. with an Apache-2.0 model such as U²-Net
 * served from their own endpoint.
 */

export type RemovalProgress = 'loading-model' | 'processing'

/** Roughly how much gets downloaded the first time, for the UI to warn about. */
export const MODEL_DOWNLOAD_MB = 45

const MODEL_ID = 'briaai/RMBG-1.4'

type Segmenter = (input: string) => Promise<Array<{ mask: { data: Uint8Array; width: number; height: number } }>>

let segmenterPromise: Promise<Segmenter> | null = null

/**
 * Loads the model once per page. The import is dynamic so neither the library
 * nor the runtime lands in the main bundle — users who never remove a
 * background never download any of it.
 */
async function getSegmenter(): Promise<Segmenter> {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const { pipeline } = await import('@huggingface/transformers')
      return (await pipeline('background-removal', MODEL_ID)) as unknown as Segmenter
    })().catch((err) => {
      // Let a later attempt retry rather than caching the failure forever.
      segmenterPromise = null
      throw err
    })
  }

  return segmenterPromise
}

function readImage(objectUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not decode the selected image'))
    image.src = objectUrl
  })
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Could not encode the cut-out image'))
    }, 'image/png')
  })
}

/**
 * Returns a copy of `file` with the background made transparent.
 *
 * PNG is used for the intermediate because it is the only format
 * `canvas.toBlob` supports everywhere that also keeps an alpha channel; the
 * server re-encodes to WebP before storing, so the size never reaches Drive.
 */
export async function removeBackground(
  file: File,
  onProgress?: (stage: RemovalProgress) => void,
): Promise<File> {
  onProgress?.('loading-model')
  const segmenter = await getSegmenter()

  onProgress?.('processing')
  const objectUrl = URL.createObjectURL(file)

  try {
    const [image, output] = await Promise.all([readImage(objectUrl), segmenter(objectUrl)])

    const mask = output?.[0]?.mask
    if (!mask) {
      throw new Error('The model returned no mask for this image')
    }

    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight

    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Could not get a 2D canvas context')
    }

    context.drawImage(image, 0, 0)

    // The mask is a single 8-bit channel at the image's dimensions; copy it
    // straight into alpha so the subject keeps its original pixels.
    const frame = context.getImageData(0, 0, canvas.width, canvas.height)
    for (let i = 0; i < mask.data.length; i += 1) {
      frame.data[i * 4 + 3] = mask.data[i]
    }
    context.putImageData(frame, 0, 0)

    const blob = await canvasToBlob(canvas)
    const name = file.name.replace(/\.[^.]+$/, '') + '.png'

    return new File([blob], name, { type: 'image/png' })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
