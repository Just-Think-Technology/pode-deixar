import type { Category } from "@/lib/client/quote/types";
import type { PopularCategory } from "@/lib/client/search/types";

const SLUG_ICON_MAP: Record<
  string,
  { iconKey: string; iconBgClassName: string; iconClassName: string }
> = {
  limpeza: {
    iconKey: "home",
    iconBgClassName: "bg-blue-100",
    iconClassName: "text-blue-600",
  },
  pintura: {
    iconKey: "paintbrush",
    iconBgClassName: "bg-purple-100",
    iconClassName: "text-purple-600",
  },
  eletrica: {
    iconKey: "zap",
    iconBgClassName: "bg-amber-100",
    iconClassName: "text-amber-600",
  },
  hidraulica: {
    iconKey: "droplets",
    iconBgClassName: "bg-cyan-100",
    iconClassName: "text-cyan-600",
  },
  reforma: {
    iconKey: "hammer",
    iconBgClassName: "bg-green-100",
    iconClassName: "text-green-600",
  },
  construcao: {
    iconKey: "hammer",
    iconBgClassName: "bg-green-100",
    iconClassName: "text-green-600",
  },
  automotivo: {
    iconKey: "car",
    iconBgClassName: "bg-red-100",
    iconClassName: "text-red-600",
  },
  jardinagem: {
    iconKey: "leaf",
    iconBgClassName: "bg-emerald-100",
    iconClassName: "text-emerald-600",
  },
  marcenaria: {
    iconKey: "hammer",
    iconBgClassName: "bg-orange-100",
    iconClassName: "text-orange-600",
  },
  vidracaria: {
    iconKey: "glass-water",
    iconBgClassName: "bg-sky-100",
    iconClassName: "text-sky-600",
  },
  telhado: {
    iconKey: "building",
    iconBgClassName: "bg-stone-100",
    iconClassName: "text-stone-600",
  },
  dedetizacao: {
    iconKey: "bug",
    iconBgClassName: "bg-lime-100",
    iconClassName: "text-lime-600",
  },
  mudancas: {
    iconKey: "truck",
    iconBgClassName: "bg-indigo-100",
    iconClassName: "text-indigo-600",
  },
  chaveiro: {
    iconKey: "key",
    iconBgClassName: "bg-yellow-100",
    iconClassName: "text-yellow-600",
  },
  informatica: {
    iconKey: "monitor",
    iconBgClassName: "bg-violet-100",
    iconClassName: "text-violet-600",
  },
  "servicos-gerais": {
    iconKey: "more-horizontal",
    iconBgClassName: "bg-gray-100",
    iconClassName: "text-gray-600",
  },
  outros: {
    iconKey: "briefcase",
    iconBgClassName: "bg-gray-100",
    iconClassName: "text-gray-600",
  },
};

const DEFAULT_ICON = {
  iconKey: "wrench",
  iconBgClassName: "bg-gray-100",
  iconClassName: "text-gray-600",
};

export function mapCategoriesToPopular(categories: Category[]): PopularCategory[] {
  return [...categories]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .slice(0, 6)
    .map((category) => {
      const visual =
        SLUG_ICON_MAP[category.slug] ??
        (category.icon
          ? {
              iconKey: category.icon,
              iconBgClassName: DEFAULT_ICON.iconBgClassName,
              iconClassName: DEFAULT_ICON.iconClassName,
            }
          : DEFAULT_ICON);

      return {
        id: category.id,
        label: category.name,
        iconKey: visual.iconKey,
        iconBgClassName: visual.iconBgClassName,
        iconClassName: visual.iconClassName,
      };
    });
}
