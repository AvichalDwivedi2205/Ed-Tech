'use client';

import { useState } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { Id } from '@/convex/_generated/dataModel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FileUpload } from '@/components/roadmap/FileUpload';
import { useToast } from '@/components/ui/use-toast';
import axios from 'axios';
import { Loader2 } from 'lucide-react';

interface RoadmapGeneratorProps {
  workspaceId: Id<'workspaces'>;
  onComplete?: () => void;
}

export function RoadmapGenerator({ workspaceId, onComplete }: RoadmapGeneratorProps) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [userInput, setUserInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [waitingForResponse, setWaitingForResponse] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  const handleGenerate = async () => {
    if (!userInput.trim() && !file) {
      toast({
        title: 'Error',
        description: 'Please provide input or upload a file',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setWaitingForResponse(false);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Generate session ID if first request
      const currentSessionId = sessionId || crypto.randomUUID();
      if (!sessionId) {
        setSessionId(currentSessionId);
      }

      const formData = new FormData();
      formData.append('user_input', userInput);
      formData.append('workspace_id', workspaceId);
      formData.append('session_id', currentSessionId);
      
      if (file) {
        formData.append('file', file);
      }

      if (messages.length > 0) {
        formData.append('conversation_history', JSON.stringify(messages));
      }

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/roadmap/generate`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const data = response.data;

      // Add messages
      const newMessages = [
        ...messages,
        { role: 'user' as const, content: userInput },
        { role: 'assistant' as const, content: data.roadmap || data.actions?.[0]?.message || 'Processing...' },
      ];
      setMessages(newMessages);

      if (data.waiting_for_response) {
        setWaitingForResponse(true);
        setUserInput('');
        toast({
          title: 'Clarification Needed',
          description: 'Please answer the question to continue',
        });
      } else if (data.roadmap_json) {
        // Roadmap completed
        toast({
          title: 'Success',
          description: 'Roadmap generated successfully!',
        });
        setUserInput('');
        setFile(null);
        setMessages([]);
        setSessionId(null);
        if (onComplete) {
          onComplete();
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || error.message || 'Failed to generate roadmap',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClarify = async () => {
    if (!userInput.trim() || !sessionId) return;

    setIsLoading(true);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/roadmap/clarify`,
        {
          user_response: userInput,
          session_id: sessionId,
          workspace_id: workspaceId,
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = response.data;

      const newMessages = [
        ...messages,
        { role: 'user' as const, content: userInput },
        { role: 'assistant' as const, content: data.roadmap || data.actions?.[0]?.message || 'Processing...' },
      ];
      setMessages(newMessages);

      if (data.waiting_for_response) {
        setWaitingForResponse(true);
        setUserInput('');
      } else if (data.roadmap_json) {
        toast({
          title: 'Success',
          description: 'Roadmap generated successfully!',
        });
        setUserInput('');
        setMessages([]);
        setSessionId(null);
        setWaitingForResponse(false);
        if (onComplete) {
          onComplete();
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || error.message || 'Failed to process clarification',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Learning Roadmap</CardTitle>
        <CardDescription>
          Describe what you want to learn or upload a document
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {messages.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-4 bg-muted/20">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-2 rounded ${
                  msg.role === 'user' ? 'bg-blue-100 ml-8' : 'bg-gray-100 mr-8'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
              </div>
            ))}
          </div>
        )}

        <FileUpload onFileSelect={setFile} />
        
        <Textarea
          placeholder="Describe what you want to learn, e.g., 'I want to learn machine learning from scratch'"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          rows={4}
          disabled={isLoading}
        />

        <Button
          onClick={waitingForResponse ? handleClarify : handleGenerate}
          disabled={isLoading || (!userInput.trim() && !file)}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {waitingForResponse ? 'Processing...' : 'Generating...'}
            </>
          ) : waitingForResponse ? (
            'Submit Answer'
          ) : (
            'Generate Roadmap'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

