"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Calendar,
  Clock,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

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
import type { ServiceType } from "@/lib/auth/types";
import { cn } from "@/lib/utils";

type WorkerServicesPageProps = {
  services: ServiceType[];
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
  services,
}: WorkerServicesPageProps) {
  const router = useRouter();
  const [selectedService, setSelectedService] = useState<ServiceType | null>(
    null,
  );

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
              CATEGORY_GRADIENTS[service.category_id] ??
              CATEGORY_GRADIENTS.outros;
            const icon = CATEGORY_ICON[service.category_id] ?? "📋";

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
                        <MapPin className="size-3.5 shrink-0" />
                        <span className="truncate">{service.location}</span>
                      </div>
                    </div>
                    <Badge
                      variant={service.status === "active" ? "default" : "secondary"}
                      className="shrink-0 text-xs capitalize"
                    >
                      {service.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>

                  <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {service.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className="shrink-0 text-xs capitalize"
                    >
                      {service.category_name}
                    </Badge>
                  </div>
                </CardContent>

                <CardFooter className="flex gap-2 px-4 pb-4 pt-3">
                  <Dialog onOpenChange={(open) => open && setSelectedService(service)}>
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
                                  <MapPin className="size-3.5" />
                                  Local
                                </span>
                                <p className="text-sm font-medium text-foreground">
                                  {selectedService.location}
                                </p>
                              </div>
                              <div className="space-y-1 rounded-lg bg-muted/50 px-3 py-2.5">
                                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Briefcase className="size-3.5" />
                                  Categoria
                                </span>
                                <p className="text-sm font-medium capitalize text-foreground">
                                  {selectedService.category_name}
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
                                  {selectedService.status === "active"
                                    ? "Ativo"
                                    : "Inativo"}
                                </p>
                              </div>
                            </div>
                          </div>

                          <DialogFooter showCloseButton>
                            <Button type="button" variant="outline" className="gap-2">
                              <Pencil className="size-4" />
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              className="gap-2"
                            >
                              <Trash2 className="size-4" />
                              Excluir
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
    </div>
  );
}
