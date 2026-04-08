const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const parseEventDate = (value?: string | null): Date | null => {
  if (!value) return null;

  const match = value.match(ISO_DATE_PATTERN);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
};

export const normalizeUpcomingEventDate = (
  value?: string | null,
  status?: string | null,
): Date | null => {
  const parsed = parseEventDate(value);
  if (!parsed) return null;

  if (status !== "pending") return parsed;

  const normalized = new Date(parsed);
  const threshold = new Date();
  threshold.setHours(12, 0, 0, 0);
  threshold.setMonth(threshold.getMonth() - 6);

  while (normalized < threshold) {
    normalized.setFullYear(normalized.getFullYear() + 1);
  }

  return normalized;
};