
import React from 'react';
import { Badge } from '@/components/ui/badge';

// Available colors for category badges
const badgeColors = [
  'bg-purple-100 text-purple-800 hover:bg-purple-200',
  'bg-blue-100 text-blue-800 hover:bg-blue-200',
  'bg-green-100 text-green-800 hover:bg-green-200',
  'bg-red-100 text-red-800 hover:bg-red-200',
  'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  'bg-indigo-100 text-indigo-800 hover:bg-indigo-200',
  'bg-pink-100 text-pink-800 hover:bg-pink-200',
  'bg-orange-100 text-orange-800 hover:bg-orange-200',
  'bg-teal-100 text-teal-800 hover:bg-teal-200',
  'bg-cyan-100 text-cyan-800 hover:bg-cyan-200',
];

interface CategoryBadgeProps {
  category: string;
}

const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category }) => {
  // Create a consistent color based on the category name
  const getColorIndex = (categoryName: string) => {
    let sum = 0;
    for (let i = 0; i < categoryName.length; i++) {
      sum += categoryName.charCodeAt(i);
    }
    return sum % badgeColors.length;
  };

  // Get a consistent color for the category
  const colorIndex = getColorIndex(category);
  const badgeColor = badgeColors[colorIndex];

  return (
    <Badge className={`text-xs px-3 py-0.5 h-6 rounded-md border-0 inline-flex w-auto ${badgeColor}`}>
      {category}
    </Badge>
  );
};

export default CategoryBadge;
