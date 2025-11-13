'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart3, Code2, FileText } from 'lucide-react'

interface Graph {
  type: string
  code: string
  description: string
  title?: string
  xlabel?: string
  ylabel?: string
}

interface GraphViewerProps {
  graphs: Graph[]
  className?: string
}

export function GraphViewer({ graphs, className }: GraphViewerProps) {
  if (!graphs || graphs.length === 0) {
    return null
  }

  const getGraphTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'line':
        return '📈'
      case 'bar':
        return '📊'
      case 'scatter':
        return '🔍'
      case '3d':
        return '🎯'
      case 'contour':
        return '🗺️'
      default:
        return '📉'
    }
  }

  const getGraphTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'line':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'bar':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'scatter':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case '3d':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'contour':
        return 'bg-pink-100 text-pink-800 border-pink-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Generated Graphs
          </CardTitle>
          <Badge variant="secondary">{graphs.length} graph{graphs.length !== 1 ? 's' : ''}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {graphs.map((graph, index) => (
          <Card key={index} className="border-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getGraphTypeIcon(graph.type)}</span>
                  <div>
                    <CardTitle className="text-lg">
                      {graph.title || `Graph ${index + 1}`}
                    </CardTitle>
                    {graph.xlabel && graph.ylabel && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {graph.xlabel} × {graph.ylabel}
                      </p>
                    )}
                  </div>
                </div>
                <Badge className={getGraphTypeColor(graph.type)}>
                  {graph.type.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {graph.description && (
                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{graph.description}</p>
                  </div>
                </div>
              )}

              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="code">
                    <Code2 className="h-4 w-4 mr-2" />
                    Code
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="preview" className="mt-4">
                  <div className="border rounded-lg p-8 bg-muted/20 flex items-center justify-center min-h-[300px]">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-2">
                        Graph visualization will be rendered here
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Note: Graph code execution requires server-side rendering.
                        The Python matplotlib code is available in the Code tab.
                      </p>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="code" className="mt-4">
                  <ScrollArea className="h-[300px] w-full rounded-lg border bg-muted/20 p-4">
                    <pre className="text-xs">
                      <code className="language-python">{graph.code}</code>
                    </pre>
                  </ScrollArea>
                  <p className="text-xs text-muted-foreground mt-2">
                    This Python code uses matplotlib to generate the visualization.
                    Execute it in a Python environment with matplotlib installed.
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  )
}

