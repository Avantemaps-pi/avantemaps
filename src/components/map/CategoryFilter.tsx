import React from 'react';
import { cn } from '@/lib/utils';
import { Utensils, ShoppingBag, Wrench, Music, LayoutGrid, type LucideIcon } from 'lucide-react';

export interface CategoryOption {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Keywords matched against business category, business_types and keywords (lowercased). 'all' means no filter. */
  match: string[];
}

export const CATEGORY_OPTIONS: CategoryOption[] = [
  { id: 'all', label: 'All', icon: LayoutGrid, match: [] },
  { id: 'food', label: 'Food', icon: Utensils, match: ['food', 'beverage', 'restaurant', 'cafe', 'coffee', 'bar', 'bakery', 'grocery'] },
  { id: 'retail', label: 'Retail', icon: ShoppingBag, match: ['retail', 'shop', 'store', 'market', 'clothing', 'fashion'] },
  { id: 'services', label: 'Services', icon: Wrench, match: ['service', 'services', 'technology', 'consulting', 'finance', 'health', 'beauty', 'salon', 'repair', 'professional'] },
  { id: 'entertainment', label: 'Entertainment', icon: Music, match: ['entertainment', 'music', 'art', 'gaming', 'sport', 'sports', 'event', 'cinema', 'club'] },
];

interface CategoryFilterProps {
  selectedCategoryId: string;
  onSelect: (categoryId: string) => void;
  className?: string;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ selectedCategoryId, onSelect, className }) => {
  return (
    <div
      className={cn('flex gap-2 overflow-x-auto no-scrollbar flex-nowrap scroll-smooth', className)}
      role="tablist"
      aria-label="Filter businesses by category"
    >
      {CATEGORY_OPTIONS.map(({ id, label, icon: Icon }) => {
        const active = id === selectedCategoryId;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(id)}
            className={cn(
              // 36px pill; ::after extends the hit area to 44px (my-1 keeps it inside the scroller)
              'relative my-1 flex h-9 flex-none items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-sm font-semibold transition-colors',
              "after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']",
              'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              active
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-surface-float text-foreground border-input hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryFilter;
