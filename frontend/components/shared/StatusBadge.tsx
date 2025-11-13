import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'

interface StatusBadgeProps {
  status: 'success' | 'error' | 'pending' | 'processing'
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variants = {
    success: {
      className: 'bg-green-100 text-green-800 border-green-200',
      icon: CheckCircle2,
      label: 'Success',
    },
    error: {
      className: 'bg-red-100 text-red-800 border-red-200',
      icon: XCircle,
      label: 'Error',
    },
    pending: {
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: Clock,
      label: 'Pending',
    },
    processing: {
      className: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: Loader2,
      label: 'Processing',
    },
  }

  const variant = variants[status]
  const Icon = variant.icon

  return (
    <Badge
      className={cn(
        'flex items-center gap-1.5 border',
        variant.className,
        className
      )}
    >
      <Icon className={cn('h-3 w-3', status === 'processing' && 'animate-spin')} />
      {variant.label}
    </Badge>
  )
}

