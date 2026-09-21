import { AppImage as Image } from '@/components/ui/app-image'
import { BASE_ITEM_FRACTION, STAGE_ASPECT, layoutFor } from '@/lib/collage'
import type { OutfitItemWithClothingItem } from '@/lib/wardrobe-types'

interface CollagePreviewProps {
  items: OutfitItemWithClothingItem[]
  /** Passed to next/image; the card grid and the detail page want different hints. */
  sizes?: string
}

/**
 * A collage exactly as arranged, at whatever size the container gives it.
 *
 * This is the outfit's cover image (FR-5.4). Rendering the layout rather than
 * storing a snapshot means the cover can never fall out of step with the
 * arrangement, and no extra files land in the user's Drive.
 *
 * Positions are fractions of the stage, so the whole thing is percentage-based
 * and needs no measurement to scale down.
 */
export function CollagePreview({ items, sizes = '(max-width: 640px) 50vw, 33vw' }: CollagePreviewProps) {
  const placements = layoutFor(items)
  const itemsById = new Map(items.map((item) => [item.clothingItemId, item]))

  return (
    <div className="relative mx-auto h-full" style={{ aspectRatio: STAGE_ASPECT }}>
      {placements.map((placement) => {
        const item = itemsById.get(placement.clothingItemId)
        if (!item) return null

        return (
          <div
            key={placement.clothingItemId}
            className="absolute"
            style={{
              left: `${placement.positionX * 100}%`,
              top: `${placement.positionY * 100}%`,
              width: `${BASE_ITEM_FRACTION * 100}%`,
              aspectRatio: '1 / 1',
              zIndex: placement.zIndex,
              transform: `translate(-50%, -50%) rotate(${placement.rotation}deg) scale(${placement.scale})`,
            }}
          >
            <Image
              src={item.clothingItem.imageUrl}
              alt=""
              fill
              sizes={sizes}
              className="object-contain"
            />
          </div>
        )
      })}
    </div>
  )
}
