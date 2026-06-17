"use client";

import { useState } from "react";
import { toast } from "sonner";

import { searchProfessionals } from "@/api/client/search";
import PopularCategories from "@/components/client/search/popular-categories";
import SearchHero from "@/components/client/search/search-hero";
import SearchResults from "@/components/client/search/search-results";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { MockProfessional } from "@/mock/types";
import { POPULAR_CATEGORIES } from "@/mock/client/search";

export default function ClientSearchPage() {
  const [query, setQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>();
  const [results, setResults] = useState<MockProfessional[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(options?: { query?: string; categoryId?: string }) {
    const nextQuery = options?.query ?? query;
    const nextCategoryId =
      options && "categoryId" in options ? options.categoryId : selectedCategoryId;

    setIsLoading(true);
    setHasSearched(true);

    try {
      const response = await searchProfessionals({
        query: nextQuery.trim() || undefined,
        categoryId: nextCategoryId,
      });

      setResults(response.professionals);
      setTotal(response.total);
    } catch (error) {
      setResults([]);
      setTotal(0);
      toast.error(
        error instanceof Error ? error.message : "Não foi possível realizar a busca.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleTextSearch() {
    setSelectedCategoryId(undefined);
    void handleSearch({ query, categoryId: undefined });
  }

  function handleCategorySelect(categoryId: string) {
    const category = POPULAR_CATEGORIES.find((item) => item.id === categoryId);
    if (!category) return;

    setSelectedCategoryId(categoryId);
    setQuery(category.label);
    void handleSearch({ query: category.label, categoryId });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex items-center gap-2 md:hidden">
        <SidebarTrigger />
      </div>

      <SearchHero
        query={query}
        onQueryChange={setQuery}
        onSearch={handleTextSearch}
        isLoading={isLoading}
      />

      <PopularCategories
        categories={POPULAR_CATEGORIES}
        selectedCategoryId={selectedCategoryId}
        onCategorySelect={handleCategorySelect}
      />

      <SearchResults
        professionals={results}
        total={total}
        isLoading={isLoading}
        hasSearched={hasSearched}
      />
    </div>
  );
}
