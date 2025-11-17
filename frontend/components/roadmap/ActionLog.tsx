'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, XCircle, AlertCircle, Info, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Action {
  type: 'success' | 'error' | 'warning' | 'info' | 'ocr' | 'search' | 'scraping' | 'generating' | 'thinking' | 'clarification' | 'processing'
  message: string
}

interface ActionLogProps {
  actions: Action[]
  className?: string
}

export function ActionLog({ actions, className }: ActionLogProps) {
  const getActionIcon = (type: Action['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case 'generating':
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
      default:
        return <Info className="h-4 w-4 text-blue-600" />
    }
  }

  const getActionColor = (type: Action['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  if (actions.length === 0) {
    return null
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Generation Process</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {actions.map((action, index) => (
            <div
              key={index}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border',
                getActionColor(action.type)
              )}
            >
              {getActionIcon(action.type)}
              <p className="text-sm flex-1">{action.message}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

