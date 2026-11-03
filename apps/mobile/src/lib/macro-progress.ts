export function getProgressRatio(consumed: number, target: number): number {
  if (!Number.isFinite(consumed) || !Number.isFinite(target) || target <= 0) return 0;
  return Math.max(0, Math.min(1, consumed / target));
}
