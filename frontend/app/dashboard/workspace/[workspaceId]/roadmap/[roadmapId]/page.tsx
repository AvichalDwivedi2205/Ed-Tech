'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Play } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const ContentGenerator = dynamic(
  () => import('@/components/workspace/ContentGenerator').then(mod => ({ default: mod.ContentGenerator })),
  { loading: () => <Skeleton className="h-96" />, ssr: false }
);

export default function RoadmapPage({ 
  params 
}: { 
  params: { workspaceId: string; roadmapId: string } 
}) {
  const workspaceId = params.workspaceId as Id<'workspaces'>;
  const roadmapId = params.roadmapId as Id<'roadmaps'>;

  const roadmap = useQuery(api.roadmaps.get, { roadmapId });
  const contentList = useQuery(api.content.listByRoadmap, { roadmapId });

  if (roadmap === undefined || contentList === undefined) {
    return (
      <div className="p-8">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">Roadmap not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roadmapJson = roadmap.roadmapJson || {};
  const subtopics = Object.keys(roadmapJson).filter(key => key.startsWith('Subtopic'));

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href={`/dashboard/workspace/${workspaceId}`}>
          <Button variant="ghost" className="mb-4">← Back to Workspace</Button>
        </Link>
        <h1 className="text-3xl font-bold">{roadmap.title}</h1>
        {roadmap.description && (
          <p className="text-muted-foreground mt-2">{roadmap.description}</p>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="content">Generate Content</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Roadmap Structure</CardTitle>
              <CardDescription>
                Teaching Style: {roadmap.teachingStyle}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {subtopics.map((subtopicKey) => {
                const subtopic = roadmapJson[subtopicKey];
                const subtopicId = subtopicKey;
                const content = contentList?.find(c => c.subtopicId === subtopicId);
                
                return (
                  <Card key={subtopicKey} className="border-l-4 border-l-blue-500">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{subtopic.TopicName || subtopicKey}</CardTitle>
                        {content && (
                          <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                            Content Generated
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {subtopic.SuggestedTimeToComplete && (
                          <p className="text-sm text-muted-foreground">
                            Estimated time: {subtopic.SuggestedTimeToComplete}
                          </p>
                        )}
                        
                        {subtopic.ContentList?.topics && (
                          <div>
                            <p className="text-sm font-medium mb-1">Topics:</p>
                            <ul className="list-disc list-inside text-sm text-muted-foreground">
                              {subtopic.ContentList.topics.map((topic: string, idx: number) => (
                                <li key={idx}>{topic}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {content && (
                          <Link href={`/dashboard/workspace/${workspaceId}/roadmap/${roadmapId}/content/${subtopicId}`}>
                            <Button variant="outline" size="sm" className="mt-2">
                              <BookOpen className="h-4 w-4 mr-2" />
                              View Content
                            </Button>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content">
          <ContentGenerator
            workspaceId={workspaceId}
            roadmapId={roadmapId}
            roadmapJson={roadmapJson}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

