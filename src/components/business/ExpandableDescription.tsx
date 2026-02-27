
import React from 'react';

interface ExpandableDescriptionProps {
  text: string;
  maxLines?: number;
  className?: string;
}

const ExpandableDescription: React.FC<ExpandableDescriptionProps> = ({
  text,
  maxLines,
  className = ''
}) => {
  const lineClampClass = maxLines === undefined ? '' : maxLines === 3 ? 'line-clamp-3' : maxLines === 4 ? 'line-clamp-4' : maxLines === 2 ? 'line-clamp-2' : 'line-clamp-4';

  return (
    <p
      className={`text-sm text-gray-700 dark:text-gray-300 break-words ${lineClampClass} ${className}`}
    >
      {text}
    </p>
  );
};

export default ExpandableDescription;

