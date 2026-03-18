import { cn } from '@/lib/utils'

export default function NativeSelect({ className, children, ...props }) {
  return (
    <select
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'transition-colors appearance-none cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
