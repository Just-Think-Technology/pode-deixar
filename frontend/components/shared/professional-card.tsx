"use client";

import Image from "next/image";
import { FileText, MapPin, MessageSquare, Star } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ProviderSearchResult } from "@/lib/client/search/types";
import { cn } from "@/lib/utils";

type ProfessionalCardProps = {
  professional: ProviderSearchResult;
  className?: string;
};

export default function ProfessionalCard({ professional, className }: ProfessionalCardProps) {
  const initials = professional.user.complete_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  const displayTitle = professional.services[0]?.title ?? "Profissional";
  const categoryName = professional.services[0]?.category.name ?? "";

  return (
    <Card
      className={cn(
        "overflow-hidden border border-border/80 bg-card py-0 shadow-sm",
        className,
      )}
    >
      <div className="relative h-44 w-full overflow-hidden">
        {professional.cover_image_url ? (
          <Image
            src={professional.cover_image_url}
            alt={displayTitle}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10" />
        )}
        {!professional.is_available && (
          <div className="absolute right-2 top-2 rounded-md bg-destructive px-2 py-1 text-xs font-medium text-destructive-foreground">
            Indisponível
          </div>
        )}
      </div>

      <CardContent className="space-y-3 px-4 pt-4 pb-0">
        <div className="flex items-center gap-3">
          <Avatar className="size-10 shrink-0">
            <AvatarImage
              src={professional.avatar_url ?? undefined}
              alt={professional.user.complete_name}
            />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">
              {professional.user.complete_name}
            </p>
            <div className="flex items-center gap-1 text-sm">
              <Star className="size-4 fill-amber-400 text-amber-400" />
              <span className="font-medium text-foreground">
                {professional.rating.toFixed(1)}
              </span>
              <span className="text-muted-foreground">
                ({professional.total_reviews})
              </span>
            </div>
          </div>
        </div>

        <h3 className="font-semibold leading-snug text-foreground">{displayTitle}</h3>

        {professional.bio && (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {professional.bio}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {categoryName && (
            <Badge className="border-secondary/30 bg-secondary/15 font-normal text-secondary hover:bg-secondary/15">
              {categoryName}
            </Badge>
          )}
          {professional.skills.length > 0 && (
            <span className="flex flex-wrap gap-1">
              {professional.skills.slice(0, 2).map((skill) => (
                <Badge
                  key={skill}
                  variant="outline"
                  className="border-border/60 font-normal text-muted-foreground"
                >
                  {skill}
                </Badge>
              ))}
              {professional.skills.length > 2 && (
                <Badge
                  variant="outline"
                  className="border-border/60 font-normal text-muted-foreground"
                >
                  +{professional.skills.length - 2}
                </Badge>
              )}
            </span>
          )}
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            {professional.user.postal_code}
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