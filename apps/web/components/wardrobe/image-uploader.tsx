'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { AppImage as Image } from '@/components/ui/app-image'
import { Upload, X, Loader2, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { MODEL_DOWNLOAD_MB, type RemovalProgress } from '@/lib/background-removal'
import type { PendingPhoto } from '@/lib/pending-photo'

interface ImageUploaderProps {
  /** Called with the chosen photo, or null when it is cleared. */
  onChange: (pending: PendingPhoto | null) => void
  existingImageUrl?: string
  disabled?: boolean
}

/**
 * Picks a photo and optionally cuts out its background — entirely locally.
 *
 * Nothing is uploaded here. The file is handed to the form, which uploads it
 * once on submit, so abandoning the form or changing your mind about the
 * background costs nothing and leaves nothing in Drive.
 */
export function ImageUploader({ onChange, existingImageUrl, disabled }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(existingImageUrl ?? null)
  const [originalFile, setOriginalFile] = useState<File | null>(null)
  const [cutOut, setCutOut] = useState(false)
  const [removalStage, setRemovalStage] = useState<RemovalProgress | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  const busy = removalStage !== null

  const releaseObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }, [])

  useEffect(() => releaseObjectUrl, [releaseObjectUrl])

  /** Points the preview at `file` and tells the form that is what to upload. */
  const present = useCallback(
    (file: File) => {
      releaseObjectUrl()
      const previewUrl = URL.createObjectURL(file)
      objectUrlRef.current = previewUrl

      setPreview(previewUrl)
      onChange({ kind: 'file', file, previewUrl })
    },
    [onChange, releaseObjectUrl],
  )

  /** Applies or removes the cut-out, re-deriving from the untouched original. */
  const applyCutOut = useCallback(
    async (file: File, shouldCutOut: boolean) => {
      if (!shouldCutOut) {
        present(file)
        return
      }

      try {
        // Imported here rather than at module scope so the model runtime is
        // only downloaded by people who actually use the feature.
        const { removeBackground } = await import('@/lib/background-removal')
        present(await removeBackground(file, setRemovalStage))
      } catch (err) {
        // Fall back to the original rather than losing the user's photo.
        console.error('[background-removal]', err)
        toast.warning('Could not remove the background — keeping the original photo.')
        present(file)
      } finally {
        setRemovalStage(null)
      }
    },
    [present],
  )

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      setOriginalFile(file)
      present(file)

      if (cutOut) void applyCutOut(file, true)
    },
    [cutOut, present, applyCutOut],
  )

  const handleCutOutChange = useCallback(
    (next: boolean) => {
      setCutOut(next)
      if (originalFile && !busy) void applyCutOut(originalFile, next)
    },
    [originalFile, busy, applyCutOut],
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

  const cutOutToggle = (
    <label
      className={cn(
        'flex items-start gap-2.5 select-none rounded-lg border border-border bg-muted/30 px-3 py-2.5',
        busy ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
      )}
    >
      <input
        type="checkbox"
        checked={cutOut}
        disabled={busy}
        onChange={(e) => handleCutOutChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-(--color-primary) cursor-pointer disabled:cursor-not-allowed"
      />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Wand2 size={14} className="text-primary shrink-0" />
          Remove the background
        </span>
        <span className="block text-xs text-muted-foreground mt-0.5">
          Cuts the item out so it sits on a clean background. Runs on your device — the photo is
          never sent anywhere for this. First use downloads ~{MODEL_DOWNLOAD_MB} MB.
        </span>
      </span>
    </label>
  )

  if (preview) {
    return (
      <div className="w-full max-w-sm space-y-3">
        <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-border bg-muted">
          {busy && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 z-10 px-4 text-center">
              <Loader2 size={24} className="animate-spin text-primary" />
              {removalStage === 'loading-model' && (
                <p className="text-xs text-muted-foreground">
                  Downloading the cut-out model (~{MODEL_DOWNLOAD_MB} MB, once only)…
                </p>
              )}
              {removalStage === 'processing' && (
                <p className="text-xs text-muted-foreground">Removing the background…</p>
              )}
            </div>
          )}
          <Image src={preview} alt="Preview" fill className="object-cover" sizes="400px" />
          {!busy && (
            <button
              type="button"
              onClick={() => {
                releaseObjectUrl()
                setOriginalFile(null)
                setPreview(null)
                onChange(null)
              }}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {originalFile && cutOutToggle}
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm space-y-3">
      <div
        {...getRootProps()}
        suppressHydrationWarning
        className={cn(
          'aspect-square w-full flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors',
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
          <p className="text-xs text-muted-foreground mt-1">Drag &amp; drop or click to browse · JPG, PNG, WEBP up to 10 MB</p>
        </div>
      </div>

      {cutOutToggle}
    </div>
  )
}
