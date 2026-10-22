import {
  Cpu,
  Gamepad2,
  Headphones,
  Laptop,
  Monitor,
  Smartphone,
  Watch,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import type { CategoryDTO } from "@/modules/catalog/types";

const icons: Record<CategoryDTO["icon"], LucideIcon> = {
  phone: Smartphone,
  laptop: Laptop,
  cpu: Cpu,
  headphones: Headphones,
  watch: Watch,
  monitor: Monitor,
  gamepad: Gamepad2,
  wifi: Wifi,
};

export function CategoryIcon({ icon, className }: { icon: CategoryDTO["icon"]; className?: string }) {
  const Icon = icons[icon];
  return <Icon aria-hidden className={className} />;
}
