/**
 * Client-side background removal.
 *
 * Runs entirely in the browser: the model is fetched from the Hugging Face CDN
 * on first use and cached by the browser thereafter, so there is no server, no
 * API key and no per-image cost. Nothing about the photo leaves the device
 * until the user saves the item.
 *
 * The work itself happens in a Web Worker (background-removal.worker.ts). Run
 * on the page's own thread it froze the whole site until the cut-out finished.
 */

export type RemovalProgress = 'loading-model' | 'processing'

/** Roughly how much gets downloaded the first time, for the UI to warn about. */
export const MODEL_DOWNLOAD_MB = 45

/** Messages to and from the worker. `id` pairs each answer with its request. */
export interface RemovalRequest {
  id: number
  file: Blob
}

export type RemovalResponse =
  | { id: number; stage: RemovalProgress }
  | { id: number; result: Blob }
  | { id: number; error: string }

let worker: Worker | null = null
let nextId = 0

/**
 * One worker for the page, created on first use and then kept, so the model
 * it has loaded is reused for every later photo instead of loading again.
 */
function getWorker(): Worker {
  if (!worker) {
    // Written inline: the bundler only spots a worker in exactly this form.
    worker = new Worker(new URL('./background-removal.worker.ts', import.meta.url), { type: 'module' })
  }
  return worker
}

/** Returns a copy of `file` with the background made transparent, as a PNG. */
export function removeBackground(file: File, onProgress?: (stage: RemovalProgress) => void): Promise<File> {
  const id = nextId++
  const active = getWorker()

  return new Promise((resolve, reject) => {
    const stopListening = () => {
      active.removeEventListener('message', onMessage)
      active.removeEventListener('error', onError)
    }

    function onMessage({ data }: MessageEvent<RemovalResponse>) {
      if (data.id !== id) return

      if ('stage' in data) {
        onProgress?.(data.stage)
        return
      }

      stopListening()
      if ('error' in data) {
        reject(new Error(data.error))
        return
      }

      const name = file.name.replace(/\.[^.]+$/, '') + '.png'
      resolve(new File([data.result], name, { type: 'image/png' }))
    }

    // The worker itself failed, e.g. its script did not load. Throw it away so
    // the next attempt starts a fresh one rather than reusing a broken worker.
    function onError(event: ErrorEvent) {
      stopListening()
      active.terminate()
      if (worker === active) worker = null
      reject(new Error(event.message || 'Background removal could not start'))
    }

    active.addEventListener('message', onMessage)
    active.addEventListener('error', onError)
    active.postMessage({ id, file } satisfies RemovalRequest)
  })
}
