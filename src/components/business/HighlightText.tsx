import React from 'react';

interface HighlightTextProps {
  text: string;
  query?: string;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const HighlightText: React.FC<HighlightTextProps> = ({ text, query }) => {
  const q = (query || '').trim();
  if (!q || !text) return <>{text}</>;

  // Split query into tokens (words) so multi-word queries highlight each term.
  const tokens = Array.from(new Set(q.split(/\s+/).filter(Boolean).map(escapeRegExp)));
  if (tokens.length === 0) return <>{text}</>;

  const re = new RegExp(`(${tokens.join('|')})`, 'gi');
  const testRe = new RegExp(`^(?:${tokens.join('|')})$`, 'i');
  const parts = text.split(re);

  return (
    <>
      {parts.map((part, i) =>
        testRe.test(part) ? (
          <mark
            key={i}
            className="bg-primary/20 text-foreground rounded-sm px-0.5"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
};

export default HighlightText;
