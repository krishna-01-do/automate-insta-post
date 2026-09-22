const IST_OFFSET_MINUTES = 330;
const DAY_MS = 86_400_000;

export const POSTING_TIMES = [
  [8, 30], [10, 30], [12, 30], [14, 30], [16, 30],
  [17, 30], [19, 30], [21, 30], [22, 30], [23, 30],
] as const;

function localParts(timestamp: number) {
  const shifted = new Date(timestamp + IST_OFFSET_MINUTES * 60_000);
  return {
    year: shifted.getUTCFullYear(), month: shifted.getUTCMonth(), day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(), minute: shifted.getUTCMinutes(),
  };
}

function istToUtc(year: number, month: number, day: number, hour: number, minute: number) {
  return Date.UTC(year, month, day, hour, minute) - IST_OFFSET_MINUTES * 60_000;
}

function localDayKey(timestamp: number) {
  const p = localParts(timestamp);
  return `${p.year}-${p.month}-${p.day}`;
}

export function createSchedule(
  count: number,
  existingIsoDates: string[],
  now = new Date(),
  random = Math.random,
): string[] {
  const scheduled: string[] = [];
  const occupied = existingIsoDates.map((value) => new Date(value).getTime()).filter(Number.isFinite);
  const localNow = localParts(now.getTime());
  const localMidnightUtc = istToUtc(localNow.year, localNow.month, localNow.day, 0, 0);

  for (let dayOffset = 0; scheduled.length < count && dayOffset < 30; dayOffset += 1) {
    const dayAnchor = new Date(localMidnightUtc + dayOffset * DAY_MS);
    const p = localParts(dayAnchor.getTime());
    for (const [hour, minute] of POSTING_TIMES) {
      const base = istToUtc(p.year, p.month, p.day, hour, minute);
      if (base <= now.getTime() + 5 * 60_000) continue;
      const sameSlot = occupied.some((timestamp) => {
        if (localDayKey(timestamp) !== localDayKey(base)) return false;
        return Math.abs(timestamp - base) <= 25 * 60_000;
      });
      if (sameSlot) continue;
      const variation = 5 + Math.floor(random() * 16);
      // Keep the database time slightly before its Hobby cron window so an
      // invocation at the very start of that hour still sees the post as due.
      const finalTime = base - variation * 60_000;
      const iso = new Date(finalTime).toISOString();
      scheduled.push(iso);
      occupied.push(finalTime);
      if (scheduled.length === count) break;
    }
  }

  if (scheduled.length < count) throw new Error("Could not create enough posting slots");
  return scheduled;
}
