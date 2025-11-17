'use client';

import React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Map, BookOpen, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { RoadmapGenerator } from '@/components/workspace/RoadmapGenerator';

export default function WorkspacePage({ params }: { params: { workspaceId: string } }) {
  const workspaceId = params.workspaceId as Id<'workspaces'>;
  
  const workspace = useQuery(api.workspaces.get, { workspaceId });
  const roadmaps = useQuery(api.roadmaps.list, { workspaceId });
  const [showGenerator, setShowGenerator] = React.useState(false);

  // Debug logging
  React.useEffect(() => {
    console.log('Workspace query result:', workspace);
    console.log('Roadmaps query result:', roadmaps);
  }, [workspace, roadmaps]);

  if (workspace === undefined || roadmaps === undefined) {
    return (
      <div className="p-8">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          Loading workspace... (workspace: {workspace === undefined ? 'undefined' : 'loaded'}, roadmaps: {roadmaps === undefined ? 'undefined' : 'loaded'})
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">Workspace not found</p>
            <p className="text-xs text-muted-foreground mt-2">Workspace ID: {workspaceId}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">{workspace.name}</h1>
          {workspace.description && (
            <p className="text-muted-foreground mt-2">{workspace.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/workspace/${workspaceId}/chat`}>
            <Button variant="outline">
              <MessageSquare className="h-4 w-4 mr-2" />
              Mini-Drona
            </Button>
          </Link>
          <Button onClick={() => setShowGenerator(!showGenerator)}>
            <Plus className="h-4 w-4 mr-2" />
            {showGenerator ? 'Cancel' : 'New Roadmap'}
          </Button>
        </div>
      </div>

      {showGenerator && (
        <div className="mb-8">
          <RoadmapGenerator 
            workspaceId={workspaceId}
            onComplete={() => setShowGenerator(false)}
          />
        </div>
      )}

      {roadmaps.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Map className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No roadmaps yet</h3>
            <p className="text-muted-foreground mb-6 text-center">
              Create your first roadmap to start learning
            </p>
            <Button onClick={() => setShowGenerator(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Roadmap
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roadmaps.map((roadmap) => (
            <Link key={roadmap._id} href={`/dashboard/workspace/${workspaceId}/roadmap/${roadmap._id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Map className="h-5 w-5" />
                    {roadmap.title}
                  </CardTitle>
                  {roadmap.description && (
                    <CardDescription>{roadmap.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded ${
                      roadmap.status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : roadmap.status === 'generating'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {roadmap.status}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(roadmap.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

