import type { CalendarEvent } from "../types/events";

interface EventDetailPopoverProps {
  event: CalendarEvent;
  onClose: () => void;
}

function formatTimeRange(start: string, end: string): string {
  const fmt = (value: string) => {
    const [, time] = value.split(" ");
    const [hours, minutes] = time.split(":");
    const h = Number(hours);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${suffix}`;
  };
  return `${fmt(start)} - ${fmt(end)}`;
}

export function EventDetailPopover({ event, onClose }: EventDetailPopoverProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-sm w-full p-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Event details"
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="font-semibold text-gray-900">{event.title}</h3>
            <p className="text-sm text-gray-500">{event.gymName}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            x
          </button>
        </div>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-gray-500">Time</dt>
            <dd>{formatTimeRange(event.start, event.end)}</dd>
          </div>
          {event.instructor && (
            <div>
              <dt className="text-gray-500">Instructor</dt>
              <dd>{event.instructor}</dd>
            </div>
          )}
          {event.capacity && (
            <div>
              <dt className="text-gray-500">Availability</dt>
              <dd>{event.capacity}</dd>
            </div>
          )}
          {event.description && (
            <div>
              <dt className="text-gray-500">Description</dt>
              <dd className="text-gray-700">{event.description}</dd>
            </div>
          )}
        </dl>
        <a
          href={event.infoUrl ?? event.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-sm text-blue-600 hover:underline"
        >
          {event.infoUrl ? "Information and Dates" : "View on Touchstone"}
        </a>
      </div>
    </div>
  );
}
