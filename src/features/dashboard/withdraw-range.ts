/** A Withdraws date range as `YYYY-MM-DD` days in the shop's time zone, both inclusive. */
export type WithdrawRange = { from: string; to: string };

const DEFAULT_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function dayIn(timeZone: string, at: Date) {
  // en-CA formats as YYYY-MM-DD.
  return at.toLocaleDateString("en-CA", { timeZone });
}

export function parseWithdrawRange({
  from,
  to,
  timeZone,
  now,
}: {
  from: unknown;
  to: unknown;
  timeZone: string;
  now: Date;
}): WithdrawRange {
  const fallback = {
    from: dayIn(timeZone, new Date(now.getTime() - DEFAULT_DAYS * DAY_MS)),
    to: dayIn(timeZone, now),
  };
  if (typeof from !== "string" || typeof to !== "string" || !ISO_DAY.test(from) || !ISO_DAY.test(to)) return fallback;
  return from <= to ? { from, to } : { from: to, to: from };
}

/** How far `timeZone` is ahead of UTC at `at`, in ms. */
function offsetMs(timeZone: string, at: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(at)
      .map((part) => [part.type, part.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

function startOfDay(day: string, timeZone: string) {
  const [year, month, date] = day.split("-").map(Number);
  const guess = Date.UTC(year, month - 1, date);
  return guess - offsetMs(timeZone, new Date(guess));
}

/** The range as epoch ms, from the start of `from` to the end of `to`. */
export function rangeBounds(range: WithdrawRange, timeZone: string) {
  const since = startOfDay(range.from, timeZone);
  const nextDay = new Date(startOfDay(range.to, timeZone) + DAY_MS + 12 * 60 * 60 * 1000);
  return { since, until: startOfDay(dayIn(timeZone, nextDay), timeZone) - 1 };
}
