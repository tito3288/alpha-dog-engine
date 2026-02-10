"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "./status-badge";
import {
  Brand,
  ContentJob,
  StatusTab,
  STATUS_TAB_FILTERS,
} from "@/lib/types";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function JobsDashboard() {
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [selectedBrandId, setSelectedBrandId] = useState("all");
  const [jobs, setJobs] = useState<ContentJob[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);

  const fetchJobs = useCallback(async (brandId?: string) => {
    try {
      const params = new URLSearchParams();
      if (brandId) params.set("brandId", brandId);
      const res = await fetch(`/api/jobs?${params.toString()}`);
      const data = await res.json();
      setJobs(data);
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    }
  }, []);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [brandsRes] = await Promise.all([
          fetch("/api/brands"),
          fetchJobs(),
        ]);
        const brandsData = await brandsRes.json();
        setBrands(brandsData);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [fetchJobs]);

  const filteredJobs = useMemo(() => {
    const allowedStatuses = STATUS_TAB_FILTERS[activeTab];
    if (!allowedStatuses) return jobs;
    return jobs.filter((job) => allowedStatuses.includes(job.status));
  }, [jobs, activeTab]);

  const handleBrandChange = (value: string) => {
    setSelectedBrandId(value);
    fetchJobs(value === "all" ? undefined : value);
  };

  const handleBatchGenerate = async () => {
    setIsBatchGenerating(true);
    try {
      await fetch("/api/jobs/batch-generate", { method: "POST" });
      await fetchJobs(
        selectedBrandId === "all" ? undefined : selectedBrandId
      );
    } finally {
      setIsBatchGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Content Jobs</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleBatchGenerate}
            disabled={isBatchGenerating}
          >
            {isBatchGenerating ? "Generating..." : "Generate All Idle"}
          </Button>
          <Button asChild>
            <Link href="/jobs/new">New Job</Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as StatusTab)}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="idle">Idle</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={selectedBrandId} onValueChange={handleBrandChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Topic</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredJobs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground py-8"
                >
                  No jobs found
                </TableCell>
              </TableRow>
            ) : (
              filteredJobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">{job.topic}</TableCell>
                  <TableCell>{job.brand.name}</TableCell>
                  <TableCell>
                    <StatusBadge status={job.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(job.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
