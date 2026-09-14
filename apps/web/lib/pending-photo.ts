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
    if (error.code === 'GOOGLE_NOT_CONNECTED' || error.code === 'FOLDER_NOT_CONNECTED') {
      throw new Error('Please connect your Google Drive first.')
    }
    throw new Error(error.error || 'Upload to Google Drive failed')
  }

  return res.json()
}
