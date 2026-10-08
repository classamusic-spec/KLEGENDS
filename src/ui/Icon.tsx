import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/design/tokens';

/** Builds a gear outline as an SVG path (pure; evaluated once). */
const gearPath = (teeth: number, outer: number, inner: number): string => {
  const parts: string[] = [];
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts = [
      [a - step * 0.22, inner],
      [a - step * 0.14, outer],
      [a + step * 0.14, outer],
      [a + step * 0.22, inner],
    ] as const;
    pts.forEach(([angle, r], j) => {
      const x = (12 + Math.cos(angle) * r).toFixed(2);
      const y = (12 + Math.sin(angle) * r).toFixed(2);
      parts.push(`${i === 0 && j === 0 ? 'M' : 'L'}${x} ${y}`);
    });
  }
  return `${parts.join(' ')} Z`;
};

/**
 * Custom engraved line icons (24 × 24, stroke based). Original artwork for
 * Kingdom Legends; no third-party icon font is used.
 */
const ICONS = {
  home: 'M3.5 9.2 12 4l8.5 5.2M4.5 9.8h15M6.5 11.5v6.5M10 11.5v6.5M14 11.5v6.5M17.5 11.5v6.5M4.5 18.6h15M3.5 20.5h17',
  collection:
    'M12 6.6C10 5.2 7.2 4.7 3.6 5.1v13.3c3.6-.4 6.4.1 8.4 1.6 2-1.5 4.8-2 8.4-1.6V5.1c-3.6-.4-6.4.1-8.4 1.5ZM12 6.6V20',
  journey: 'M12 4.2l1.7 6.1 6.1 1.7-6.1 1.7L12 19.8l-1.7-6.1-6.1-1.7 6.1-1.7Z',
  challenges:
    'M12 3.8l2.4 5 5.4.7-4 3.7 1 5.4L12 16l-4.8 2.6 1-5.4-4-3.7 5.4-.7Z',
  shop: 'M4.2 10.4h15.6v8.8H4.2ZM4.2 10.4V8.6c0-2 1.6-3.4 3.6-3.4h8.4c2 0 3.6 1.4 3.6 3.4v1.8M4.2 13.6h15.6M10.8 12.4h2.4v2.6h-2.4Z',
  settings: gearPath(8, 9, 7.1),
  back: 'M14.8 5.2 8 12l6.8 6.8',
  close: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  heart:
    'M12 19.8C5.8 15.4 3.4 12.3 3.4 9.1c0-2.5 1.9-4.4 4.3-4.4 1.8 0 3.3 1 4.3 2.6 1-1.6 2.5-2.6 4.3-2.6 2.4 0 4.3 1.9 4.3 4.4 0 3.2-2.4 6.3-8.6 10.7Z',
  rotate: 'M18.7 12a6.7 6.7 0 1 1-1.96-4.74M18.9 4.6v3.3h-3.3',
  scripture: 'M6.2 4.2h11.6v15.6H6.2ZM9 8.2h6M9 11.2h6M9 14.2h4M6.2 4.2c0 0 1 1 1 2.2',
  editions: 'M7 4.6h10l3.4 4.4L12 19.6 3.6 9Zm-3.4 4.4h16.8M9.4 9 12 19.6 14.6 9M9.4 9 12 4.6 14.6 9',
  lock: 'M6.5 10.5h11v9h-11ZM8.8 10.5V8a3.2 3.2 0 0 1 6.4 0v2.5M12 14v2.2',
  check: 'M5.2 12.6l4.6 4.6 9-9.6',
  sparkle: 'M12 3.4c.8 5 3.6 7.8 8.6 8.6-5 .8-7.8 3.6-8.6 8.6-.8-5-3.6-7.8-8.6-8.6 5-.8 7.8-3.6 8.6-8.6Z',
  arrowRight: 'M4.8 12h14M13.4 6.4 19 12l-5.6 5.6',
  crown: 'M4.4 17.2 3.4 8l4.8 3.6L12 5.4l3.8 6.2L20.6 8l-1 9.2ZM4.6 19.6h14.8',
  sound: 'M4.5 9.6h3.2l4.3-3.6v12l-4.3-3.6H4.5ZM15.4 9.2a4 4 0 0 1 0 5.6M17.8 6.8a7.4 7.4 0 0 1 0 10.4',
  map: 'M3.8 6.4 9 4.6l6 2 5.2-1.8v12.8L15 19.4l-6-2-5.2 1.8ZM9 4.6v12.8M15 6.6v12.8',
  replay: 'M5.3 12a6.7 6.7 0 1 0 1.96-4.74M5.1 4.6v3.3h3.3',
  hand: 'M9 12.5V5.8a1.4 1.4 0 0 1 2.8 0v5.4M11.8 11V4.6a1.4 1.4 0 0 1 2.8 0v6.6M14.6 11.2V6.4a1.4 1.4 0 0 1 2.8 0v7.8c0 3.4-2.4 5.8-5.8 5.8-2.1 0-3.4-.9-4.6-2.6l-2.5-3.7a1.3 1.3 0 0 1 2-1.6L9 13.6',
  skip: 'M5.5 6.2 12 12l-6.5 5.8ZM12.5 6.2 19 12l-6.5 5.8Z',
} as const;

export type IconName = keyof typeof ICONS;

export interface IconProps {
  readonly name: IconName;
  readonly size?: number;
  readonly color?: string;
  readonly strokeWidth?: number;
  /** Fill the shape (used for selected hearts and emblems). */
  readonly filled?: boolean;
}

export function Icon({ name, size = 24, color = colors.textPrimary, strokeWidth = 1.6, filled = false }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <Path
        d={ICONS[name]}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? color : 'none'}
      />
      {name === 'settings' ? <Circle cx={12} cy={12} r={2.6} stroke={color} strokeWidth={strokeWidth} fill="none" /> : null}
      {name === 'journey' ? <Circle cx={12} cy={12} r={8.6} stroke={color} strokeWidth={strokeWidth * 0.7} fill="none" /> : null}
    </Svg>
  );
}
