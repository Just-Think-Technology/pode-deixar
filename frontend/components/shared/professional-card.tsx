"use client";

import Image from "next/image";
import { FileText, MapPin, MessageSquare, Star } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { MockProfessional } from "@/mock/types";
import { cn } from "@/lib/utils";

type ProfessionalCardProps = {
  professional: MockProfessional;
  className?: string;
};

export default function ProfessionalCard({ professional, className }: ProfessionalCardProps) {
  const initials = professional.providerName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <Card
      className={cn(
        "overflow-hidden border border-border/80 bg-card py-0 shadow-sm",
        className,
      )}
    >
      <div className="relative h-44 w-full overflow-hidden">
        <Image
          src={professional.coverImageUrl}
          alt={professional.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>

      <CardContent className="space-y-3 px-4 pt-4 pb-0">
        <div className="flex items-center gap-3">
          <Avatar className="size-10 shrink-0">
            <AvatarImage src={professional.avatarImageUrl} alt={professional.providerName} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">{professional.providerName}</p>
            <div className="flex items-center gap-1 text-sm">
              <Star className="size-4 fill-amber-400 text-amber-400" />
              <span className="font-medium text-foreground">
                {professional.rating.toFixed(1)}
              </span>
              <span className="text-muted-foreground">({professional.reviewCount})</span>
            </div>
          </div>
        </div>

        <h3 className="font-semibold leading-snug text-foreground">{professional.title}</h3>

        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {professional.description}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-secondary/30 bg-secondary/15 font-normal text-secondary hover:bg-secondary/15">
            {professional.category}
          </Badge>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            {professional.location}
          </span>
        </div>

        <div className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2.5">
          <div className="flex gap-2">
            <FileText className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Orçamento personalizado</p>
              <p className="text-xs text-muted-foreground">
                Descreva seu projeto e receba uma proposta
              </p>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 px-4 pb-4 pt-3">
        <Button
          type="button"
          className="flex-1 gap-2"
          onClick={() =>
            toast.info("Em breve você poderá solicitar orçamentos por aqui.")
          }
        >
          <MessageSquare className="size-4" />
          Solicitar Orçamento
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => toast.info("Detalhes do profissional em breve.")}
        >
          Ver Mais
        </Button>
      </CardFooter>
    </Card>
  );
}
