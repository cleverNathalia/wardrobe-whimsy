'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { AppImage as Image } from '@/components/ui/app-image'
import { Upload, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface UploadResult {
  imageUrl: string
  imageFileId: string
}

interface ImageUploaderProps {
  /** Which wardrobe's Drive folder the file lands in. */
  wardrobeId: string
  onUploadComplete: (result: UploadResult) => void
  existingImageUrl?: string
  disabled?: boolean
}

export function ImageUploader({
  wardrobeId,
  onUploadComplete,
  existingImageUrl,
  disabled,
}: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(existingImageUrl ?? null)
  const [uploading, setUploading] = useState(false)

  const uploadToDrive = useCallback(
    async (file: File) => {
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('wardrobeId', wardrobeId)

        const uploadRes = await fetch('/api/drive/upload', { method: 'POST', body: formData })

        if (!uploadRes.ok) {
          const error = await uploadRes.json().catch(() => ({}))
          if (error.code === 'GOOGLE_NOT_CONNECTED' || error.code === 'FOLDER_NOT_CONNECTED') {
            throw new Error('Please connect your Google Drive first.')
          }
          throw new Error(error.error || 'Upload to Google Drive failed')
        }

        const data: UploadResult = await uploadRes.json()
        setPreview(data.imageUrl)
        onUploadComplete(data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Image upload failed. Please try again.'
        toast.error(message)
        console.error(err)
      } finally {
        setUploading(false)
      }
    },
    [wardrobeId, onUploadComplete],
  )

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return
      const objectUrl = URL.createObjectURL(file)
      setPreview(objectUrl)
      uploadToDrive(file)
    },
    [uploadToDrive],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    disabled,
  })

  if (disabled) {
    return (
      <div className="aspect-square w-full max-w-sm flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 cursor-not-allowed opacity-60">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <Upload size={20} className="text-muted-foreground" />
        </div>
        <div className="text-center px-4">
          <p className="text-sm font-medium text-foreground">Image upload unavailable</p>
          <p className="text-xs text-muted-foreground mt-1">Connect your Google Drive to upload photos</p>
        </div>
      </div>
    )
  }

  if (preview) {
    return (
      <div className="relative aspect-square w-full max-w-sm rounded-xl overflow-hidden border border-border bg-muted">
        {uploading && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-10">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        )}
        <Image src={preview} alt="Preview" fill className="object-cover" sizes="400px" />
        {!uploading && (
          <button
            type="button"
            onClick={() => setPreview(null)}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      {...getRootProps()}
      suppressHydrationWarning
      className={cn(
        'aspect-square w-full max-w-sm flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors',
        isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50',
      )}
    >
      <input {...getInputProps()} suppressHydrationWarning />
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <Upload size={20} className="text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          {isDragActive ? 'Drop it here' : 'Upload a photo'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">Drag & drop or click to browse · JPG, PNG, WEBP up to 10 MB</p>
      </div>
    </div>
  )
}
