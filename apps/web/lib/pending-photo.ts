import { toast } from 'sonner'

/**
 * A photo the user has chosen but not yet committed.
 *
 * Nothing reaches Google Drive until the form is submitted. Uploading on
 * selection meant every abandoned form — and every change of mind about the
 * background — left a file behind that only the orphan sweep could clean up.
 */
export type PendingPhoto =
  /** Chosen from the device. Still local; uploaded when the form is saved. */
  | { kind: 'file'; file: File; previewUrl: string }
  /**
   * Already in Drive. Google Photos imports are fetched server-side from a
   * short-lived picker session, so they cannot be deferred the same way.
   */
  | { kind: 'uploaded'; imageFileId: string; imageUrl: string; previewUrl: string }

export interface UploadedImage {
  imageFileId: string
  imageUrl: string
}

/**
 * Turns a pending photo into a stored Drive file, uploading only if it has not
 * been uploaded already. Call this from a form's submit handler.
 */
export async function resolvePendingPhoto(
  pending: PendingPhoto,
  wardrobeId: string,
): Promise<UploadedImage> {
  if (pending.kind === 'uploaded') {
    return { imageFileId: pending.imageFileId, imageUrl: pending.imageUrl }
  }

  const formData = new FormData()
  formData.append('file', pending.file)
  formData.append('wardrobeId', wardrobeId)

  const res = await fetch('/api/drive/upload', { method: 'POST', body: formData })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    if (error.code === 'GOOGLE_NOT_CONNECTED') {
      throw new DriveReconnectRequiredError()
    }
    throw new Error(error.error || 'Upload to Google Drive failed')
  }

  return res.json()
}

/**
 * Google no longer accepts the saved login — it expired, or access was removed.
 * Only going back through Google's consent screen fixes it, so this is kept
 * distinct from other upload failures to let the UI offer exactly that.
 */
export class DriveReconnectRequiredError extends Error {
  constructor() {
    super('Your Google Drive connection has expired. Reconnect to upload photos.')
    this.name = 'DriveReconnectRequiredError'
  }
}

/** Sends the user through Google's consent screen and back to this page. */
export function reconnectGoogleDrive(): void {
  const returnTo = window.location.pathname + window.location.search
  window.location.href = `/api/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`
}

/**
 * The error toast for a failed photo upload. A dead Drive login gets a
 * Reconnect button: without one the user is told to connect with nothing to
 * click, and has to leave the form to find a way back.
 */
export function toastUploadError(err: unknown): void {
  if (err instanceof DriveReconnectRequiredError) {
    toast.error(err.message, {
      duration: Infinity,
      action: { label: 'Reconnect', onClick: reconnectGoogleDrive },
    })
    return
  }

  toast.error(err instanceof Error ? err.message : 'Could not upload the photo.')
}
