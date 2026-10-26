const DAYS: Array<[string, string]> = [
  ['monday', 'Mon'],
  ['tuesday', 'Tue'],
  ['wednesday', 'Wed'],
  ['thursday', 'Thu'],
  ['friday', 'Fri'],
  ['saturday', 'Sat'],
  ['sunday', 'Sun'],
];

export interface HoursGroup {
  days: string;
  hours: string;
}

const normalise = (value: string | undefined): string => {
  const trimmed = (value ?? '').trim();
  if (!trimmed || /^(n\/a|closed)$/i.test(trimmed)) return 'closed';
  return trimmed.replace(/\s*-\s*/g, '–');
};

/**
 * Groups consecutive days with identical hours, e.g.
 * [{ days: 'Mon–Fri', hours: '07:00–17:00' }, { days: 'Sat', hours: '09:00–13:00' }, { days: 'Sun', hours: 'closed' }].
 * Returns [] when no day has a value.
 */
export const formatHours = (hours: Record<string, string> | undefined): HoursGroup[] => {
  if (!hours || !Object.values(hours).some((v) => v && v.trim())) return [];

  const groups: Array<{ start: string; end: string; hours: string }> = [];
  for (const [key, short] of DAYS) {
    const value = normalise(hours[key] ?? hours[short] ?? hours[key.charAt(0).toUpperCase() + key.slice(1)]);
    const last = groups[groups.length - 1];
    if (last && last.hours === value) {
      last.end = short;
    } else {
      groups.push({ start: short, end: short, hours: value });
    }
  }

  return groups.map(({ start, end, hours: h }) => ({
    days: start === end ? start : `${start}–${end}`,
    hours: h,
  }));
};

/**
 * Today's hours on the device's current weekday, normalised like formatHours:
 * '07:00–17:00', 'closed', or null when there are no hours at all.
 */
export const todayHours = (
  hours: Record<string, string> | undefined,
  now: Date = new Date()
): string | null => {
  if (!hours || !Object.values(hours).some((v) => v && v.trim())) return null;
  // getDay(): 0 = Sunday; DAYS starts on Monday
  const day = DAYS[(now.getDay() + 6) % 7];
  if (!day) return null;
  const [key, short] = day;
  return normalise(hours[key] ?? hours[short] ?? hours[key.charAt(0).toUpperCase() + key.slice(1)]);
};

/** "Today 07:00–17:00", "Closed today", or '' when there are no hours (as in the drawer). */
export const todayHoursLabel = (hours: Record<string, string> | undefined): string => {
  const today = todayHours(hours);
  return today === null ? '' : today === 'closed' ? 'Closed today' : `Today ${today}`;
};
