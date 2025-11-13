import { AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ErrorDisplayProps {
  error: string
  className?: string
}

export function ErrorDisplay({ error, className }: ErrorDisplayProps) {
  return (
    <Card className={cn('border-destructive bg-destructive/10', className)}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p className="font-medium">{error}</p>
        </div>
      </CardContent>
    </Card>
  )
}

