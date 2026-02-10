"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Brand } from "@/lib/types";

export function CreateJobForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [batchTopics, setBatchTopics] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/brands")
      .then((res) => res.json())
      .then(setBrands)
      .catch(() => setError("Failed to load brands"));
  }, []);

  const handleSubmit = async () => {
    setError(null);

    if (!selectedBrandId) {
      setError("Please select a brand.");
      return;
    }

    const brandId = parseInt(selectedBrandId, 10);

    if (mode === "single") {
      if (!topic.trim()) {
        setError("Please enter a topic.");
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brandId,
            topic: topic.trim(),
            keywords: keywords.trim() || undefined,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create job");
        }
        router.push("/");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create job"
        );
      } finally {
        setIsSubmitting(false);
      }
    } else {
      const topics = batchTopics
        .split("\n")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      if (topics.length === 0) {
        setError("Please enter at least one topic.");
        return;
      }

      setIsSubmitting(true);
      try {
        const results = await Promise.all(
          topics.map((t) =>
            fetch("/api/jobs", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ brandId, topic: t }),
            })
          )
        );

        const failed = results.filter((r) => !r.ok);
        if (failed.length > 0) {
          throw new Error(
            `${failed.length} of ${topics.length} jobs failed to create`
          );
        }

        router.push("/");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create jobs"
        );
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/">&larr; Back to Dashboard</Link>
        </Button>
        <h1 className="text-2xl font-bold mt-4 text-foreground">
          Create Content Job
        </h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs
            value={mode}
            onValueChange={(v) => setMode(v as "single" | "batch")}
          >
            <TabsList className="mb-6">
              <TabsTrigger value="single">Single Job</TabsTrigger>
              <TabsTrigger value="batch">Batch Jobs</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2 mb-4">
            <Label>Brand</Label>
            <Select
              value={selectedBrandId}
              onValueChange={setSelectedBrandId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a brand" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode === "single" ? (
            <>
              <div className="space-y-2 mb-4">
                <Label>Topic</Label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Enter topic..."
                />
              </div>
              <div className="space-y-2 mb-6">
                <Label>Keywords (optional)</Label>
                <Input
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="keyword1, keyword2..."
                />
              </div>
            </>
          ) : (
            <div className="space-y-2 mb-6">
              <Label>Topics (one per line)</Label>
              <Textarea
                value={batchTopics}
                onChange={(e) => setBatchTopics(e.target.value)}
                placeholder="Enter one topic per line..."
                rows={8}
              />
            </div>
          )}

          {error && (
            <p className="text-destructive text-sm mb-4">{error}</p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting
              ? "Creating..."
              : mode === "single"
                ? "Create Job"
                : "Create Jobs"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
