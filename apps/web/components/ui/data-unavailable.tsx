'use client'

import { Database, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface DataUnavailableProps {
  resource: 'wardrobe' | 'outfits'
}

export function DataUnavailable({ resource }: DataUnavailableProps) {
  const router = useRouter()

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center rounded-xl border border-border bg-card px-6 py-12 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Database size={22} />
      </div>
      <h1 className="font-serif text-2xl font-medium text-foreground">
        We couldn&apos;t load your {resource}
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Your data is temporarily unavailable. Nothing has been lost—please try again in a moment.
      </p>
      <Button className="mt-6" variant="outline" onClick={() => router.refresh()}>
        <RefreshCw size={16} />
        Try again
      </Button>
    </div>
  )
}
