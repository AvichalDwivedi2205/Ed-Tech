'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Id } from '@/convex/_generated/dataModel';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import axios from 'axios';
import { Send, Loader2, Bot, User } from 'lucide-react';
import Link from 'next/link';

export default function ChatPage({ params }: { params: { workspaceId: string } }) {
  const workspaceId = params.workspaceId as Id<'workspaces'>;
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
    citations?: any[];
  }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChatHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/qa/history/${workspaceId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const history = response.data.messages || [];
      const formattedMessages = history.flatMap((msg: any) => [
        { role: 'user' as const, content: msg.message },
        { role: 'assistant' as const, content: msg.response, citations: msg.citations },
      ]);

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/qa/ask`,
        {
          question: userMessage,
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
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer,
          citations: data.citations,
        },
      ]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || error.message || 'Failed to get answer',
        variant: 'destructive',
      });
      setMessages((prev) => prev.slice(0, -1)); // Remove user message on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Mini-Drona</h1>
            <p className="text-sm text-muted-foreground">
              Ask questions about your workspace content
            </p>
          </div>
          <Link href={`/dashboard/workspace/${workspaceId}`}>
            <Button variant="outline">Back to Workspace</Button>
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Start a conversation</h3>
              <p className="text-muted-foreground">
                Ask questions about your roadmaps and content
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-4 ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'assistant' && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            )}
            
            <Card className={`max-w-3xl ${
              msg.role === 'user' ? 'bg-blue-50' : ''
            }`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-2 mb-2">
                  {msg.role === 'user' && (
                    <User className="h-4 w-4 mt-1 text-blue-600" />
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
                
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-medium mb-2">Sources:</p>
                    <div className="space-y-1">
                      {msg.citations.slice(0, 3).map((citation, cIdx) => (
                        <div key={cIdx} className="text-xs text-muted-foreground">
                          <span className="font-medium">{citation.type}</span>
                          {citation.subtopicName && ` - ${citation.subtopicName}`}
                          {citation.title && `: ${citation.title}`}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {msg.role === 'user' && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-4 justify-start">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Bot className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask a question about your workspace..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

