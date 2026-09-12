'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { AppImage as Image } from '@/components/ui/app-image'
import { Upload, X, Loader2, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { MODEL_DOWNLOAD_MB, type RemovalProgress } from '@/lib/background-removal'

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
  const [cutOut, setCutOut] = useState(false)
  const [removalStage, setRemovalStage] = useState<RemovalProgress | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  /**
   * The untouched file, so the cut-out can be toggled without re-picking it.
   * State rather than a ref because it decides whether the toggle renders.
   */
  const [originalFile, setOriginalFile] = useState<File | null>(null)

  const releaseObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }, [])

  useEffect(() => releaseObjectUrl, [releaseObjectUrl])

  const uploadToDriveWith = useCallback(
    async (original: File, shouldCutOut: boolean) => {
      setUploading(true)
      try {
        let file = original

        if (shouldCutOut) {
          try {
            // Imported here rather than at module scope so the model runtime is
            // only downloaded by people who actually use the feature.
            const { removeBackground } = await import('@/lib/background-removal')
            file = await removeBackground(original, setRemovalStage)
          } catch (err) {
            // A failed cut-out is not a failed upload — keep the original photo
            // rather than losing the user's work.
            console.error('[background-removal]', err)
            toast.warning('Could not remove the background — uploading the original photo.')
          } finally {
            setRemovalStage(null)
          }
        }

        // Preview whatever is actually being uploaded, so the cut-out is
        // visible — and so toggling back shows the original again. Still a
        // local object URL rather than data.imageUrl, because the proxy route
        // 404s until the form is submitted and a row exists.
        releaseObjectUrl()
        const previewUrl = URL.createObjectURL(file)
        objectUrlRef.current = previewUrl
        setPreview(previewUrl)

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

        // Deliberately keep showing the local object URL rather than switching
        // to data.imageUrl. /api/drive/image resolves the owning wardrobe from
        // a clothing_items row, and that row does not exist until this form is
        // submitted — so the proxied URL would 404 until then.
        onUploadComplete(data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Image upload failed. Please try again.'
        toast.error(message)
        console.error(err)
      } finally {
        setUploading(false)
        setRemovalStage(null)
      }
    },
    [wardrobeId, onUploadComplete, releaseObjectUrl],
  )

  const uploadToDrive = useCallback(
    (original: File) => uploadToDriveWith(original, cutOut),
    [uploadToDriveWith, cutOut],
  )

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      setOriginalFile(file)
      releaseObjectUrl()
      const objectUrl = URL.createObjectURL(file)
      objectUrlRef.current = objectUrl
      setPreview(objectUrl)
      uploadToDrive(file)
    },
    [uploadToDrive, releaseObjectUrl],
  )

  /**
   * Toggling after a photo is chosen re-runs the pipeline on the original
   * file, so the effect is visible immediately instead of only applying to the
   * next upload. The superseded Drive file is left for the orphan sweep.
   */
  const handleCutOutChange = useCallback(
    (next: boolean) => {
      setCutOut(next)

      if (originalFile && !uploading) {
        void uploadToDriveWith(originalFile, next)
      }
    },
    [originalFile, uploading, uploadToDriveWith],
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

  /**
   * Rendered under both the dropzone and the preview. Keeping it visible after
   * a photo is chosen matters: it is the only way to see the effect on the
   * photo you actually picked, and on the edit page a preview exists from the
   * first render, so a dropzone-only toggle would never appear at all.
   */
  const cutOutToggle = (
    <label
      className={cn(
        'flex items-start gap-2.5 select-none rounded-lg border border-border bg-muted/30 px-3 py-2.5',
        uploading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
      )}
    >
      <input
        type="checkbox"
        checked={cutOut}
        disabled={uploading}
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
          {uploading && (
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
          {!uploading && (
            <button
              type="button"
              onClick={() => {
                releaseObjectUrl()
                setOriginalFile(null)
                setPreview(null)
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
          <p className="text-xs text-muted-foreground mt-1">Drag & drop or click to browse · JPG, PNG, WEBP up to 10 MB</p>
        </div>
      </div>

      {cutOutToggle}
    </div>
  )
}
