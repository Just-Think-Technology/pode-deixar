"use client";

import {
  Briefcase,
  Bug,
  Building2,
  Car,
  Droplets,
  GlassWater,
  Hammer,
  Home,
  Key,
  Leaf,
  Monitor,
  MoreHorizontal,
  Paintbrush,
  Truck,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { createElement } from "react";

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  home: Home,
  paintbrush: Paintbrush,
  zap: Zap,
  wrench: Wrench,
  hammer: Hammer,
  car: Car,
  droplets: Droplets,
  leaf: Leaf,
  "glass-water": GlassWater,
  building: Building2,
  bug: Bug,
  truck: Truck,
  key: Key,
  monitor: Monitor,
  "more-horizontal": MoreHorizontal,
  briefcase: Briefcase,
};

type CategoryIconProps = {
  iconKey: string;
  className?: string;
};

export function CategoryIcon({ iconKey, className }: CategoryIconProps) {
  const Icon = CATEGORY_ICON_MAP[iconKey] ?? Wrench;
  return createElement(Icon, { className });
}
