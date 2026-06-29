import { CircularProgress, AppText } from '../../../core/ui';
import { palette } from '../../../core/design/tokens';

/**
 * A compact countdown ring that depletes with the remaining time and shifts from
 * cyan → orange → red as the clock runs low. Used by every timed mode.
 */
export function TimerRing({
  remaining,
  total,
  size = 60,
}: {
  remaining: number;
  total: number;
  size?: number;
}) {
  const fraction = total > 0 ? Math.max(0, remaining / total) : 0;
  const low = fraction <= 0.25;
  const mid = fraction <= 0.5;
  const color = low ? palette.red : mid ? palette.orange : palette.cyan;

  return (
    <CircularProgress
      progress={fraction}
      size={size}
      strokeWidth={6}
      duration={120}
      fromColor={color}
      toColor={color}
    >
      <AppText variant="bodyStrong" style={{ color }}>
        {Math.ceil(remaining)}
      </AppText>
    </CircularProgress>
  );
}
