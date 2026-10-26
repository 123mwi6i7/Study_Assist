export class DeadlineValidationError extends Error {}

function sameWallTime(date: Date, expected: number[], timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return ["year", "month", "day", "hour", "minute"].every(
    (part, index) => Number(values[part]) === expected[index],
  );
}

function offsetAt(instant: number, timeZone: string) {
  const roundedInstant = Math.floor(instant / 60_000) * 60_000;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(roundedInstant));
  const values = Object.fromEntries(parts.map((part) => [part.type, Number(part.value)]));
  const renderedAsUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
  );

  return renderedAsUtc - roundedInstant;
}

export function localDeadlineToUtc(value: string, timeZone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new DeadlineValidationError("Enter a valid deadline date and time.");

  const expected = match.slice(1).map(Number);
  const [year, month, day, hour, minute] = expected;
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute);

  if (
    new Date(localAsUtc).getUTCFullYear() !== year ||
    new Date(localAsUtc).getUTCMonth() + 1 !== month ||
    new Date(localAsUtc).getUTCDate() !== day ||
    hour > 23 ||
    minute > 59
  ) {
    throw new DeadlineValidationError("Enter a valid deadline date and time.");
  }

  try {
    new Intl.DateTimeFormat("en", { timeZone }).format(new Date(localAsUtc));
  } catch {
    throw new DeadlineValidationError("Choose a valid time zone, such as Africa/Nairobi or Europe/London.");
  }

  const offsets = new Set(
    [-36, -12, 0, 12, 36].map((hours) => offsetAt(localAsUtc + hours * 60 * 60 * 1000, timeZone)),
  );
  const matches = [...offsets]
    .map((offset) => new Date(localAsUtc - offset))
    .filter((candidate) => sameWallTime(candidate, expected, timeZone));

  if (matches.length === 0) {
    throw new DeadlineValidationError("That local time does not exist because of a clock change. Choose another time.");
  }
  if (matches.length > 1) {
    throw new DeadlineValidationError("That local time occurs twice because of a clock change. Choose another time.");
  }
  if (matches[0].getTime() <= Date.now()) {
    throw new DeadlineValidationError("Choose a deadline in the future.");
  }

  return matches[0].toISOString();
}
