// Report review dialog — worker reports an abusive or harmful review

"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/auth/errors";
import type {
  ReportReason,
  ReportReviewPayload,
  ReportStatus,
} from "@/lib/worker/reviews/types";
import { REPORT_REASONS } from "@/lib/worker/reviews/types";

type ReportReviewDialogProps = {
  reviewId: string;
  reportStatus: ReportStatus;
  onReport: (reviewId: string, payload: ReportReviewPayload) => Promise<void>;
};

export default function ReportReviewDialog({
  reviewId,
  reportStatus,
  onReport,
}: ReportReviewDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  const isPending = reportStatus === "PENDING";

  async function handleSubmit() {
    if (!reason || isSending) {
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const trimmed = description.trim();
      await onReport(reviewId, {
        reason,
        ...(trimmed ? { description: trimmed } : {}),
      });
      setIsSent(true);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSending(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen) {
      setReason(null);
      setDescription("");
      setError(null);
      setIsSent(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={isPending}
      >
        {isPending ? "Denúncia em análise" : "Denunciar"}
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Motivo da denúncia</DialogTitle>
          <DialogDescription>
            Conte por que esta avaliação deve ser analisada. O conteúdo
            continua visível até a decisão da moderação.
          </DialogDescription>
        </DialogHeader>

        {isSent ? (
          <p className="text-sm text-foreground">
            Denúncia enviada. Nossa equipe vai analisar.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <RadioGroup
              value={reason ?? ""}
              onValueChange={(value) => setReason(value as ReportReason)}
            >
              {REPORT_REASONS.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <RadioGroupItem
                    value={option.value}
                    id={`report-${option.value}`}
                  />
                  <Label htmlFor={`report-${option.value}`}>
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <Textarea
              placeholder="Detalhes (opcional)"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        {!isSent && (
          <DialogFooter>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!reason || isSending}
            >
              {isSending ? "Enviando…" : "Enviar denúncia"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
      </Dialog>
    </>
  );
}
