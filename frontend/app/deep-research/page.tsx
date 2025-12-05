"use client";

import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Search, Sparkles, Loader2, FileText, ExternalLink, Trash2, MessageSquare, Send } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { ConvexStatus } from "@/components/ConvexStatus";
import Link from "next/link";
import { Id } from "convex/_generated/dataModel";

export default function DeepResearchPage() {
  const reports = useQuery(api.queries.deepResearch.listReports, { limit: 50 });
  const startResearch = useAction(api.actions.deepResearch.startResearch);
  const continueResearch = useAction(api.actions.deepResearch.continueResearch);
  const deleteReportMutation = useMutation(api.mutations.deepResearch.deleteReport);
  
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"normal" | "comprehensive">("normal");
  const [isStarting, setIsStarting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [clarificationQuestion, setClarificationQuestion] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [generationId, setGenerationId] = useState<Id<"deepResearchGenerations"> | null>(null);
  const [generatingReportId, setGeneratingReportId] = useState<string | null>(null);

  // Check for active generation
  const activeGeneration = useQuery(
    api.queries.deepResearchGenerations.getGeneration,
    generationId ? { generationId } : "skip"
  );

  useEffect(() => {
    if (activeGeneration && activeGeneration.status === "clarifying") {
      // Get the last AI message as the clarification question
      const lastAIMessage = activeGeneration.messages
        .filter((msg: any) => msg.type === "AIMessage")
        .pop();
      if (lastAIMessage) {
        setClarificationQuestion(lastAIMessage.content);
      }
    } else if (activeGeneration && activeGeneration.status === "generating") {
      // Generation is in progress
      setIsGenerating(true);
    } else if (activeGeneration && activeGeneration.status === "completed") {
      // Generation completed, reset state
      setIsGenerating(false);
      setGenerationId(null);
      setClarificationQuestion("");
      setUserAnswer("");
      setQuery("");
    }
  }, [activeGeneration]);

  const handleStartResearch = async () => {
    if (!query.trim()) return;
    
    setIsStarting(true);
    setClarificationQuestion("");
    setUserAnswer("");
    setGenerationId(null);
    
    try {
      const result = await startResearch({
        query: query.trim(),
        mode,
      });
      
      setGenerationId(result.generationId);
      setClarificationQuestion(result.clarificationQuestion);
    } catch (error: any) {
      console.error("Failed to start research:", error);
      alert(`Failed to start research: ${error.message}`);
    } finally {
      setIsStarting(false);
    }
  };

  const handleContinueResearch = async () => {
    if (!userAnswer.trim() || !generationId) return;
    
    setIsGenerating(true);
    
    try {
      const result = await continueResearch({
        generationId,
        userAnswer: userAnswer.trim(),
      });
      
      setGeneratingReportId(result.reportId);
      setClarificationQuestion("");
      setUserAnswer("");
      // Don't reset generationId yet - wait for status update
    } catch (error: any) {
      console.error("Failed to continue research:", error);
      alert(`Failed to continue research: ${error.message}`);
      setIsGenerating(false);
    }
  };

  const handleDelete = async (reportId: Id<"deepResearchReports">) => {
    if (!confirm("Are you sure you want to delete this report?")) return;
    
    try {
      await deleteReportMutation({ reportId });
    } catch (error: any) {
      console.error("Failed to delete report:", error);
      alert(`Failed to delete report: ${error.message}`);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Sidebar />
      
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-lg lg:ml-64 dark:border-slate-800/80 dark:bg-slate-900/80">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/25">
              <Search className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Deep Research
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                AI-Powered Research Reports
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ConvexStatus />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 lg:ml-64">
        {/* Hero Section */}
        <div className="mb-10 rounded-3xl bg-gradient-to-br from-purple-600 via-pink-600 to-indigo-700 p-8 text-white shadow-2xl lg:p-12">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 backdrop-blur-sm">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Deep Research Agent</span>
            </div>
            <h2 className="text-3xl font-bold leading-tight lg:text-4xl">
              Comprehensive Research Reports
            </h2>
            <p className="mt-4 text-lg text-white/80">
              Generate thorough, citation-backed research documents using multi-layered search, 
              web scraping, and AI synthesis. Choose between standard or comprehensive research modes.
            </p>
          </div>
          
          {/* Research Form */}
          <div className="mt-8 space-y-4">
            {!clarificationQuestion ? (
              <>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    placeholder="Enter your research query (e.g., Impact of AI on healthcare, Quantum computing applications...)"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !isStarting && handleStartResearch()}
                    className="flex-1 rounded-xl border-2 border-white/20 bg-white/10 px-5 py-3.5 text-white placeholder-white/60 backdrop-blur-sm transition-all focus:border-white/40 focus:outline-none focus:ring-0"
                    disabled={isStarting || isGenerating}
                  />
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as "normal" | "comprehensive")}
                    className="rounded-xl border-2 border-white/20 bg-white/10 px-4 py-3.5 text-white backdrop-blur-sm transition-all focus:border-white/40 focus:outline-none focus:ring-0"
                    disabled={isStarting || isGenerating}
                  >
                    <option value="normal" className="text-slate-900">Standard Report</option>
                    <option value="comprehensive" className="text-slate-900">Comprehensive Report</option>
                  </select>
                  <Button
                    onClick={handleStartResearch}
                    disabled={isStarting || isGenerating || !query.trim()}
                    size="lg"
                    className="bg-white px-8 text-purple-700 shadow-lg transition-all hover:bg-white/90 hover:shadow-xl disabled:opacity-50"
                  >
                    {isStarting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-5 w-5" />
                        Start Research
                      </>
                    )}
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <span className="rounded-full bg-white/20 px-3 py-1">
                    {mode === "comprehensive" ? "🔬 Comprehensive: Deep analysis with 8-12 sections" : "📄 Standard: Quick research with 4-6 sections"}
                  </span>
                </div>
              </>
            ) : (
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <div className="flex items-center gap-2 text-white">
                    <MessageSquare className="h-5 w-5" />
                    <CardTitle className="text-white">Clarification Question</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-white/90 text-sm leading-relaxed">
                    {clarificationQuestion}
                  </p>
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Your answer..."
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !isGenerating) {
                          handleContinueResearch();
                        }
                      }}
                      className="min-h-[100px] bg-white/10 border-white/20 text-white placeholder-white/60 backdrop-blur-sm"
                      disabled={isGenerating}
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-white/60">
                        Press Ctrl+Enter or Cmd+Enter to submit
                      </p>
                      <Button
                        onClick={handleContinueResearch}
                        disabled={isGenerating || !userAnswer.trim()}
                        className="bg-white text-purple-700 hover:bg-white/90"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Continue Research
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Generating Status */}
        {isGenerating && !clarificationQuestion && (
          <Card className="mb-8 border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20">
            <CardContent className="flex items-center gap-4 py-6">
              <Loader2 className="h-6 w-6 animate-spin text-purple-600 dark:text-purple-400" />
              <div>
                <p className="font-medium text-purple-900 dark:text-purple-100">
                  Generating Research Report...
                </p>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  This may take a few minutes. The report will appear below when complete.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reports Section */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Research Reports
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-400">
            {reports?.length || 0} report{reports?.length !== 1 ? "s" : ""} generated
          </p>
        </div>

        {reports === undefined ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700 mt-2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-pink-200 dark:from-purple-900 dark:to-pink-800">
                <FileText className="h-10 w-10 text-purple-600 dark:text-purple-300" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-slate-900 dark:text-slate-100">
                No reports yet
              </h3>
              <p className="mt-2 max-w-sm text-center text-slate-600 dark:text-slate-400">
                Generate your first research report above to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => (
              <Card
                key={report._id}
                className={`group transition-all hover:shadow-lg ${
                  generatingReportId === report._id ? "ring-2 ring-purple-500" : ""
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="line-clamp-2 text-lg">
                        {report.title || report.query}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {formatDate(report.createdAt)}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(report._id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                        report.researchDepth === "comprehensive"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                      }`}>
                        {report.researchDepth === "comprehensive" ? "Comprehensive" : "Standard"}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {report.sourcesCount} sources
                      </span>
                    </div>
                    {report.summary && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">
                        {report.summary}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${
                        report.status === "completed"
                          ? "text-green-600 dark:text-green-400"
                          : report.status === "generating"
                          ? "text-yellow-600 dark:text-yellow-400"
                          : report.status === "failed"
                          ? "text-red-600 dark:text-red-400"
                          : "text-slate-500 dark:text-slate-400"
                      }`}>
                        {report.status === "completed" && "✓ Completed"}
                        {report.status === "generating" && "⟳ Generating..."}
                        {report.status === "failed" && "✗ Failed"}
                        {report.status === "pending" && "⏳ Pending"}
                      </span>
                    </div>
                    {report.status === "completed" && (
                      <Link href={`/deep-research/${report._id}`}>
                        <Button className="w-full" variant="outline">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Report
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

