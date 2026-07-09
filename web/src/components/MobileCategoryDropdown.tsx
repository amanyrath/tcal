import { useState, useRef, useEffect } from "react";
import type { CategoryGroup } from "../types/events";

interface MobileCategoryDropdownProps {
  catalog: CategoryGroup[];
  offGroups: string[];
  hiddenGroups: string[];
  onToggleGroup: (groupId: string, on: boolean) => void;
  onSelectAll: () => void;
}

export function MobileCategoryDropdown({
  catalog,
  offGroups,
  hiddenGroups,
  onToggleGroup,
  onSelectAll,
}: MobileCategoryDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const offSet = new Set(offGroups);
  const hiddenSet = new Set(hiddenGroups);
  const allEnabled = offSet.size === 0 && hiddenSet.size === 0;

  const enabledLabels = [
    ...new Set(
      catalog
        .filter((g) => !offSet.has(g.id) && !hiddenSet.has(g.id))
        .map((g) => g.label),
    ),
  ];

  const label =
    allEnabled || catalog.length === 0
      ? "All"
      : enabledLabels.length === 0
        ? "None"
        : enabledLabels.join(", ");

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 font-medium">Category:</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white text-gray-800 hover:bg-gray-50 active:bg-gray-100"
        >
          <span className="max-w-[160px] truncate">{label}</span>
          <svg
            width="11"
            height="11"
            viewBox="0 0 12 12"
            fill="none"
            className={`shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            <path
              d="M2 4l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-40 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[220px] py-1 overflow-hidden">
          <button
            type="button"
            onClick={() => {
              onSelectAll();
              setOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 active:bg-gray-100 ${
              allEnabled ? "font-semibold text-gray-900" : "text-gray-600"
            }`}
          >
            <Checkbox checked={allEnabled} />
            All
          </button>

          {catalog.length > 0 && <div className="h-px bg-gray-100 mx-3 my-0.5" />}

          {catalog.map((group) => {
            const isOn = !offSet.has(group.id) && !hiddenSet.has(group.id);
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => onToggleGroup(group.id, !isOn)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 active:bg-gray-100 text-gray-700"
              >
                <Checkbox checked={isOn} />
                {group.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
        checked ? "bg-gray-800 border-gray-800" : "border-gray-300 bg-white"
      }`}
    >
      {checked && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path
            d="M2 5l2.5 2.5L8 2.5"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}
