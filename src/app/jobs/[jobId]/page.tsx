"use client";

import { useState, useEffect, useCallback, use } from "react";

interface Brand {
  id: number;
  name: string;
  website: string;
  description: string | null;
}

interface Job {
  id: number;
  topic: string;
  status: string;
  keywords: string | null;
  articleContent: string | null;
  linkedinPost: string | null;
  youtubeScript: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  urlSlug: string | null;
  thumbnailUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  brand: Brand;
}

type RepurposeTab = "linkedin" | "youtube";

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<RepurposeTab>("linkedin");
  const [generatingLinkedin, setGeneratingLinkedin] = useState(false);
  const [generatingYoutube, setGeneratingYoutube] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (res.ok) {
        const data = await res.json();
        setJob(data);
      }
    } catch (error) {
      console.error("Failed to fetch job:", error);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  const handleGenerateLinkedIn = async () => {
    if (!job) return;
    setGeneratingLinkedin(true);

    // Open SSE connection before triggering
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
        const err = await res.json();
        alert(err.error || "Failed to start LinkedIn generation");
      }
    } catch {
      es.close();
      setGeneratingLinkedin(false);
      alert("Failed to start LinkedIn generation");
    }
  };

  const handleGenerateYouTube = async () => {
    if (!job) return;
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
        const err = await res.json();
        alert(err.error || "Failed to start YouTube generation");
      }
    } catch {
      es.close();
      setGeneratingYoutube(false);
      alert("Failed to start YouTube generation");
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      console.error("Failed to copy to clipboard");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading job...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Job not found</p>
      </div>
    );
  }

  const isCompleted = job.status === "completed";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <a
            href="/jobs"
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            &larr; Back to jobs
          </a>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
            {job.topic}
          </h1>
          <div className="mt-2 flex items-center gap-3">
            <StatusBadge status={job.status} />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Brand: {job.brand.name}
            </span>
            {job.keywords && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Keywords: {job.keywords}
              </span>
            )}
          </div>
        </div>

        {/* Meta Info */}
        {isCompleted && (job.metaTitle || job.metaDescription || job.urlSlug) && (
          <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              SEO Meta
            </h2>
            <div className="space-y-2 text-sm">
              {job.metaTitle && (
                <p>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Title:
                  </span>{" "}
                  <span className="text-gray-600 dark:text-gray-400">{job.metaTitle}</span>
                </p>
              )}
              {job.metaDescription && (
                <p>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Description:
                  </span>{" "}
                  <span className="text-gray-600 dark:text-gray-400">
                    {job.metaDescription}
                  </span>
                </p>
              )}
              {job.urlSlug && (
                <p>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Slug:
                  </span>{" "}
                  <span className="text-gray-600 dark:text-gray-400">{job.urlSlug}</span>
                </p>
              )}
            </div>
          </section>
        )}

        {/* Repurpose Section */}
        <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Repurpose Content
          </h2>

          {!isCompleted && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Content repurposing is available once the job is completed.
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={handleGenerateLinkedIn}
              disabled={!isCompleted || generatingLinkedin}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {generatingLinkedin ? "Generating..." : "Generate LinkedIn Post"}
            </button>
            <button
              onClick={handleGenerateYouTube}
              disabled={!isCompleted || generatingYoutube}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {generatingYoutube ? "Generating..." : "Generate YouTube Script"}
            </button>
          </div>

          {/* Tabs */}
          {(job.linkedinPost || job.youtubeScript) && (
            <div>
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setActiveTab("linkedin")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "linkedin"
                      ? "border-blue-600 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                >
                  LinkedIn Post
                </button>
                <button
                  onClick={() => setActiveTab("youtube")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "youtube"
                      ? "border-red-600 text-red-600 dark:text-red-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                >
                  YouTube Script
                </button>
              </div>

              <div className="mt-4">
                {activeTab === "linkedin" && (
                  <div>
                    {job.linkedinPost ? (
                      <div>
                        <div className="flex justify-end mb-2">
                          <button
                            onClick={() =>
                              copyToClipboard(job.linkedinPost!, "linkedin")
                            }
                            className="px-3 py-1 text-xs font-medium rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
                          >
                            {copiedField === "linkedin"
                              ? "Copied!"
                              : "Copy to Clipboard"}
                          </button>
                        </div>
                        <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                          {job.linkedinPost}
                        </pre>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No LinkedIn post generated yet. Click the button above
                        to generate one.
                      </p>
                    )}
                  </div>
                )}

                {activeTab === "youtube" && (
                  <div>
                    {job.youtubeScript ? (
                      <div>
                        <div className="flex justify-end mb-2">
                          <button
                            onClick={() =>
                              copyToClipboard(job.youtubeScript!, "youtube")
                            }
                            className="px-3 py-1 text-xs font-medium rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
                          >
                            {copiedField === "youtube"
                              ? "Copied!"
                              : "Copy to Clipboard"}
                          </button>
                        </div>
                        <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                          {job.youtubeScript}
                        </pre>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No YouTube script generated yet. Click the button above
                        to generate one.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Error */}
        {job.errorMessage && (
          <section className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-4">
            <p className="text-sm text-red-700 dark:text-red-400">
              {job.errorMessage}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    idle: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    researching: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    writing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    generating_images: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    generating_meta: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    generating_thumbnail: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
        styles[status] || styles.idle
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
