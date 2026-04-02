
import { Region, CalendarEvent } from '../types';

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

export const getFirstDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
};

export const isSameDay = (d1: Date, d2: Date): boolean => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export const isDateInRange = (
  dateToCheck: Date,
  startDateStr: string,
  endDateStr: string,
  isAllDay: boolean
): boolean => {
  const checkDate = new Date(dateToCheck);
  checkDate.setHours(0, 0, 0, 0);
  const checkTime = checkDate.getTime();
  
  const dayEnd = new Date(checkDate);
  dayEnd.setHours(23, 59, 59, 999);
  const dayEndTime = dayEnd.getTime();

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  
  if (isAllDay) {
     const s = new Date(start); s.setHours(0, 0, 0, 0);
     const e = new Date(end); e.setHours(0, 0, 0, 0);
     return checkTime >= s.getTime() && checkTime <= e.getTime();
  }
  
  return start.getTime() <= dayEndTime && end.getTime() > checkTime;
};

/**
 * Checks if an event is active on a specific date, accounting for recurrence.
 */
export const isEventActiveOnDate = (dateToCheck: Date, event: CalendarEvent): boolean => {
  const checkDate = new Date(dateToCheck);
  checkDate.setHours(0, 0, 0, 0);
  const checkTime = checkDate.getTime();

  const eventStart = new Date(event.start);
  const startMidnight = new Date(eventStart);
  startMidnight.setHours(0, 0, 0, 0);
  const startMidnightTime = startMidnight.getTime();

  // If the date is before the event even starts, it's not active
  if (checkTime < startMidnightTime) return false;

  if (event.recurrence === 'monthly') {
    return checkDate.getDate() === eventStart.getDate();
  }

  if (event.recurrence === 'yearly') {
    return (
      checkDate.getDate() === eventStart.getDate() &&
      checkDate.getMonth() === eventStart.getMonth()
    );
  }

  // Default: check if the date falls within the event's specific start/end range
  return isDateInRange(dateToCheck, event.start, event.end, event.isAllDay);
};

export const toDateString = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const toTimeString = (date: Date): string => {
  return `${date.getHours()}:${date.getMinutes()}`;
};

export const formatFriendlyDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

export const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const generateCalendarGrid = (currentDate: Date): { date: Date; isCurrentMonth: boolean }[] => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const daysInPrevMonth = getDaysInMonth(year, month - 1);
  const prevMonthDays = Array.from({ length: firstDay }, (_, i) => {
    return {
      date: new Date(year, month - 1, daysInPrevMonth - firstDay + i + 1),
      isCurrentMonth: false
    };
  });

  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => {
    return {
      date: new Date(year, month, i + 1),
      isCurrentMonth: true
    };
  });

  const remainingCells = 42 - (prevMonthDays.length + currentMonthDays.length);
  const nextMonthDays = Array.from({ length: remainingCells }, (_, i) => {
    return {
      date: new Date(year, month + 1, i + 1),
      isCurrentMonth: false
    };
  });

  return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
};

export const getRegionClasses = (region: Region) => {
    switch (region) {
        case Region.IWAMI:
            return 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200';
        case Region.IZUMO:
            return 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200';
        case Region.OKI:
            return 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200';
        default: 
            return 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200';
    }
};
