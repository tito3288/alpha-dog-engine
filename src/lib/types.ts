export interface Brand {
  id: number;
  name: string;
  website: string;
  description: string | null;
  createdAt: string;
}

export interface ContentJob {
  id: number;
  brandId: number;
  topic: string;
  keywords: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  brand: Brand;
}

export type StatusTab = "all" | "idle" | "in_progress" | "completed" | "failed";

export const IN_PROGRESS_STATUSES = [
  "researching",
  "generating_images",
  "writing",
  "generating_meta",
  "generating_thumbnail",
] as const;

export const STATUS_TAB_FILTERS: Record<StatusTab, string[] | null> = {
  all: null,
  idle: ["idle"],
  in_progress: [...IN_PROGRESS_STATUSES],
  completed: ["completed"],
  failed: ["failed"],
};

export const STATUS_LABELS: Record<string, string> = {
  idle: "Idle",
  researching: "Researching",
  generating_images: "Generating Images",
  writing: "Writing",
  generating_meta: "Generating Meta",
  generating_thumbnail: "Generating Thumbnail",
  completed: "Completed",
  failed: "Failed",
};
