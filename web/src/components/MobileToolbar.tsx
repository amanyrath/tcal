import type { ReactNode } from "react";
import { formatWeekLabel, formatDayNavLabel } from "../lib/dates";

interface MobileToolbarProps {
  weekStart: string;
  selectedDay: string;
  onPrevDay: () => void;
  onNextDay: () => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
}

export function MobileToolbar({
  weekStart,
  selectedDay,
  onPrevDay,
  onNextDay,
  onPrevWeek,
  onNextWeek,
  onToday,
}: MobileToolbarProps) {
  const weekLabel = formatWeekLabel(weekStart);
  const dayLabel = formatDayNavLabel(selectedDay);

  return (
    <div className="bg-white border-b border-gray-200 shrink-0">
      {/* Row 1: week range + view pills */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-800">{weekLabel}</span>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
          {(["month", "week", "day"] as const).map((v) => (
            <span
              key={v}
              className={`px-2.5 py-1 capitalize select-none ${
                v === "week"
                  ? "bg-gray-800 text-white"
                  : "bg-white text-gray-400"
              }`}
            >
              {v}
            </span>
          ))}
        </div>
      </div>

      {/* Row 2: navigation */}
      <div className="flex items-center px-3 py-2 gap-1.5">
        {/* Large prev week */}
        <NavButton onClick={onPrevWeek} aria-label="Previous week" size="lg">
          <DoubleChevronLeft />
        </NavButton>

        {/* Small prev day */}
        <NavButton onClick={onPrevDay} aria-label="Previous day" size="sm">
          <ChevronLeft />
        </NavButton>

        {/* Day label */}
        <span className="flex-1 text-center text-sm font-medium text-gray-800 px-1 truncate">
          {dayLabel}
        </span>

        {/* Small next day */}
        <NavButton onClick={onNextDay} aria-label="Next day" size="sm">
          <ChevronRight />
        </NavButton>

        {/* Large next week */}
        <NavButton onClick={onNextWeek} aria-label="Next week" size="lg">
          <DoubleChevronRight />
        </NavButton>

        {/* Today */}
        <button
          type="button"
          onClick={onToday}
          className="ml-1 px-3 h-8 rounded text-sm font-medium bg-[var(--cal-toolbar-bg)] text-[var(--cal-toolbar-text)] hover:bg-[var(--cal-toolbar-active)] active:bg-[var(--cal-toolbar-active)] transition-colors shrink-0"
        >
          today
        </button>
      </div>
    </div>
  );
}

function NavButton({
  children,
  onClick,
  "aria-label": ariaLabel,
  size,
}: {
  children: ReactNode;
  onClick: () => void;
  "aria-label": string;
  size: "sm" | "lg";
}) {
  const sizeClass =
    size === "lg"
      ? "w-9 h-8 bg-[var(--cal-toolbar-bg)] text-[var(--cal-toolbar-text)] hover:bg-[var(--cal-toolbar-active)]"
      : "w-7 h-7 border border-gray-300 bg-white text-gray-600 hover:bg-gray-50";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`flex items-center justify-center rounded shrink-0 active:opacity-80 transition-colors ${sizeClass}`}
    >
      {children}
    </button>
  );
}

function ChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M10 4L6 8l4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DoubleChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M11 4L7 9l4 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 4L3 9l4 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DoubleChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M7 4l4 5-4 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11 4l4 5-4 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
