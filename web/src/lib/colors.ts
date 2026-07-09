const PALETTE: Record<string, string> = {
  "pacific-pipe":       "#ff1744",
  ironworks:            "#00b0ff",
  "class-5":            "#00e676",
  "cliffs-of-id":       "#ff9100",
  "diablo-rock":        "#ff6d00",
  dogpatch:             "#d500f9",
  "gwpower-co":         "#aa00ff",
  "hollywood-boulders": "#f50057",
  hyperion:             "#2979ff",
  "la-boulders":        "#ff3d00",
  metalmark:            "#00e5ff",
  "mission-cliffs":     "#1de9b6",
  pipeworks:            "#ff4081",
  "the-oaks":           "#c6ff00",
  "the-post":           "#e040fb",
  "the-studio":         "#18ffff",
  "verdigo-boulders":   "#69ff47",
};

export interface CategoryStyle {
  bg: string;
  text: string;
  muted: string;
  border: string;
}

const CATEGORY_COLORS: Record<string, CategoryStyle> = {
  "fitness-classes": {
    bg: "#2f6b3a",
    text: "#ffffff",
    muted: "#d8f3dc",
    border: "#1b4332",
  },
  "fitness-clinics": {
    bg: "#245530",
    text: "#ffffff",
    muted: "#d8f3dc",
    border: "#1b4332",
  },
  "yoga-classes": {
    bg: "#c5e86c",
    text: "#1a2e05",
    muted: "#3f6212",
    border: "#a8d948",
  },
  "yoga-clinics": {
    bg: "#b8db5c",
    text: "#1a2e05",
    muted: "#3f6212",
    border: "#a8d948",
  },
  "youth-programs": {
    bg: "#d93a3a",
    text: "#ffffff",
    muted: "#fee2e2",
    border: "#b91c1c",
  },
  "affinity-meetup-groups": {
    bg: "#f5c518",
    text: "#422006",
    muted: "#713f12",
    border: "#ca8a04",
  },
  "climbing-clinics": {
    bg: "#6ec6e6",
    text: "#0c4a6e",
    muted: "#075985",
    border: "#38bdf8",
  },
  "intro-classes": {
    bg: "#1b4b7a",
    text: "#ffffff",
    muted: "#bfdbfe",
    border: "#1e3a8a",
  },
  "gym-events": {
    bg: "#9ca3af",
    text: "#ffffff",
    muted: "#f3f4f6",
    border: "#6b7280",
  },
  uncategorized: {
    bg: "#9ca3af",
    text: "#ffffff",
    muted: "#f3f4f6",
    border: "#6b7280",
  },
};

export function gymColor(gymKey: string): string {
  return PALETTE[gymKey] ?? "#6b7280";
}

export function categoryStyle(categoryGroup: string): CategoryStyle {
  return CATEGORY_COLORS[categoryGroup] ?? CATEGORY_COLORS.uncategorized;
}
