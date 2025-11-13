'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileUpload } from '@/components/roadmap/FileUpload'
import { ContentDisplay } from './ContentDisplay'
import { QuizComponent } from './QuizComponent'
import { GraphViewer } from './GraphViewer'
import { ProgressTracker } from './ProgressTracker'
import { ActionLog } from '@/components/roadmap/ActionLog'
import { ErrorDisplay } from '@/components/shared/ErrorDisplay'
import { contentApi } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'
import { Download, RefreshCw } from 'lucide-react'

interface ContentGeneratorProps {
  className?: string
}

export function ContentGenerator({ className }: ContentGeneratorProps) {
  const { toast } = useToast()
  
  const [roadmapJson, setRoadmapJson] = useState<any>(null)
  const [file, setFile] = useState<File | null>(null)
  const [content, setContent] = useState<string>('')
  const [quiz, setQuiz] = useState<any[]>([])
  const [graphs, setGraphs] = useState<any[]>([])
  const [actions, setActions] = useState<any[]>([])
  const [currentSubtopic, setCurrentSubtopic] = useState<string>('')
  const [completedSubtopics, setCompletedSubtopics] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [taskId, setTaskId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Poll for progress updates
  useEffect(() => {
    if (!taskId || !isLoading) return

    const interval = setInterval(async () => {
      try {
        const progressData = await contentApi.getProgress(taskId)
        setProgress(progressData.progress || 0)
        setCurrentStep(progressData.current_step || '')
        setActions(progressData.actions || [])

        if (progressData.status === 'completed') {
          setIsLoading(false)
          clearInterval(interval)
        } else if (progressData.status === 'error') {
          setIsLoading(false)
          setError(progressData.message || 'Generation failed')
          clearInterval(interval)
        }
      } catch (err) {
        console.error('Error fetching progress:', err)
      }
    }, 2000) // Poll every 2 seconds

    return () => clearInterval(interval)
  }, [taskId, isLoading])

  // Load completed subtopics
  useEffect(() => {
    loadCompletedSubtopics()
  }, [])

  const loadCompletedSubtopics = async () => {
    try {
      const data = await contentApi.getCompleted()
      setCompletedSubtopics(data.completed_subtopics || [])
    } catch (err) {
      console.error('Error loading completed subtopics:', err)
    }
  }

  const handleFileSelect = async (selectedFile: File | null) => {
    setFile(selectedFile)
    
    if (selectedFile) {
      try {
        const text = await selectedFile.text()
        const json = JSON.parse(text)
        setRoadmapJson(json)
        toast({
          title: 'Roadmap Loaded',
          description: 'Roadmap file loaded successfully.',
        })
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Failed to parse roadmap JSON file.',
          variant: 'destructive',
        })
      }
    }
  }

  const handleGenerate = async (subtopicId?: string) => {
    if (!roadmapJson) {
      toast({
        title: 'Error',
        description: 'Please upload a roadmap JSON file first.',
        variant: 'destructive',
      })
      return
    }

    setError(null)
    setIsLoading(true)
    setProgress(0)
    setCurrentStep('Starting generation...')
    setContent('')
    setQuiz([])
    setGraphs([])
    setActions([])

    try {
      const response = await contentApi.generate(roadmapJson, subtopicId)
      
      setTaskId(response.task_id || null)
      setContent(response.content || '')
      setQuiz(response.quiz || [])
      setGraphs(response.graphs || [])
      setActions(response.actions || [])
      setCurrentSubtopic(response.subtopic_id || '')

      if (response.task_id) {
        // Progress will be updated via polling
      } else {
        setIsLoading(false)
        setProgress(100)
        toast({
          title: 'Content Generated!',
          description: 'Content has been generated successfully.',
        })
        loadCompletedSubtopics()
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to generate content'
      setError(errorMessage)
      setIsLoading(false)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  const handleResetContext = async () => {
    try {
      await contentApi.resetContext()
      setCompletedSubtopics([])
      setContent('')
      setQuiz([])
      toast({
        title: 'Context Reset',
        description: 'Context has been reset successfully.',
      })
    } catch (err: any) {
      toast({
        title: 'Error',
        description: 'Failed to reset context.',
        variant: 'destructive',
      })
    }
  }

  const getNextSubtopic = () => {
    if (!roadmapJson) return null
    
    const allSubtopics = Object.keys(roadmapJson)
      .filter(k => k.startsWith('Subtopic'))
      .sort((a, b) => {
        const numA = parseInt(a.replace('Subtopic', ''))
        const numB = parseInt(b.replace('Subtopic', ''))
        return numA - numB
      })
    
    return allSubtopics.find(st => !completedSubtopics.includes(st)) || null
  }

  const nextSubtopic = getNextSubtopic()

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Roadmap</CardTitle>
            <CardDescription>
              Upload the roadmap JSON file generated by the Roadmap Generator
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload onFileSelect={handleFileSelect} acceptedTypes={['.json']} />
          </CardContent>
        </Card>

        {/* Progress Tracker */}
        {isLoading && (
          <ProgressTracker
            progress={progress}
            currentStep={currentStep}
            status="processing"
          />
        )}

        {/* Actions Log */}
        {actions.length > 0 && (
          <ActionLog actions={actions} />
        )}

        {/* Error Display */}
        {error && (
          <ErrorDisplay error={error} />
        )}

        {/* Generate Button */}
        {roadmapJson && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Generate Content</CardTitle>
                  <CardDescription>
                    {nextSubtopic
                      ? `Next subtopic to generate: ${nextSubtopic}`
                      : 'All subtopics completed!'}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={handleResetContext}
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset Context
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {nextSubtopic ? (
                <Button
                  onClick={() => handleGenerate(nextSubtopic)}
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                >
                  Generate Content for {nextSubtopic}
                </Button>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-4">All subtopics have been completed!</p>
                  <Button
                    onClick={() => handleGenerate()}
                    disabled={isLoading}
                    variant="secondary"
                  >
                    Generate Mega Quiz
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Content Display */}
        {content && (
          <ContentDisplay content={content} />
        )}

        {/* Quiz Display */}
        {quiz.length > 0 && (
          <QuizComponent questions={quiz} />
        )}

        {/* Graphs Display */}
        {graphs.length > 0 && (
          <GraphViewer graphs={graphs} />
        )}

        {/* Completed Subtopics */}
        {completedSubtopics.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Completed Subtopics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {completedSubtopics.map((st) => (
                  <Badge key={st} variant="secondary">{st}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

