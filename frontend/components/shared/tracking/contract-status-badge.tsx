// Contract status badge — official 5-status indicator

import { Badge } from "@/components/ui/badge";
import { getContractStatusLabel } from "@/lib/tracking/labels";
import type { ContractStatus } from "@/lib/tracking/types";
import { cn } from "@/lib/utils";

const STATUS_BADGE_CLASS: Record<ContractStatus, string> = {
  AWAITING_PAYMENT: "border-amber-200 bg-amber-50 text-amber-800",
  SCHEDULED: "border-sky-200 bg-sky-50 text-sky-800",
  IN_PROGRESS: "border-violet-200 bg-violet-50 text-violet-800",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  CANCELLED: "border-slate-200 bg-slate-50 text-slate-700",
};

type ContractStatusBadgeProps = {
  status: ContractStatus;
  className?: string;
};

export function ContractStatusBadge({ status, className }: ContractStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(STATUS_BADGE_CLASS[status], className)}
    >
      {getContractStatusLabel(status)}
    </Badge>
  );
}
