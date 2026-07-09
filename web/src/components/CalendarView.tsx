import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import type { CalendarEvent } from "../types/events";
import { formatDayHeader, getDayColumnStyle } from "../lib/calendarDay";
import { localDateString, isPastDay, isToday } from "../lib/dates";
import { DayColumn } from "./DayColumn";
import { EventDetailPopover } from "./EventDetailPopover";

interface CalendarViewProps {
  events: CalendarEvent[];
  weekStart: string;
  hasActiveGyms: boolean;
  selectedDay?: string;
}

function localDateKey(date: Date): string {
  return localDateString(date);
}

export function CalendarView({ events, weekStart, hasActiveGyms, selectedDay }: CalendarViewProps) {
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const dayRefs = useRef<Record<string, HTMLElement | null>>({});

  // Tracks days where the user has explicitly flipped the default collapse state.
  // Empty days default to collapsed; days with events default to expanded.
  // A key in this set means the user toggled it away from its default.
  const [userToggles, setUserToggles] = useState<Set<string>>(new Set());

  const weekDays = useMemo(() => {
    const start = new Date(`${weekStart}T12:00:00`);
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [weekStart]);

  const eventsByDay = useMemo(() => {
    return weekDays.map((day) => {
      const key = localDateKey(day);
      const dayEvents = events
        .filter((event) => event.start.startsWith(key))
        .sort((a, b) => a.start.localeCompare(b.start));
      return { day, events: dayEvents };
    });
  }, [events, weekDays]);

  // Reset user toggles when the week changes so each week starts fresh
  useEffect(() => {
    setUserToggles(new Set());
  }, [weekStart]);

  const isDayCollapsed = useCallback(
    (dayKey: string, dayEventCount: number) => {
      const autoCollapsed = dayEventCount === 0;
      return userToggles.has(dayKey) ? !autoCollapsed : autoCollapsed;
    },
    [userToggles],
  );

  const toggleDay = useCallback((dayKey: string) => {
    setUserToggles((prev) => {
      const next = new Set(prev);
      if (next.has(dayKey)) next.delete(dayKey);
      else next.add(dayKey);
      return next;
    });
  }, []);

  // Scroll to selected day on mobile when it changes or events load
  useEffect(() => {
    if (!selectedDay) return;
    const el = dayRefs.current[selectedDay];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedDay, events]);

  if (!hasActiveGyms) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
        Select a gym to view calendar.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Mobile: stacked day list with no horizontal min-width */}
      <div className="sm:hidden p-3 space-y-2">
        {eventsByDay.filter(({ day, events: dayEvents }) =>
          // Hide past days that have no events - start view from today
          !(isPastDay(day) && dayEvents.length === 0)
        ).map(({ day, events: dayEvents }) => {
          const header = formatDayHeader(day);
          const columnStyle = getDayColumnStyle(day);
          const today = isToday(day);
          const past = isPastDay(day);
          const dayKey = localDateKey(day);
          const isSelected = selectedDay === dayKey;
          const isCollapsed = isDayCollapsed(dayKey, dayEvents.length);

          return (
            <section
              key={day.toISOString()}
              ref={(el) => {
                dayRefs.current[dayKey] = el;
              }}
              className={`rounded-xl overflow-hidden ${isSelected ? "ring-2 ring-gray-700" : ""}`}
              style={{ backgroundColor: columnStyle.backgroundColor }}
            >
              <button
                type="button"
                onClick={() => toggleDay(dayKey)}
                aria-expanded={!isCollapsed}
                className={`w-full flex items-center justify-between px-3 py-2 border-b border-black/5 text-left ${
                  today
                    ? "text-gray-900 bg-yellow-50"
                    : past
                      ? "text-gray-400"
                      : "text-gray-700"
                }`}
              >
                <span className="text-sm font-bold">
                  {header.weekday}, {header.date}
                </span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                  className={`shrink-0 transition-transform duration-200 ${
                    isCollapsed ? "-rotate-90" : "rotate-0"
                  }`}
                >
                  <path
                    d="M4 6l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {!isCollapsed && (
                <div className="p-2">
                  <DayColumn events={dayEvents} onEventClick={setSelected} layout="list" />
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Desktop: 7-column week grid */}
      <div className="hidden sm:block min-w-[800px] p-1.5">
        <div className="grid grid-cols-7 border-b border-[var(--cal-grid-border)] sticky top-0 z-10 bg-white">
          {weekDays.map((day) => {
            const header = formatDayHeader(day);
            const columnStyle = getDayColumnStyle(day);
            return (
              <div
                key={day.toISOString()}
                className="py-2 text-center border-l border-[var(--cal-grid-border)] first:border-l-0"
                style={{ backgroundColor: columnStyle.backgroundColor }}
              >
                <div className="text-xs font-bold text-gray-700">{header.weekday}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{header.date}</div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-7 items-start border-[var(--cal-grid-border)]">
          {eventsByDay.map(({ day, events: dayEvents }) => {
            const columnStyle = getDayColumnStyle(day);
            return (
              <div
                key={day.toISOString()}
                className="px-1.5 py-1 border-l border-[var(--cal-grid-border)] first:border-l-0"
                style={{ backgroundColor: columnStyle.backgroundColor }}
              >
                <DayColumn events={dayEvents} onEventClick={setSelected} layout="grid" />
              </div>
            );
          })}
        </div>
      </div>

      {selected && <EventDetailPopover event={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
