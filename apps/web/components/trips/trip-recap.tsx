import type { TripRecap as TripRecapData } from '@/lib/trips/packing-list'

/** After the trip: what got worn, and what came along for nothing. */
export function TripRecap({ recap }: { recap: TripRecapData }) {
  const { wornOutfitCount, outfitCount, unwornItems } = recap

  return (
    <section className="space-y-2 rounded-xl border border-border bg-card p-5">
      <h2 className="font-serif text-xl font-medium text-foreground">How it went</h2>
      <p className="text-sm text-foreground">
        Wore {wornOutfitCount} of {outfitCount} outfit{outfitCount === 1 ? '' : 's'}.
      </p>
      {unwornItems.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Packed but never worn: {unwornItems.map((item) => item.name).join(', ')}. Worth leaving at home next time?
        </p>
      ) : (
        outfitCount > 0 && <p className="text-sm text-muted-foreground">Everything you packed got worn.</p>
      )}
      <p className="text-xs text-muted-foreground">
        Counted from &ldquo;Wore it&rdquo; logs and looks dated within the trip. Items added on their own aren&apos;t
        tracked.
      </p>
    </section>
  )
}
