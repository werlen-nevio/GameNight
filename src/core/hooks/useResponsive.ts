import { useWindowDimensions } from 'react-native';

import { inputMode, isTablet } from '../platform/platform';

export interface Responsive {
  width: number;
  height: number;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  /** True when the primary pointer is a mouse/trackpad (enables hover/keyboard). */
  pointer: boolean;
  /** Comfortable content width — content centers within this on large screens. */
  contentMaxWidth: number;
  /** Suggested column count for tile grids. */
  columns: number;
}

/**
 * Responsive layout signals. The UI reads these to adapt automatically from
 * phones to tablets to desktop browsers (centered, multi-column content and
 * pointer-aware affordances) without per-platform branches in screens.
 */
export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
  const tablet = isTablet() || (width >= 700 && width < 1000);
  const desktop = width >= 1000;
  return {
    width,
    height,
    isPhone: !tablet && !desktop,
    isTablet: tablet,
    isDesktop: desktop,
    pointer: inputMode() === 'pointer',
    contentMaxWidth: desktop ? 760 : tablet ? 640 : width,
    columns: desktop ? 4 : tablet ? 3 : 2,
  };
}
