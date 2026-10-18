import { ExternalLink, HardDrive, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { requireDefaultWardrobe } from '@/lib/current-wardrobe'
import { isGoogleLoginWorking } from '@/lib/google-oauth'

const RECONNECT_HREF = '/api/auth/google/start?returnTo=/settings'

type DriveStatus =
  | { kind: 'working'; folderId: string | null }
  | { kind: 'disconnected' }
  | { kind: 'unknown' }

async function loadDriveStatus(): Promise<DriveStatus> {
  try {
    const { userId, googleFolderId } = await requireDefaultWardrobe()
    if (!(await isGoogleLoginWorking(userId))) return { kind: 'disconnected' }
    return { kind: 'working', folderId: googleFolderId }
  } catch (err) {
    // Shown rather than thrown: the rest of Settings works without the
    // database or Google, so one failed check must not take the page down.
    console.error('[settings/google-drive]', err)
    return { kind: 'unknown' }
  }
}

function describe(status: DriveStatus): string {
  switch (status.kind) {
    case 'working':
      return status.folderId
        ? 'Connected. Your photos are saved to a Wardrobe Whimsy folder in your Drive.'
        : 'Connected. Your Wardrobe Whimsy folder will be created with your first photo.'
    case 'disconnected':
      return 'Not connected. Connect your Google Drive to save photos.'
    case 'unknown':
      return "We couldn't check your connection just now. If uploads are failing, try reconnecting."
  }
}

/**
 * A way back that does not depend on anything else working. Uploads and the
 * wardrobe page recover a dead login on their own, but this is where to go if
 * they ever don't.
 */
export async function GoogleDriveSettings({ googleStatus }: { googleStatus?: string }) {
  const status = await loadDriveStatus()

  return (
    <section className="max-w-2xl space-y-4 rounded-xl border border-border bg-card p-6">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
          <HardDrive size={18} className="text-muted-foreground" />
        </div>
        <div>
          <h2 className="font-serif text-xl font-medium text-foreground">Google Drive</h2>
          <p className="mt-1 text-sm text-muted-foreground">{describe(status)}</p>
        </div>
      </div>

      {googleStatus && googleStatus !== 'connected' && (
        <p className="text-xs text-destructive">Google didn&apos;t finish connecting. Please try again.</p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant={status.kind === 'working' ? 'outline' : 'primary'}>
          <a href={RECONNECT_HREF}>
            <RefreshCw size={14} />
            {status.kind === 'disconnected' ? 'Connect Google Drive' : 'Reconnect'}
          </a>
        </Button>
        {status.kind === 'working' && status.folderId && (
          <Button asChild size="sm" variant="outline">
            <a
              href={`https://drive.google.com/drive/folders/${status.folderId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={14} />
              Open folder
            </a>
          </Button>
        )}
      </div>
    </section>
  )
}
