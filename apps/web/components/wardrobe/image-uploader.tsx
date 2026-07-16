'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import Image from 'next/image'
import { Upload, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface UploadResult {
  imageUrl: string
  imagePublicId: string
}

interface ImageUploaderProps {
  onUploadComplete: (result: UploadResult) => void
  existingImageUrl?: string
  disabled?: boolean
}

export function ImageUploader({ onUploadComplete, existingImageUrl, disabled }: ImageUploaderProps) {
  if (disabled) {
    return (
      <div className="aspect-square w-full max-w-sm flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 cursor-not-allowed opacity-60">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <Upload size={20} className="text-muted-foreground" />
        </div>
        <div className="text-center px-4">
          <p className="text-sm font-medium text-foreground">Image upload unavailable</p>
          <p className="text-xs text-muted-foreground mt-1">Add your Cloudinary keys to enable photo uploads</p>
        </div>
      </div>
    )
  }

  const [preview, setPreview] = useState<string | null>(existingImageUrl ?? null)
  const [uploading, setUploading] = useState(false)

  const uploadToCloudinary = useCallback(
    async (file: File) => {
      setUploading(true)
      try {
        const sigRes = await fetch('/api/cloudinary/sign', { method: 'POST' })
        if (!sigRes.ok) throw new Error('Failed to get upload signature')
        const { timestamp, signature, cloudName, apiKey, folder } = await sigRes.json()

        const formData = new FormData()
        formData.append('file', file)
        formData.append('timestamp', String(timestamp))
        formData.append('signature', signature)
        formData.append('api_key', apiKey)
        formData.append('folder', folder)

        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData,
        })
        if (!uploadRes.ok) throw new Error('Upload to Cloudinary failed')

        const data = await uploadRes.json()
        setPreview(data.secure_url)
        onUploadComplete({ imageUrl: data.secure_url, imagePublicId: data.public_id })
      } catch (err) {
        toast.error('Image upload failed. Please try again.')
        console.error(err)
      } finally {
        setUploading(false)
      }
    },
    [onUploadComplete],
  )

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return
      const objectUrl = URL.createObjectURL(file)
      setPreview(objectUrl)
      uploadToCloudinary(file)
    },
    [uploadToCloudinary],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  })

  const clearImage = () => {
    setPreview(null)
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
            onClick={clearImage}
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
      className={cn(
        'aspect-square w-full max-w-sm flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors',
        isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50',
      )}
    >
      <input {...getInputProps()} />
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
