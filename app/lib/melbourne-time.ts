export const MELBOURNE_TIME_ZONE = "Australia/Melbourne";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: MELBOURNE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** ISO calendar date in Melbourne, independent of the function host's timezone. */
export function melbourneDay(date = new Date()): string {
  const values = Object.fromEntries(
    dateFormatter.formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}
