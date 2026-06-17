"use client";

import { useState } from "react";
import { toast } from "sonner";

<<<<<<< HEAD
=======
import { searchProfessionals } from "@/api/client/search";
>>>>>>> 414c12f (feat: implementar página de busca do cliente com hero, categorias e resultados)
import PopularCategories from "@/components/client/search/popular-categories";
import SearchHero from "@/components/client/search/search-hero";
import SearchResults from "@/components/client/search/search-results";
import { SidebarTrigger } from "@/components/ui/sidebar";
<<<<<<< HEAD
import { searchProfessionalsAction } from "@/lib/client/search/actions";
import type {
  PopularCategory,
  ProviderSearchResult,
} from "@/lib/client/search/types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ClientSearchPageProps = {
  categories: PopularCategory[];
  categoriesError?: string;
};

export default function ClientSearchPage({
  categories,
  categoriesError,
}: ClientSearchPageProps) {
  const [query, setQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>();
  const [results, setResults] = useState<ProviderSearchResult[]>([]);
=======
import type { MockProfessional } from "@/mock/types";
import { POPULAR_CATEGORIES } from "@/mock/client/search";

export default function ClientSearchPage() {
  const [query, setQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>();
  const [results, setResults] = useState<MockProfessional[]>([]);
>>>>>>> 414c12f (feat: implementar página de busca do cliente com hero, categorias e resultados)
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(options?: { query?: string; categoryId?: string }) {
    const nextQuery = options?.query ?? query;
<<<<<<< HEAD
    const rawCategoryId =
      options && "categoryId" in options ? options.categoryId : selectedCategoryId;
    const nextCategoryId =
      rawCategoryId && UUID_REGEX.test(rawCategoryId) ? rawCategoryId : undefined;
=======
    const nextCategoryId =
      options && "categoryId" in options ? options.categoryId : selectedCategoryId;
>>>>>>> 414c12f (feat: implementar página de busca do cliente com hero, categorias e resultados)

    setIsLoading(true);
    setHasSearched(true);

    try {
<<<<<<< HEAD
      const response = await searchProfessionalsAction({
=======
      const response = await searchProfessionals({
>>>>>>> 414c12f (feat: implementar página de busca do cliente com hero, categorias e resultados)
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
<<<<<<< HEAD
    const category = categories.find((item) => item.id === categoryId);
=======
    const category = POPULAR_CATEGORIES.find((item) => item.id === categoryId);
>>>>>>> 414c12f (feat: implementar página de busca do cliente com hero, categorias e resultados)
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
<<<<<<< HEAD
        categories={categories}
=======
        categories={POPULAR_CATEGORIES}
>>>>>>> 414c12f (feat: implementar página de busca do cliente com hero, categorias e resultados)
        selectedCategoryId={selectedCategoryId}
        onCategorySelect={handleCategorySelect}
      />

<<<<<<< HEAD
      {categoriesError ? (
        <p className="text-sm text-destructive">{categoriesError}</p>
      ) : null}

=======
>>>>>>> 414c12f (feat: implementar página de busca do cliente com hero, categorias e resultados)
      <SearchResults
        professionals={results}
        total={total}
        isLoading={isLoading}
        hasSearched={hasSearched}
      />
    </div>
  );
<<<<<<< HEAD
}
=======
}
>>>>>>> 414c12f (feat: implementar página de busca do cliente com hero, categorias e resultados)
