import * as RadixSeparator from '@radix-ui/react-separator'
import { cn } from '@/lib/utils'

export default function Separator({ className, orientation = 'horizontal', decorative = true, ...props }) {
  return (
    <RadixSeparator.Root
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  )
}
