
export type RecurrenceType = 'none' | 'monthly' | 'yearly';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string; // ISO 8601 date string
  end: string;   // ISO 8601 date string
  region: Region;
  isAllDay: boolean;
  location?: string;
  recurrence?: RecurrenceType;
  status?: 'pending' | 'approved' | 'rejected' | 'edited' | 'deleted';
  originalData?: CalendarEvent; // Stores the state of the event before editing
  uid?: string; // The UID of the user who submitted the event or edit
}

export enum Region {
  IWAMI = 'Iwami (West)',
  IZUMO = 'Izumo (East)',
  OKI = 'Oki'
}

export interface DayData {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}
