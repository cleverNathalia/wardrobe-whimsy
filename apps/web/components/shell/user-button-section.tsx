'use client'

import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { User } from 'lucide-react'

interface UserButtonSectionProps {
  isDemoMode: boolean
}

export function UserButtonSection({ isDemoMode }: UserButtonSectionProps) {
  if (isDemoMode) {
    return (
      <>
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground px-1">
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
            <User size={14} />
          </div>
          <span>Demo mode</span>
        </div>
        <Link
          href="/sign-in"
          className="flex w-full items-center justify-center rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
        >
          Sign in
        </Link>
      </>
    )
  }

  return <UserButton showName />
}
