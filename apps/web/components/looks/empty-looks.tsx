import Link from 'next/link'
import { Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function EmptyLooks() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Camera size={28} className="text-muted-foreground" />
      </div>
      <h2 className="font-serif text-xl font-medium text-foreground mb-1">No looks yet</h2>
      <p className="text-muted-foreground text-sm mb-6 max-w-xs">
        Add a photo of yourself wearing something you loved.
      </p>
      <Button asChild>
        <Link href="/looks/new">Add your first look</Link>
      </Button>
    </div>
  )
}
