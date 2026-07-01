"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Calendar,
  Clock,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteServiceAction,
  updateServiceAction,
} from "@/lib/auth/actions";
import type { ProviderService } from "@/lib/auth/types";
import { cn } from "@/lib/utils";

type WorkerServicesPageProps = {
  services: ProviderService[];
};

const CATEGORY_GRADIENTS: Record<string, string> = {
  limpeza: "from-emerald-400 to-emerald-300",
  pintura: "from-sky-400 to-sky-300",
  eletrica: "from-amber-400 to-amber-300",
  construcao: "from-stone-400 to-stone-300",
  jardinagem: "from-green-400 to-green-300",
  automotivo: "from-rose-400 to-rose-300",
  mudancas: "from-violet-400 to-violet-300",
  reformas: "from-orange-400 to-orange-300",
  hidraulica: "from-cyan-400 to-cyan-300",
  outros: "from-slate-400 to-slate-300",
};

const CATEGORY_ICON: Record<string, string> = {
  limpeza: "🧹",
  pintura: "🎨",
  eletrica: "⚡",
  construcao: "🏗️",
  jardinagem: "🌱",
  automotivo: "🔧",
  mudancas: "📦",
  reformas: "🔨",
  hidraulica: "🔧",
  outros: "📋",
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function WorkerServicesPage({
  services: initialServices,
}: WorkerServicesPageProps) {
  const router = useRouter();
  const [services, setServices] = useState<ProviderService[]>(initialServices);
  const [selectedService, setSelectedService] = useState<ProviderService | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingService, setEditingService] = useState<ProviderService | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  function openEdit(service: ProviderService) {
    setEditingService(service);
    setEditErrors({});
    setDetailsOpen(false);
    setEditOpen(true);
  }

  async function handleSaveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingService) return;
    setEditErrors({});
    setSaving(true);

    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    const description = String(data.get("description") ?? "").trim();
    const category = String(data.get("category") ?? "").trim();
    const fixedPrice = Number(data.get("fixedPrice") ?? 0);

    const errors: Record<string, string> = {};
    if (title.length < 3 || title.length > 200) errors.title = "Título deve ter entre 3 e 200 caracteres";
    if (description.length < 10 || description.length > 2000) errors.description = "Descrição deve ter entre 10 e 2000 caracteres";
    if (!category) errors.category = "Informe a categoria do serviço";
    if (!fixedPrice || fixedPrice <= 0) errors.fixedPrice = "Preço deve ser maior que zero";

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      setSaving(false);
      return;
    }

    const updatedService: ProviderService = {
      ...editingService,
      title,
      description,
      category,
      fixed_price: fixedPrice,
    };

    setServices((prev) =>
      prev.map((s) => (s.id === editingService.id ? updatedService : s)),
    );
    setEditOpen(false);
    setEditingService(null);
    setSaving(false);

    try {
      await updateServiceAction(updatedService.id, {
        title,
        description,
        category,
        fixedPrice,
      });
      toast.success("Serviço atualizado com sucesso!");
    } catch {
      setServices((prev) =>
        prev.map((s) =>
          s.id === updatedService.id ? editingService : s,
        ),
      );
      toast.error("Erro ao atualizar serviço. Tente novamente.");
    }
  }

  async function handleDelete(service: ProviderService) {
    if (!confirm("Tem certeza que deseja desativar este serviço?")) return;
    setDeleting(true);
    setServices((prev) => prev.filter((s) => s.id !== service.id));
    setDetailsOpen(false);
    try {
      await deleteServiceAction(service.id);
      toast.success("Serviço desativado com sucesso!");
    } catch {
      setServices((prev) => [...prev, service]);
      toast.error("Erro ao desativar serviço. Tente novamente.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Serviços
          </h1>
          <p className="mt-1 text-muted-foreground">
            Gerencie os serviços que você oferece na plataforma.
          </p>
        </div>
        <Button
          onClick={() => router.push("/worker/services/create")}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
        >
          <Plus className="mr-2 size-4" />
          Cadastrar Serviço
        </Button>
      </div>

      {services.length === 0 ? (
        <Empty className="border border-dashed border-border/80 bg-muted/20">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Briefcase />
            </EmptyMedia>
            <EmptyTitle>Nenhum serviço cadastrado</EmptyTitle>
            <EmptyDescription>
              Você ainda não cadastrou nenhum serviço. Clique no botão acima
              para cadastrar seu primeiro serviço e começar a receber
              solicitações de orçamento.
            </EmptyDescription>
          </EmptyHeader>
          <Button
            onClick={() => router.push("/worker/services/create")}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
          >
            <Plus className="mr-2 size-4" />
            Cadastrar primeiro serviço
          </Button>
        </Empty>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const gradient =
              CATEGORY_GRADIENTS[service.category.toLowerCase()] ??
              CATEGORY_GRADIENTS.outros;
            const icon =
              CATEGORY_ICON[service.category.toLowerCase()] ?? "📋";

            return (
              <Card
                key={service.id}
                className="overflow-hidden border-border/80 bg-card py-0 shadow-sm transition-shadow hover:shadow-md"
              >
                <div
                  className={cn(
                    "flex h-36 items-center justify-center bg-gradient-to-br",
                    gradient,
                  )}
                  aria-hidden
                >
                  <span className="text-5xl drop-shadow-sm">{icon}</span>
                </div>

                <CardContent className="space-y-3 px-4 pb-0 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold leading-snug text-foreground">
                        {service.title}
                      </h3>
                      <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {service.fixed_price.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={service.is_active ? "default" : "secondary"}
                      className="shrink-0 text-xs capitalize"
                    >
                      {service.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>

                  <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {service.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {service.category}
                    </Badge>
                  </div>
                </CardContent>

                <CardFooter className="flex gap-2 px-4 pb-4 pt-3">
                  <Dialog
                    open={detailsOpen && selectedService?.id === service.id}
                    onOpenChange={(open) => {
                      if (open) setSelectedService(service);
                      setDetailsOpen(open);
                    }}
                  >
                    <DialogTrigger
                      render={
                        <Button type="button" variant="outline" className="flex-1" />
                      }
                    >
                      Ver detalhes
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      {selectedService && (
                        <>
                          <DialogHeader>
                            <DialogTitle>
                              {selectedService.title}
                            </DialogTitle>
                            <DialogDescription>
                              Detalhes do serviço
                            </DialogDescription>
                          </DialogHeader>

                          <div className="space-y-4">
                            <p className="text-sm leading-relaxed text-foreground">
                              {selectedService.description}
                            </p>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1 rounded-lg bg-muted/50 px-3 py-2.5">
                                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Briefcase className="size-3.5" />
                                  Preço
                                </span>
                                <p className="text-sm font-medium text-foreground">
                                  {selectedService.fixed_price.toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  })}
                                </p>
                              </div>
                              <div className="space-y-1 rounded-lg bg-muted/50 px-3 py-2.5">
                                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Briefcase className="size-3.5" />
                                  Categoria
                                </span>
                                <p className="text-sm font-medium text-foreground">
                                  {selectedService.category}
                                </p>
                              </div>
                              <div className="space-y-1 rounded-lg bg-muted/50 px-3 py-2.5">
                                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Calendar className="size-3.5" />
                                  Criado em
                                </span>
                                <p className="text-sm font-medium text-foreground">
                                  {formatDate(selectedService.created_at)}
                                </p>
                              </div>
                              <div className="space-y-1 rounded-lg bg-muted/50 px-3 py-2.5">
                                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Clock className="size-3.5" />
                                  Status
                                </span>
                                <p className="text-sm font-medium capitalize text-foreground">
                                  {selectedService.is_active
                                    ? "Ativo"
                                    : "Inativo"}
                                </p>
                              </div>
                            </div>
                          </div>

                          <DialogFooter showCloseButton>
                            <Button
                              type="button"
                              variant="outline"
                              className="gap-2"
                              onClick={() => openEdit(selectedService)}
                            >
                              <Pencil className="size-4" />
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              className="gap-2"
                              disabled={deleting}
                              onClick={() => handleDelete(selectedService)}
                            >
                              <Trash2 className="size-4" />
                              {deleting ? "Desativando..." : "Excluir"}
                            </Button>
                          </DialogFooter>
                        </>
                      )}
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Serviço</DialogTitle>
            <DialogDescription>
              Altere os dados do serviço e clique em salvar.
            </DialogDescription>
          </DialogHeader>

          <form key={editingService?.id ?? "new"} onSubmit={handleSaveEdit} className="space-y-4">
            <FieldGroup className="grid gap-4 md:grid-cols-2">
              <Field className="md:col-span-2">
                <FieldLabel htmlFor="edit-title">Título do serviço</FieldLabel>
                <Input
                  id="edit-title"
                  name="title"
                  defaultValue={editingService?.title ?? ""}
                  aria-invalid={!!editErrors.title}
                />
                {editErrors.title && (
                  <p className="text-sm text-destructive">{editErrors.title}</p>
                )}
              </Field>

              <Field className="md:col-span-2">
                <FieldLabel htmlFor="edit-description">Descrição</FieldLabel>
                <Textarea
                  id="edit-description"
                  name="description"
                  defaultValue={editingService?.description ?? ""}
                  rows={3}
                  aria-invalid={!!editErrors.description}
                />
                {editErrors.description && (
                  <p className="text-sm text-destructive">
                    {editErrors.description}
                  </p>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="edit-category">Categoria</FieldLabel>
                <Input
                  id="edit-category"
                  name="category"
                  defaultValue={editingService?.category ?? ""}
                  aria-invalid={!!editErrors.category}
                />
                {editErrors.category && (
                  <p className="text-sm text-destructive">
                    {editErrors.category}
                  </p>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="edit-fixedPrice">Preço fixo (R$)</FieldLabel>
                <Input
                  id="edit-fixedPrice"
                  name="fixedPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={editingService?.fixed_price ?? ""}
                  aria-invalid={!!editErrors.fixedPrice}
                />
                {editErrors.fixedPrice && (
                  <p className="text-sm text-destructive">
                    {editErrors.fixedPrice}
                  </p>
                )}
              </Field>
            </FieldGroup>

            <DialogFooter showCloseButton>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
              >
                {saving ? (
                  <>
                    <Spinner className="mr-2" />
                    Salvando...
                  </>
                ) : (
                  "Salvar alterações"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
