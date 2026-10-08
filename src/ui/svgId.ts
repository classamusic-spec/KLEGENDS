import { useId } from 'react';

/**
 * A unique id for an SVG definition (gradient, clip). On the web, SVG ids
 * share one document: a `url(#id)` that resolves into a hidden screen
 * (`display: none`) paints nothing, so every component instance gets its own.
 */
export const useSvgId = (prefix: string): string => {
  const id = useId();
  return `${prefix}-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
};
