"use client";

import CategoryCard from "@/components/client/search/category-card";
import type { PopularCategory } from "@/lib/client/search/types";

type PopularCategoriesProps = {
  categories: PopularCategory[];
  selectedCategoryId?: string;
  onCategorySelect: (categoryId: string) => void;
};

export default function PopularCategories({
  categories,
  selectedCategoryId,
  onCategorySelect,
}: PopularCategoriesProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">Categorias populares</h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            isSelected={selectedCategoryId === category.id}
            onSelect={onCategorySelect}
          />
        ))}
      </div>
    </section>
  );
}
