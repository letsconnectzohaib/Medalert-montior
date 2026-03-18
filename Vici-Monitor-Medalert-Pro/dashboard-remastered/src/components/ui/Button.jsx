import { cn } from '@/lib/utils'

const variants = {
  primary:   'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  outline:   'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground',
  ghost:     'hover:bg-accent hover:text-accent-foreground',
  danger:    'bg-danger text-danger-foreground hover:bg-danger/90 shadow-sm',
}

const sizes = {
  sm:   'h-8 px-3 text-xs rounded-md gap-1.5',
  md:   'h-9 px-4 text-sm rounded-lg gap-2',
  lg:   'h-10 px-5 text-sm rounded-lg gap-2',
  icon: 'size-9 rounded-lg',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all',
        'disabled:opacity-50 disabled:pointer-events-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        'active:scale-[0.98]',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
