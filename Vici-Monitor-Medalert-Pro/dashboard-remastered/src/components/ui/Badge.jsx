import { cn } from '@/lib/utils'

const variants = {
  default:  'bg-primary/10 text-primary border-primary/20',
  success:  'bg-success/10 text-success border-success/20',
  warning:  'bg-warning/10 text-warning border-warning/20',
  danger:   'bg-danger/10  text-danger  border-danger/20',
  muted:    'bg-muted text-muted-foreground border-transparent',
  outline:  'border-border text-foreground',
}

export default function Badge({ variant = 'default', className, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
