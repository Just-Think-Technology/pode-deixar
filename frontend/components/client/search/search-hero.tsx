"use client";

import { Search } from "lucide-react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SearchHeroProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  isLoading?: boolean;
};

export default function SearchHero({
  query,
  onQueryChange,
  onSearch,
  isLoading = false,
}: SearchHeroProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch();
  }

  return (
    <div className="-mx-4 bg-primary px-4 py-10 md:-mx-6 md:px-6 md:py-12 lg:-mx-8 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6 text-center">
        <h1 className="text-2xl font-bold text-primary-foreground sm:text-3xl">
          O que você precisa?
        </h1>

        <form onSubmit={handleSubmit} className="relative mx-auto max-w-2xl">
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Ex: Pintor, Eletricista, Faxineira..."
            disabled={isLoading}
            className="h-14 rounded-full border-0 bg-card pl-5 pr-14 text-base text-foreground shadow-md"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading}
            className="absolute right-2 top-1/2 size-10 -translate-y-1/2 rounded-full"
            aria-label="Buscar"
          >
            <Search className="size-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
