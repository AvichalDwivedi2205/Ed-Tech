'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface RoadmapData {
  TeachingStyle?: string
  [key: string]: any
}

interface RoadmapVisualizationProps {
  roadmapJson: RoadmapData
  className?: string
}

export function RoadmapVisualization({ roadmapJson, className }: RoadmapVisualizationProps) {
  const teachingStyle = roadmapJson.TeachingStyle || 'mixed'
  
  // Extract subtopics
  const subtopics = Object.entries(roadmapJson)
    .filter(([key]) => key.startsWith('Subtopic'))
    .sort(([a], [b]) => {
      const numA = parseInt(a.replace('Subtopic', ''))
      const numB = parseInt(b.replace('Subtopic', ''))
      return numA - numB
    })

  const downloadJSON = () => {
    const dataStr = JSON.stringify(roadmapJson, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'roadmap.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Learning Roadmap</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Teaching Style: <Badge variant="secondary">{teachingStyle}</Badge>
              </p>
            </div>
            <Button onClick={downloadJSON} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download JSON
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {subtopics.map(([subtopicKey, subtopicData], index) => {
              const topicName = subtopicData?.TopicName || subtopicKey
              const timeToComplete = subtopicData?.SuggestedTimeToComplete || 'Not specified'
              const contentList = subtopicData?.ContentList || {}
              const topics = contentList?.topics || []
              const videos = contentList?.videos || []
              const blogs = contentList?.blogs || []
              const books = contentList?.books || []

              return (
                <div key={subtopicKey} className="space-y-4">
                  {index > 0 && (
                    <div className="flex justify-center">
                      <div className="h-8 w-0.5 bg-gradient-to-b from-primary to-primary/50" />
                    </div>
                  )}
                  
                  <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{subtopicKey}</Badge>
                            <CardTitle className="text-xl">{topicName}</CardTitle>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            ⏱️ Estimated Time: {timeToComplete}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="topics" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                          <TabsTrigger value="topics">Topics</TabsTrigger>
                          <TabsTrigger value="videos">Videos ({videos.length})</TabsTrigger>
                          <TabsTrigger value="blogs">Articles ({blogs.length})</TabsTrigger>
                          <TabsTrigger value="books">Books ({books.length})</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="topics" className="mt-4">
                          <ul className="space-y-2">
                            {topics.map((topic: string, i: number) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-primary mt-1">•</span>
                                <span>{topic}</span>
                              </li>
                            ))}
                          </ul>
                        </TabsContent>
                        
                        <TabsContent value="videos" className="mt-4">
                          <div className="space-y-3">
                            {videos.length > 0 ? (
                              videos.map((video: any, i: number) => (
                                <div key={i} className="p-3 border rounded-lg">
                                  <a
                                    href={video.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline font-medium"
                                  >
                                    {video.title}
                                  </a>
                                  {video.description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {video.description}
                                    </p>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">No videos available</p>
                            )}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="blogs" className="mt-4">
                          <div className="space-y-3">
                            {blogs.length > 0 ? (
                              blogs.map((blog: any, i: number) => (
                                <div key={i} className="p-3 border rounded-lg">
                                  <a
                                    href={blog.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline font-medium"
                                  >
                                    {blog.title}
                                  </a>
                                  {blog.description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {blog.description}
                                    </p>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">No articles available</p>
                            )}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="books" className="mt-4">
                          <div className="space-y-3">
                            {books.length > 0 ? (
                              books.map((book: any, i: number) => (
                                <div key={i} className="p-3 border rounded-lg">
                                  <p className="font-medium">
                                    {book.title}
                                    {book.author && <span className="text-muted-foreground"> by {book.author}</span>}
                                  </p>
                                  {book.description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {book.description}
                                    </p>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">No books available</p>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

