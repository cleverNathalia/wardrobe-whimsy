import Link from 'next/link'
import { ArrowRight, Shirt, Layers, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-10 bg-background/86 backdrop-blur border-b border-border">
        <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1 select-none">
            <span className="font-serif text-lg font-medium text-primary">Wardrobe</span>
            <span className="font-serif text-lg font-medium text-foreground">Whimsy</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/sign-up">Get started</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24 sm:py-32">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground mb-6">
          Your closet, beautifully organised
        </p>
        <h1 className="font-serif text-5xl sm:text-6xl font-medium text-foreground max-w-2xl leading-tight mb-6">
          Get dressed with{' '}
          <span className="text-primary">intention</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-lg mb-10">
          Catalogue your clothes, build outfits as visual collages, and track what you actually wear.
          Your wardrobe, finally working for you.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" iconRight={<ArrowRight size={18} />} asChild>
            <Link href="/sign-up">Start for free</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
      </section>

      {/* Feature strip */}
      <section className="border-t border-border bg-muted/40">
        <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 py-16 grid sm:grid-cols-3 gap-10">
          <div className="flex flex-col gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              <Shirt size={20} className="text-primary" />
            </div>
            <h3 className="font-sans font-semibold text-foreground">Catalogue your clothes</h3>
            <p className="text-muted-foreground text-sm">
              Upload photos and add details — category, colour, season, occasion. Import directly from Google Photos.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center">
              <Layers size={20} className="text-secondary-foreground" />
            </div>
            <h3 className="font-sans font-semibold text-foreground">Build outfit collages</h3>
            <p className="text-muted-foreground text-sm">
              Drag, scale, and layer clothing items into visual collages. Save your best combinations as outfits.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="w-10 h-10 rounded-md bg-gold/20 flex items-center justify-center">
              <Star size={20} className="text-gold" />
            </div>
            <h3 className="font-sans font-semibold text-foreground">Track what you wear</h3>
            <p className="text-muted-foreground text-sm">
              Log wear dates and see what actually gets used. Discover your real favourites, retire what you never reach for.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Wardrobe Whimsy
      </footer>
    </div>
  )
}
