import { useEffect, useRef, useState } from 'react';

import { AppText, type TextProps } from '../ui/Text';

export interface CountUpProps extends Omit<TextProps, 'children'> {
  value: number;
  /** Animation duration in ms. */
  duration?: number;
  /** Format the displayed number (e.g. thousands grouping). */
  format?: (n: number) => string;
  /** Delay before counting starts. */
  delay?: number;
}

/**
 * A number that animates from its previous value up (or down) to a new target
 * with an ease-out curve. Used for scores, coin/XP gains and result tallies.
 */
export function CountUp({ value, duration = 700, format, delay = 0, ...textProps }: CountUpProps) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) {
      setDisplay(to);
      return;
    }
    let start: number | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const tick = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };

    timeout = setTimeout(() => {
      rafRef.current = requestAnimationFrame(tick);
    }, delay);

    return () => {
      if (timeout) clearTimeout(timeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = to;
    };
  }, [value, duration, delay]);

  return <AppText {...textProps}>{format ? format(display) : String(display)}</AppText>;
}
