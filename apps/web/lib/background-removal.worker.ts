/**
 * Background removal, run off the main thread.
 *
 * Loading the model, running it and compositing the result are each long
 * blocks of synchronous work. On the main thread they froze the whole page —
 * no scrolling, clicks or repaints — for as long as the cut-out took. Here
 * they only occupy this worker.
 *
 * The model is BRIA RMBG-1.4, licensed for noncommercial use — the same terms
 * as this project (see LICENSE.md). Anyone forking this for commercial use
 * must replace it, e.g. with an Apache-2.0 model such as U²-Net served from
 * their own endpoint.
 */
import { AutoModel, AutoProcessor, RawImage } from '@huggingface/transformers'
import type { RemovalRequest, RemovalResponse } from './background-removal'

const MODEL_ID = 'briaai/RMBG-1.4'

/**
 * The server resizes every upload to fit 1600px before storing it, so cutting
 * out at full camera resolution was work thrown away. A 12MP photo is about
 * five times the pixels of one this size.
 */
const MAX_EDGE = 1600

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

type Model = (input: { input: unknown }) => Promise<{ output: unknown }>
type Processor = (image: RawImage) => Promise<{ pixel_values: unknown }>

/**
 * The DOM typings describe `self` as a Window. In a worker it is the worker
 * scope, whose postMessage takes no target origin.
 */
const scope = self as unknown as {
  postMessage(message: RemovalResponse): void
  onmessage: ((event: MessageEvent<RemovalRequest>) => void) | null
}

let loadPromise: Promise<{ model: Model; processor: Processor }> | null = null

/** Loads once per worker; the worker lives as long as the page does. */
function load() {
  if (!loadPromise) {
    loadPromise = Promise.all([
      AutoModel.from_pretrained(MODEL_ID, MODEL_OPTIONS as never),
      AutoProcessor.from_pretrained(MODEL_ID, PROCESSOR_OPTIONS as never),
    ])
      .then(([model, processor]) => ({
        model: model as unknown as Model,
        processor: processor as unknown as Processor,
      }))
      .catch((err) => {
        // Let a later attempt retry rather than caching the failure forever.
        loadPromise = null
        throw err
      })
  }
  return loadPromise
}

async function cutOut(file: Blob): Promise<Blob> {
  const { model, processor } = await load()

  // Decodes with the photo's EXIF orientation applied, so phone shots that
  // were taken sideways come out the right way up.
  const bitmap = await createImageBitmap(file)
  const fit = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * fit)
  const height = Math.round(bitmap.height * fit)

  const canvas = new OffscreenCanvas(width, height)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not get a 2D canvas context')
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const { pixel_values } = await processor(RawImage.fromCanvas(canvas).rgb())
  const { output } = await model({ input: pixel_values })

  // The model emits a single-channel 0–1 confidence map at its own working
  // size; scale it to bytes and back up to the image's dimensions.
  const tensor = (output as { [index: number]: { mul: (n: number) => { to: (t: string) => unknown } } })[0]
  const mask = await RawImage.fromTensor(tensor.mul(255).to('uint8') as never).resize(width, height)

  const frame = context.getImageData(0, 0, width, height)
  const pixels = width * height

  // Without this a size mismatch would silently leave most of the image
  // opaque, which looks like "the feature did nothing" rather than an error.
  if (mask.data.length !== pixels) {
    throw new Error(`Mask/image size mismatch: mask has ${mask.data.length} values, image has ${pixels} pixels`)
  }

  // Copy the mask straight into alpha so the subject keeps its own pixels.
  for (let i = 0; i < pixels; i += 1) {
    frame.data[i * 4 + 3] = mask.data[i]
  }
  context.putImageData(frame, 0, 0)

  // PNG because it keeps the alpha channel everywhere; the server re-encodes
  // to WebP before storing, so this size never reaches Drive.
  return canvas.convertToBlob({ type: 'image/png' })
}

scope.onmessage = async ({ data: { id, file } }) => {
  try {
    scope.postMessage({ id, stage: 'loading-model' })
    await load()
    scope.postMessage({ id, stage: 'processing' })
    scope.postMessage({ id, result: await cutOut(file) })
  } catch (err) {
    scope.postMessage({ id, error: err instanceof Error ? err.message : String(err) })
  }
}
