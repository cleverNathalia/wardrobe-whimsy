'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, Camera, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { nearestColourName } from '@/lib/colour-names'
import type { SwatchSource } from '@/lib/wardrobe-types'
import { ImageColourSampler } from './image-colour-sampler'

export const MAX_SWATCHES = 12

export interface DraftSwatch {
  /** Client-only, so React can track a swatch while the list is reordered. */
  key: string
  hex: string
  label: string
  source: SwatchSource
}

const HEX_PATTERN = /^#[0-9a-f]{6}$/i

interface SwatchEditorProps {
  value: DraftSwatch[]
  onChange: (swatches: DraftSwatch[]) => void
}

export function SwatchEditor({ value, onChange }: SwatchEditorProps) {
  const [draft, setDraft] = useState('#6a8caf')
  const [sampling, setSampling] = useState(false)
  const draftValid = HEX_PATTERN.test(draft)
  const full = value.length >= MAX_SWATCHES

  const append = (hex: string, source: SwatchSource) => {
    if (full) return
    onChange([...value, { key: crypto.randomUUID(), hex: hex.toLowerCase(), label: '', source }])
  }

  const add = () => {
    if (draftValid) append(draft, 'picker')
  }

  const update = (key: string, label: string) =>
    onChange(value.map((swatch) => (swatch.key === key ? { ...swatch, label } : swatch)))

  const remove = (key: string) => onChange(value.filter((swatch) => swatch.key !== key))

  const move = (index: number, by: -1 | 1) => {
    const next = [...value]
    ;[next[index], next[index + by]] = [next[index + by], next[index]]
    onChange(next)
  }

  return (
    <div className="space-y-4">
      {value.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {value.map((swatch, index) => {
            const name = swatch.label || nearestColourName(swatch.hex)
            return (
              <li key={swatch.key} className="flex items-center gap-3 p-2">
                <div
                  className="size-11 shrink-0 rounded-md border border-border"
                  style={{ backgroundColor: swatch.hex }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <Input
                    value={swatch.label}
                    maxLength={30}
                    placeholder={nearestColourName(swatch.hex)}
                    aria-label={`Label for ${swatch.hex}`}
                    onChange={(e) => update(swatch.key, e.target.value)}
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono">{swatch.hex}</span>
                    {swatch.source === 'image' && ' · from a photo'}
                  </p>
                </div>
                <div className="flex shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={`Move ${name} earlier`}
                  >
                    <ArrowUp size={16} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11"
                    disabled={index === value.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={`Move ${name} later`}
                  >
                    <ArrowDown size={16} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11"
                    onClick={() => remove(swatch.key)}
                    aria-label={`Remove ${name}`}
                  >
                    <X size={16} />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="swatch-picker">Colour</Label>
          {/* The browser's own picker: works with touch, and on phones opens
              the system colour picker. */}
          <input
            id="swatch-picker"
            type="color"
            value={draftValid ? draft.toLowerCase() : '#000000'}
            onChange={(e) => setDraft(e.target.value)}
            className="block size-11 cursor-pointer rounded-md border border-border bg-transparent p-1"
          />
        </div>
        <div className="w-32 space-y-1.5">
          <Label htmlFor="swatch-hex">Hex</Label>
          <Input
            id="swatch-hex"
            value={draft}
            maxLength={7}
            spellCheck={false}
            onChange={(e) => setDraft(e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`)}
            aria-invalid={!draftValid}
            className="font-mono"
          />
        </div>
        <Button type="button" variant="outline" onClick={add} disabled={!draftValid || full}>
          <Plus size={16} />
          Add colour
        </Button>
        <Button
          type="button"
          variant={sampling ? 'secondary' : 'ghost'}
          aria-expanded={sampling}
          onClick={() => setSampling((open) => !open)}
        >
          <Camera size={16} />
          From a photo
        </Button>
      </div>
      {sampling && <ImageColourSampler onAdd={(hex) => append(hex, 'image')} disabled={full} />}
      {full && <p className="text-xs text-muted-foreground">A combo can hold up to {MAX_SWATCHES} colours.</p>}
    </div>
  )
}
