export interface Gym {
  key: string;
  name: string;
  shortName: string;
}

export interface CategoryType {
  displayName: string;
  count: number;
}

export interface CategorySubgroup {
  id: string;
  label: string;
  types: CategoryType[];
}

export interface CategoryGroup {
  id: string;
  label: string;
  subgroups?: CategorySubgroup[];
  types: CategoryType[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  rawTitle: string;
  start: string;
  end: string;
  gymKey: string;
  gymName: string;
  categoryGroup: string;
  categorySubgroup?: string;
  displayName: string;
  instructor: string | null;
  capacity: string | null;
  description: string | null;
  infoUrl: string | null;
  sourceUrl: string;
  backgroundColor?: string | null;
  textColor?: string | null;
}

export interface EventsResponse {
  updatedAt: string;
  gyms: Gym[];
  categoryGroups: CategoryGroup[];
  events: CalendarEvent[];
}
