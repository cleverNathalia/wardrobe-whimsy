'use client'

import { useRef, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { AppImage as Image } from '@/components/ui/app-image'
import { cn } from '@/lib/utils'
import {
  BASE_ITEM_FRACTION,
  MAX_SCALE,
  MIN_SCALE,
  clamp,
  normaliseRotation,
  type CollagePlacement,
} from '@/lib/collage'
import type { OutfitItemWithClothingItem } from '@/lib/wardrobe-types'

/**
 * Handles are 44×44 to meet the touch-target floor in NFR-4.1 / FR-5.5. They
 * sit inside the scaled element, so they are counter-scaled to stay that size
 * however large or small the item is drawn.
 */
const HANDLE_SIZE_PX = 44

type Gesture =
  | { kind: 'drag'; pointerX: number; pointerY: number; startX: number; startY: number }
  | { kind: 'rotate'; centreX: number; centreY: number; startAngle: number; startRotation: number }
  | { kind: 'scale'; centreX: number; centreY: number; startDistance: number; startScale: number }

interface CollageItemProps {
  placement: CollagePlacement
  item: OutfitItemWithClothingItem
  selected: boolean
  /** The stage, for converting pointer pixels into normalised stage fractions. */
  stageRef: RefObject<HTMLDivElement | null>
  onSelect: () => void
  onChange: (next: Partial<Omit<CollagePlacement, 'clothingItemId'>>) => void
  onKeyboardCommand: (event: React.KeyboardEvent<HTMLDivElement>) => void
}

function angleFrom(centreX: number, centreY: number, x: number, y: number): number {
  return (Math.atan2(y - centreY, x - centreX) * 180) / Math.PI
}

function distanceFrom(centreX: number, centreY: number, x: number, y: number): number {
  return Math.hypot(x - centreX, y - centreY)
}

export function CollageItem({
  placement,
  item,
  selected,
  stageRef,
  onSelect,
  onChange,
  onKeyboardCommand,
}: CollageItemProps) {
  const gesture = useRef<Gesture | null>(null)
  const elementRef = useRef<HTMLDivElement>(null)

  /** The item's centre in viewport pixels — the pivot for rotate and scale. */
  const centreOf = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    return { centreX: rect.left + rect.width / 2, centreY: rect.top + rect.height / 2 }
  }

  const beginGesture = (event: ReactPointerEvent, next: Gesture) => {
    // Pointer capture is what makes a drag survive the cursor leaving the
    // element, and it is the same code path for mouse, pen and touch.
    event.currentTarget.setPointerCapture(event.pointerId)
    event.stopPropagation()
    gesture.current = next
    onSelect()
  }

  const handleDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    beginGesture(event, {
      kind: 'drag',
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: placement.positionX,
      startY: placement.positionY,
    })
  }

  const handleRotateStart = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!elementRef.current) return
    const { centreX, centreY } = centreOf(elementRef.current)

    beginGesture(event, {
      kind: 'rotate',
      centreX,
      centreY,
      startAngle: angleFrom(centreX, centreY, event.clientX, event.clientY),
      startRotation: placement.rotation,
    })
  }

  const handleScaleStart = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!elementRef.current) return
    const { centreX, centreY } = centreOf(elementRef.current)
    const startDistance = distanceFrom(centreX, centreY, event.clientX, event.clientY)

    // A grab exactly on the centre would divide by zero on the first move.
    if (startDistance < 1) return

    beginGesture(event, {
      kind: 'scale',
      centreX,
      centreY,
      startDistance,
      startScale: placement.scale,
    })
  }

  const handlePointerMove = (event: ReactPointerEvent) => {
    const active = gesture.current
    if (!active) return

    if (active.kind === 'drag') {
      const stage = stageRef.current?.getBoundingClientRect()
      if (!stage || stage.width === 0 || stage.height === 0) return

      onChange({
        positionX: clamp(active.startX + (event.clientX - active.pointerX) / stage.width, 0, 1),
        positionY: clamp(active.startY + (event.clientY - active.pointerY) / stage.height, 0, 1),
      })
      return
    }

    if (active.kind === 'rotate') {
      const swept = angleFrom(active.centreX, active.centreY, event.clientX, event.clientY) - active.startAngle
      onChange({ rotation: normaliseRotation(active.startRotation + swept) })
      return
    }

    const distance = distanceFrom(active.centreX, active.centreY, event.clientX, event.clientY)
    onChange({
      scale: clamp((distance / active.startDistance) * active.startScale, MIN_SCALE, MAX_SCALE),
    })
  }

  const handlePointerEnd = (event: ReactPointerEvent) => {
    if (!gesture.current) return
    gesture.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const counterScale = { transform: `scale(${1 / placement.scale})` }

  return (
    <div
      ref={elementRef}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
      aria-label={`${item.clothingItem.name}, layer ${placement.zIndex + 1}. Arrow keys move, shift and arrows resize, square brackets rotate, page up and page down change layer.`}
      onPointerDown={handleDragStart}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onKeyDown={onKeyboardCommand}
      onFocus={onSelect}
      className={cn(
        'absolute cursor-grab touch-none select-none rounded-md outline-none active:cursor-grabbing',
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
      )}
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
        alt={item.clothingItem.name}
        fill
        draggable={false}
        sizes="(max-width: 640px) 33vw, 240px"
        className="pointer-events-none object-contain"
      />

      {selected ? (
        <>
          <button
            type="button"
            aria-label={`Rotate ${item.clothingItem.name}`}
            onPointerDown={handleRotateStart}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            style={{ ...counterScale, width: HANDLE_SIZE_PX, height: HANDLE_SIZE_PX }}
            className="absolute -left-5 -top-5 flex touch-none items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm"
          >
            <RotateGlyph />
          </button>

          <button
            type="button"
            aria-label={`Resize ${item.clothingItem.name}`}
            onPointerDown={handleScaleStart}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            style={{ ...counterScale, width: HANDLE_SIZE_PX, height: HANDLE_SIZE_PX }}
            className="absolute -bottom-5 -right-5 flex touch-none items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm"
          >
            <ResizeGlyph />
          </button>
        </>
      ) : null}
    </div>
  )
}

function RotateGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 3v6h-6" />
    </svg>
  )
}

function ResizeGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M15 3h6v6" />
      <path d="M9 21H3v-6" />
      <path d="M21 3l-7 7" />
      <path d="M3 21l7-7" />
    </svg>
  )
}
