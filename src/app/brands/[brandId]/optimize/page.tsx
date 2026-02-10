"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft, Search, Sparkles } from "lucide-react";

interface AuditScores {
  contentDepth: number;
  keywordUsage: number;
  structure: number;
  readability: number;
  internalLinking: number;
}

interface Recommendation {
  priority: "high" | "medium" | "low";
  category: string;
  description: string;
}

interface AuditReport {
  scores: AuditScores;
  overallScore: number;
  recommendations: Recommendation[];
  summary: string;
}

interface OptimizationResult {
  report: AuditReport;
  targetKeyword: string;
  jobId: number;
  optimizedRewrite: string | null;
}

const SCORE_LABELS: Record<string, string> = {
  contentDepth: "Content Depth",
  keywordUsage: "Keyword Usage",
  structure: "Structure",
  readability: "Readability",
  internalLinking: "Internal Linking",
};

const PRIORITY_ORDER: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function getScoreColor(score: number): string {
  if (score >= 80) return "[&>div]:bg-green-500";
  if (score >= 60) return "[&>div]:bg-yellow-500";
  return "[&>div]:bg-red-500";
}

function getScoreTextColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
}

export default function OptimizePage() {
  const { brandId } = useParams<{ brandId: string }>();
  const [sourceUrl, setSourceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rewriting, setRewriting] = useState(false);

  async function handleOptimize(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceUrl) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/brands/${brandId}/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUrl }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Optimization failed");
      }

      const job = await res.json();
      const report = JSON.parse(job.analysisReport) as AuditReport;

      setResult({
        report,
        targetKeyword: job.targetKeyword,
        jobId: job.id,
        optimizedRewrite: job.optimizedRewrite,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRewrite() {
    if (!result) return;

    setRewriting(true);
    try {
      const res = await fetch(`/api/brands/${brandId}/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUrl, generateRewrite: true }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Rewrite failed");
      }

      const job = await res.json();
      const report = JSON.parse(job.analysisReport) as AuditReport;

      setResult({
        report,
        targetKeyword: job.targetKeyword,
        jobId: job.id,
        optimizedRewrite: job.optimizedRewrite,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rewrite failed");
    } finally {
      setRewriting(false);
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/brands/${brandId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Content Optimization</h1>
          <p className="text-muted-foreground">
            Audit and optimize existing content for SEO
          </p>
        </div>
      </div>

      <Card className="mb-8">
        <CardContent className="pt-6">
          <form onSubmit={handleOptimize} className="flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="url">URL to Optimize</Label>
              <Input
                id="url"
                placeholder="https://example.com/blog/article"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button type="submit" disabled={loading || !sourceUrl}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Analyze
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading && (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center py-8 gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">Running optimization audit...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Scraping content, detecting keywords, researching competitors,
                  and generating audit. This may take a minute.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert className="mb-8 border-destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <>
          {/* Overall Score */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
            <Card className="md:col-span-2">
              <CardContent className="pt-6 text-center">
                <div
                  className={`text-5xl font-bold mb-2 ${getScoreTextColor(result.report.overallScore)}`}
                >
                  {result.report.overallScore}
                </div>
                <div className="text-sm text-muted-foreground mb-3">
                  Overall Score
                </div>
                <Badge>
                  Keyword: {result.targetKeyword}
                </Badge>
              </CardContent>
            </Card>

            {/* Category Scores */}
            <div className="md:col-span-4 grid grid-cols-2 lg:grid-cols-5 gap-4">
              {Object.entries(result.report.scores).map(([key, value]) => (
                <Card key={key}>
                  <CardContent className="pt-4 pb-4">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      {SCORE_LABELS[key] || key}
                    </div>
                    <div
                      className={`text-2xl font-bold mb-2 ${getScoreTextColor(value)}`}
                    >
                      {value}
                    </div>
                    <Progress value={value} className={getScoreColor(value)} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Summary */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Audit Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{result.report.summary}</p>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
              <CardDescription>
                Prioritized suggestions to improve your content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {result.report.recommendations
                  .sort(
                    (a, b) =>
                      (PRIORITY_ORDER[a.priority] ?? 2) -
                      (PRIORITY_ORDER[b.priority] ?? 2)
                  )
                  .map((rec, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Badge
                        variant={
                          rec.priority === "high"
                            ? "destructive"
                            : rec.priority === "medium"
                              ? "default"
                              : "secondary"
                        }
                        className="mt-0.5 shrink-0"
                      >
                        {rec.priority}
                      </Badge>
                      <div>
                        <div className="font-medium">{rec.category}</div>
                        <div className="text-sm text-muted-foreground">
                          {rec.description}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Optimized Rewrite */}
          <Separator className="my-8" />

          {result.optimizedRewrite ? (
            <Card>
              <CardHeader>
                <CardTitle>Optimized Rewrite</CardTitle>
                <CardDescription>
                  AI-generated rewrite addressing the audit recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                  {result.optimizedRewrite}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center">
              <Button
                variant="outline"
                size="lg"
                onClick={handleRewrite}
                disabled={rewriting}
              >
                {rewriting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Rewrite...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Optimized Rewrite
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                Generate an SEO-optimized rewrite of the content based on the
                audit findings
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
