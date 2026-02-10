"use client";

import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, IN_PROGRESS_STATUSES } from "@/lib/types";

function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "completed") return "default";
  if (status === "failed") return "destructive";
  if (status === "idle") return "outline";
  if ((IN_PROGRESS_STATUSES as readonly string[]).includes(status))
    return "secondary";
  return "outline";
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={getStatusVariant(status)}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
