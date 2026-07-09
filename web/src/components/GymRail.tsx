import { gymColor } from "../lib/colors";
import { orderGyms } from "../lib/gyms";
import { GymIcon } from "./GymIcon";

interface GymRailProps {
  gymOrder: string[];
  activeGyms: string[];
  onToggle: (gymKey: string) => void;
  allowedGymKeys?: string[];
}

export function GymRail({ gymOrder, activeGyms, onToggle, allowedGymKeys }: GymRailProps) {
  const active = new Set(activeGyms);
  const allowed = allowedGymKeys ? new Set(allowedGymKeys) : null;
  const ordered = orderGyms(gymOrder).filter((gym) => !allowed || allowed.has(gym.key));

  return (
    <nav
      className="flex flex-row gap-1.5 overflow-x-auto p-2 bg-white border-b border-gray-200 shrink-0"
      aria-label="Gym selector"
    >
      {ordered.map((gym) => {
        const isActive = active.has(gym.key);
        const color = gymColor(gym.key);
        return (
          <button
            key={gym.key}
            type="button"
            title={gym.name}
            onClick={() => onToggle(gym.key)}
            className={`flex items-center justify-center px-2 py-1 rounded-md transition-opacity shrink-0 ${
              isActive ? "opacity-100" : "opacity-35 hover:opacity-65"
            }`}
            style={isActive ? { boxShadow: `0 0 0 2.5px ${color}` } : {}}
          >
            <GymIcon gymKey={gym.key} size={40} className="h-9 w-auto max-w-[80px]" />
          </button>
        );
      })}
    </nav>
  );
}
