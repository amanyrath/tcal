import { useState } from "react";
import { gymColor } from "../lib/colors";
import { GYM_BY_KEY, gymIconUrl, gymLogoUrl } from "../lib/gyms";

interface GymIconProps {
  gymKey: string;
  size?: number;
  className?: string;
  useIcon?: boolean;
}

function initials(gymKey: string): string {
  const gym = GYM_BY_KEY[gymKey];
  if (!gym) return "??";
  const words = gym.shortName.split(/\s+/);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return gym.shortName.slice(0, 2).toUpperCase();
}

function InitialsIcon({
  gymKey,
  size,
  className,
}: {
  gymKey: string;
  size: number;
  className: string;
}) {
  const color = gymColor(gymKey);
  const label = initials(gymKey);
  const fontSize = size * 0.35;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      aria-hidden="true"
    >
      <circle cx="20" cy="20" r="18" fill={color} opacity="0.15" />
      <circle cx="20" cy="20" r="18" fill="none" stroke={color} strokeWidth="2" />
      <text
        x="20"
        y="20"
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize={fontSize}
        fontWeight="600"
        fontFamily="system-ui, sans-serif"
      >
        {label}
      </text>
    </svg>
  );
}

export function GymIcon({ gymKey, size = 32, className = "", useIcon = false }: GymIconProps) {
  const [useFallback, setUseFallback] = useState(false);
  const gym = GYM_BY_KEY[gymKey];

  if (!gym || useFallback) {
    return <InitialsIcon gymKey={gymKey} size={size} className={className} />;
  }

  const src = useIcon ? gymIconUrl(gymKey) : gymLogoUrl(gymKey);

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={`object-contain ${useIcon ? "" : "invert"} ${className}`}
      onError={() => setUseFallback(true)}
    />
  );
}
