import Link from 'next/link'
import { Luggage } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function EmptyTrips() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Luggage size={28} className="text-muted-foreground" />
      </div>
      <h2 className="mb-1 font-serif text-xl font-medium text-foreground">No trips yet</h2>
      <p className="mb-6 max-w-xs text-sm text-muted-foreground">
        Plan what to pack for a trip — pick outfits, see how many tops and bottoms that adds up to, and tick things off as
        they go in the case.
      </p>
      <Button asChild>
        <Link href="/trips/new">Plan your first trip</Link>
      </Button>
    </div>
  )
}
