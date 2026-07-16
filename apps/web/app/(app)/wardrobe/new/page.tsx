import Link from 'next/link'
import { ArrowLeft, Image as ImageIcon } from 'lucide-react'
import { AddItemForm } from '@/components/wardrobe/add-item-form'
import { HAS_CLOUDINARY } from '@/lib/cloudinary'

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

      <div className="flex gap-3">
        <div className="flex-1 rounded-xl border-2 border-primary bg-primary/5 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <ImageIcon size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Upload from device</p>
            <p className="text-xs text-muted-foreground">JPG, PNG, WEBP up to 10 MB</p>
          </div>
        </div>
        <div className="flex-1 rounded-xl border border-border bg-muted/30 p-4 flex items-center gap-3 opacity-50 cursor-not-allowed">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <ImageIcon size={16} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Google Photos</p>
            <p className="text-xs text-muted-foreground">Coming in Phase 3</p>
          </div>
        </div>
      </div>

      <AddItemForm cloudinaryAvailable={HAS_CLOUDINARY} />
    </div>
  )
}
