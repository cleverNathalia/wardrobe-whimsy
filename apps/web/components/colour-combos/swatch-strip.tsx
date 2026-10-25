import { cn } from '@/lib/utils'
import { comboDisplayName } from '@/lib/colour-names'

interface SwatchStripProps {
  hexes: string[]
  className?: string
}

/**
 * A combo drawn as equal-width bands of its colours, in order. The bands carry
 * no text, so the strip is labelled as a whole for screen readers.
 */
export function SwatchStrip({ hexes, className }: SwatchStripProps) {
  return (
    <div
      role="img"
      aria-label={`Colours: ${comboDisplayName(null, hexes)}`}
      className={cn('flex overflow-hidden', className)}
    >
      {hexes.map((hex, index) => (
        <div key={`${hex}-${index}`} className="flex-1" style={{ backgroundColor: hex }} />
      ))}
    </div>
  )
}
