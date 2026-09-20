'use client'

import type { Outfit } from '@/lib/wardrobe-types'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

/**
 * Radix rejects an empty string as a SelectItem value, so "no outfit" needs a
 * real sentinel that is translated back to null on the way out.
 */
const NONE = 'none'

interface OutfitLinkSelectProps {
  outfits: Outfit[]
  value: string | null
  onChange: (outfitId: string | null) => void
}

export function OutfitLinkSelect({ outfits, value, onChange }: OutfitLinkSelectProps) {
  return (
    <div className="space-y-1.5">
      <Label>Outfit</Label>
      <Select
        value={value ?? NONE}
        onValueChange={(v) => onChange(v === NONE ? null : v)}
        disabled={outfits.length === 0}
      >
        <SelectTrigger>
          <SelectValue placeholder="No outfit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>No outfit</SelectItem>
          {outfits.map((outfit) => (
            <SelectItem key={outfit.id} value={outfit.id}>
              {outfit.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {outfits.length === 0
          ? 'Build an outfit first to link one here — a look is fine without it.'
          : 'Optional. Link this photo to the outfit it recreates.'}
      </p>
    </div>
  )
}
