'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Map, BookOpen, Sparkles } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            OpenT Agents
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            AI-Powered Learning Platform - Generate comprehensive learning roadmaps and educational content
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Map className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Roadmap Generator</CardTitle>
              </div>
              <CardDescription>
                Create personalized learning roadmaps with AI assistance. Upload documents or describe your learning goals.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/roadmap">
                <Button className="w-full" size="lg">
                  Generate Roadmap
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <BookOpen className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>Content Creator</CardTitle>
              </div>
              <CardDescription>
                Generate comprehensive educational content, quizzes, and visualizations for each subtopic in your roadmap.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/content">
                <Button className="w-full" size="lg" variant="secondary">
                  Create Content
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span>Powered by AI • Built with Next.js & FastAPI</span>
          </div>
        </div>
      </div>
    </div>
  )
}

