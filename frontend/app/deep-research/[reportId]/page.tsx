"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "convex/_generated/api";
import { Sidebar } from "@/components/layout/Sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { ConvexStatus } from "@/components/ConvexStatus";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, ExternalLink, FileText, FileDown } from "lucide-react";
import Link from "next/link";
import { ResearchReportViewer } from "@/components/research/ResearchReportViewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

export default function ReportPage() {
  const params = useParams();
  const reportId = params.reportId as any;
  
  const report = useQuery(api.queries.deepResearch.getReport, {
    reportId,
  });

  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  const handleDownloadMarkdown = () => {
    if (!report?.markdown) return;
    
    const blob = new Blob([report.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.title || report.query}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = async () => {
    if (!report?.markdown) return;
    
    setIsDownloadingPDF(true);
    try {
      // Dynamic import of html2pdf
      const html2pdf = (await import("html2pdf.js")).default;
      
      // Create a temporary container with the report content
      const element = document.createElement("div");
      element.className = "research-report-pdf";
      element.innerHTML = `
        <style>
          @page {
            margin: 2cm;
            size: A4;
          }
          body {
            font-family: 'Georgia', 'Times New Roman', serif;
            line-height: 1.8;
            color: #1f2937;
            font-size: 11pt;
          }
          h1 {
            font-size: 24pt;
            font-weight: 700;
            margin-top: 0;
            margin-bottom: 20pt;
            border-bottom: 3px solid #e5e7eb;
            padding-bottom: 10pt;
          }
          h2 {
            font-size: 18pt;
            font-weight: 600;
            margin-top: 30pt;
            margin-bottom: 15pt;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 8pt;
          }
          h3 {
            font-size: 14pt;
            font-weight: 600;
            margin-top: 20pt;
            margin-bottom: 10pt;
          }
          p {
            margin-bottom: 12pt;
            text-align: justify;
          }
          ul, ol {
            margin-bottom: 12pt;
            padding-left: 30pt;
          }
          li {
            margin-bottom: 6pt;
          }
          blockquote {
            border-left: 4px solid #6366f1;
            padding-left: 15pt;
            margin: 20pt 0;
            font-style: italic;
            background: #f9fafb;
            padding: 15pt;
          }
          code {
            background: #f3f4f6;
            padding: 2pt 4pt;
            border-radius: 3pt;
            font-size: 9pt;
            font-family: 'Courier New', monospace;
          }
          pre {
            background: #1f2937;
            padding: 15pt;
            border-radius: 5pt;
            overflow-x: auto;
            color: #e5e7eb;
          }
          pre code {
            background: transparent;
            padding: 0;
            color: #e5e7eb;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20pt 0;
            font-size: 10pt;
          }
          th, td {
            border: 1px solid #e5e7eb;
            padding: 8pt 10pt;
            text-align: left;
          }
          th {
            background: #f9fafb;
            font-weight: 600;
          }
          hr {
            border: none;
            border-top: 2px solid #e5e7eb;
            margin: 30pt 0;
          }
          a {
            color: #2563eb;
            text-decoration: underline;
          }
        </style>
        <div style="max-width: 100%;">
          ${report.markdown
            .replace(/```[\s\S]*?```/g, (match) => {
              // Preserve code blocks
              return match;
            })
            .replace(/\n/g, "<br>")
            .replace(/^# (.+)$/gm, "<h1>$1</h1>")
            .replace(/^## (.+)$/gm, "<h2>$1</h2>")
            .replace(/^### (.+)$/gm, "<h3>$1</h3>")
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(.+?)\*/g, "<em>$1</em>")
            .replace(/\[(\d+)\]/g, '<sup style="color: #6366f1; font-weight: 600;">[$1]</sup>')}
        </div>
      `;
      
      const opt = {
        margin: [20, 20, 20, 20],
        filename: `${report.title || report.query}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };
      
      await html2pdf().set(opt).from(element).save();
    } catch (error: any) {
      console.error("Failed to generate PDF:", error);
      alert("Failed to generate PDF. Please try downloading as Markdown instead.");
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  if (report === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <Sidebar />
        <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-lg lg:ml-64 dark:border-slate-800/80 dark:bg-slate-900/80">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-48 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </div>
            <ThemeToggle />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 lg:ml-64">
          <div className="h-64 w-full rounded-2xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
        </main>
      </div>
    );
  }

  if (report === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <Sidebar />
        <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-lg lg:ml-64 dark:border-slate-800/80 dark:bg-slate-900/80">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">Report Not Found</h1>
            </div>
            <ThemeToggle />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 lg:ml-64">
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-slate-600 dark:text-slate-400">
                The report you're looking for doesn't exist.
              </p>
              <Link href="/deep-research">
                <Button className="mt-4">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Research
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Sidebar />
      
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-lg lg:ml-64 dark:border-slate-800/80 dark:bg-slate-900/80">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/deep-research">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {report.title || report.query}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {new Date(report.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadMarkdown}
                disabled={!report?.markdown}
              >
                <FileText className="mr-2 h-4 w-4" />
                Markdown
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadPDF}
                disabled={!report?.markdown || isDownloadingPDF}
              >
                <FileDown className="mr-2 h-4 w-4" />
                {isDownloadingPDF ? "Generating..." : "PDF"}
              </Button>
            </div>
            <ConvexStatus />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 lg:ml-64">
        <div className="mx-auto max-w-4xl">
          {/* Report Metadata */}
          <div className="mb-8 flex flex-wrap items-center gap-4">
            <span className={`rounded-full px-4 py-2 text-sm font-medium ${
              report.researchDepth === "comprehensive"
                ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
            }`}>
              {report.researchDepth === "comprehensive" ? "Comprehensive Research" : "Standard Research"}
            </span>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {report.sourcesCount} sources
            </span>
            {report.sections.length > 0 && (
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {report.sections.length} sections
              </span>
            )}
            <span className="text-sm text-slate-500 dark:text-slate-500">
              Generated {new Date(report.createdAt).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
          </div>

          {/* Report Content */}
          {report.status === "completed" && report.markdown ? (
            <div className="mb-12 rounded-2xl bg-white p-12 shadow-xl ring-1 ring-slate-200/50 dark:bg-slate-900 dark:ring-slate-700/50 print:shadow-none print:ring-0">
              <ResearchReportViewer content={report.markdown} />
            </div>
        ) : report.status === "generating" ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Generating Report
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    This may take a few minutes. The page will update automatically when complete.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : report.status === "failed" ? (
          <Card>
            <CardContent className="py-16 text-center">
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
                Report Generation Failed
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                There was an error generating this report. Please try again.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-slate-600 dark:text-slate-400">
                Report is pending generation.
              </p>
            </CardContent>
          </Card>
        )}

          {/* Citations */}
          {report.citations && report.citations.length > 0 && (
            <Card className="mb-8">
              <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                <CardTitle className="text-2xl font-bold">References</CardTitle>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {report.citations.length} source{report.citations.length !== 1 ? "s" : ""} cited in this report
                </p>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {report.citations.map((citation, index) => (
                    <div 
                      key={citation.id} 
                      className="flex items-start gap-4 rounded-lg border border-slate-200 bg-slate-50 p-5 transition-all hover:border-purple-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-purple-600 dark:hover:bg-slate-800"
                    >
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-sm font-bold text-white shadow-lg">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                          {citation.title}
                        </h4>
                        <a
                          href={citation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300 break-all"
                        >
                          <span className="truncate">{citation.url}</span>
                          <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                        </a>
                        {citation.snippet && (
                          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400 italic">
                            {citation.snippet}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

