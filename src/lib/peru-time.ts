const HOUR_IN_MS = 60 * 60 * 1000;
const DAY_IN_MS = 24 * HOUR_IN_MS;
const PERU_UTC_OFFSET_IN_MS = -5 * HOUR_IN_MS;
const PERU_MIDNIGHT_IN_UTC_HOURS = 5;

function getPeruDateParts(date: Date) {
  const peruDate = new Date(date.getTime() + PERU_UTC_OFFSET_IN_MS);

  return {
    year: peruDate.getUTCFullYear(),
    monthIndex: peruDate.getUTCMonth(),
    day: peruDate.getUTCDate(),
    dayOfWeek: peruDate.getUTCDay(),
  };
}

function peruMidnightToUtc(year: number, monthIndex: number, day: number) {
  return new Date(
    Date.UTC(year, monthIndex, day, PERU_MIDNIGHT_IN_UTC_HOURS),
  );
}

export function getPeruLocalDateString(date = new Date()) {
  const { year, monthIndex, day } = getPeruDateParts(date);
  const month = String(monthIndex + 1).padStart(2, "0");
  const dayOfMonth = String(day).padStart(2, "0");

  return `${year}-${month}-${dayOfMonth}`;
}

export function getPeruDayUtcRange(date = new Date()) {
  const { year, monthIndex, day } = getPeruDateParts(date);
  const startOfDay = peruMidnightToUtc(year, monthIndex, day);

  return {
    startOfDay,
    startOfNextDay: new Date(startOfDay.getTime() + DAY_IN_MS),
  };
}

export function getPeruWeekUtcRange(date = new Date()) {
  const { year, monthIndex, day, dayOfWeek } = getPeruDateParts(date);
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfWeek = peruMidnightToUtc(
    year,
    monthIndex,
    day - daysSinceMonday,
  );

  return {
    startOfWeek,
    startOfNextWeek: new Date(startOfWeek.getTime() + 7 * DAY_IN_MS),
  };
}

export function getPeruMonthUtcRange(date = new Date()) {
  const { year, monthIndex } = getPeruDateParts(date);

  return {
    startOfMonth: peruMidnightToUtc(year, monthIndex, 1),
    startOfNextMonth: peruMidnightToUtc(year, monthIndex + 1, 1),
  };
}
