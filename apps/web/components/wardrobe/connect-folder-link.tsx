'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { HardDrive } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ConnectFolderLinkProps {
  wardrobeId: string
}

export function ConnectFolderLink({ wardrobeId }: ConnectFolderLinkProps) {
  const router = useRouter()
  const [folderLink, setFolderLink] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const extractFolderId = (link: string): string | null => {
    // Handle full URLs like https://drive.google.com/drive/folders/FOLDER_ID
    const match = link.match(/\/folders\/([a-zA-Z0-9-_]+)/)
    if (match) return match[1]

    // Handle just folder IDs
    if (/^[a-zA-Z0-9-_]+$/.test(link)) return link

    return null
  }

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const folderId = extractFolderId(folderLink.trim())
    if (!folderId) {
      setError('Invalid Google Drive folder link or ID')
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/wardrobes/${wardrobeId}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleFolderId: folderId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to connect folder')
      }

      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not connect folder'
      setError(message)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto rounded-xl border border-border bg-muted/40 p-8 text-center space-y-4">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
        <HardDrive size={20} className="text-muted-foreground" />
      </div>
      <div>
        <h2 className="font-serif text-xl font-medium text-foreground">Connect Google Drive Folder</h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          Share a Google Drive folder with us. We&apos;ll store your wardrobe photos there — they stay in your Google
          Drive, not our servers.
        </p>
      </div>

      <form onSubmit={handleConnect} className="space-y-3">
        <input
          type="text"
          placeholder="Paste folder link or ID..."
          value={folderLink}
          onChange={(e) => setFolderLink(e.target.value)}
          disabled={loading}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm placeholder:text-muted-foreground disabled:opacity-50"
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" loading={loading} disabled={!folderLink.trim() || loading} className="w-full">
          Connect Folder
        </Button>
      </form>

      <div className="pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          <strong>How to:</strong> Open Google Drive → Create a folder → Right-click → Share with{' '}
          <code className="bg-muted px-1 py-0.5 rounded">your-email@gmail.com</code> → Copy the folder link and paste
          it above
        </p>
      </div>
    </div>
  )
}
