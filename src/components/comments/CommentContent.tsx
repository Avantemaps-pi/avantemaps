
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

interface CommentContentProps {
  content: string;
}

const CommentContent: React.FC<CommentContentProps> = ({ content }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const toggleExpand = () => setIsExpanded(!isExpanded);
  
  // Check if comment is long and needs to be truncated
  const isLongComment = content.length > 200;
  const displayContent = isLongComment && !isExpanded 
    ? `${content.substring(0, 200)}...` 
    : content;

  return (
    <div className="mt-2 text-sm">
      <p>{displayContent}</p>
      {isLongComment && (
        <Button 
          variant="link" 
          size="sm" 
          className="p-0 h-auto mt-1 text-primary"
          onClick={toggleExpand}
        >
          {isExpanded ? 'Show Less' : 'Read More'}
        </Button>
      )}
    </div>
  );
};

export default CommentContent;
