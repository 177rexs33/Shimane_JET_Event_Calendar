import React, { useState, useMemo } from 'react';
import { Search, X, Calendar as CalendarIcon, MapPin, ArrowRight } from 'lucide-react';
import { CalendarEvent } from '../types';
import { Modal } from './Modal';
import { getRegionClasses, formatFriendlyDate, formatTime, sortEventTypes } from '../utils/dateUtils';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, events, onEventClick }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    return events.filter(event => 
      event.status === 'approved' && 
      event.title.toLowerCase().includes(query)
    );
  }, [events, searchQuery]);

  const renderTime = (e: CalendarEvent | undefined) => {
      if (!e) return null;
      return (
        <div className="flex flex-wrap gap-2 items-center">
            <span className="whitespace-nowrap">
                {formatFriendlyDate(e.start)}
                {!e.isAllDay && <span className="ml-1.5 font-medium">{formatTime(e.start)}</span>}
            </span>
            <ArrowRight size={12} className="text-gray-400" />
            <span className="whitespace-nowrap">
                {formatFriendlyDate(e.end)}
                {!e.isAllDay && <span className="ml-1.5 font-medium">{formatTime(e.end)}</span>}
            </span>
        </div>
      );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Search Events">
      <div className="flex flex-col h-full max-h-[70vh]">
        <div className="relative mb-4 shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Search by event title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {!searchQuery.trim() ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 py-12">
              <Search size={32} className="opacity-20" />
              <p>Type to search events</p>
            </div>
          ) : filteredEvents.length > 0 ? (
            <div className="space-y-3">
              {filteredEvents.map(event => (
                <div 
                  key={event.id} 
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group"
                  onClick={() => {
                    onEventClick(event);
                    onClose();
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{event.title}</h3>
                    <div className="flex gap-1">
                      {sortEventTypes(event.types).map(type => (
                        <span key={type} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-100 text-blue-800">
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1.5 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <CalendarIcon size={14} className="text-gray-400" />
                      <span>{renderTime(event)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-gray-400" />
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${getRegionClasses(event.region)}`}>
                          {event.region}
                        </span>
                        {event.city && event.city !== 'Whole Region' && (
                          <span className="text-xs">{event.city}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 py-12">
              <Search size={32} className="opacity-20" />
              <p>No events found matching "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
