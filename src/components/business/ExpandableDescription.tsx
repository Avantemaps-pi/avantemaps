
import React, { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ExpandableDescriptionProps {
  text: string;
  maxLines?: number;
  className?: string;
}

const ExpandableDescription: React.FC<ExpandableDescriptionProps> = ({ 
  text, 
  maxLines = 4,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsExpansion, setNeedsExpansion] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  // Check if the text overflows and needs a "read more" button
  useEffect(() => {
    const checkOverflow = () => {
      const element = textRef.current;
      if (element) {
        // Get line height in pixels
        const style = window.getComputedStyle(element);
        const lineHeight = parseInt(style.lineHeight) || parseInt(style.fontSize) * 1.2;
        const maxHeight = lineHeight * maxLines;
        
        setNeedsExpansion(element.scrollHeight > maxHeight);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [text, maxLines]);

  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={setIsExpanded}
      className={`w-full ${className}`}
    >
      <div className="space-y-2">
        <div className="relative overflow-hidden" style={!isExpanded ? {maxHeight: `${maxLines * 1.5}em`} : {}}>
          <p
            ref={textRef}
            className={`text-sm text-gray-700 dark:text-gray-300 break-words ${!isExpanded ? `line-clamp-${maxLines}` : ''}`}
          >
            {text}
          </p>
        </div>

        {needsExpansion && !isExpanded && (
          <CollapsibleTrigger className="text-xs text-primary cursor-pointer font-medium">
            read more...
          </CollapsibleTrigger>
        )}
      </div>
      
      <CollapsibleContent>
        <ScrollArea 
          className="max-h-36 mt-1 overflow-y-auto" 
          orientation="vertical"
        >
          <p className="text-sm text-gray-700 dark:text-gray-300 pr-3">{text}</p>
        </ScrollArea>
        <div className="text-right mt-1">
          <CollapsibleTrigger className="text-xs text-primary cursor-pointer">
            show less
          </CollapsibleTrigger>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default ExpandableDescription;

