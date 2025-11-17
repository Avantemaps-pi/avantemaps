import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { NotificationCategory, categoryConfig } from '@/utils/notificationCategories';

interface NotificationCategoryTabsProps {
  activeCategory: NotificationCategory;
  onCategoryChange: (category: NotificationCategory) => void;
  categoryCounts: Record<NotificationCategory, number>;
}

const NotificationCategoryTabs: React.FC<NotificationCategoryTabsProps> = ({
  activeCategory,
  onCategoryChange,
  categoryCounts
}) => {
  const categories: NotificationCategory[] = ['all', 'comments', 'system'];

  return (
    <Tabs value={activeCategory} onValueChange={(value) => onCategoryChange(value as NotificationCategory)} className="w-full">
      <TabsList className="w-full grid grid-cols-3 h-auto">
        {categories.map((category) => (
          <TabsTrigger 
            key={category} 
            value={category}
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <span>{categoryConfig[category].label}</span>
            {categoryCounts[category] > 0 && (
              <Badge 
                variant="secondary" 
                className="ml-1 h-5 min-w-5 px-1.5 text-xs font-semibold"
              >
                {categoryCounts[category]}
              </Badge>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};

export default NotificationCategoryTabs;
