import type { ReactNode } from "react";
import { ExportMenu } from "./ExportMenu";
import { formatWeekLabel } from "../lib/dates";
import type { AppState } from "../types/state";

interface CalendarToolbarProps {
  weekStart: string;
  filterPanelOpen: boolean;
  updatedAt: string | null;
  state: AppState;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onToggleFilterPanel: () => void;
}

export function CalendarToolbar({
  weekStart,
  filterPanelOpen,
  updatedAt,
  state,
  onPrevWeek,
  onNextWeek,
  onToday,
  onToggleFilterPanel,
}: CalendarToolbarProps) {
  return (
    <header className="flex items-center justify-between gap-2 px-3 py-2 bg-white border-b border-[var(--cal-grid-border)] shrink-0">
      <div className="flex items-center gap-1.5 min-w-0">
        <button
          type="button"
          onClick={onToggleFilterPanel}
          className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded md:hidden"
        >
          Filters
        </button>
        <button
          type="button"
          onClick={onToggleFilterPanel}
          className="hidden md:flex items-center justify-center w-8 h-8 text-sm text-gray-600 hover:bg-gray-100 rounded"
          title={filterPanelOpen ? "Collapse filters" : "Expand filters"}
          aria-label={filterPanelOpen ? "Collapse filters" : "Expand filters"}
        >
          <PanelChevron expanded={filterPanelOpen} />
        </button>
        <ToolbarButton onClick={onPrevWeek} aria-label="Previous week">
          <ChevronLeft />
        </ToolbarButton>
        <ToolbarButton onClick={onNextWeek} aria-label="Next week">
          <ChevronRight />
        </ToolbarButton>
        <ToolbarButton onClick={onToday} className="px-3">
          Today
        </ToolbarButton>
      </div>

      <div className="flex-1 text-center min-w-0 px-2">
        <span className="text-sm font-bold text-gray-800 truncate block">
          {formatWeekLabel(weekStart)}
        </span>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {updatedAt && (
          <span className="hidden sm:inline text-xs text-gray-400">Updated {updatedAt}</span>
        )}
        <ExportMenu state={state} />
      </div>
    </header>
  );
}

function ToolbarButton({
  children,
  onClick,
  className = "",
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center h-8 min-w-8 rounded text-sm font-medium text-[var(--cal-toolbar-text)] bg-[var(--cal-toolbar-bg)] hover:bg-[var(--cal-toolbar-active)] transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

function PanelChevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
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

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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
