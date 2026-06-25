function partsInTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  ) as Record<
    "year" | "month" | "day" | "hour" | "minute" | "second",
    number
  >;
}

export function zonedDateTimeToUtc(
  date: string,
  time: string,
  timezone: string
) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute, 0);
  let candidate = target;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = partsInTimezone(new Date(candidate), timezone);
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second
    );
    const difference = target - actualAsUtc;

    if (difference === 0) {
      break;
    }

    candidate += difference;
  }

  return new Date(candidate);
}

export function formatInTimezone(
  date: string,
  timezone: string,
  options: Intl.DateTimeFormatOptions
) {
  return new Intl.DateTimeFormat("en", {
    ...options,
    timeZone: timezone
  }).format(new Date(date));
}
