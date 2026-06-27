"use client";

import { useRouter } from "next/navigation";
import { Briefcase, Plus, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { ServiceType } from "@/lib/auth/types";

type WorkerServicesPageProps = {
  services: ServiceType[];
};

export default function WorkerServicesPage({
  services,
}: WorkerServicesPageProps) {
  const router = useRouter();

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card
              key={service.id}
              className="overflow-hidden border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              <div
                className="flex h-36 items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5"
                aria-hidden
              >
                <span className="text-4xl font-bold text-primary/30">
                  {service.title.charAt(0)}
                </span>
              </div>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold leading-snug text-foreground">
                      {service.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {service.location}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {service.category_name}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
