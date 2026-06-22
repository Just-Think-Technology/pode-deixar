"use client";

import EmptyState from "@/components/shared/empty-state";
import ProfessionalCard from "@/components/shared/professional-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { MockProfessional } from "@/mock/types";

type SearchResultsProps = {
  professionals: MockProfessional[];
  total: number;
  isLoading: boolean;
  hasSearched: boolean;
};

function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="space-y-4 rounded-xl border border-border/80 bg-card p-4">
          <Skeleton className="h-44 w-full rounded-lg" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ))}
    </div>
  );
}

export default function SearchResults({
  professionals,
  total,
  isLoading,
  hasSearched,
}: SearchResultsProps) {
  if (!hasSearched) {
    return null;
  }

  const countLabel =
    total === 1 ? "1 profissional encontrado" : `${total} profissionais encontrados`;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Resultados</h2>
        {!isLoading && <p className="mt-1 text-sm text-muted-foreground">{countLabel}</p>}
      </div>

      {isLoading ? (
        <ResultsSkeleton />
      ) : professionals.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {professionals.map((professional) => (
            <ProfessionalCard key={professional.id} professional={professional} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nenhum profissional encontrado"
          description="Tente outra busca ou selecione uma categoria diferente."
        />
      )}
    </section>
  );
}
