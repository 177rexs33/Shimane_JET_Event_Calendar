import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { CalendarEvent } from '../types';
import { getPendingEvents, getEditedEvents, getPendingDeletedEvents } from '../lib/firebase';
import { Clock, Edit3, Trash2, Calendar as CalendarIcon, MapPin, Loader2 } from 'lucide-react';
import { formatTime, getRegionClasses } from '../utils/dateUtils';

interface PendingRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PendingRequestsModal: React.FC<PendingRequestsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'edited' | 'deleted'>('pending');
  const [pendingEvents, setPendingEvents] = useState<CalendarEvent[]>([]);
  const [editedEvents, setEditedEvents] = useState<CalendarEvent[]>([]);
  const [deletedEvents, setDeletedEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    
    setLoading(true);
    let pendingLoaded = false;
    let editedLoaded = false;
    let deletedLoaded = false;

    const checkLoading = () => {
      if (pendingLoaded && editedLoaded && deletedLoaded) {
        setLoading(false);
      }
    };

    const unsubPending = getPendingEvents((events) => {
      setPendingEvents(events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()));
      pendingLoaded = true;
      checkLoading();
    });

    const unsubEdited = getEditedEvents((events) => {
      setEditedEvents(events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()));
      editedLoaded = true;
      checkLoading();
    });

    const unsubDeleted = getPendingDeletedEvents((events) => {
      setDeletedEvents(events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()));
      deletedLoaded = true;
      checkLoading();
    });

    return () => {
      unsubPending();
      unsubEdited();
      unsubDeleted();
    };
  }, [isOpen]);

  const renderEventCard = (event: CalendarEvent) => (
    <div key={event.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2 gap-4">
        <h4 className="font-semibold text-gray-800 truncate max-w-full min-w-0">{event.title}</h4>
        <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
          {event.types && event.types.map(type => (
            <span key={type} className="text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-800">
              {type}
            </span>
          ))}
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRegionClasses(event.region)}`}>
            {event.region}
          </span>
          {event.city && event.city !== 'Whole Region' && (
            <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-800">
              {event.city}
            </span>
          )}
        </div>
      </div>
      
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <CalendarIcon size={14} className="text-gray-400" />
          <span>
            {new Date(event.start).toLocaleDateString()}
            {!event.isAllDay && ` • ${formatTime(event.start)} - ${formatTime(event.end)}`}
            {event.isAllDay && ' • All Day'}
          </span>
        </div>
      </div>

      {event.description && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-sm text-gray-600 line-clamp-2">{event.description}</p>
        </div>
      )}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pending Requests">
      <div className="flex flex-col h-full">
        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg mb-4 shrink-0">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              activeTab === 'pending'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
            }`}
          >
            <Clock size={16} />
            New Events
            {pendingEvents.length > 0 && (
              <span className="bg-blue-100 text-blue-600 py-0.5 px-2 rounded-full text-xs">
                {pendingEvents.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('edited')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              activeTab === 'edited'
                ? 'bg-white text-amber-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
            }`}
          >
            <Edit3 size={16} />
            Edits
            {editedEvents.length > 0 && (
              <span className="bg-amber-100 text-amber-600 py-0.5 px-2 rounded-full text-xs">
                {editedEvents.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('deleted')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              activeTab === 'deleted'
                ? 'bg-white text-red-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
            }`}
          >
            <Trash2 size={16} />
            Deletions
            {deletedEvents.length > 0 && (
              <span className="bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs">
                {deletedEvents.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 py-12">
              <Loader2 size={24} className="animate-spin text-blue-500" />
              <p>Loading requests...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTab === 'pending' ? (
                pendingEvents.length > 0 ? (
                  pendingEvents.map(renderEventCard)
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Clock size={32} className="mx-auto mb-3 opacity-20" />
                    <p>No new event requests pending.</p>
                  </div>
                )
              ) : activeTab === 'edited' ? (
                editedEvents.length > 0 ? (
                  editedEvents.map(renderEventCard)
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Edit3 size={32} className="mx-auto mb-3 opacity-20" />
                    <p>No edit requests pending.</p>
                  </div>
                )
              ) : (
                deletedEvents.length > 0 ? (
                  deletedEvents.map(renderEventCard)
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Trash2 size={32} className="mx-auto mb-3 opacity-20" />
                    <p>No deletion requests pending.</p>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
