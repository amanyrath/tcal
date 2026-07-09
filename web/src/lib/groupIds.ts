// Touchstone storefront slugs and legacy category ids from pre-storefront builds.
export const STOREFRONT_GROUP_LABELS: Record<string, string> = {
  "intro-classes": "Intro Classes",
  "climbing-clinics": "Climbing Clinics",
  "yoga-classes": "Yoga Classes",
  "yoga-clinics": "Yoga Clinics",
  "fitness-classes": "Fitness Classes",
  "fitness-clinics": "Fitness Clinics",
  "affinity-meetup-groups": "Affinity Groups",
  "youth-programs": "Youth Programs",
  "gym-events": "Gym Events",
  uncategorized: "Uncategorized",
};

export const LEGACY_GROUP_IDS: Record<string, string> = {
  notices: "gym-events",
  "intro-climbing": "intro-classes",
  clinics: "climbing-clinics",
  kids: "youth-programs",
  community: "affinity-meetup-groups",
  yoga: "yoga-classes",
  fitness: "fitness-classes",
};

export function normalizeGroupId(groupId: string): string {
  return LEGACY_GROUP_IDS[groupId] ?? groupId;
}

export const VISIBLE_GROUP_IDS = new Set([
  ...Object.keys(STOREFRONT_GROUP_LABELS).filter((id) => id !== "uncategorized"),
  ...Object.keys(LEGACY_GROUP_IDS),
]);
