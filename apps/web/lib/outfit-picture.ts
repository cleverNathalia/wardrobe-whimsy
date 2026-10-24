import { toast } from 'sonner'
import { renderCollageToPng } from './collage-export'
import { DriveReconnectRequiredError, toastUploadError } from './pending-photo'
import type { OutfitWithItems } from './wardrobe-types'

/**
 * Saves a picture of the outfit's collage to the user's Drive, replacing the
 * previous one. Call it after anything that changes what the collage shows:
 * creating the outfit, editing it, or saving its layout.
 *
 * Reads the outfit back from the server rather than taking the caller's copy,
 * so the picture always matches what was actually saved.
 *
 * White, not transparent: these are for browsing in Drive, whose viewer shows
 * transparency against a dark background.
 */
export async function saveOutfitPicture(outfitId: string, wardrobeId: string): Promise<void> {
  const outfitRes = await fetch(`/api/outfits/${outfitId}?wardrobeId=${wardrobeId}`)
  if (!outfitRes.ok) throw new Error('Could not load the outfit to draw its picture')
  const outfit: OutfitWithItems = await outfitRes.json()

  const png = await renderCollageToPng(outfit.items, outfit.items, { background: '#ffffff' })

  const formData = new FormData()
  formData.append('file', png, 'outfit.png')

  const res = await fetch(`/api/outfits/${outfitId}/picture?wardrobeId=${wardrobeId}`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    if (error.code === 'GOOGLE_NOT_CONNECTED') throw new DriveReconnectRequiredError()
    throw new Error('Could not save the outfit picture to Google Drive')
  }
}

/**
 * saveOutfitPicture for callers whose own save has already succeeded. The
 * outfit is safe either way, so a failure is a warning, not an error, except
 * for a dead Drive login, which gets the usual Reconnect button.
 */
export async function saveOutfitPictureQuietly(outfitId: string, wardrobeId: string): Promise<void> {
  try {
    await saveOutfitPicture(outfitId, wardrobeId)
  } catch (err) {
    console.error('[outfit-picture]', err)
    if (err instanceof DriveReconnectRequiredError) {
      toastUploadError(err)
      return
    }
    toast.warning("Outfit saved, but its picture couldn't be saved to Google Drive.")
  }
}
