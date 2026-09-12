/**
 * Client-side background removal.
 *
 * Runs entirely in the browser: the model is fetched from the Hugging Face CDN
 * on first use and cached by the browser thereafter, so there is no server, no
 * API key and no per-image cost. Nothing about the photo leaves the device
 * until the user saves the item.
 *
 * The model is BRIA RMBG-1.4, licensed for noncommercial use — the same terms
 * as this project (see LICENSE.md). Anyone forking this for commercial use
 * must replace it, e.g. with an Apache-2.0 model such as U²-Net served from
 * their own endpoint.
 */

export type RemovalProgress = 'loading-model' | 'processing'

/** Roughly how much gets downloaded the first time, for the UI to warn about. */
export const MODEL_DOWNLOAD_MB = 45

const MODEL_ID = 'briaai/RMBG-1.4'

/**
 * RMBG-1.4 cannot be loaded through the `background-removal` pipeline helper.
 * Its config.json declares `model_type: "SegformerForSemanticSegmentation"`
 * even though the real architecture is BriaRMBG (IS-Net), so the pipeline
 * resolves it to Segformer and rejects it. Loading the model directly with
 * `model_type: 'custom'` is the documented way round that.
 */
const MODEL_OPTIONS = { config: { model_type: 'custom' } } as const

/**
 * RMBG-1.4 ships no usable preprocessor config, so the image transform is
 * declared here: 1024×1024, scaled to 0–1, then normalised around 0.5.
 */
const PROCESSOR_OPTIONS = {
  config: {
    do_normalize: true,
    do_pad: false,
    do_rescale: true,
    do_resize: true,
    image_mean: [0.5, 0.5, 0.5],
    image_std: [1, 1, 1],
    resample: 2,
    rescale_factor: 1 / 255,
    size: { width: 1024, height: 1024 },
  },
} as const

type Loaded = {
  model: (input: { input: unknown }) => Promise<{ output: unknown }>
  processor: (image: unknown) => Promise<{ pixel_values: unknown }>
  RawImage: {
    fromURL: (url: string) => Promise<{ width: number; height: number; toCanvas: () => HTMLCanvasElement }>
    fromTensor: (tensor: unknown) => { resize: (w: number, h: number) => Promise<{ data: Uint8Array }> }
  }
}

let loadPromise: Promise<Loaded> | null = null

/**
 * Loads the model once per page. The import is dynamic so neither the library
 * nor the runtime lands in the main bundle — users who never remove a
 * background never download any of it.
 */
async function load(): Promise<Loaded> {
  if (!loadPromise) {
    loadPromise = (async () => {
      const { AutoModel, AutoProcessor, RawImage } = await import('@huggingface/transformers')

      const [model, processor] = await Promise.all([
        AutoModel.from_pretrained(MODEL_ID, MODEL_OPTIONS as never),
        AutoProcessor.from_pretrained(MODEL_ID, PROCESSOR_OPTIONS as never),
      ])

      return { model, processor, RawImage } as unknown as Loaded
    })().catch((err) => {
      // Let a later attempt retry rather than caching the failure forever.
      loadPromise = null
      throw err
    })
  }

  return loadPromise
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
  const { model, processor, RawImage } = await load()

  onProgress?.('processing')
  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await RawImage.fromURL(objectUrl)

    const { pixel_values } = await processor(image)
    const { output } = await model({ input: pixel_values })

    // The model emits a single-channel 0–1 confidence map at its own working
    // size; scale it to bytes and back up to the image's real dimensions.
    const tensor = (output as { [index: number]: { mul: (n: number) => { to: (t: string) => unknown } } })[0]
    const mask = await RawImage.fromTensor(tensor.mul(255).to('uint8')).resize(image.width, image.height)

    const canvas = image.toCanvas()
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Could not get a 2D canvas context')
    }

    // Copy the mask straight into alpha so the subject keeps its own pixels.
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
