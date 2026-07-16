"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Send,
  Tag,
  Wallet,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  getApiErrorMessage,
  mapApiErrorToFieldErrors,
} from "@/lib/auth/errors";
import { createProposalAction } from "@/lib/worker/requests/actions";
import {
  formatRequestBudget,
  formatRequestDate,
  getRequestStatusLabel,
  isOpenRequest,
} from "@/lib/worker/requests/labels";
import type { WorkerRequest } from "@/lib/worker/requests/types";
import {
  parseCreateProposalForm,
  validateCreateProposal,
} from "@/lib/worker/requests/validation";
import { cn } from "@/lib/utils";

type WorkerRequestDetailPageProps = {
  request: WorkerRequest;
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  OPEN: "border-sky-200 bg-sky-50 text-sky-800",
  IN_PROGRESS: "border-amber-200 bg-amber-50 text-amber-800",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  CANCELLED: "border-slate-200 bg-slate-50 text-slate-700",
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}

export default function WorkerRequestDetailPage({
  request,
}: WorkerRequestDetailPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const canRespond = isOpenRequest(request.status);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    setLoading(true);

    try {
      const payload = parseCreateProposalForm(event.currentTarget, request.id);
      const validation = validateCreateProposal(payload);

      if (!validation.ok) {
        setFieldErrors(validation.errors);
        throw Object.assign(new Error("validation"), {
          fieldErrors: validation.errors,
        });
      }

      await createProposalAction(payload);
      toast.success("Proposta enviada com sucesso!");
      router.push("/worker/proposal");
    } catch (err) {
      if (
        err instanceof Error &&
        err.message === "validation" &&
        "fieldErrors" in err
      ) {
        return;
      }

      const mapped = mapApiErrorToFieldErrors(err);
      if (mapped) {
        setFieldErrors(mapped);
      }

      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/worker/requests"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "mb-6 gap-2 text-muted-foreground",
        )}
      >
        <ArrowLeft className="size-4" />
        Voltar às solicitações
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {request.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Detalhes da solicitação recebida.
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-sm",
            STATUS_BADGE_CLASS[request.status] ??
              "border-slate-200 bg-slate-50 text-slate-700",
          )}
        >
          {getRequestStatusLabel(request.status)}
        </Badge>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sobre o pedido</CardTitle>
            <CardDescription>
              Informações enviadas pelo cliente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-foreground">
              {request.description}
            </p>
            <Separator />
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <Tag className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <dt className="text-muted-foreground">Categoria</dt>
                  <dd className="font-medium text-foreground">
                    {request.category.name}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Wallet className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <dt className="text-muted-foreground">Orçamento</dt>
                  <dd className="font-medium text-foreground">
                    {formatRequestBudget(
                      request.budget_min,
                      request.budget_max,
                    )}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <dt className="text-muted-foreground">Recebida em</dt>
                  <dd className="font-medium text-foreground">
                    {formatRequestDate(request.created_at)}
                  </dd>
                </div>
              </div>
            </dl>
          </CardContent>
        </Card>

        {canRespond ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Enviar proposta</CardTitle>
              <CardDescription>
                Informe o valor, a descrição do serviço e a duração estimada.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <FieldGroup className="grid gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="price">Preço (R$)</FieldLabel>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0.01"
                      placeholder="150.00"
                      aria-invalid={!!fieldErrors.price}
                    />
                    <FieldError message={fieldErrors.price} />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="estimatedDuration">
                      Duração estimada (opcional)
                    </FieldLabel>
                    <div className="relative">
                      <Clock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="estimatedDuration"
                        name="estimatedDuration"
                        placeholder="Ex.: 2 horas"
                        aria-invalid={!!fieldErrors.estimatedDuration}
                        className="pl-9"
                      />
                    </div>
                    <FieldError message={fieldErrors.estimatedDuration} />
                  </Field>

                  <Field className="md:col-span-2">
                    <FieldLabel htmlFor="description">
                      Descrição da proposta
                    </FieldLabel>
                    <Textarea
                      id="description"
                      name="description"
                      rows={4}
                      placeholder="Descreva como você pretende realizar o serviço, materiais inclusos e condições..."
                      aria-invalid={!!fieldErrors.description}
                    />
                    <FieldError message={fieldErrors.description} />
                  </Field>
                </FieldGroup>

                <Button type="submit" disabled={loading} className="gap-2">
                  {loading ? <Spinner /> : <Send className="size-4" />}
                  {loading ? "Enviando..." : "Enviar proposta"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-6 text-sm text-muted-foreground">
              Esta solicitação não está mais aberta para novas propostas.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
