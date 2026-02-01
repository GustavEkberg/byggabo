'use client';

import {
  CookingPot,
  Bath,
  Sofa,
  Bed,
  Flower2,
  Car,
  Box,
  Home,
  DoorOpen,
  Lamp,
  WashingMachine,
  Refrigerator,
  Tv,
  Armchair,
  Fence,
  Trees,
  Drill,
  Wrench,
  PaintBucket,
  Hammer,
  type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<string, LucideIcon> = {
  'cooking-pot': CookingPot,
  bath: Bath,
  sofa: Sofa,
  bed: Bed,
  'flower-2': Flower2,
  car: Car,
  box: Box,
  home: Home,
  'door-open': DoorOpen,
  lamp: Lamp,
  'washing-machine': WashingMachine,
  refrigerator: Refrigerator,
  tv: Tv,
  armchair: Armchair,
  fence: Fence,
  trees: Trees,
  drill: Drill,
  wrench: Wrench,
  'paint-bucket': PaintBucket,
  hammer: Hammer
};

type Props = {
  icon: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizes = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-8 h-8'
};

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4'
};

export function SectionIcon({ icon, color, size = 'md', className }: Props) {
  const IconComponent = iconMap[icon] ?? Box;

  return (
    <span
      className={cn(
        'rounded-full shrink-0 flex items-center justify-center',
        sizes[size],
        className
      )}
      style={{ backgroundColor: color }}
    >
      <IconComponent className={cn('text-white', iconSizes[size])} />
    </span>
  );
}

export { iconMap };
