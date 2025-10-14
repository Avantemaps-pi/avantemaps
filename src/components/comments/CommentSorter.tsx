
import React from 'react';
import { SortOption } from './CommentSection';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  TrendingUp, 
  Clock, 
  AlertTriangle 
} from 'lucide-react';

interface CommentSorterProps {
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
}

const CommentSorter: React.FC<CommentSorterProps> = ({ 
  sortOption, 
  onSortChange 
}) => {
  const handleSortChange = (value: string) => {
    onSortChange(value as SortOption);
  };

  return (
    <div className="flex items-center justify-between mb-4">
      <span className="text-sm font-medium">Sort by:</span>
      <Select value={sortOption} onValueChange={handleSortChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="useful">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              <span>Most Useful</span>
            </div>
          </SelectItem>
          <SelectItem value="recent">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              <span>Most Recent</span>
            </div>
          </SelectItem>
          <SelectItem value="controversial">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              <span>Most Controversial</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default CommentSorter;
