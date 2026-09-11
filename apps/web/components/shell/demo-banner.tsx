'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Info, X } from 'lucide-react'

const STORAGE_KEY = 'ww-demo-banner-dismissed'

export function DemoBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setVisible(!localStorage.getItem(STORAGE_KEY))
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  if (!visible) return null

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm">
      <Info size={15} className="shrink-0 text-amber-500" />
      <p className="flex-1">
        <span className="font-medium">Demo mode</span> — some features are read-only.{' '}
        <Link href="/sign-in" className="underline underline-offset-2 hover:text-amber-900 transition-colors font-medium">
          Sign in
        </Link>{' '}
        to save items and upload photos.
      </p>
      <button
        onClick={() => {
          localStorage.setItem(STORAGE_KEY, '1')
          setVisible(false)
        }}
        className="shrink-0 p-0.5 rounded hover:bg-amber-100 transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}
