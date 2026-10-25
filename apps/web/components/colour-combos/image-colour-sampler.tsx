'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { ImagePlus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { averageColourAt } from '@/lib/colour-sampling'
import { nearestColourName } from '@/lib/colour-names'

/** Plenty to tap accurately on, without holding a 12MP photo's pixels in memory. */
const MAX_EDGE = 1200
const KEY_STEP = 0.01
const KEY_STEP_LARGE = 0.05

interface Point {
  /** 0–1 across the photo. */
  x: number
  /** 0–1 down the photo. */
  y: number
}

interface ImageColourSamplerProps {
  onAdd: (hex: string) => void
  /** True when the combo is full, so nothing more can be added. */
  disabled?: boolean
}

/**
 * Pick a colour by tapping a photo. The photo is read in the browser and
 * never uploaded: only the colour is kept.
 */
export function ImageColourSampler({ onAdd, disabled }: ImageColourSamplerProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pixelsRef = useRef<ImageData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [point, setPoint] = useState<Point>({ x: 0.5, y: 0.5 })
  const [hex, setHex] = useState<string | null>(null)

  const sample = (next: Point) => {
    const pixels = pixelsRef.current
    if (!pixels) return
    setPoint(next)
    setHex(averageColourAt(pixels.data, pixels.width, pixels.height, next.x * pixels.width, next.y * pixels.height))
  }

  const load = async (file: File) => {
    const canvas = canvasRef.current
    if (!canvas) return

    try {
      // Applies the photo's EXIF orientation, so phone shots are the right way up.
      const bitmap = await createImageBitmap(file)
      const fit = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
      canvas.width = Math.round(bitmap.width * fit)
      canvas.height = Math.round(bitmap.height * fit)

      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) throw new Error('No 2D canvas context')
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      bitmap.close()

      pixelsRef.current = context.getImageData(0, 0, canvas.width, canvas.height)
      setLoaded(true)
      sample({ x: 0.5, y: 0.5 })
    } catch (err) {
      console.error('[image-colour-sampler]', err)
      toast.error("Couldn't open that photo. Try a JPEG or PNG.")
    }
  }

  const tap = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    sample({
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    })
  }

  const add = () => {
    if (hex && !disabled) onAdd(hex)
  }

  // Keyboard parity with tapping: arrows move the sample point, Enter adds it.
  const onKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP
    const moves: Record<string, Point> = {
      ArrowLeft: { x: point.x - step, y: point.y },
      ArrowRight: { x: point.x + step, y: point.y },
      ArrowUp: { x: point.x, y: point.y - step },
      ArrowDown: { x: point.x, y: point.y + step },
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      add()
      return
    }
    const next = moves[event.key]
    if (!next) return
    event.preventDefault()
    sample({ x: Math.min(1, Math.max(0, next.x)), y: Math.min(1, Math.max(0, next.y)) })
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void load(file)
          e.target.value = ''
        }}
      />

      {/* Always mounted so load() has a canvas to draw into; hidden until then. */}
      <div className={loaded ? 'relative mx-auto w-fit max-w-full' : 'hidden'}>
        <canvas
          ref={canvasRef}
          tabIndex={0}
          onPointerDown={tap}
          onKeyDown={onKeyDown}
          aria-label="Photo. Tap a spot, or use the arrow keys, to choose a colour. Press Enter to add it."
          className="block max-h-80 max-w-full cursor-crosshair touch-none rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)]"
          style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%`, backgroundColor: hex ?? 'transparent' }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {loaded && (
          <div className="flex items-center gap-2" aria-live="polite">
            <div
              aria-hidden
              className="size-11 rounded-md border border-border"
              style={{ backgroundColor: hex ?? 'transparent' }}
            />
            <div className="text-sm">
              {hex ? (
                <>
                  <p className="font-medium text-foreground">{nearestColourName(hex)}</p>
                  <p className="font-mono text-xs text-muted-foreground">{hex}</p>
                </>
              ) : (
                <p className="text-muted-foreground">No colour here — try another spot.</p>
              )}
            </div>
          </div>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
            <ImagePlus size={16} />
            {loaded ? 'Another photo' : 'Choose a photo'}
          </Button>
          {loaded && (
            <Button type="button" onClick={add} disabled={!hex || disabled}>
              <Plus size={16} />
              Add colour
            </Button>
          )}
        </div>
      </div>

      {!loaded && (
        <p className="text-xs text-muted-foreground">
          Your photo stays on this device. Only the colour you pick is saved.
        </p>
      )}
    </div>
  )
}
