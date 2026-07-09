export const PIXELS_PER_MINUTE = 1.2;
export const MIN_EVENT_HEIGHT = 40;

export function parseEventMinutes(value: string): number {
  const time = value.split(" ")[1];
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function eventDurationMinutes(start: string, end: string): number {
  return Math.max(parseEventMinutes(end) - parseEventMinutes(start), 0);
}

export function eventHeightFromDuration(start: string, end: string): number {
  const minutes = eventDurationMinutes(start, end);
  return Math.max(minutes * PIXELS_PER_MINUTE, MIN_EVENT_HEIGHT);
}
