import { Sidebar } from '@/components/shell/sidebar'
import { BottomNav } from '@/components/shell/bottom-nav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:pl-62 pb-[var(--touch-target)] lg:pb-0">
        <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</div>
      </main>
      <BottomNav />
    </div>
  )
}
