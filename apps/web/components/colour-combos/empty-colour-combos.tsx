import Link from 'next/link'
import { Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function EmptyColourCombos() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Palette size={28} className="text-muted-foreground" />
      </div>
      <h2 className="mb-1 font-serif text-xl font-medium text-foreground">No colour combos yet</h2>
      <p className="mb-6 max-w-xs text-sm text-muted-foreground">
        Save colours that work together — green, yellow and purple, say — and link the outfits that wear them.
      </p>
      <Button asChild>
        <Link href="/colour-combos/new">Make your first combo</Link>
      </Button>
    </div>
  )
}
