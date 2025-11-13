'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Lock, Unlock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuizQuestion {
  question: string
  type: 'multiple_choice' | 'short_answer' | 'true_false'
  options?: string[]
  correct_answer: string
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
}

interface QuizComponentProps {
  questions: QuizQuestion[]
  className?: string
}

export function QuizComponent({ questions, className }: QuizComponentProps) {
  const [revealedAnswers, setRevealedAnswers] = useState<Set<number>>(new Set())

  const toggleReveal = (index: number) => {
    setRevealedAnswers((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'hard':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (questions.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">No quiz questions available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Quiz Questions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {questions.map((question, index) => {
          const isRevealed = revealedAnswers.has(index)

          return (
            <Card key={index} className="border-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                  <Badge className={cn('border', getDifficultyColor(question.difficulty))}>
                    {question.difficulty.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="font-medium">{question.question}</p>

                {question.type === 'multiple_choice' && question.options && (
                  <div className="space-y-2">
                    {question.options.map((option, optIndex) => (
                      <div
                        key={optIndex}
                        className={cn(
                          'p-3 border rounded-lg',
                          isRevealed && option === question.correct_answer
                            ? 'bg-green-50 border-green-200'
                            : 'bg-muted/50'
                        )}
                      >
                        <span className="font-medium mr-2">{String.fromCharCode(65 + optIndex)}.</span>
                        {option}
                        {isRevealed && option === question.correct_answer && (
                          <CheckCircle2 className="h-4 w-4 text-green-600 inline-block ml-2" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {question.type === 'true_false' && (
                  <div className="space-y-2">
                    {['True', 'False'].map((option) => (
                      <div
                        key={option}
                        className={cn(
                          'p-3 border rounded-lg',
                          isRevealed && option === question.correct_answer
                            ? 'bg-green-50 border-green-200'
                            : 'bg-muted/50'
                        )}
                      >
                        {option}
                        {isRevealed && option === question.correct_answer && (
                          <CheckCircle2 className="h-4 w-4 text-green-600 inline-block ml-2" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {isRevealed && (
                  <div className="space-y-2 pt-4 border-t">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-800">Correct Answer:</p>
                        <p className="text-sm">{question.correct_answer}</p>
                      </div>
                    </div>
                    {question.explanation && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-blue-900 mb-1">Explanation:</p>
                        <p className="text-sm text-blue-800">{question.explanation}</p>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  variant="outline"
                  onClick={() => toggleReveal(index)}
                  className="w-full"
                >
                  {isRevealed ? (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Hide Answer
                    </>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4 mr-2" />
                      Reveal Answer
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </CardContent>
    </Card>
  )
}

