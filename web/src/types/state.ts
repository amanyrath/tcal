export type TimeFilterPreset = "all" | "morning" | "midday" | "evening" | "custom";

export interface TimeFilter {
  preset: TimeFilterPreset;
  customStart: string; // "HH:MM" 24-hour
  customEnd: string;   // "HH:MM" 24-hour
}

export interface AppState {
  homeGym: string;
  activeGyms: string[];
  gymOrder: string[];
  enabledTypes: Record<string, string[]>;
  hiddenGroups: string[];
  offGroups: string[];
  hideFull: boolean;
  timeFilter: TimeFilter;
  collapsedSections: {
    gyms: boolean;
    categories: boolean;
    hidden: boolean;
    time: boolean;
  };
  filterPanelOpen: boolean;
  view: "week";
  weekStart: string;
}

export const STORAGE_KEY = "touchstonecal-state-v1";
