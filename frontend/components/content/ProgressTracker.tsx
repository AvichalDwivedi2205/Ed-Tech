'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

interface ProgressTrackerProps {
  progress: number
  currentStep: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  className?: string
}

export function ProgressTracker({ progress, currentStep, status, className }: ProgressTrackerProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {status === 'processing' && <LoadingSpinner size="sm" />}
          Generation Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">{currentStep || 'Initializing...'}</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>
      </CardContent>
    </Card>
  )
}

