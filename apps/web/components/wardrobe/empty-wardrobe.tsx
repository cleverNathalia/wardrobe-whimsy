import Link from 'next/link'
import { Shirt, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function EmptyWardrobe() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Shirt size={28} className="text-muted-foreground" />
      </div>
      <h2 className="font-serif text-xl font-medium text-foreground mb-2">Your wardrobe is empty</h2>
      <p className="text-muted-foreground text-sm max-w-xs mb-6">
        Add your first item to start building your digital wardrobe.
      </p>
      <Button asChild>
        <Link href="/wardrobe/new">
          <Plus size={16} />
          Add your first item
        </Link>
      </Button>
    </div>
  )
}
