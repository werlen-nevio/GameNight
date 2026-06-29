import { clamp } from '../../../core/utils/format';

/** A raw score report received from a (potentially untrusted) client. */
export interface RawReport {
  score: number;
  correctAnswers: number;
  perfect: boolean;
  rounds: number;
}

export interface SanitizedReport {
  score: number;
  correctAnswers: number;
  perfect: boolean;
  /** False when the original report contained impossible values (it was clamped). */
  trusted: boolean;
}

/**
 * Host-side anti-cheat. The host never trusts a client's self-reported score: it
 * clamps the score to the legitimately achievable range for the match config and
 * flags impossible values. Out-of-range, NaN/Infinity, or negative reports are
 * rejected (clamped) rather than applied.
 */
export function sanitizeReport(report: RawReport, opts: { scoreCap: number; rounds: number }): SanitizedReport {
  const finite = (n: number) => typeof n === 'number' && Number.isFinite(n);
  const maxCorrect = Math.max(0, opts.rounds) * 50; // generous upper bound

  const scoreOk = finite(report.score) && report.score >= 0 && report.score <= opts.scoreCap;
  const correctOk = finite(report.correctAnswers) && report.correctAnswers >= 0 && report.correctAnswers <= maxCorrect;

  const score = scoreOk ? report.score : clamp(finite(report.score) ? report.score : 0, 0, opts.scoreCap);
  const correctAnswers = correctOk ? report.correctAnswers : clamp(finite(report.correctAnswers) ? report.correctAnswers : 0, 0, maxCorrect);
  // "perfect" can only stand if the score is at the cap.
  const perfect = report.perfect === true && score >= opts.scoreCap;

  return { score, correctAnswers, perfect, trusted: scoreOk && correctOk };
}
