"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useJobProgress } from "@/hooks/useJobProgress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Search,
  ImageIcon,
  PenTool,
  Tag,
  LayoutGrid,
  RefreshCw,
  Copy,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface Brand {
  id: number;
  name: string;
}

interface ContentJob {
  id: number;
  brandId: number;
  topic: string;
  keywords: string | null;
  status: string;
  researchBrief: string | null;
  articleContent: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  urlSlug: string | null;
  images: string | null;
  thumbnailUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  brand: Brand;
}

const PIPELINE_STEPS = [
  { key: "researching", label: "Research", icon: Search },
  { key: "generating_images", label: "Images", icon: ImageIcon },
  { key: "writing", label: "Writing", icon: PenTool },
  { key: "generating_meta", label: "Meta", icon: Tag },
  { key: "generating_thumbnail", label: "Thumbnail", icon: LayoutGrid },
] as const;

function getStepState(
  stepKey: string,
  currentStatus: string
): "completed" | "active" | "pending" {
  const stepIndex = PIPELINE_STEPS.findIndex((s) => s.key === stepKey);
  const currentIndex = PIPELINE_STEPS.findIndex(
    (s) => s.key === currentStatus
  );

  if (currentStatus === "completed") return "completed";
  if (currentStatus === "failed") {
    return stepIndex <= currentIndex ? "completed" : "pending";
  }
  if (stepIndex < currentIndex) return "completed";
  if (stepIndex === currentIndex) return "active";
  return "pending";
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {copied ? (
        <Check className="h-3 w-3 mr-1" />
      ) : (
        <Copy className="h-3 w-3 mr-1" />
      )}
      {copied ? "Copied" : label ?? "Copy"}
    </Button>
  );
}

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.jobId ? parseInt(params.jobId as string, 10) : null;

  const [job, setJob] = useState<ContentJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const progress = useJobProgress(
    jobId && job && !["completed", "failed", "idle"].includes(job.status)
      ? jobId
      : null
  );

  const fetchJob = useCallback(async () => {
    if (!jobId) return;
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (res.ok) {
        setJob(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch job:", err);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  // Refetch job data when pipeline completes or fails
  useEffect(() => {
    if (progress.status === "completed" || progress.status === "failed") {
      fetchJob();
    }
  }, [progress.status, fetchJob]);

  const handleRegenerate = async () => {
    if (!jobId) return;
    setRegenerating(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/generate`, { method: "POST" });
      if (res.ok) {
        await fetchJob();
      }
    } catch (err) {
      console.error("Failed to regenerate:", err);
    } finally {
      setRegenerating(false);
    }
  };

  const activeStatus =
    progress.status !== "idle" && progress.status !== "connected"
      ? progress.status
      : job?.status ?? "idle";

  const parsedImages: Array<{
    url: string;
    alt?: string;
    caption?: string;
  }> = (() => {
    if (!job?.images) return [];
    try {
      return JSON.parse(job.images);
    } catch {
      return [];
    }
  })();

  let researchData: Record<string, unknown> | null = null;
  if (job?.researchBrief) {
    try {
      researchData = JSON.parse(job.researchBrief);
    } catch {
      // researchBrief is plain text, not JSON
    }
  }

  if (loading) {
    return (
      <div className="dark min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="dark min-h-screen bg-background text-foreground flex items-center justify-center">
        <p className="text-muted-foreground">Job not found.</p>
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-start gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{job.topic}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">{job.brand.name}</Badge>
                <Badge
                  variant={
                    activeStatus === "completed"
                      ? "default"
                      : activeStatus === "failed"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {activeStatus}
                </Badge>
              </div>
            </div>
          </div>
          <Button
            onClick={handleRegenerate}
            disabled={regenerating}
            variant="outline"
          >
            {regenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Regenerate
          </Button>
        </div>

        {/* Pipeline Progress */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              {PIPELINE_STEPS.map((step, index) => {
                const state = getStepState(step.key, activeStatus);
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div
                        className={`
                          w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors
                          ${
                            state === "completed"
                              ? "bg-green-500/20 border-green-500 text-green-500"
                              : state === "active"
                                ? "bg-primary/20 border-primary text-primary animate-pulse"
                                : "bg-muted border-muted-foreground/30 text-muted-foreground/50"
                          }
                        `}
                      >
                        {state === "completed" ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </div>
                      <span
                        className={`text-xs mt-2 ${
                          state === "active"
                            ? "text-foreground font-medium"
                            : state === "completed"
                              ? "text-green-500"
                              : "text-muted-foreground/50"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {index < PIPELINE_STEPS.length - 1 && (
                      <div
                        className={`flex-1 h-px mx-3 mt-[-1rem] ${
                          getStepState(
                            PIPELINE_STEPS[index + 1].key,
                            activeStatus
                          ) !== "pending"
                            ? "bg-green-500"
                            : "bg-muted-foreground/20"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {progress.message && (
              <p className="text-sm text-muted-foreground text-center">
                {progress.message}
              </p>
            )}
            {job.errorMessage && activeStatus === "failed" && (
              <p className="text-sm text-destructive text-center mt-2">
                {job.errorMessage}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Content Tabs */}
        <Tabs defaultValue="article">
          <TabsList className="mb-4">
            <TabsTrigger value="article">Article</TabsTrigger>
            <TabsTrigger value="research">Research</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="meta">Meta</TabsTrigger>
          </TabsList>

          {/* Article Tab */}
          <TabsContent value="article">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Article</CardTitle>
                {job.articleContent && (
                  <CopyButton text={job.articleContent} label="Copy Markdown" />
                )}
              </CardHeader>
              <CardContent>
                {job.articleContent ? (
                  <div className="prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/80 prose-a:text-primary prose-strong:text-foreground prose-code:text-primary prose-pre:bg-muted prose-pre:text-foreground">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {job.articleContent}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No article content yet. Run the pipeline to generate.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Research Tab */}
          <TabsContent value="research">
            <Card>
              <CardHeader>
                <CardTitle>Research Brief</CardTitle>
              </CardHeader>
              <CardContent>
                {job.researchBrief ? (
                  researchData ? (
                    <div className="space-y-6">
                      {Object.entries(researchData).map(([key, value]) => (
                        <div key={key}>
                          <h3 className="text-sm font-semibold text-foreground mb-2 capitalize">
                            {key.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}
                          </h3>
                          {typeof value === "string" ? (
                            <p className="text-sm text-muted-foreground">
                              {value}
                            </p>
                          ) : Array.isArray(value) ? (
                            <ul className="list-disc list-inside space-y-1">
                              {value.map((item, i) => (
                                <li
                                  key={i}
                                  className="text-sm text-muted-foreground"
                                >
                                  {typeof item === "string"
                                    ? item
                                    : JSON.stringify(item)}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <pre className="text-sm text-muted-foreground bg-muted p-3 rounded-md overflow-auto">
                              {JSON.stringify(value, null, 2)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="prose prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {job.researchBrief}
                      </ReactMarkdown>
                    </div>
                  )
                ) : (
                  <p className="text-muted-foreground">
                    No research data yet. Run the pipeline to generate.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Images Tab */}
          <TabsContent value="images">
            <Card>
              <CardHeader>
                <CardTitle>Images</CardTitle>
              </CardHeader>
              <CardContent>
                {job.thumbnailUrl || parsedImages.length > 0 ? (
                  <div className="space-y-6">
                    {job.thumbnailUrl && (
                      <div>
                        <h3 className="text-sm font-semibold mb-3">
                          Thumbnail
                        </h3>
                        <div className="relative rounded-lg overflow-hidden border border-border max-w-md">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={job.thumbnailUrl}
                            alt="Blog thumbnail"
                            className="w-full h-auto"
                          />
                        </div>
                      </div>
                    )}
                    {parsedImages.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-3">
                          In-Blog Images
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {parsedImages.map((img, i) => (
                            <div
                              key={i}
                              className="rounded-lg overflow-hidden border border-border"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={img.url}
                                alt={img.alt ?? `Image ${i + 1}`}
                                className="w-full h-auto"
                              />
                              <div className="p-3 bg-muted">
                                {img.alt && (
                                  <p className="text-xs text-muted-foreground">
                                    {img.alt}
                                  </p>
                                )}
                                {img.caption && (
                                  <p className="text-xs text-muted-foreground mt-1 italic">
                                    {img.caption}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No images yet. Run the pipeline to generate.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Meta Tab */}
          <TabsContent value="meta">
            <Card>
              <CardHeader>
                <CardTitle>SEO Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                {job.metaTitle || job.metaDescription || job.urlSlug ? (
                  <div className="space-y-4">
                    {job.metaTitle && (
                      <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-muted">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">
                            Meta Title
                          </p>
                          <p className="text-sm font-medium">{job.metaTitle}</p>
                        </div>
                        <CopyButton text={job.metaTitle} />
                      </div>
                    )}
                    {job.metaDescription && (
                      <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-muted">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">
                            Meta Description
                          </p>
                          <p className="text-sm">{job.metaDescription}</p>
                        </div>
                        <CopyButton text={job.metaDescription} />
                      </div>
                    )}
                    {job.urlSlug && (
                      <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-muted">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">
                            URL Slug
                          </p>
                          <p className="text-sm font-mono">{job.urlSlug}</p>
                        </div>
                        <CopyButton text={job.urlSlug} />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No metadata yet. Run the pipeline to generate.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
