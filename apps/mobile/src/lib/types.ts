/**
 * The shapes the web API returns. Kept here for now; when more screens arrive
 * these belong in packages/api-client, shared with the web app's own types.
 */
export interface ClothingItem {
  id: string
  name: string
  category: string
  subcategory: string | null
  colour: string | null
  season: string | null
  occasion: string | null
  brand: string | null
  size: string | null
  notes: string | null
  /** Relative to the API, e.g. "/api/drive/image/abc" — see apiUrl(). */
  imageUrl: string
  isFavourite: boolean
  status: 'DRAFT' | 'ACTIVE'
}

export interface DefaultWardrobe {
  wardrobeId: string
  /** False until the user has connected Google Drive on the web app. */
  driveFolderConnected: boolean
}
