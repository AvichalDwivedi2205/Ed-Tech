"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Upload, X, FileText, MessageSquare } from "lucide-react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";

interface GenerateRoadmapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: Id<"workspaces">;
  onSuccess?: () => void;
}

export function GenerateRoadmapDialog({
  open,
  onOpenChange,
  workspaceId,
  onSuccess,
}: GenerateRoadmapDialogProps) {
  const [userInput, setUserInput] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [clarificationQuestion, setClarificationQuestion] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [generationId, setGenerationId] = useState<Id<"roadmapGenerations"> | null>(null);
  const [fileStorageId, setFileStorageId] = useState<Id<"_storage"> | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startGeneration = useAction(api.actions.roadmap.startGeneration);
  const continueGeneration = useAction(api.actions.roadmap.continueGeneration);
  const getUploadUrl = useMutation(api.mutations.storage.uploadFile);

  // Check for active generation when dialog opens
  const activeGeneration = useQuery(
    api.queries.roadmapGenerations.getActiveGeneration,
    open ? { workspaceId } : "skip"
  );

  useEffect(() => {
    if (activeGeneration && activeGeneration.status === "clarifying") {
      setGenerationId(activeGeneration._id);
      // Get the last AI message as the clarification question
      const lastAIMessage = activeGeneration.messages
        .filter((msg: any) => msg.type === "AIMessage")
        .pop();
      if (lastAIMessage) {
        setClarificationQuestion(lastAIMessage.content);
      }
      setUserInput(activeGeneration.userInput);
    }
  }, [activeGeneration]);

  const processFile = async (file: File) => {
    // Validate file type
    const validTypes = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];
    const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
    if (!validTypes.includes(fileExt)) {
      alert("Please upload a PDF or image file (.pdf, .png, .jpg, .jpeg, .webp)");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    setIsUploading(true);
    try {
      // Get upload URL from Convex
      const uploadUrl = await getUploadUrl();
      
      // Upload file to Convex Storage
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      // Extract storage ID from response
      const storageIdJson = await uploadResponse.json();
      const storageId = storageIdJson.storageId as Id<"_storage">;
      setFileStorageId(storageId);
      setFileName(file.name);
    } catch (error: any) {
      console.error("Failed to upload file:", error);
      alert(`Failed to upload file: ${error.message}`);
    } finally {
      setIsUploading(false);
      setIsDragging(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      await processFile(file);
    }
  }, []);

  const handleRemoveFile = () => {
    setFileStorageId(null);
    setFileName(null);
    setIsDragging(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isStarting) return;

    setIsStarting(true);
    try {
      const result = await startGeneration({
        workspaceId,
        userInput: userInput.trim(),
        fileStorageId: fileStorageId || undefined,
      });

      setGenerationId(result.generationId);
      setClarificationQuestion(result.clarificationQuestion);
    } catch (error: any) {
      console.error("Failed to start roadmap generation:", error);
      alert(`Failed to start: ${error.message}`);
    } finally {
      setIsStarting(false);
    }
  };

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim() || !generationId || isGenerating) return;

    setIsGenerating(true);
    try {
      await continueGeneration({
        generationId,
        userAnswer: userAnswer.trim(),
      });

      setUserInput("");
      setUserAnswer("");
      setClarificationQuestion("");
      setGenerationId(null);
      handleRemoveFile();
      onOpenChange(false);
      
      if (onSuccess) {
        onSuccess();
      }
      
      alert("Roadmap generation started! This may take 2-5 minutes. Refresh the page to see it when ready.");
    } catch (error: any) {
      console.error("Failed to generate roadmap:", error);
      alert(`Failed to generate roadmap: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancel = () => {
    setUserInput("");
    setUserAnswer("");
    setClarificationQuestion("");
    setGenerationId(null);
    handleRemoveFile();
    onOpenChange(false);
  };

  // Show clarification step if we have a question
  const showClarification = clarificationQuestion && generationId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {showClarification ? "Answer Clarification Question" : "Generate Learning Roadmap"}
          </DialogTitle>
          <DialogDescription>
            {showClarification
              ? "Please answer the question below to help us create a personalized roadmap for you."
              : "Describe what you want to learn. Optionally upload a PDF or image (syllabus, course outline) to help generate a more accurate roadmap. Our AI will ask a clarifying question before generating."}
          </DialogDescription>
        </DialogHeader>

        {showClarification ? (
          <form onSubmit={handleContinue}>
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                <div className="flex items-start gap-3">
                  <MessageSquare className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                      AI Question:
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                      {clarificationQuestion}
                    </p>
                  </div>
                </div>
              </div>
              <Textarea
                placeholder="Type your answer here..."
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                className="min-h-[120px] resize-none"
                disabled={isGenerating}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!userAnswer.trim() || isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Generate Roadmap
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handleStart}>
            <div className="space-y-4 py-4">
              <div>
                <Textarea
                  placeholder="e.g., Learn machine learning fundamentals, Master Python programming, Understand web development..."
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  className="min-h-[120px] resize-none"
                  disabled={isStarting || isUploading}
                  autoFocus
                />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Be as specific as possible about your learning goals.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Optional: Upload PDF or Image (Syllabus/Course Outline)
                </label>
                {!fileStorageId ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
                      relative rounded-lg border-2 border-dashed p-4 text-center transition-all
                      ${isDragging 
                        ? "border-blue-500 bg-blue-50/50 dark:border-blue-400 dark:bg-blue-900/20" 
                        : "border-slate-300 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-600"
                      }
                      ${isUploading || isStarting ? "pointer-events-none opacity-60" : ""}
                    `}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      onChange={handleFileSelect}
                      disabled={isStarting || isUploading}
                      className="hidden"
                      id="roadmap-file-upload"
                    />
                    <div className="flex flex-col items-center gap-2">
                      {isUploading ? (
                        <>
                          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                          <p className="text-sm text-blue-600 dark:text-blue-400">Uploading...</p>
                        </>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-slate-400" />
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {isDragging ? "Drop file here" : "Drag & drop file here"}
                          </p>
                          <label
                            htmlFor="roadmap-file-upload"
                            className="cursor-pointer text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            or click to browse
                          </label>
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            PDF, PNG, JPG, WEBP (max 10MB)
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{fileName}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      disabled={isStarting}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isStarting || isUploading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!userInput.trim() || isStarting || isUploading}>
                {isStarting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Start
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
