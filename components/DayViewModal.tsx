import React, { useMemo, useState } from 'react';
import { Modal } from './Modal';
import { CalendarEvent } from '../types';
import { getRegionClasses, formatTime, isEventActiveOnDate, getEnglishHolidayName } from '../utils/dateUtils';
import { Clock, Repeat, List, Calendar as CalendarIcon, MapPin, Plus } from 'lucide-react';

interface DayViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onAddEvent?: () => void;
  holidayName?: string;
}

export const DayViewModal: React.FC<DayViewModalProps> = ({ isOpen, onClose, date, events, onEventClick, onAddEvent, holidayName }) => {
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');

  const dayEvents = useMemo(() => {
    if (!date) return [];
    return events.filter(event => event.status === 'approved' && isEventActiveOnDate(date, event));
  }, [date, events]);

  const sortedDayEvents = useMemo(() => {
    return [...dayEvents].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [dayEvents]);

  const allDayEvents = dayEvents.filter(e => e.isAllDay);
  const timedEvents = dayEvents.filter(e => !e.isAllDay);

  if (!date) return null;

  const title = (
    <div className="flex items-start justify-between min-w-0 pr-4">
      <div className="flex flex-col min-w-0">
        <span className="truncate">{date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
        {holidayName && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-semibold px-2 py-0.5 bg-red-100 text-red-700 rounded-md border border-red-200 shrink-0">
              {holidayName}
            </span>
            <span className="text-xs font-medium text-red-600 truncate">
              {getEnglishHolidayName(holidayName)}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0 ml-2">
        <button 
          onClick={() => setViewMode(prev => prev === 'timeline' ? 'list' : 'timeline')}
          className="flex items-center justify-center w-7 h-7 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
          title={viewMode === 'timeline' ? 'Switch to List View' : 'Switch to Hourly View'}
        >
          {viewMode === 'timeline' ? <List size={18} /> : <Clock size={18} />}
        </button>
        {onAddEvent && (
          <button 
            onClick={onAddEvent}
            className="flex items-center justify-center w-7 h-7 text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 rounded-md transition-colors"
            title="Add Event"
          >
            <Plus size={18} />
          </button>
        )}
      </div>
    </div>
  );

  // 60 pixels per hour
  const HOUR_HEIGHT = 60;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col h-[70vh] md:h-[60vh] w-full min-w-0 overflow-hidden">
        {viewMode === 'timeline' ? (
          <>
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
                        px-3 py-2 rounded-lg border-l-4 cursor-pointer hover:opacity-90 transition-opacity flex justify-between items-start shadow-sm gap-2
                        ${getRegionClasses(event.region)}
                      `}
                    >
                      <span className="font-medium text-sm break-words whitespace-normal flex-1">{event.title}</span>
                      {event.recurrence && event.recurrence !== 'none' && (
                        <Repeat size={14} className="opacity-60 shrink-0 mt-0.5" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timed Events Grid */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar relative bg-gray-50/30 rounded-xl border border-gray-100 w-full min-w-0">
              <div className="relative min-h-[1440px] w-full"> {/* 24 hours * 60px */}
                {/* Time markers */}
                {Array.from({ length: 24 }).map((_, i) => (
                  <div 
                    key={i} 
                    className="absolute w-full flex border-t border-gray-100"
                    style={{ top: `${i * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                  >
                    <div className="w-16 shrink-0 text-right pr-3 py-1.5 text-xs text-gray-400 font-medium bg-transparent z-10">
                      {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                    </div>
                    <div className="flex-1 border-l border-gray-100 relative bg-white/50"></div>
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
                          absolute left-1.5 right-2.5 rounded-lg border-l-4 p-2 cursor-pointer hover:opacity-90 transition-all overflow-hidden shadow-sm hover:shadow flex flex-col gap-0.5
                          ${getRegionClasses(event.region)}
                        `}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          zIndex: 20
                        }}
                      >
                        <div className="text-xs font-bold leading-tight break-words whitespace-normal">{event.title}</div>
                        {height >= 40 && (
                          <div className="text-[10px] opacity-80 flex items-center gap-1 mt-auto shrink-0 w-full overflow-hidden">
                            <Clock size={10} className="shrink-0" />
                            <span className="truncate">{formatTime(event.start)} - {formatTime(event.end)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar w-full min-w-0 pr-2">
            {sortedDayEvents.length > 0 ? (
              <div className="flex flex-col gap-3 py-2">
                {sortedDayEvents.map(event => (
                  <div 
                    key={event.id} 
                    onClick={() => { onClose(); onEventClick(event); }}
                    className={`
                      bg-white rounded-xl border-l-4 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col gap-2 
                      ${getRegionClasses(event.region)}
                    `}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <h3 className="font-bold text-gray-900 leading-snug">{event.title}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm font-medium text-gray-700">
                      <div className="flex items-center gap-1.5 bg-white/50 px-2 py-1 rounded-md">
                        <Clock size={14} className="text-gray-500" />
                        <span>
                          {event.isAllDay 
                            ? 'All Day' 
                            : `${formatTime(event.start)} - ${formatTime(event.end)}`}
                        </span>
                      </div>
                      {(event.city || event.region) && (
                        <div className="flex items-center gap-1.5 bg-white/50 px-2 py-1 rounded-md max-w-full">
                          <MapPin size={14} className="text-gray-500 shrink-0" />
                          <span className="truncate">
                            {[event.city, event.region].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 py-10">
                <CalendarIcon size={48} className="text-gray-300 mb-4" />
                <p className="text-lg font-medium text-center">No events for this day</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
