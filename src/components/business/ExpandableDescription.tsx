import React from 'react';
import HighlightText from './HighlightText';

interface ExpandableDescriptionProps {
  text: string;
  maxLines?: number;
  className?: string;
  highlightQuery?: string | undefined;
}

const ExpandableDescription: React.FC<ExpandableDescriptionProps> = ({
  text,
  maxLines,
  className = '',
  highlightQuery,
}) => {
  const lineClampClass = maxLines === undefined ? '' : maxLines === 3 ? 'line-clamp-3' : maxLines === 4 ? 'line-clamp-4' : maxLines === 2 ? 'line-clamp-2' : 'line-clamp-4';

  return (
    <p
      className={`text-sm text-gray-700 dark:text-gray-300 break-words ${lineClampClass} ${className}`}
    >
      <HighlightText text={text} query={highlightQuery} />
    </p>
  );
};

export default ExpandableDescription;
