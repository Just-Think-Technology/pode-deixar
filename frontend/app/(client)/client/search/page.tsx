// purpose: Client search route — renders search page with categories
import { getCategories } from "@/api/client/categories";
import { ApiError } from "@/api/client";
import ClientSearchPage from "@/components/pages/client-search-page";
import { mapCategoriesToPopular } from "@/lib/client/search/category-display";
import type { PopularCategory } from "@/lib/client/search/types";

export default async function ClientSearchRoute() {
  let categories: PopularCategory[] = [];
  let categoriesError: string | undefined;

  try {
    const apiCategories = await getCategories();
    if (apiCategories.length > 0) {
      categories = mapCategoriesToPopular(apiCategories);
    } else {
      categoriesError = "Nenhuma categoria disponível no momento.";
    }
  } catch (error) {
    categoriesError =
      error instanceof ApiError
        ? error.message
        : "Não foi possível carregar as categorias.";
  }

  return (
    <ClientSearchPage
      categories={categories}
      categoriesError={categoriesError}
    />
  );
}
