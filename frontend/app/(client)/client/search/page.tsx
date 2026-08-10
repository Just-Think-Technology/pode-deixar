import { getCategories } from "@/api/client/categories";
import { ApiError } from "@/api/client";
import ClientSearchPage from "@/components/pages/client-search-page";
import { mapCategoriesToPopular } from "@/lib/client/search/category-display";
import type { PopularCategory } from "@/lib/client/search/types";
import { POPULAR_CATEGORIES } from "@/mock/client/search";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export default async function ClientSearchRoute() {
  let categories: PopularCategory[] = USE_MOCK ? POPULAR_CATEGORIES : [];
  let categoriesError: string | undefined;

  try {
    const apiCategories = await getCategories();
    if (apiCategories.length > 0) {
      categories = mapCategoriesToPopular(apiCategories);
    } else if (!USE_MOCK) {
      categoriesError = "Nenhuma categoria disponível no momento.";
    }
  } catch (error) {
    if (USE_MOCK) {
      categories = POPULAR_CATEGORIES;
    } else {
      categoriesError =
        error instanceof ApiError
          ? error.message
          : "Não foi possível carregar as categorias.";
    }
  }

  return (
    <ClientSearchPage
      categories={categories}
      categoriesError={categoriesError}
    />
  );
}
