import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AddItemForm } from '@/components/wardrobe/add-item-form'

const HAS_GOOGLE_PHOTOS = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

export default function NewItemPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href="/wardrobe"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft size={14} />
          Back to wardrobe
        </Link>
        <h1 className="font-serif text-3xl font-medium text-foreground">Add an item</h1>
        <p className="text-muted-foreground text-sm mt-1">Upload a photo and fill in the details.</p>
      </div>

      <AddItemForm googlePhotosEnabled={HAS_GOOGLE_PHOTOS} />
    </div>
  )
}
