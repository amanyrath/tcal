import type { CSSProperties } from "react";
import { gymColor } from "../lib/colors";
import { orderGyms } from "../lib/gyms";
import { GymIcon } from "./GymIcon";

interface MobileGymRailProps {
  gymOrder: string[];
  activeGyms: string[];
  onToggle: (gymKey: string) => void;
  allowedGymKeys?: string[];
}

export function MobileGymRail({ gymOrder, activeGyms, onToggle, allowedGymKeys }: MobileGymRailProps) {
  const active = new Set(activeGyms);
  const allowed = allowedGymKeys ? new Set(allowedGymKeys) : null;
  const ordered = orderGyms(gymOrder).filter((gym) => !allowed || allowed.has(gym.key));

  return (
    <nav
      className="flex gap-2 overflow-x-auto px-3 py-2 bg-white border-b border-gray-200 shrink-0"
      style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as CSSProperties}
      aria-label="Gym selector"
    >
      {ordered.map((gym) => {
        const isActive = active.has(gym.key);
        const color = gymColor(gym.key);
        return (
          <button
            key={gym.key}
            type="button"
            onClick={() => onToggle(gym.key)}
            title={gym.name}
            className={`flex items-center justify-center px-2 py-1 rounded-md shrink-0 transition-opacity ${
              isActive ? "opacity-100" : "opacity-35 hover:opacity-65"
            }`}
            style={isActive ? { boxShadow: `0 0 0 2px ${color}` } : {}}
            aria-pressed={isActive}
          >
            <GymIcon gymKey={gym.key} size={40} className="h-8 w-auto max-w-[72px]" />
          </button>
        );
      })}
    </nav>
  );
}
