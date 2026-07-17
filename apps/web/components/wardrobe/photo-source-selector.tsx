'use client'

import { useState } from 'react'
import { Upload, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ImageUploader } from './image-uploader'
import { GooglePhotosPicker } from './google-photos-picker'

type Source = 'manual' | 'google_photos'

interface UploadResult {
  imageUrl: string
  imagePublicId: string
}

interface PhotoSourceSelectorProps {
  onUploadComplete: (result: UploadResult, source: Source) => void
  cloudinaryAvailable?: boolean
  googlePhotosEnabled?: boolean
  existingImageUrl?: string
}

export function PhotoSourceSelector({
  onUploadComplete,
  cloudinaryAvailable = true,
  googlePhotosEnabled = false,
  existingImageUrl,
}: PhotoSourceSelectorProps) {
  const [activeSource, setActiveSource] = useState<Source>('manual')

  return (
    <div className="space-y-4">
      {/* Source tabs */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setActiveSource('manual')}
          className={cn(
            'flex-1 rounded-xl border-2 p-4 flex items-center gap-3 transition-colors text-left',
            activeSource === 'manual'
              ? 'border-primary bg-primary/5'
              : 'border-border bg-muted/30 hover:border-primary/30',
          )}
        >
          <div
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
              activeSource === 'manual' ? 'bg-primary/10' : 'bg-muted',
            )}
          >
            <Upload size={16} className={activeSource === 'manual' ? 'text-primary' : 'text-muted-foreground'} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Upload from device</p>
            <p className="text-xs text-muted-foreground">JPG, PNG, WEBP up to 10 MB</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => googlePhotosEnabled && setActiveSource('google_photos')}
          disabled={!googlePhotosEnabled}
          className={cn(
            'flex-1 rounded-xl border-2 p-4 flex items-center gap-3 transition-colors text-left',
            !googlePhotosEnabled && 'opacity-50 cursor-not-allowed',
            googlePhotosEnabled && activeSource === 'google_photos'
              ? 'border-primary bg-primary/5'
              : googlePhotosEnabled
                ? 'border-border bg-muted/30 hover:border-primary/30'
                : 'border-border bg-muted/30',
          )}
        >
          <div
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
              activeSource === 'google_photos' ? 'bg-primary/10' : 'bg-muted',
            )}
          >
            <ImageIcon
              size={16}
              className={activeSource === 'google_photos' ? 'text-primary' : 'text-muted-foreground'}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Google Photos</p>
            <p className="text-xs text-muted-foreground">
              {googlePhotosEnabled ? 'Import from your library' : 'Coming in Phase 3'}
            </p>
          </div>
        </button>
      </div>

      {/* Active uploader */}
      {activeSource === 'manual' ? (
        <ImageUploader
          disabled={!cloudinaryAvailable}
          existingImageUrl={existingImageUrl}
          onUploadComplete={(result) => onUploadComplete(result, 'manual')}
        />
      ) : (
        <GooglePhotosPicker
          onUploadComplete={(result) => onUploadComplete(result, 'google_photos')}
        />
      )}
    </div>
  )
}
