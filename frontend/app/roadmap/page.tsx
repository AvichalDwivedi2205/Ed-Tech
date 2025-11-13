'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RoadmapChat } from '@/components/roadmap/RoadmapChat'
import { RoadmapVisualization } from '@/components/roadmap/RoadmapVisualization'
import { FileUpload } from '@/components/roadmap/FileUpload'
import { ActionLog } from '@/components/roadmap/ActionLog'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorDisplay } from '@/components/shared/ErrorDisplay'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { roadmapApi } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Action {
  type: 'success' | 'error' | 'warning' | 'info' | 'ocr' | 'search' | 'scraping' | 'generating' | 'thinking' | 'clarification' | string
  message: string
}

export default function RoadmapPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [messages, setMessages] = useState<Message[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [roadmapJson, setRoadmapJson] = useState<any>(null)
  const [actions, setActions] = useState<Action[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [waitingForResponse, setWaitingForResponse] = useState(false)

  const handleSendMessage = async (message: string) => {
    setError(null)
    setIsLoading(true)
    setWaitingForResponse(false)

    // Add user message to chat
    const userMessage: Message = { role: 'user', content: message }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)

    try {
      // Build conversation history from current messages including the new one
      const conversationHistory = updatedMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
      
      const response = await roadmapApi.generate(message, file || undefined, sessionId || undefined, conversationHistory)
      
      // Update session ID if provided
      if (response.session_id) {
        setSessionId(response.session_id)
      }

      // Extract clarification question from actions
      const clarificationAction = response.actions?.find((action: Action) => action.type === 'clarification')
      
      // Add assistant response
      if (response.roadmap) {
        const assistantMessage: Message = { role: 'assistant', content: response.roadmap }
        setMessages((prev) => [...prev, assistantMessage])
      } else if (clarificationAction) {
        // Display clarification question as assistant message
        const clarificationMessage: Message = { 
          role: 'assistant', 
          content: clarificationAction.message 
        }
        setMessages((prev) => [...prev, clarificationMessage])
      }

      // Update roadmap JSON if available
      if (response.roadmap_json) {
        setRoadmapJson(response.roadmap_json)
      }

      // Update actions
      if (response.actions) {
        setActions((prev) => [...prev, ...response.actions])
      }

      // Check if waiting for response
      setWaitingForResponse(response.waiting_for_response || false)

      // Show success toast
      if (response.roadmap_json) {
        toast({
          title: 'Roadmap Generated!',
          description: 'Your learning roadmap has been created successfully.',
        })
      } else if (response.waiting_for_response && clarificationAction) {
        toast({
          title: 'Clarification Needed',
          description: clarificationAction.message,
        })
      }
    } catch (err: any) {
      let errorMessage = 'Failed to generate roadmap'
      
      if (err.response) {
        // Server responded with error status
        errorMessage = err.response.data?.error || err.response.data?.detail || `Server error: ${err.response.status}`
      } else if (err.request) {
        // Request was made but no response received
        errorMessage = `Cannot connect to backend at ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}. Make sure the backend server is running.`
      } else {
        // Error in request setup
        errorMessage = err.message || 'Network error occurred'
      }
      
      console.error('Roadmap generation error:', err)
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (selectedFile: File | null) => {
    setFile(selectedFile)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Roadmap Generator
          </h1>
          <p className="text-muted-foreground">
            Create personalized learning roadmaps with AI assistance
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Chat and File Upload */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload Document (Optional)</CardTitle>
                <CardDescription>
                  Upload an image or PDF of an existing roadmap to enhance it
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUpload onFileSelect={handleFileSelect} />
              </CardContent>
            </Card>

            <RoadmapChat
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              className="h-[600px]"
            />

            {actions.length > 0 && (
              <ActionLog actions={actions as any} />
            )}

            {error && (
              <ErrorDisplay error={error} />
            )}
          </div>

          {/* Right Column - Roadmap Visualization */}
          <div className="space-y-6">
            {roadmapJson ? (
              <RoadmapVisualization roadmapJson={roadmapJson} />
            ) : (
              <Card className="h-[600px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <p className="text-lg mb-2">No roadmap generated yet</p>
                  <p className="text-sm">Start a conversation to generate your learning roadmap</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

