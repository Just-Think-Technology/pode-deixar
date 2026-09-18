// Contract tracking view — shared composition for client and provider

"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ContractActions } from "@/components/shared/tracking/contract-actions";
import { ContractSummaryCard } from "@/components/shared/tracking/contract-summary-card";
import { ContractTimeline } from "@/components/shared/tracking/contract-timeline";
import { EvidenceGallery } from "@/components/shared/tracking/evidence-gallery";
import { TrackingCancelledNotice } from "@/components/shared/tracking/tracking-states";
import {
  buildTimelineEvents,
  deriveContractStatus,
  getAvailableActions,
} from "@/lib/tracking/timeline-builder";
import { CONTRACT_STATUS_DESCRIPTIONS } from "@/lib/tracking/labels";
import type { ContractTracking } from "@/lib/tracking/types";
import { cn } from "@/lib/utils";

type ContractTrackingViewProps = {
  tracking: ContractTracking;
  backHref: string;
  backLabel: string;
};

export function ContractTrackingView({
  tracking,
  backHref,
  backLabel,
}: ContractTrackingViewProps) {
  const router = useRouter();
  const status = deriveContractStatus(tracking);
  const events = buildTimelineEvents(tracking);
  const actions = getAvailableActions(tracking);

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      const referrer = document.referrer;
      const isInternal =
        referrer === "" || referrer.startsWith(window.location.origin);
      if (isInternal) {
        router.back();
        return;
      }
    }
    router.push(backHref);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <button
        type="button"
        onClick={handleBack}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "gap-2 text-muted-foreground",
        )}
      >
        <ArrowLeft className="size-4" />
        {backLabel}
      </button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Acompanhamento da contratação
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {CONTRACT_STATUS_DESCRIPTIONS[status]}
        </p>
      </div>

      {status === "CANCELLED" ? (
        <TrackingCancelledNotice
          reason={tracking.cancelReason}
          cancelledAt={tracking.cancelledAt}
        />
      ) : null}

      <ContractSummaryCard tracking={tracking} />

      <ContractActions tracking={tracking} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Linha do tempo</CardTitle>
        </CardHeader>
        <CardContent>
          <ContractTimeline events={events} />
        </CardContent>
      </Card>

      {actions.canViewEvidence && tracking.evidence ? (
        <EvidenceGallery tracking={tracking} evidence={tracking.evidence} />
      ) : null}

      <p className="text-center text-xs text-muted-foreground">
        Dúvidas? Consulte a{" "}
        <a
          href="/help"
          className="font-medium text-primary hover:underline"
        >
          central de ajuda
        </a>{" "}
        ou fale com o suporte.
      </p>
    </div>
  );
}
