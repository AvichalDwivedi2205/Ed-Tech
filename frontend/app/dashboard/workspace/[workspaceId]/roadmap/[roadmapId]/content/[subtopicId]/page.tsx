'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const GraphViewer = dynamic(
  () => import('@/components/content/GraphViewer').then(mod => ({ default: mod.GraphViewer })),
  { loading: () => <Skeleton className="h-64" />, ssr: false }
);

export default function ContentPage({
  params,
}: {
  params: { workspaceId: string; roadmapId: string; subtopicId: string };
}) {
  const workspaceId = params.workspaceId as Id<'workspaces'>;
  const roadmapId = params.roadmapId as Id<'roadmaps'>;
  const subtopicId = params.subtopicId;

  const content = useQuery(api.content.getByRoadmapSubtopic, {
    roadmapId,
    subtopicId,
  });

  if (content === undefined) {
    return (
      <div className="p-8">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">Content not found</p>
            <Link href={`/dashboard/workspace/${workspaceId}/roadmap/${roadmapId}`}>
              <Button className="mt-4">Back to Roadmap</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href={`/dashboard/workspace/${workspaceId}/roadmap/${roadmapId}`}>
          <Button variant="ghost" className="mb-4">← Back to Roadmap</Button>
        </Link>
        <h1 className="text-3xl font-bold">{content.subtopicName}</h1>
      </div>

      <div className="space-y-6">
        {content.content && (
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <ReactMarkdown>{content.content}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}

        {content.graphs && content.graphs.length > 0 && (
          <GraphViewer graphs={content.graphs} />
        )}

        {content.quiz && content.quiz.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Quiz</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {content.quiz.map((question: any, idx: number) => (
                <div key={idx} className="border rounded-lg p-4">
                  <p className="font-medium mb-3">{question.question}</p>
                  <ul className="space-y-2">
                    {question.options?.map((option: string, optIdx: number) => (
                      <li
                        key={optIdx}
                        className={`p-2 rounded ${
                          optIdx === question.correctAnswer
                            ? 'bg-green-100 border border-green-300'
                            : 'bg-gray-50'
                        }`}
                      >
                        {option}
                        {optIdx === question.correctAnswer && (
                          <span className="ml-2 text-green-600 font-medium">✓ Correct</span>
                        )}
                      </li>
                    ))}
                  </ul>
                  {question.explanation && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      {question.explanation}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

