'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { navItems } from './nav-items'

const isDemoMode = !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-card border-t border-border z-30 flex safe-bottom">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 py-2 min-h-(--touch-target) text-xs font-medium transition-colors duration-120',
              active ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        )
      })}
      <div className="flex flex-1 flex-col items-center justify-center gap-1 py-2 min-h-(--touch-target)">
        {isDemoMode ? (
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
            <User size={14} className="text-muted-foreground" />
          </div>
        ) : (
          <UserButton />
        )}
      </div>
    </nav>
  )
}
