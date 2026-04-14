import React, { useMemo } from 'react';
import { Modal } from './Modal';
import { CalendarEvent } from '../types';
import { getRegionClasses, formatTime, isEventActiveOnDate } from '../utils/dateUtils';
import { Clock, Repeat } from 'lucide-react';

interface DayViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export const DayViewModal: React.FC<DayViewModalProps> = ({ isOpen, onClose, date, events, onEventClick }) => {
  const dayEvents = useMemo(() => {
    if (!date) return [];
    return events.filter(event => event.status === 'approved' && isEventActiveOnDate(date, event));
  }, [date, events]);

  const allDayEvents = dayEvents.filter(e => e.isAllDay);
  const timedEvents = dayEvents.filter(e => !e.isAllDay);

  if (!date) return null;

  const title = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // 60 pixels per hour
  const HOUR_HEIGHT = 60;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col h-[70vh]">
        {/* All Day Events Section */}
        {allDayEvents.length > 0 && (
          <div className="shrink-0 border-b border-gray-200 pb-2 mb-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">All Day</h4>
            <div className="flex flex-col gap-1.5">
              {allDayEvents.map(event => (
                <div
                  key={event.id}
                  onClick={() => { onClose(); onEventClick(event); }}
                  className={`
                    px-3 py-2 rounded-lg border-l-4 cursor-pointer hover:opacity-90 transition-opacity flex justify-between items-center
                    ${getRegionClasses(event.region)}
                  `}
                >
                  <span className="font-medium text-sm truncate">{event.title}</span>
                  {event.recurrence && event.recurrence !== 'none' && (
                    <Repeat size={14} className="opacity-60 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timed Events Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          <div className="relative min-h-[1440px]"> {/* 24 hours * 60px */}
            {/* Time markers */}
            {Array.from({ length: 24 }).map((_, i) => (
              <div 
                key={i} 
                className="absolute w-full flex border-t border-gray-100"
                style={{ top: `${i * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
              >
                <div className="w-16 shrink-0 text-right pr-2 py-1 text-xs text-gray-400 font-medium bg-white z-10">
                  {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                </div>
                <div className="flex-1 border-l border-gray-100 relative"></div>
              </div>
            ))}

            {/* Events */}
            <div className="absolute top-0 left-16 right-0 bottom-0">
              {timedEvents.map(event => {
                const start = new Date(event.start);
                const end = new Date(event.end);
                
                // If event starts before this day, set start to 00:00
                const eventStartOnDay = start < new Date(date.getFullYear(), date.getMonth(), date.getDate()) 
                  ? new Date(date.getFullYear(), date.getMonth(), date.getDate()) 
                  : start;
                  
                // If event ends after this day, set end to 23:59
                const eventEndOnDay = end > new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)
                  ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)
                  : end;

                const startMinutes = eventStartOnDay.getHours() * 60 + eventStartOnDay.getMinutes();
                const endMinutes = eventEndOnDay.getHours() * 60 + eventEndOnDay.getMinutes();
                const durationMinutes = Math.max(endMinutes - startMinutes, 15); // Min 15 mins height

                const top = (startMinutes / 60) * HOUR_HEIGHT;
                const height = (durationMinutes / 60) * HOUR_HEIGHT;

                return (
                  <div
                    key={event.id}
                    onClick={() => { onClose(); onEventClick(event); }}
                    className={`
                      absolute left-1 right-2 rounded-md border-l-4 p-1.5 cursor-pointer hover:opacity-90 transition-opacity overflow-hidden shadow-sm
                      ${getRegionClasses(event.region)}
                    `}
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      zIndex: 20
                    }}
                  >
                    <div className="text-xs font-bold truncate">{event.title}</div>
                    {height >= 40 && (
                      <div className="text-[10px] opacity-80 flex items-center gap-1 mt-0.5">
                        <Clock size={10} />
                        {formatTime(event.start)} - {formatTime(event.end)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
