// Pure math for the home dashboard's calorie ring.
// Returns a clamped percentage (0..999) and a color flag at 100%+.
export type RingState = {
  pct: number;
  over: boolean;
  remaining: number;
};

export function ringState(consumed: number, target: number): RingState {
  const safeTarget = target > 0 ? target : 1;
  const pct = Math.min(999, Math.max(0, Math.round((consumed / safeTarget) * 100)));
  return {
    pct,
    over: consumed > target,
    remaining: target - consumed,
  };
}
