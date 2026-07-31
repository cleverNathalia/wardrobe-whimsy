import Link from 'next/link'
import { Shirt } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function EmptyOutfits() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Shirt size={28} className="text-muted-foreground" />
      </div>
      <h2 className="font-serif text-xl font-medium text-foreground mb-1">No outfits yet</h2>
      <p className="text-muted-foreground text-sm mb-6 max-w-xs">
        Combine your wardrobe items into outfits you love.
      </p>
      <Button asChild>
        <Link href="/outfits/new">Create your first outfit</Link>
      </Button>
    </div>
  )
}
