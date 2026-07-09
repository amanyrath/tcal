import type { Gym } from "../types/events";

export const GYMS: Gym[] = [
  { key: "pacific-pipe", name: "Pacific Pipe", shortName: "Pacific Pipe" },
  { key: "ironworks", name: "Berkeley Ironworks", shortName: "Ironworks" },
  { key: "class-5", name: "Class 5", shortName: "Class 5" },
  { key: "cliffs-of-id", name: "Cliffs of Id", shortName: "Cliffs of Id" },
  { key: "diablo-rock", name: "Diablo Rock Gym", shortName: "Diablo Rock" },
  { key: "dogpatch", name: "Dogpatch Boulders", shortName: "Dogpatch" },
  { key: "gwpower-co", name: "Great Western Power Co", shortName: "Great Western" },
  { key: "hollywood-boulders", name: "Hollywood Boulders", shortName: "Hollywood" },
  { key: "hyperion", name: "Hyperion Climbing", shortName: "Hyperion" },
  { key: "la-boulders", name: "LA Boulders", shortName: "LA.B" },
  { key: "metalmark", name: "Metalmark", shortName: "Metalmark" },
  { key: "mission-cliffs", name: "Mission Cliffs", shortName: "Mission Cliffs" },
  { key: "pipeworks", name: "Sacramento Pipeworks", shortName: "Pipeworks" },
  { key: "the-oaks", name: "The Oaks", shortName: "The Oaks" },
  { key: "the-post", name: "The Post", shortName: "The Post" },
  { key: "the-studio", name: "The Studio Climbing", shortName: "The Studio" },
  { key: "verdigo-boulders", name: "Verdigo Boulders", shortName: "Verdigo" },
];

export const HOME_GYM = "pacific-pipe";

export const DEFAULT_GYM_ORDER = GYMS.map((gym) => gym.key);

export const GYM_BY_KEY = Object.fromEntries(GYMS.map((gym) => [gym.key, gym]));

export function normalizeGymOrder(order: string[]): string[] {
  const known = new Set(GYMS.map((gym) => gym.key));
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const key of order) {
    if (known.has(key) && !seen.has(key)) {
      normalized.push(key);
      seen.add(key);
    }
  }

  for (const gym of GYMS) {
    if (!seen.has(gym.key)) {
      normalized.push(gym.key);
    }
  }

  return normalized;
}

export function moveGymToTop(order: string[], gymKey: string): string[] {
  const normalized = normalizeGymOrder(order);
  const index = normalized.indexOf(gymKey);
  if (index < 0) return normalized;
  normalized.splice(index, 1);
  normalized.unshift(gymKey);
  return normalized;
}

export function gymLogoUrl(gymKey: string): string {
  return `/gyms/${gymKey}.png`;
}

export function gymIconUrl(gymKey: string): string {
  return `/gyms/${gymKey}-icon.png`;
}

export interface GymRegion {
  id: string;
  label: string;
  keys: string[];
}

export const GYM_REGIONS: GymRegion[] = [
  {
    id: "norcal",
    label: "Northern California",
    keys: [
      "ironworks",
      "diablo-rock",
      "dogpatch",
      "gwpower-co",
      "hyperion",
      "mission-cliffs",
      "pacific-pipe",
      "pipeworks",
      "the-oaks",
      "the-studio",
    ],
  },
  {
    id: "socal",
    label: "Southern California",
    keys: [
      "cliffs-of-id",
      "class-5",
      "hollywood-boulders",
      "la-boulders",
      "metalmark",
      "the-post",
      "verdigo-boulders",
    ],
  },
];

function sortGymsInRegion(gyms: Gym[], gymOrder: string[]): Gym[] {
  const order = new Map(normalizeGymOrder(gymOrder).map((key, index) => [key, index]));
  return [...gyms].sort((a, b) => (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0));
}

export function gymsGroupedByRegion(
  gymOrder: string[],
): { region: GymRegion; gyms: Gym[] }[] {
  return GYM_REGIONS.map((region) => ({
    region,
    gyms: sortGymsInRegion(
      region.keys.map((key) => GYM_BY_KEY[key]).filter(Boolean),
      gymOrder,
    ),
  }));
}

export function orderGyms(gymOrder: string[]): Gym[] {
  return normalizeGymOrder(gymOrder)
    .map((key) => GYM_BY_KEY[key])
    .filter(Boolean);
}
