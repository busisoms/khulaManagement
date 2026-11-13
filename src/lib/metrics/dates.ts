// Date helpers. All day maths uses the server's local calendar days.

export type Period = { start: Date; end: Date }; // start inclusive, end exclusive

const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Whole calendar days from `a` to `b` (positive when b is later). */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS);
}

export function dayKey(d: Date): string {
  const x = startOfDay(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

export function inPeriod(d: Date, p: Period): boolean {
  return d >= p.start && d < p.end;
}

/** The last `days` days, including today. */
export function lastNDays(now: Date, days: number): Period {
  const end = addDays(startOfDay(now), 1);
  return { start: addDays(end, -days), end };
}

/** The period of equal length immediately before `p`. */
export function previousPeriod(p: Period): Period {
  const days = daysBetween(p.start, p.end);
  return { start: addDays(p.start, -days), end: p.start };
}

export function periodDays(p: Period): number {
  return daysBetween(p.start, p.end);
}
