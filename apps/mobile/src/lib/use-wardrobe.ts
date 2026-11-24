import { useCallback } from 'react'
import { useApi } from './api'
import { useRemote } from './use-remote'
import type { ClothingItem, DefaultWardrobe } from './types'

/** The signed-in user's wardrobe and its items, newest first. */
export function useWardrobe() {
  const api = useApi()

  const load = useCallback(async () => {
    const wardrobe = await api<DefaultWardrobe>('/api/wardrobes/default')
    const items = wardrobe.driveFolderConnected
      ? await api<ClothingItem[]>(`/api/clothing-items?wardrobeId=${wardrobe.wardrobeId}`)
      : []
    return { ...wardrobe, items }
  }, [api])

  return useRemote(load)
}

export function useClothingItem(itemId: string) {
  const api = useApi()

  const load = useCallback(async () => {
    const { wardrobeId } = await api<DefaultWardrobe>('/api/wardrobes/default')
    return api<ClothingItem>(`/api/clothing-items/${itemId}?wardrobeId=${wardrobeId}`)
  }, [api, itemId])

  return useRemote(load)
}
