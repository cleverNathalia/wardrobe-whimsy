import Link from 'next/link'
import { SwatchStrip } from './swatch-strip'
import { comboDisplayName } from '@/lib/colour-names'
import type { ColourCombo } from '@/lib/wardrobe-types'

/** The swatch strip is the card's whole picture — a combo has nothing else to show. */
export function ColourComboCard({ combo }: { combo: ColourCombo }) {
  const hexes = combo.swatches.map((swatch) => swatch.hex)
  const outfits = combo.outfitIds.length

  return (
    <Link
      href={`/colour-combos/${combo.id}`}
      className="group block overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
    >
      <SwatchStrip hexes={hexes} className="aspect-[4/3]" />
      <div className="p-3">
        <p className="truncate text-sm font-medium text-foreground">{comboDisplayName(combo.name, hexes)}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {outfits === 0 ? 'No outfits yet' : `${outfits} outfit${outfits === 1 ? '' : 's'}`}
        </p>
      </div>
    </Link>
  )
}
