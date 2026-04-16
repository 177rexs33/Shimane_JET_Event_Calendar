
export type RecurrenceType = 'none' | 'monthly' | 'yearly';

export type EventCategory = 'JET' | 'AJET' | 'Local Event' | 'Festival' | 'Sports' | 'Music' | 'Cultural Exchange' | 'Other';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  types?: EventCategory[];
  start: string; // ISO 8601 date string
  end: string;   // ISO 8601 date string
  region: Region;
  city?: string;
  isAllDay: boolean;
  recurrence?: RecurrenceType;
  status?: 'pending' | 'approved' | 'rejected' | 'edited' | 'deleted';
  originalData?: CalendarEvent; // Stores the state of the event before editing
  uid?: string; // The UID of the user who submitted the event or edit
}

export enum Region {
  IWAMI = 'Iwami (West)',
  IZUMO = 'Izumo (East)',
  OKI = 'Oki Island',
  OUTSIDE_SHIMANE = 'Outside Shimane'
}

export const REGION_CITIES: Record<Region, string[]> = {
  [Region.IWAMI]: ['Whole Region', 'Masuda', 'Hamada', 'Gotsu', 'Oda', 'Yoshika', 'Tsuwano', 'Kawamoto', 'Ohnan', 'Misato'],
  [Region.IZUMO]: ['Whole Region', 'Izumo', 'Matsue', 'Unnan', 'Yasugi', 'Iinan', 'Okuizumo'],
  [Region.OKI]: ['Whole Region', 'Okinoshima', 'Ama', 'Nishinoshima', 'Chibu'],
  [Region.OUTSIDE_SHIMANE]: ['N/A']
};

export type HolidayData = Record<string, string>;

