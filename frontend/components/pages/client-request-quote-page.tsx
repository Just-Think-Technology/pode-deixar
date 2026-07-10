"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  DollarSign,
  FileText,
  Send,
  Star,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import EmptyState from "@/components/shared/empty-state";
import { createServiceOrderAction } from "@/lib/client/quote/actions";
import type { Category, ServiceOrder } from "@/lib/client/quote/types";
import {
  parseCreateServiceOrderForm,
  validateCreateServiceOrder,
} from "@/lib/client/quote/validation";
import type { ProviderPublicProfile } from "@/lib/client/provider/types";
import {
  getApiErrorMessage,
  mapApiErrorToFieldErrors,
} from "@/lib/auth/errors";
import { cn } from "@/lib/utils";

type ClientRequestQuotePageProps = {
  profile: ProviderPublicProfile | null;
  categories: Category[];
  error?: string;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
}

function getDefaultCategoryId(
  profile: ProviderPublicProfile,
  categories: Category[],
): string {
  const firstService = profile.services[0];
  if (!firstService) return "";

  const byId = categories.find(
    (category) => category.id === firstService.category_id,
  );
  if (byId) return byId.id;

  const bySlug = categories.find(
    (category) => category.slug === firstService.category?.slug,
  );
  if (bySlug) return bySlug.id;

  return "";
}

function formatCurrency(value: number | null) {
  if (value == null) return null;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function ClientRequestQuotePage({
  profile,
  categories,
  error,
}: ClientRequestQuotePageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [createdOrder, setCreatedOrder] = useState<ServiceOrder | null>(null);

  const defaultCategoryId = useMemo(
    () => (profile ? getDefaultCategoryId(profile, categories) : ""),
    [profile, categories],
  );

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-6 gap-2 text-muted-foreground"
          onClick={() => router.back()}
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Button>
        <EmptyState
          title="Não foi possível carregar a solicitação"
          description={error}
        />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    setLoading(true);

    try {
      const payload = parseCreateServiceOrderForm(event.currentTarget);
      const validation = validateCreateServiceOrder(payload);

      if (!validation.ok) {
        setFieldErrors(validation.errors);
        throw Object.assign(new Error("validation"), {
          fieldErrors: validation.errors,
        });
      }

      const order = await createServiceOrderAction(payload);
      setCreatedOrder(order);
      toast.success("Solicitação enviada com sucesso!");
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

  if (createdOrder) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <Card className="border-primary/20 bg-primary/5 shadow-sm">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <CheckCircle2 className="size-12 text-primary" />
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Solicitação enviada!
              </h1>
              <p className="text-muted-foreground">
                Sua solicitação foi registrada. O profissional{" "}
                <span className="font-medium text-foreground">
                  {profile.user.complete_name}
                </span>{" "}
                poderá analisar e enviar uma proposta em breve.
              </p>
            </div>
            <div className="w-full rounded-lg border border-border/80 bg-card p-4 text-left text-sm">
              <p className="font-medium text-foreground">{createdOrder.title}</p>
              <p className="mt-1 text-muted-foreground">
                {createdOrder.category.name}
              </p>
              {(createdOrder.budget_min != null ||
                createdOrder.budget_max != null) && (
                <p className="mt-2 text-muted-foreground">
                  Faixa de orçamento:{" "}
                  {formatCurrency(createdOrder.budget_min) ?? "—"} a{" "}
                  {formatCurrency(createdOrder.budget_max) ?? "—"}
                </p>
              )}
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.push("/client/home")}
              >
                Voltar ao início
              </Button>
              <Button
                type="button"
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => router.push("/client/search")}
              >
                Buscar outros profissionais
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 gap-2 text-muted-foreground"
          onClick={() => router.back()}
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Solicitar Orçamento
        </h1>
        <p className="mt-1 text-muted-foreground">
          Descreva o serviço que você precisa e aguarde a proposta do
          profissional.
        </p>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardContent className="flex items-start gap-4 p-5">
          <Avatar className="size-14 shrink-0">
            <AvatarImage
              src={profile.avatar_url ?? undefined}
              alt={profile.user.complete_name}
            />
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(profile.user.complete_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">
                {profile.user.complete_name}
              </h2>
              <Badge
                variant="secondary"
                className={cn(
                  profile.is_available
                    ? "bg-secondary/15 text-secondary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {profile.is_available ? "Disponível" : "Indisponível"}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Star className="size-4 fill-amber-400 text-amber-400" />
              <span className="font-medium text-foreground">
                {profile.rating.toFixed(1)}
              </span>
              <span>({profile.total_reviews} avaliações)</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Descreva o serviço que você precisa. O profissional poderá
              analisar e enviar uma proposta personalizada.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Detalhes da solicitação
          </CardTitle>
          <CardDescription>
            Quanto mais detalhes você fornecer, melhor será a proposta
            recebida.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <FieldGroup className="grid gap-4 md:grid-cols-2">
              <Field className="md:col-span-2">
                <FieldLabel htmlFor="title">Título da solicitação</FieldLabel>
                <div className="relative">
                  <Briefcase className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="title"
                    name="title"
                    placeholder="Ex.: Pintura de sala e quarto"
                    aria-invalid={!!fieldErrors.title}
                    className="pl-9"
                  />
                </div>
                <FieldError message={fieldErrors.title} />
              </Field>

              <Field className="md:col-span-2">
                <FieldLabel htmlFor="description">Descrição do serviço</FieldLabel>
                <div className="relative">
                  <FileText className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" />
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Descreva o que precisa ser feito, local, prazo desejado e outras informações relevantes..."
                    rows={5}
                    aria-invalid={!!fieldErrors.description}
                    className="pl-9"
                  />
                </div>
                <FieldError message={fieldErrors.description} />
              </Field>

              <Field className="md:col-span-2">
                <FieldLabel htmlFor="categoryId">Categoria</FieldLabel>
                <NativeSelect
                  id="categoryId"
                  name="categoryId"
                  defaultValue={defaultCategoryId}
                  aria-invalid={!!fieldErrors.categoryId}
                  className="w-full"
                >
                  <NativeSelectOption value="">
                    Selecione uma categoria
                  </NativeSelectOption>
                  {categories.map((category) => (
                    <NativeSelectOption key={category.id} value={category.id}>
                      {category.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError message={fieldErrors.categoryId} />
              </Field>

              <Field>
                <FieldLabel htmlFor="budgetMin">
                  Orçamento mínimo (R$){" "}
                  <span className="font-normal text-muted-foreground">
                    (opcional)
                  </span>
                </FieldLabel>
                <div className="relative">
                  <DollarSign className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="budgetMin"
                    name="budgetMin"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="50,00"
                    aria-invalid={!!fieldErrors.budgetMin}
                    className="pl-9"
                  />
                </div>
                <FieldError message={fieldErrors.budgetMin} />
              </Field>

              <Field>
                <FieldLabel htmlFor="budgetMax">
                  Orçamento máximo (R$){" "}
                  <span className="font-normal text-muted-foreground">
                    (opcional)
                  </span>
                </FieldLabel>
                <div className="relative">
                  <DollarSign className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="budgetMax"
                    name="budgetMax"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="200,00"
                    aria-invalid={!!fieldErrors.budgetMax}
                    className="pl-9"
                  />
                </div>
                <FieldError message={fieldErrors.budgetMax} />
              </Field>
            </FieldGroup>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="outline"
                className="sm:flex-1"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 sm:flex-1"
              >
                {loading ? (
                  <>
                    <Spinner className="size-4" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    Enviar solicitação
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
