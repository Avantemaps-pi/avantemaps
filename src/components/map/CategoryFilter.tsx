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
    <div className={cn('relative bg-background/80 backdrop-blur-xs shadow-xs rounded-xl', className)}>
      <div
        className="flex gap-2 overflow-x-auto no-scrollbar flex-nowrap scroll-smooth px-3 py-2 pb-3 pr-12"
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
              'flex items-center gap-1.5 flex-none rounded-full border px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap shadow-xs backdrop-blur-xs',
              active
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-white/90 text-foreground border-border hover:bg-accent'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
        })}
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-background/80 via-background/50 to-transparent"
      />
    </div>
  );
};

export default CategoryFilter;
