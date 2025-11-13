'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Id } from '@/convex/_generated/dataModel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import axios from 'axios';
import { Loader2, Play } from 'lucide-react';
import dynamic from 'next/dynamic';

const GraphViewer = dynamic(
  () => import('@/components/content/GraphViewer').then(mod => ({ default: mod.GraphViewer })),
  { loading: () => <div>Loading graphs...</div>, ssr: false }
);

interface ContentGeneratorProps {
  workspaceId: Id<'workspaces'>;
  roadmapId: Id<'roadmaps'>;
  roadmapJson: any;
}

export function ContentGenerator({ workspaceId, roadmapId, roadmapJson }: ContentGeneratorProps) {
  const { user, getToken } = useUser();
  const { toast } = useToast();
  const [selectedSubtopic, setSelectedSubtopic] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [taskId, setTaskId] = useState<string | null>(null);

  const subtopics = Object.keys(roadmapJson).filter(key => key.startsWith('Subtopic'));

  useEffect(() => {
    if (!taskId || !isLoading) return;

    const interval = setInterval(async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/content/progress/${taskId}`
        );
        const data = response.data;
        setProgress(data.progress || 0);
        setCurrentStep(data.current_step || '');

        if (data.status === 'completed' || data.status === 'error') {
          setIsLoading(false);
          clearInterval(interval);
          if (data.status === 'completed') {
            toast({
              title: 'Success',
              description: 'Content generated successfully!',
            });
            // Refresh page to show new content
            window.location.reload();
          }
        }
      } catch (err) {
        console.error('Error fetching progress:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [taskId, isLoading, toast]);

  const handleGenerate = async (subtopicId: string) => {
    setIsLoading(true);
    setSelectedSubtopic(subtopicId);
    setProgress(0);
    setCurrentStep('Starting...');

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/content/generate`,
        {
          roadmap_json: roadmapJson,
          subtopic_id: subtopicId,
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          params: {
            workspace_id: workspaceId,
            roadmap_id: roadmapId,
          },
        }
      );

      const data = response.data;
      setTaskId(data.task_id || null);

      if (!data.task_id) {
        // Completed immediately
        setIsLoading(false);
        toast({
          title: 'Success',
          description: 'Content generated successfully!',
        });
        window.location.reload();
      }
    } catch (error: any) {
      setIsLoading(false);
      toast({
        title: 'Error',
        description: error.response?.data?.detail || error.message || 'Failed to generate content',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Generate Content</CardTitle>
          <CardDescription>
            Select a subtopic to generate educational content, quizzes, and visualizations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subtopics.map((subtopicKey) => {
            const subtopic = roadmapJson[subtopicKey];
            return (
              <div
                key={subtopicKey}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <h3 className="font-medium">{subtopic.TopicName || subtopicKey}</h3>
                  {subtopic.SuggestedTimeToComplete && (
                    <p className="text-sm text-muted-foreground">
                      {subtopic.SuggestedTimeToComplete}
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => handleGenerate(subtopicKey)}
                  disabled={isLoading}
                  variant="outline"
                >
                  {isLoading && selectedSubtopic === subtopicKey ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
            );
          })}

          {isLoading && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{currentStep}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

