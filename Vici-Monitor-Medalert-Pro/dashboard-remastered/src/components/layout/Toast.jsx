import { useEffect } from 'react'
import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/context/AppContext'

const ICONS = {
  success: CheckCircle,
  warning: AlertTriangle,
  error:   XCircle,
  info:    Info,
}

const COLORS = {
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  error:   'border-danger/30  bg-danger/10  text-danger',
  info:    'border-primary/30 bg-primary/10 text-primary',
}

function ToastItem({ id, type = 'info', message }) {
  const { dismissToast } = useApp()
  const Icon = ICONS[type] ?? Info

  useEffect(() => {
    const t = setTimeout(() => dismissToast(id), 5000)
    return () => clearTimeout(t)
  }, [id, dismissToast])

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm max-w-sm w-full',
        'animate-in slide-in-from-bottom-2 fade-in duration-200',
        'bg-card',
        COLORS[type],
      )}
    >
      <Icon className="size-4 mt-0.5 shrink-0" />
      <span className="flex-1 text-card-foreground">{message}</span>
      <button
        onClick={() => dismissToast(id)}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}

export default function Toast() {
  const { toasts } = useApp()

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end">
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} />
      ))}
    </div>
  )
}
