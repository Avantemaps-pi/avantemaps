
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface CategoryBadgeProps {
  category: string;
}

const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category }) => {
  return (
    <Badge className="text-xs px-2 py-1 rounded bg-green-100 text-green-800 border-0 font-medium">
      {category}
    </Badge>
  );
};

export default CategoryBadge;
