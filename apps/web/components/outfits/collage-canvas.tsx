'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { CollageItem } from './collage-item'
import {
  FINE_NUDGE_STEP,
  MAX_SCALE,
  MIN_SCALE,
  NUDGE_STEP,
  ROTATE_STEP,
  SCALE_STEP,
  STAGE_ASPECT,
  clamp,
  compactLayers,
  layoutFor,
  normalisePlacement,
  normaliseRotation,
  placementsEqual,
  reorderLayer,
  type CollagePlacement,
} from '@/lib/collage'
import { collageFilename, downloadBlob, renderCollageToPng } from '@/lib/collage-export'
import type { OutfitWithItems } from '@/lib/wardrobe-types'

interface CollageCanvasProps {
  wardrobeId: string
  outfit: OutfitWithItems
}

export function CollageCanvas({ wardrobeId, outfit }: CollageCanvasProps) {
  const router = useRouter()
  const stageRef = useRef<HTMLDivElement>(null)

  // Not the raw rows: an outfit built before the editor existed is dealt into
  // a grid first, so it opens arrangeable rather than piled in the corner.
  const initial = useMemo(() => layoutFor(outfit.items), [outfit.items])

  const [placements, setPlacements] = useState<CollagePlacement[]>(initial)
  // What is on the server, as far as this editor knows. Rebaselined on save
  // rather than re-read from props, so a background refresh can never discard
  // an arrangement the user has not saved yet.
  const [saved, setSaved] = useState<CollagePlacement[]>(initial)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)

  const dirty = !placementsEqual(placements, saved)

  useEffect(() => {
    if (!dirty) return

    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const itemsById = useMemo(
    () => new Map(outfit.items.map((item) => [item.clothingItemId, item])),
    [outfit.items]
  )

  const updatePlacement = useCallback(
    (clothingItemId: string, patch: Partial<Omit<CollagePlacement, 'clothingItemId'>>) => {
      setPlacements((current) =>
        current.map((placement) =>
          placement.clothingItemId === clothingItemId
            ? normalisePlacement({ ...placement, ...patch })
            : placement
        )
      )
    },
    []
  )

  const changeLayer = useCallback(
    (clothingItemId: string, direction: 'forward' | 'backward') => {
      setPlacements((current) => {
        const next = reorderLayer(current, clothingItemId, direction)
        const moved = next.find((placement) => placement.clothingItemId === clothingItemId)
        const name = itemsById.get(clothingItemId)?.clothingItem.name ?? 'Item'

        setAnnouncement(
          next === current
            ? `${name} is already ${direction === 'forward' ? 'at the front' : 'at the back'}.`
            : `${name} moved to layer ${(moved?.zIndex ?? 0) + 1} of ${next.length}.`
        )

        return next
      })
    },
    [itemsById]
  )

  /**
   * The keyboard route through every gesture the pointer offers, which is what
   * WCAG 2.1.1 asks for — drag-and-drop alone would lock out anyone not using
   * a pointing device.
   */
  const handleKeyboardCommand = useCallback(
    (clothingItemId: string) => (event: KeyboardEvent<HTMLDivElement>) => {
      const placement = placements.find((entry) => entry.clothingItemId === clothingItemId)
      if (!placement) return

      const name = itemsById.get(clothingItemId)?.clothingItem.name ?? 'Item'
      const step = event.altKey ? FINE_NUDGE_STEP : NUDGE_STEP

      const move = (dx: number, dy: number) => {
        event.preventDefault()
        const positionX = clamp(placement.positionX + dx, 0, 1)
        const positionY = clamp(placement.positionY + dy, 0, 1)
        updatePlacement(clothingItemId, { positionX, positionY })
        setAnnouncement(
          `${name} at ${Math.round(positionX * 100)} percent across, ${Math.round(positionY * 100)} percent down.`
        )
      }

      const resize = (delta: number) => {
        event.preventDefault()
        const scale = clamp(placement.scale + delta, MIN_SCALE, MAX_SCALE)
        updatePlacement(clothingItemId, { scale })
        setAnnouncement(`${name} at ${Math.round(scale * 100)} percent size.`)
      }

      const rotate = (delta: number) => {
        event.preventDefault()
        const rotation = normaliseRotation(placement.rotation + delta)
        updatePlacement(clothingItemId, { rotation })
        setAnnouncement(`${name} rotated to ${Math.round(rotation)} degrees.`)
      }

      switch (event.key) {
        case 'ArrowLeft':
          return event.shiftKey ? resize(-SCALE_STEP) : move(-step, 0)
        case 'ArrowRight':
          return event.shiftKey ? resize(SCALE_STEP) : move(step, 0)
        case 'ArrowUp':
          return event.shiftKey ? resize(SCALE_STEP) : move(0, -step)
        case 'ArrowDown':
          return event.shiftKey ? resize(-SCALE_STEP) : move(0, step)
        case '[':
          return rotate(-ROTATE_STEP)
        case ']':
          return rotate(ROTATE_STEP)
        case 'PageUp':
          event.preventDefault()
          return changeLayer(clothingItemId, 'forward')
        case 'PageDown':
          event.preventDefault()
          return changeLayer(clothingItemId, 'backward')
        default:
          return
      }
    },
    [changeLayer, itemsById, placements, updatePlacement]
  )

  const handleSave = async () => {
    setSaving(true)

    // Layers are compacted to 0…n−1 on the way out, so what is stored matches
    // what is drawn however much the stack has been shuffled.
    const toSave = compactLayers(placements)

    const res = await fetch(`/api/outfits/${outfit.id}/layout?wardrobeId=${wardrobeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: toSave }),
    })

    if (!res.ok) {
      toast.error('Failed to save the collage.')
      setSaving(false)
      return
    }

    setPlacements(toSave)
    setSaved(toSave)
    setSaving(false)
    toast.success('Collage saved!')

    // The gallery cover is rendered from this layout, so it needs re-fetching.
    router.refresh()
  }

  /**
   * Exports what is on screen, not what is saved — downloading an arrangement
   * you can see but have not committed yet is the obvious expectation.
   */
  const handleDownload = async () => {
    setExporting(true)

    try {
      const blob = await renderCollageToPng(placements, outfit.items)
      downloadBlob(blob, collageFilename(outfit.name))
      toast.success('Collage downloaded!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not download the collage.')
    } finally {
      setExporting(false)
    }
  }

  const selected = placements.find((placement) => placement.clothingItemId === selectedId) ?? null
  const selectedName = selectedId ? itemsById.get(selectedId)?.clothingItem.name : null

  if (outfit.items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        This outfit has no items yet. Add some on the outfit page and they will appear here to arrange.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div
        ref={stageRef}
        // Clicking the backdrop deselects, which is also how the handles are dismissed.
        onPointerDown={() => setSelectedId(null)}
        className="relative mx-auto w-full max-w-xl overflow-hidden rounded-xl border border-border bg-muted/30"
        style={{ aspectRatio: STAGE_ASPECT }}
      >
        {placements.map((placement) => {
          const item = itemsById.get(placement.clothingItemId)
          if (!item) return null

          return (
            <CollageItem
              key={placement.clothingItemId}
              placement={placement}
              item={item}
              selected={placement.clothingItemId === selectedId}
              stageRef={stageRef}
              onSelect={() => setSelectedId(placement.clothingItemId)}
              onChange={(patch) => updatePlacement(placement.clothingItemId, patch)}
              onKeyboardCommand={handleKeyboardCommand(placement.clothingItemId)}
            />
          )
        })}
      </div>

      <p className="text-muted-foreground text-center text-xs">
        Drag to move. Select an item for its rotate and resize handles, or use the arrow keys,
        <span className="whitespace-nowrap"> Shift + arrows</span>,
        <span className="whitespace-nowrap"> [ and ]</span>, and
        <span className="whitespace-nowrap"> Page Up / Page Down</span>.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" loading={saving} disabled={!dirty} onClick={handleSave}>
          Save collage
        </Button>
        <Button type="button" variant="outline" disabled={!dirty} onClick={() => setPlacements(saved)}>
          Discard changes
        </Button>
        <Button type="button" variant="outline" loading={exporting} onClick={handleDownload}>
          <Download size={16} />
          Download PNG
        </Button>

        <div className="ml-auto flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!selected}
            onClick={() => selectedId && changeLayer(selectedId, 'backward')}
          >
            Send back
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!selected}
            onClick={() => selectedId && changeLayer(selectedId, 'forward')}
          >
            Bring forward
          </Button>
        </div>
      </div>

      {selected && selectedName ? (
        <p className="text-muted-foreground text-xs">
          {selectedName} — {Math.round(selected.scale * 100)}% size, {Math.round(selected.rotation)}°,
          layer {selected.zIndex + 1} of {placements.length}
        </p>
      ) : null}

      {/* Keyboard gestures have no visible result for a screen reader, so each one is spoken. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}
