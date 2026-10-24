import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarCheck, Shirt } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { requireDefaultWardrobe } from '@/lib/current-wardrobe'
import { getDashboardStats } from '@/lib/wears'
import { formatWearDay } from '@/lib/wear-day'
import { isDatabaseUnavailableError } from '@/lib/database-errors'
import { AppImage as Image } from '@/components/ui/app-image'
import { Button } from '@/components/ui/button'
import { DataUnavailable } from '@/components/ui/data-unavailable'

async function loadDashboard() {
  try {
    const { userId, wardrobeId } = await requireDefaultWardrobe()
    return { kind: 'ready' as const, stats: await getDashboardStats(wardrobeId, userId) }
  } catch (error) {
    if (!isDatabaseUnavailableError(error)) throw error
    console.error('[dashboard/page] Database unavailable', error)
    return { kind: 'unavailable' as const }
  }
}

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const data = await loadDashboard()
  if (data.kind === 'unavailable') return <DataUnavailable resource="dashboard" />
  const { totals, recentlyWorn, mostWornOutfits, mostWornItems, notWornLately } = data.stats

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-medium text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your wardrobe at a glance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Items" value={totals.items} href="/wardrobe" />
        <StatTile label="Outfits" value={totals.outfits} href="/outfits" />
        <StatTile
          label="Wears this month"
          value={totals.wearsThisMonth}
          hint={`${totals.wearsLastMonth} last month`}
        />
      </div>

      {recentlyWorn.length === 0 ? (
        <NoWearsYet />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Recently worn">
            {recentlyWorn.map((wear) => (
              <Row key={`${wear.outfitId}-${wear.day}`} href={`/outfits/${wear.outfitId}`}>
                <RowText primary={wear.outfitName} secondary={formatWearDay(wear.day)} />
              </Row>
            ))}
          </Panel>

          <Panel title="Most-worn outfits">
            {mostWornOutfits.map((outfit) => (
              <Row key={outfit.outfitId} href={`/outfits/${outfit.outfitId}`}>
                <RowText primary={outfit.name} secondary={`Last worn ${formatWearDay(outfit.lastWorn)}`} />
                <Count value={outfit.count} />
              </Row>
            ))}
          </Panel>

          {mostWornItems.length > 0 && (
            <Panel title="Most-worn items" description="Counted through the outfits they are in.">
              {mostWornItems.map((item) => (
                <Row key={item.itemId} href={`/wardrobe/${item.itemId}`}>
                  <Thumb src={item.imageUrl} />
                  <RowText primary={item.name} secondary={`Last worn ${formatWearDay(item.lastWorn)}`} />
                  <Count value={item.count} />
                </Row>
              ))}
            </Panel>
          )}
        </div>
      )}

      {notWornLately.total > 0 && (
        <Panel
          title="Not worn in 60+ days"
          description={
            notWornLately.total > notWornLately.items.length
              ? `${notWornLately.total} items — the longest-forgotten first.`
              : 'The longest-forgotten first.'
          }
        >
          {notWornLately.items.map((item) => (
            <Row key={item.itemId} href={`/wardrobe/${item.itemId}`}>
              <Thumb src={item.imageUrl} />
              <RowText
                primary={item.name}
                secondary={item.lastWorn ? `Last worn ${formatWearDay(item.lastWorn)}` : 'Never worn'}
              />
            </Row>
          ))}
        </Panel>
      )}
    </div>
  )
}

/**
 * Value in the body sans, not the serif display face, and in proportional
 * figures — at this size tabular digits look loose.
 */
function StatTile({ label, value, hint, href }: { label: string; value: number; hint?: string; href?: string }) {
  const body = (
    <>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-4xl font-semibold text-foreground">{value.toLocaleString('en-GB')}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </>
  )

  const className = 'block rounded-xl border border-border bg-card p-5'
  return href ? (
    <Link href={href} className={`${className} transition-shadow hover:shadow-md`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}

function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-serif text-xl font-medium text-foreground">{title}</h2>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      <ul className="mt-3 divide-y divide-border">{children}</ul>
    </section>
  )
}

function Row({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="-mx-2 flex min-h-11 items-center gap-3 rounded-md px-2 py-2 hover:bg-accent">
        {children}
      </Link>
    </li>
  )
}

function RowText({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium text-foreground">{primary}</p>
      <p className="truncate text-xs text-muted-foreground">{secondary}</p>
    </div>
  )
}

/** Tabular figures so a column of counts lines up. */
function Count({ value }: { value: number }) {
  return (
    <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
      {value}×<span className="sr-only"> worn</span>
    </span>
  )
}

function Thumb({ src }: { src: string }) {
  return (
    <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-muted">
      <Image src={src} alt="" fill className="object-contain" sizes="40px" />
    </div>
  )
}

function NoWearsYet() {
  return (
    <div className="flex flex-col items-center rounded-xl border border-border bg-card px-6 py-12 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <CalendarCheck size={22} />
      </div>
      <h2 className="font-serif text-2xl font-medium text-foreground">No wears logged yet</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Open an outfit and press <strong>Wore it</strong>, or link a Look to an outfit. Your most-worn outfits and
        items will show up here.
      </p>
      <Button asChild className="mt-6">
        <Link href="/outfits">
          <Shirt size={16} />
          Go to outfits
        </Link>
      </Button>
    </div>
  )
}

