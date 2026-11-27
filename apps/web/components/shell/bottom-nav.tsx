'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { cn } from '@/lib/utils'
import { navItems } from './nav-items'

/**
 * The tabs scroll sideways once there are more than fit — a 360px phone shows
 * four — and the account button stays pinned on the right. A fade on whichever
 * edge has more tabs behind it is the only hint the row scrolls, so it matters.
 */
export function BottomNav() {
  const pathname = usePathname()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [more, setMore] = useState({ left: false, right: false })

  const updateFades = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    // 1px of slack: scroll positions can land on fractions at some zoom levels.
    setMore({
      left: el.scrollLeft > 1,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
    })
  }, [])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    updateFades()
    const observer = new ResizeObserver(updateFades)
    observer.observe(el)
    return () => observer.disconnect()
  }, [updateFades])

  // Keep the current page's tab on screen, e.g. after following a link to Settings.
  useEffect(() => {
    const active = scrollerRef.current?.querySelector('[aria-current="page"]')
    active?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [pathname])

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-card border-t border-border z-30 flex safe-bottom">
      <div className="relative flex-1 min-w-0">
        <div
          ref={scrollerRef}
          onScroll={updateFades}
          className="flex overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex w-18 shrink-0 snap-start flex-col items-center justify-center gap-1 py-2 min-h-(--touch-target) text-xs font-medium transition-colors duration-120',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon size={20} />
                <span>{label}</span>
              </Link>
            )
          })}
        </div>

        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-y-0 left-0 w-8 bg-linear-to-r from-card to-transparent transition-opacity duration-120',
            more.left ? 'opacity-100' : 'opacity-0',
          )}
        />
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-card to-transparent transition-opacity duration-120',
            more.right ? 'opacity-100' : 'opacity-0',
          )}
        />
      </div>

      {/* Sets the pinned account button apart from the tabs scrolling past it. */}
      <div aria-hidden className="h-8 w-px shrink-0 self-center bg-border" />

      <div className="flex w-18 shrink-0 flex-col items-center justify-center gap-1 py-2 min-h-(--touch-target)">
        <UserButton />
      </div>
    </nav>
  )
}
