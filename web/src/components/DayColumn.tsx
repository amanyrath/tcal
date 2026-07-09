import { useState } from "react";
import type { CalendarEvent } from "../types/events";
import { MAX_VISIBLE_EVENTS } from "../lib/dayOverflow";
import { EventChip } from "./EventChip";

interface DayColumnProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  layout: "grid" | "list";
}

export function DayColumn({ events, onEventClick, layout }: DayColumnProps) {
  const [expanded, setExpanded] = useState(false);

  if (events.length === 0) {
    return (
      <p className={`text-gray-400 text-center ${layout === "grid" ? "text-xs py-4" : "text-sm"}`}>
        No events
      </p>
    );
  }

  const hasOverflow = events.length > MAX_VISIBLE_EVENTS;
  const visibleEvents = expanded ? events : events.slice(0, MAX_VISIBLE_EVENTS);
  const remaining = events.length - MAX_VISIBLE_EVENTS;

  const eventItems = visibleEvents.map((event) => (
    <EventChip
      key={event.id}
      event={event}
      onClick={() => onEventClick(event)}
      fullWidth
    />
  ));

  const overflowButton = hasOverflow ? (
    <button
      type="button"
      onClick={() => setExpanded((value) => !value)}
      aria-expanded={expanded}
      className="w-full text-left text-xs font-medium text-gray-600 hover:text-gray-800 py-1 px-1"
    >
      {expanded ? "Show less" : `+${remaining} more`}
    </button>
  ) : null;

  if (layout === "list") {
    return (
      <>
        <ul className="space-y-1">
          {visibleEvents.map((event) => (
            <li key={event.id}>
              <EventChip event={event} onClick={() => onEventClick(event)} fullWidth />
            </li>
          ))}
        </ul>
        {overflowButton}
      </>
    );
  }

  return (
    <div className="space-y-1 px-0.5">
      {eventItems}
      {overflowButton}
    </div>
  );
}
