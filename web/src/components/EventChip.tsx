import type { CalendarEvent } from "../types/events";
import { gymColor } from "../lib/colors";
import { eventStyle, formatTimeRange } from "../lib/eventDisplay";
import { eventHeightFromDuration } from "../lib/eventTime";

interface EventChipProps {
  event: CalendarEvent;
  onClick: () => void;
  fullWidth?: boolean;
}

export function EventChip({ event, onClick, fullWidth = false }: EventChipProps) {
  const style = eventStyle(event);
  const usesApiColors = Boolean(event.backgroundColor && event.textColor);
  const height = eventHeightFromDuration(event.start, event.end);
  const showDetails = fullWidth || height >= 56;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative text-left rounded-md px-2.5 py-1.5 hover:brightness-95 transition-all overflow-hidden flex flex-col gap-0.5 ${
        fullWidth ? "w-full" : "w-fit max-w-full"
      }`}
      style={{
        backgroundColor: style.bg,
        color: style.text,
        border: "none",
        borderLeft: `8px solid ${gymColor(event.gymKey)}`,
        minHeight: fullWidth ? undefined : height,
      }}
    >
      <img
        src={`/gyms/${event.gymKey}-icon.png`}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        style={{ opacity: 0.12 }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 py-1 px-2 text-[10px] font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150 truncate z-10"
        style={{ backgroundColor: gymColor(event.gymKey) }}
      >
        {event.gymName}
      </div>
      <div
        className="text-[10px] italic leading-snug shrink-0"
        style={{ color: style.muted, opacity: usesApiColors ? 0.85 : 1 }}
      >
        {formatTimeRange(event.start, event.end)}
      </div>
      <div className="text-xs font-semibold leading-snug line-clamp-2 pr-1">{event.title}</div>
      {showDetails && event.instructor && (
        <div
          className="text-[10px] leading-snug line-clamp-1 pr-1"
          style={{ opacity: usesApiColors ? 0.85 : 0.9 }}
        >
          {event.instructor}
        </div>
      )}
      {showDetails && event.capacity && (
        <div
          className="text-[10px] leading-snug italic font-medium line-clamp-1"
          style={{ color: style.muted, opacity: usesApiColors ? 0.85 : 1 }}
        >
          {event.capacity}
        </div>
      )}
    </button>
  );
}
