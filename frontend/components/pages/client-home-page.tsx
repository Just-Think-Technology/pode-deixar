"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import ProfessionalCard from "@/components/shared/professional-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  CLIENT_CATEGORY_ALL,
  CLIENT_MOCK_PROFESSIONALS,
  CLIENT_SERVICE_CATEGORIES,
} from "@/mock/client/home";
import { cn } from "@/lib/utils";

export default function ClientHomePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>(CLIENT_CATEGORY_ALL);

  const filtered = useMemo(() => {
    return CLIENT_MOCK_PROFESSIONALS.filter((p) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.providerName.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      const matchesCategory =
        category === CLIENT_CATEGORY_ALL || p.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [search, category]);

  const countLabel =
    filtered.length === 1
      ? "1 profissional encontrado"
      : `${filtered.length} profissionais encontrados`;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center gap-2 md:hidden">
        <SidebarTrigger />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="O que você precisa?"
            className="h-12 rounded-full border-border/80 bg-card pl-11 text-base shadow-sm"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-12 shrink-0 gap-2 rounded-full border-border/80 bg-card px-5 shadow-sm"
          onClick={() => toast.info("Filtros avançados em breve.")}
        >
          <SlidersHorizontal className="size-4" />
          Filtros
        </Button>
      </div>

      <div className="rounded-lg bg-primary/10 px-4 py-3 text-center text-sm text-foreground">
        <span className="font-medium">Como funciona:</span> Descreva o que você precisa e
        receba orçamentos personalizados dos profissionais
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory(CLIENT_CATEGORY_ALL)}
          className={cn(
            "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
            category === CLIENT_CATEGORY_ALL
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground hover:border-primary/30",
          )}
        >
          {CLIENT_CATEGORY_ALL}
        </button>
        {CLIENT_SERVICE_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.label)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              category === cat.label
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-primary/30",
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div>
        <h2 className="text-xl font-bold text-foreground">Profissionais disponíveis</h2>
        <p className="mt-1 text-sm text-muted-foreground">{countLabel}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((professional) => (
          <ProfessionalCard key={professional.id} professional={professional} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-16 text-center text-muted-foreground">
          Nenhum profissional encontrado. Tente outra busca ou categoria.
        </p>
      )}
    </div>
  );
}
