"use client";

import { useRouter } from "next/navigation";
import { Briefcase, FileText, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { createServiceAction } from "@/lib/auth/actions";
import {
  getApiErrorMessage,
  mapApiErrorToFieldErrors,
} from "@/lib/auth/errors";
import type { CreateServicePayload } from "@/lib/auth/types";
import { validateCreateService } from "@/lib/auth/validation";

type WorkerCreateServicePageProps = Record<string, never>;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}

function parseCreateServiceForm(
  form: HTMLFormElement,
): CreateServicePayload {
  const data = new FormData(form);
  return {
    title: String(data.get("title") ?? "").trim(),
    description: String(data.get("description") ?? "").trim(),
    fixedPrice: Number(data.get("fixedPrice") ?? 0),
    category: String(data.get("category") ?? "").trim(),
  };
}

export default function WorkerCreateServicePage(_props: WorkerCreateServicePageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    setLoading(true);

    try {
      const payload = parseCreateServiceForm(event.currentTarget);
      const validation = validateCreateService(payload);

      if (!validation.ok) {
        setFieldErrors(validation.errors);
        throw Object.assign(new Error("validation"), {
          fieldErrors: validation.errors,
        });
      }

      await createServiceAction(payload);

      toast.success("Serviço cadastrado com sucesso!");
      router.push("/worker/services");
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
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Cadastrar Serviço
        </h1>
        <p className="mt-1 text-muted-foreground">
          Crie um novo serviço para oferecer aos clientes na plataforma.
        </p>
      </div>

      <Card className="border-border/80 bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Informações do serviço
          </CardTitle>
          <CardDescription>
            Preencha os dados abaixo para cadastrar seu serviço.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <FieldGroup className="grid gap-4 md:grid-cols-2">
              <Field className="md:col-span-2">
                <FieldLabel htmlFor="title">Título do serviço</FieldLabel>
                <div className="relative">
                  <Briefcase className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="title"
                    name="title"
                    placeholder="Ex.: Pintura residencial"
                    aria-invalid={!!fieldErrors.title}
                    className="pl-9"
                  />
                </div>
                <FieldError message={fieldErrors.title} />
              </Field>

              <Field className="md:col-span-2">
                <FieldLabel htmlFor="description">Descrição</FieldLabel>
                <div className="relative">
                  <FileText className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" />
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Descreva detalhadamente o serviço oferecido..."
                    rows={4}
                    aria-invalid={!!fieldErrors.description}
                    className="pl-9"
                  />
                </div>
                <FieldError message={fieldErrors.description} />
              </Field>

              <Field>
                <FieldLabel htmlFor="category">Categoria</FieldLabel>
                <div className="relative">
                  <Briefcase className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="category"
                    name="category"
                    placeholder="Ex.: Elétrica, Hidráulica, Pintura..."
                    aria-invalid={!!fieldErrors.category}
                    className="pl-9"
                  />
                </div>
                <FieldError message={fieldErrors.category} />
              </Field>

              <Field>
                <FieldLabel htmlFor="fixedPrice">Preço fixo (R$)</FieldLabel>
                <div className="relative">
                  <span className="pointer-events-none absolute top-3.5 left-3 size-4 -translate-y-1/2 text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id="fixedPrice"
                    name="fixedPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="150,00"
                    aria-invalid={!!fieldErrors.fixedPrice}
                    className="pl-10"
                  />
                </div>
                <FieldError message={fieldErrors.fixedPrice} />
              </Field>
            </FieldGroup>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/worker/services")}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
              >
                {loading ? (
                  <>
                    <Spinner className="mr-2" />
                    Cadastrando...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 size-4" />
                    Cadastrar serviço
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
