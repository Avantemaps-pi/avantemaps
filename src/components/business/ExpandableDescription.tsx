import React, { useEffect, useRef, useState } from 'react';
import HighlightText from './HighlightText';

interface ExpandableDescriptionProps {
  text: string;
  maxLines?: number;
  className?: string;
  highlightQuery?: string | undefined;
  /** Clamp to 3 lines with a "Read more" / "Show less" toggle, shown only when the text overflows */
  expandable?: boolean;
}

const ExpandableDescription: React.FC<ExpandableDescriptionProps> = ({
  text,
  maxLines,
  className = '',
  highlightQuery,
  expandable = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  // Measure while clamped; re-measure when the width changes
  useEffect(() => {
    const el = ref.current;
    if (!expandable || expanded || !el) return;
    const measure = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [expandable, expanded, text]);

  if (expandable) {
    return (
      <div className="flex flex-col items-start">
        <p
          ref={ref}
          className={`text-sm text-foreground break-words ${expanded ? '' : 'line-clamp-3'} ${className}`}
        >
          <HighlightText text={text} query={highlightQuery} />
        </p>
        {(overflows || expanded) && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-primary"
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>
    );
  }

  const lineClampClass = maxLines === undefined ? '' : maxLines === 3 ? 'line-clamp-3' : maxLines === 4 ? 'line-clamp-4' : maxLines === 2 ? 'line-clamp-2' : 'line-clamp-4';

  return (
    <p
      className={`text-sm text-foreground break-words ${lineClampClass} ${className}`}
    >
      <HighlightText text={text} query={highlightQuery} />
    </p>
  );
};

export default ExpandableDescription;
