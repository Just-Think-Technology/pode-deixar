"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  DollarSign,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Star,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import EmptyState from "@/components/shared/empty-state";
import type { ProviderPublicProfile } from "@/lib/client/provider/types";
import { cn } from "@/lib/utils";

type ClientProviderProfilePageProps = {
  profile: ProviderPublicProfile | null;
  error?: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
}

function StarRating({ rating, total }: { rating: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              "size-4",
              i < Math.round(rating)
                ? "fill-amber-400 text-amber-400"
                : "fill-muted text-muted",
            )}
          />
        ))}
      </div>
      <span className="text-sm font-medium text-foreground">
        {rating.toFixed(1)}
      </span>
      <span className="text-sm text-muted-foreground">({total})</span>
    </div>
  );
}

export default function ClientProviderProfilePage({
  profile,
  error,
}: ClientProviderProfilePageProps) {
  const router = useRouter();

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
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
          title="Erro ao carregar perfil"
          description={error}
          action={
            <Button variant="outline" onClick={() => router.refresh()}>
              Tentar novamente
            </Button>
          }
        />
      </div>
    );
  }

  if (!profile) return null;

  const initials = getInitials(profile.user.complete_name);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Button
        variant="ghost"
        size="sm"
        className="mb-6 gap-2 text-muted-foreground"
        onClick={() => router.back()}
      >
        <ArrowLeft className="size-4" />
        Voltar
      </Button>

      <div className="space-y-8">
        <Card className="overflow-hidden border-border/80 shadow-sm">
          <div className="flex flex-col items-center px-6 pb-6 pt-10 sm:flex-row sm:items-start sm:gap-6 sm:pt-6">
            <Avatar className="mb-4 size-28 shrink-0 sm:mb-0 sm:size-32">
              <AvatarImage
                src={profile.avatar_url ?? undefined}
                alt={profile.user.complete_name}
              />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>

            <div className="flex min-w-0 flex-1 flex-col items-center text-center sm:items-start sm:text-left">
              <h1 className="text-2xl font-bold text-foreground">
                {profile.user.complete_name}
              </h1>

              <StarRating rating={profile.rating} total={profile.total_reviews} />

              <div className="mt-2 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                {profile.is_available ? (
                  <Badge className="border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                    Disponível
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Indisponível
                  </Badge>
                )}

                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" />
                  {profile.user.postal_code}
                </span>
              </div>

              {profile.hourly_rate != null && (
                <div className="mt-4 flex items-center gap-1.5 rounded-lg border border-primary/15 bg-primary/5 px-4 py-2">
                  <DollarSign className="size-4 shrink-0 text-primary" />
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(profile.hourly_rate)}
                  </span>
                  <span className="text-sm text-muted-foreground">/hora</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {profile.bio && (
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">Sobre</h2>
            <Card className="border-border/80 shadow-sm">
              <CardContent className="p-5">
                <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
                  {profile.bio}
                </p>
              </CardContent>
            </Card>
          </section>
        )}

        {profile.skills.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">Habilidades</h2>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="border-secondary/30 bg-secondary/15 font-normal text-secondary hover:bg-secondary/15"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">Serviços</h2>
          {profile.services.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {profile.services.map((service) => (
                <Card
                  key={service.id}
                  className="flex flex-col border-border/80 shadow-sm transition-shadow hover:shadow-md"
                >
                  <CardContent className="flex flex-1 flex-col gap-3 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-foreground">
                        {service.title}
                      </h3>
                      <Badge
                        variant="outline"
                        className="shrink-0 border-primary/20 text-xs text-primary"
                      >
                        {service.category.name}
                      </Badge>
                    </div>

                    <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {service.description}
                    </p>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Preço fixo</span>
                      <span className="text-lg font-bold text-primary">
                        {formatCurrency(service.fixed_price)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Nenhum serviço cadastrado"
              description="Este profissional ainda não possui serviços cadastrados."
            />
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">Contato</h2>
          <Card className="border-border/80 shadow-sm">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="size-4 shrink-0 text-muted-foreground" />
                <a
                  href={`mailto:${profile.user.email}`}
                  className="text-primary hover:underline"
                >
                  {profile.user.email}
                </a>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="size-4 shrink-0 text-muted-foreground" />
                <span className="text-foreground">{profile.user.phone}</span>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      <div className="sticky bottom-0 -mx-4 mt-8 border-t bg-background px-4 py-4">
        <Button
          type="button"
          className="w-full gap-2"
          size="lg"
          onClick={() =>
            toast.info("Em breve você poderá solicitar orçamentos por aqui.")
          }
        >
          <MessageSquare className="size-4" />
          Solicitar Orçamento
        </Button>
      </div>
    </div>
  );
}
