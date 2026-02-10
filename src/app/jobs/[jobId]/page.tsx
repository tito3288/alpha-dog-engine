"use client";

import { useEffect, useState, useCallback } from "react";

export const dynamic = 'force-dynamic';
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
  linkedinPost: string | null;
  youtubeScript: string | null;
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
  const [generatingLinkedin, setGeneratingLinkedin] = useState(false);
  const [generatingYoutube, setGeneratingYoutube] = useState(false);

  // Use SSE when job is in progress OR when regenerating (even if status is still "idle")
  const progress = useJobProgress(
    jobId && job && (!["completed", "failed", "idle"].includes(job.status) || regenerating)
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
      setRegenerating(false);
    }
  }, [progress.status, fetchJob]);

  // Poll for updates when job is in progress OR when regenerating
  useEffect(() => {
    // Don't poll if job is completed/failed and we're not regenerating
    if (!job || (!regenerating && ["completed", "failed", "idle"].includes(job.status))) {
      // Stop regenerating state when job completes or fails
      if (job && (job.status === "completed" || job.status === "failed")) {
        setRegenerating(false);
      }
      return;
    }

    // If regenerating, always poll to catch status changes
    const interval = setInterval(() => {
      fetchJob();
    }, 2000); // Poll every 2 seconds (faster during regeneration)

    return () => clearInterval(interval);
  }, [job, regenerating, fetchJob]);

  const handleRegenerate = async () => {
    if (!jobId) return;
    setRegenerating(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/generate`, { method: "POST" });
      if (res.ok) {
        // Fetch immediately to get the new status
        await fetchJob();
        // Keep regenerating true - it will be set to false when job completes
        // Don't set regenerating to false here - let the polling handle it
      } else {
        setRegenerating(false);
      }
    } catch (err) {
      console.error("Failed to regenerate:", err);
      setRegenerating(false);
    }
  };

  const handleGenerateLinkedIn = async () => {
    if (!jobId) return;
    setGeneratingLinkedin(true);

    const es = new EventSource(`/api/jobs/${jobId}/progress`);
    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.status === "completed" || data.status === "failed") {
        es.close();
        setGeneratingLinkedin(false);
        fetchJob();
      }
    };
    es.onerror = () => {
      es.close();
      setGeneratingLinkedin(false);
      fetchJob();
    };

    try {
      const res = await fetch(`/api/jobs/${jobId}/repurpose/linkedin`, {
        method: "POST",
      });
      if (!res.ok) {
        es.close();
        setGeneratingLinkedin(false);
      }
    } catch {
      es.close();
      setGeneratingLinkedin(false);
    }
  };

  const handleGenerateYouTube = async () => {
    if (!jobId) return;
    setGeneratingYoutube(true);

    const es = new EventSource(`/api/jobs/${jobId}/progress`);
    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.status === "completed" || data.status === "failed") {
        es.close();
        setGeneratingYoutube(false);
        fetchJob();
      }
    };
    es.onerror = () => {
      es.close();
      setGeneratingYoutube(false);
      fetchJob();
    };

    try {
      const res = await fetch(`/api/jobs/${jobId}/repurpose/youtube`, {
        method: "POST",
      });
      if (!res.ok) {
        es.close();
        setGeneratingYoutube(false);
      }
    } catch {
      es.close();
      setGeneratingYoutube(false);
    }
  };

  const activeStatus =
    progress.status !== "idle" && progress.status !== "connected"
      ? progress.status
      : job?.status ?? "idle";

  const isCompleted = job?.status === "completed";

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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div className="flex items-start gap-4 min-w-0">
            <Link href="/">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold break-words">{job.topic}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
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
            disabled={
              regenerating ||
              (job?.status !== "idle" &&
                job?.status !== "completed" &&
                job?.status !== "failed")
            }
            variant="outline"
            className={`w-full sm:w-auto shrink-0 min-w-[160px] transition-all ${
              regenerating ||
              (job?.status !== "idle" &&
                job?.status !== "completed" &&
                job?.status !== "failed")
                ? "animate-pulse"
                : ""
            }`}
          >
            {regenerating ||
            (job?.status !== "idle" &&
              job?.status !== "completed" &&
              job?.status !== "failed") ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {progress.message || "Generating..."}
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </>
            )}
          </Button>
        </div>

        {/* Pipeline Progress */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 -mx-1">
              {PIPELINE_STEPS.map((step, index) => {
                const state = getStepState(step.key, activeStatus);
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex items-center flex-1 min-w-[5rem] shrink-0">
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
          <TabsList className="mb-4 flex-wrap h-auto sm:flex-nowrap overflow-x-auto">
            <TabsTrigger value="article">Article</TabsTrigger>
            <TabsTrigger value="research">Research</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="meta">Meta</TabsTrigger>
            <TabsTrigger value="repurpose">Repurpose</TabsTrigger>
          </TabsList>

          {/* Article Tab */}
          <TabsContent value="article">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle>Article</CardTitle>
                {job.articleContent && (
                  <CopyButton text={job.articleContent} label="Copy Markdown" />
                )}
              </CardHeader>
              <CardContent>
                {job.articleContent ? (
                  <div className="prose prose-invert prose-lg max-w-none
                    prose-headings:font-bold prose-headings:text-foreground prose-headings:mt-8 prose-headings:mb-4 first:prose-headings:mt-0
                    prose-h1:text-3xl prose-h1:mb-6
                    prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4
                    prose-h3:text-xl prose-h3:mt-8
                    prose-p:text-foreground/90 prose-p:leading-relaxed prose-p:mb-4
                    prose-a:text-primary prose-a:underline hover:prose-a:text-primary/80
                    prose-strong:text-foreground prose-strong:font-semibold
                    prose-ul:my-6 prose-ul:space-y-2
                    prose-ol:my-6 prose-ol:space-y-2
                    prose-li:text-foreground/90 prose-li:leading-relaxed
                    prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                    prose-pre:bg-muted prose-pre:text-foreground prose-pre:p-4 prose-pre:rounded-lg prose-pre:my-6
                    prose-blockquote:border-l-primary prose-blockquote:text-foreground/80 prose-blockquote:italic
                    prose-img:rounded-lg prose-img:my-8">
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
                    <div className="space-y-8">
                      {Object.entries(researchData).map(([key, value]) => (
                        <div key={key} className="border-l-2 border-primary/30 pl-4">
                          <h3 className="text-base font-bold text-foreground mb-3 capitalize">
                            {key.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}
                          </h3>
                          {typeof value === "string" ? (
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {value}
                            </p>
                          ) : Array.isArray(value) ? (
                            <div className="space-y-3">
                              {value.map((item, i) => (
                                <div key={i}>
                                  {typeof item === "string" ? (
                                    <div className="flex items-start gap-2">
                                      <span className="text-primary mt-1">•</span>
                                      <p className="text-sm text-muted-foreground flex-1">
                                        {item}
                                      </p>
                                    </div>
                                  ) : typeof item === "object" && item !== null ? (
                                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                                      {Object.entries(item as Record<string, unknown>).map(
                                        ([itemKey, itemValue]) => (
                                          <div key={itemKey}>
                                            <span className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
                                              {itemKey.replace(/([A-Z])/g, " $1")}:
                                            </span>
                                            {Array.isArray(itemValue) ? (
                                              <ul className="mt-1 ml-4 space-y-1">
                                                {itemValue.map((subItem, j) => (
                                                  <li
                                                    key={j}
                                                    className="text-sm text-muted-foreground flex items-start gap-2"
                                                  >
                                                    <span className="text-primary/60">→</span>
                                                    <span className="flex-1">
                                                      {typeof subItem === "string"
                                                        ? subItem
                                                        : JSON.stringify(subItem)}
                                                    </span>
                                                  </li>
                                                ))}
                                              </ul>
                                            ) : (
                                              <p className="text-sm text-muted-foreground mt-1">
                                                {String(itemValue)}
                                              </p>
                                            )}
                                          </div>
                                        )
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">
                                      {JSON.stringify(item)}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
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
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-4 rounded-lg bg-muted">
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
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-4 rounded-lg bg-muted">
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
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-4 rounded-lg bg-muted">
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

          {/* Repurpose Tab */}
          <TabsContent value="repurpose">
            <Card>
              <CardHeader>
                <CardTitle>Repurpose Content</CardTitle>
              </CardHeader>
              <CardContent>
                {!isCompleted && (
                  <p className="text-muted-foreground mb-4">
                    Content repurposing is available once the job is completed.
                  </p>
                )}

                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <Button
                    onClick={handleGenerateLinkedIn}
                    className="w-full sm:w-auto"
                    disabled={!isCompleted || generatingLinkedin}
                  >
                    {generatingLinkedin && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {generatingLinkedin
                      ? "Generating..."
                      : "Generate LinkedIn Post"}
                  </Button>
                  <Button
                    onClick={handleGenerateYouTube}
                    disabled={!isCompleted || generatingYoutube}
                    variant="secondary"
                    className="w-full sm:w-auto"
                  >
                    {generatingYoutube && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {generatingYoutube
                      ? "Generating..."
                      : "Generate YouTube Script"}
                  </Button>
                </div>

                {(job.linkedinPost || job.youtubeScript) && (
                  <Tabs defaultValue={job.linkedinPost ? "linkedin" : "youtube"}>
                    <TabsList className="mb-4">
                      <TabsTrigger value="linkedin">LinkedIn Post</TabsTrigger>
                      <TabsTrigger value="youtube">YouTube Script</TabsTrigger>
                    </TabsList>

                    <TabsContent value="linkedin">
                      {job.linkedinPost ? (
                        <div>
                          <div className="flex justify-end mb-3">
                            <CopyButton
                              text={job.linkedinPost}
                              label="Copy Post"
                            />
                          </div>
                          <pre className="whitespace-pre-wrap text-sm text-foreground/80 bg-muted rounded-lg p-4 max-h-96 overflow-y-auto">
                            {job.linkedinPost}
                          </pre>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">
                          No LinkedIn post generated yet.
                        </p>
                      )}
                    </TabsContent>

                    <TabsContent value="youtube">
                      {job.youtubeScript ? (
                        <div>
                          <div className="flex justify-end mb-3">
                            <CopyButton
                              text={job.youtubeScript}
                              label="Copy Script"
                            />
                          </div>
                          <pre className="whitespace-pre-wrap text-sm text-foreground/80 bg-muted rounded-lg p-4 max-h-96 overflow-y-auto">
                            {job.youtubeScript}
                          </pre>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">
                          No YouTube script generated yet.
                        </p>
                      )}
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
