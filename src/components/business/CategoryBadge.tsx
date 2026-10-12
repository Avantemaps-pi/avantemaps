
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const toneClasses = {
  default: 'bg-secondary text-secondary-foreground',
  outline: 'bg-transparent text-foreground ring-1 ring-inset ring-input',
  navy: 'bg-brand-navy text-background',
};

interface CategoryBadgeProps {
  category: string;
  tone?: keyof typeof toneClasses;
  icon?: LucideIcon;
  className?: string;
}

const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category, tone = 'default', icon: Icon, className }) => {
  if (!category.trim()) return null;

  return (
    <span
      className={cn(
        'inline-flex w-auto items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold leading-4',
        toneClasses[tone],
        className
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
      {category}
    </span>
  );
};

export default CategoryBadge;
