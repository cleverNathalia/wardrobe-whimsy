import type { OutfitItemWithClothingItem } from './wardrobe-types'

/**
 * Stage aspect ratio, width / height. Portrait, like a lookbook page — most
 * clothing photos are taller than they are wide.
 */
export const STAGE_ASPECT = '3 / 4'

/**
 * How much of the stage width an item covers at scale 1. Scale is stored
 * relative to this rather than in pixels, which is what keeps a saved layout
 * resolution independent.
 */
export const BASE_ITEM_FRACTION = 0.32

export const MIN_SCALE = 0.25
export const MAX_SCALE = 3

/** One arrow press. 1% of the stage is small enough to be precise, big enough to see. */
export const NUDGE_STEP = 0.01
/** Alt+arrow, for the last bit of alignment. */
export const FINE_NUDGE_STEP = 0.002
export const SCALE_STEP = 0.1
export const ROTATE_STEP = 5

export const COLLAGE_COLUMNS = 3

/** An item's place on the stage. Mirrors OutfitLayoutEntrySchema. */
export interface CollagePlacement {
  clothingItemId: string
  positionX: number
  positionY: number
  scale: number
  rotation: number
  zIndex: number
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Rounds to a fixed number of places before saving. Pointer maths produces
 * long floats, and without this a layout that nobody touched still reads as
 * changed on the next comparison.
 */
function round(value: number, places: number): number {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

/**
 * Wraps rotation into the −180…180 the API accepts. Wrapping rather than
 * clamping so spinning an item past half a turn keeps going instead of sticking.
 */
export function normaliseRotation(degrees: number): number {
  const wrapped = ((((degrees + 180) % 360) + 360) % 360) - 180
  return round(wrapped, 1)
}

export function normalisePlacement(placement: CollagePlacement): CollagePlacement {
  return {
    clothingItemId: placement.clothingItemId,
    positionX: round(clamp(placement.positionX, 0, 1), 4),
    positionY: round(clamp(placement.positionY, 0, 1), 4),
    scale: round(clamp(placement.scale, MIN_SCALE, MAX_SCALE), 3),
    rotation: normaliseRotation(placement.rotation),
    zIndex: Math.max(0, Math.round(placement.zIndex)),
  }
}

/**
 * Where a newly added item lands on the stage: a loose grid, so a freshly
 * built outfit is already arrangeable instead of being one pile.
 *
 * Shared with the database layer, which uses it when creating rows, so the
 * server's idea of a starting arrangement and the client's cannot drift.
 */
export function initialPlacement(index: number) {
  const column = index % COLLAGE_COLUMNS
  const row = Math.floor(index / COLLAGE_COLUMNS)

  return {
    positionX: (column + 0.5) / COLLAGE_COLUMNS,
    // Rows wrap so a long list never deals items off the bottom of the stage.
    positionY: ((row % COLLAGE_COLUMNS) + 0.5) / COLLAGE_COLUMNS,
    scale: 1,
    rotation: 0,
    zIndex: index,
  }
}

/**
 * Outfits built before the collage editor existed have every item stored at
 * (0, 0). Drawn literally that is one unreadable pile in the top-left corner,
 * so an untouched layout is dealt into the same grid a new outfit gets.
 *
 * A single item at the origin is left alone — there is nothing to untangle,
 * and it may well be deliberate.
 */
function isUnarranged(placements: CollagePlacement[]): boolean {
  return (
    placements.length > 1 &&
    placements.every((placement) => placement.positionX === 0 && placement.positionY === 0)
  )
}

/**
 * The arrangement to draw: what was saved, or a dealt grid when nothing has
 * been arranged yet. Both the editor and the read-only preview go through
 * this, so a collage looks the same wherever it is shown.
 */
export function layoutFor(items: OutfitItemWithClothingItem[]): CollagePlacement[] {
  const placements = toPlacements(items)
  if (!isUnarranged(placements)) return placements

  return placements.map((placement, index) => ({
    ...placement,
    ...initialPlacement(index),
  }))
}

/** The saved rows, in paint order. */
export function toPlacements(items: OutfitItemWithClothingItem[]): CollagePlacement[] {
  return items
    .map((item) =>
      normalisePlacement({
        clothingItemId: item.clothingItemId,
        positionX: item.positionX,
        positionY: item.positionY,
        scale: item.scale,
        rotation: item.rotation,
        zIndex: item.zIndex,
      })
    )
    .sort((a, b) => a.zIndex - b.zIndex)
}

/** Whether an arrangement differs from the one that was loaded. */
export function placementsEqual(a: CollagePlacement[], b: CollagePlacement[]): boolean {
  if (a.length !== b.length) return false

  const byId = new Map(b.map((placement) => [placement.clothingItemId, placement]))

  return a.every((placement) => {
    const other = byId.get(placement.clothingItemId)
    return (
      other !== undefined &&
      other.positionX === placement.positionX &&
      other.positionY === placement.positionY &&
      other.scale === placement.scale &&
      other.rotation === placement.rotation &&
      other.zIndex === placement.zIndex
    )
  })
}

/**
 * Renumbers z-indexes to 0…n−1 in their current visual order, so layering
 * stays a dense sequence however often items are moved up and down.
 */
export function compactLayers(placements: CollagePlacement[]): CollagePlacement[] {
  return [...placements]
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((placement, index) => ({ ...placement, zIndex: index }))
}

/**
 * Moves one item one step through the stack. Returns the list unchanged when
 * the item is already at the end it is being sent to.
 */
export function reorderLayer(
  placements: CollagePlacement[],
  clothingItemId: string,
  direction: 'forward' | 'backward'
): CollagePlacement[] {
  const ordered = compactLayers(placements)
  const index = ordered.findIndex((placement) => placement.clothingItemId === clothingItemId)
  if (index === -1) return placements

  const target = direction === 'forward' ? index + 1 : index - 1
  if (target < 0 || target >= ordered.length) return placements

  const swapped = [...ordered]
  swapped[index] = { ...ordered[target], zIndex: index }
  swapped[target] = { ...ordered[index], zIndex: target }

  return swapped
}
