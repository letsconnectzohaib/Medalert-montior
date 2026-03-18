import { LogOut, Wifi, WifiOff, AlertTriangle, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/context/AppContext'
import { PAGE_GROUPS } from '@/config/navigation'
import ThemeToggle from './ThemeToggle'

function WsIndicator({ status }) {
  const map = {
    connected:    { Icon: Wifi,          color: 'text-success',  label: 'Live' },
    connecting:   { Icon: Activity,      color: 'text-warning',  label: 'Connecting…' },
    disconnected: { Icon: WifiOff,       color: 'text-muted-foreground', label: 'Offline' },
    unauthorized: { Icon: AlertTriangle, color: 'text-danger',   label: 'Unauthorized' },
  }
  const { Icon, color, label } = map[status] ?? map.disconnected
  return (
    <div className={cn('flex items-center gap-2 text-xs', color)}>
      <Icon className="size-3.5 shrink-0" />
      <span>{label}</span>
    </div>
  )
}

export default function Sidebar() {
  const { page, navigate, logout, wsStatus, user } = useApp()

  return (
    <aside className="
      flex flex-col w-[240px] shrink-0
      h-screen border-r
      bg-[hsl(var(--sidebar-bg))]
      border-[hsl(var(--sidebar-border))]
    ">
      {/* Brand */}
      <div className="flex items-center gap-2.5 h-14 px-4 border-b border-[hsl(var(--sidebar-border))] shrink-0">
        <div className="size-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <span className="text-primary-foreground text-xs font-bold">M</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate leading-none">Medalert Pro</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{user?.username ?? 'Monitor'}</p>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-4 px-2">
        {PAGE_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map(({ id, label, Icon }) => {
                const active = page === id
                return (
                  <li key={id}>
                    <button
                      onClick={() => navigate(id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors text-left',
                        'relative',
                        active
                          ? 'bg-[hsl(var(--sidebar-item-active-bg))] text-[hsl(var(--sidebar-item-active-fg))]'
                          : 'text-foreground/70 hover:bg-[hsl(var(--sidebar-item-hover-bg))] hover:text-foreground',
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r bg-primary" />
                      )}
                      <Icon className="size-4 shrink-0" />
                      {label}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-[hsl(var(--sidebar-border))] px-3 py-3 space-y-2">
        <WsIndicator status={wsStatus} />
        <div className="flex items-center justify-between">
          <ThemeToggle />
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-danger transition-colors"
            title="Logout"
          >
            <LogOut className="size-3.5" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  )
}
