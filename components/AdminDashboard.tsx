
import React, { useEffect, useState } from 'react';
import { CalendarEvent } from '../types';
import { 
    getPendingEvents, 
    getRejectedEvents, 
    getEditedEvents, 
    getPendingDeletedEvents,
    getDeletedEvents,
    getVisitorCount,
    approvePendingEvent, 
    approveEditedEvent, 
    approveDeletedEvent,
    rejectRequest,
    restoreRejectedEvent,
    restoreDeletedEvent,
    hardDeleteEvent,
    hardDeleteRejectedEvent
} from '../lib/firebase';
import { Check, X, MapPin, Calendar as CalendarIcon, Loader2, ArrowRight, RotateCcw, FileText, Clock, Edit3, LayoutList, History, Trash2, AlertCircle, Users, Activity, BarChart2 } from 'lucide-react';
import { formatFriendlyDate, formatTime, getRegionClasses } from '../utils/dateUtils';

type Tab = 'new' | 'edits' | 'pending_deleted' | 'rejected' | 'deleted';

export const AdminDashboard: React.FC = () => {
  const [pendingEvents, setPendingEvents] = useState<CalendarEvent[]>([]);
  const [editedEvents, setEditedEvents] = useState<CalendarEvent[]>([]);
  const [pendingDeletedEvents, setPendingDeletedEvents] = useState<CalendarEvent[]>([]);
  const [rejectedEvents, setRejectedEvents] = useState<CalendarEvent[]>([]);
  const [deletedEvents, setDeletedEvents] = useState<CalendarEvent[]>([]);
  const [visitorCount, setVisitorCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('new');
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [rejectedEventToDelete, setRejectedEventToDelete] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribePending = getPendingEvents((events) => {
      setPendingEvents(events);
      setLoading(false);
    });

    const unsubscribeEdited = getEditedEvents((events) => {
      setEditedEvents(events);
    });

    const unsubscribePendingDeleted = getPendingDeletedEvents((events) => {
      setPendingDeletedEvents(events);
    });
    
    const unsubscribeRejected = getRejectedEvents((events) => {
      setRejectedEvents(events);
    });

    const unsubscribeDeleted = getDeletedEvents((events) => {
      setDeletedEvents(events);
    });

    const unsubscribeVisitors = getVisitorCount((count) => {
      setVisitorCount(count);
    });

    return () => {
        unsubscribePending();
        unsubscribeEdited();
        unsubscribePendingDeleted();
        unsubscribeRejected();
        unsubscribeDeleted();
        unsubscribeVisitors();
    };
  }, []);

  const handleStatusChange = async (event: CalendarEvent, newStatus: 'approved' | 'rejected' | 'pending') => {
    try {
      if (newStatus === 'approved') {
          // Approve new event
          await approvePendingEvent(event);
      } else if (newStatus === 'rejected') {
          // Reject request
          await rejectRequest(event);
      } else if (newStatus === 'pending') {
          // Restore from rejected
          await restoreRejectedEvent(event);
      }
    } catch (e) {
      console.error("Failed to update status", e);
      alert("Failed to update status. Please try again.");
    }
  };

  const handleEditApproval = async (event: CalendarEvent, approved: boolean) => {
      try {
          if (approved) {
              await approveEditedEvent(event);
          } else {
              // Reject the edit request
              await rejectRequest(event);
          }
      } catch (e) {
          console.error("Failed to process edit approval", e);
          alert("Failed to process action. Please try again.");
      }
  };

  const handleDeletionApproval = async (event: CalendarEvent, approved: boolean) => {
      try {
          if (approved) {
              await approveDeletedEvent(event);
          } else {
              // Reject the deletion request
              await rejectRequest(event);
          }
      } catch (e) {
          console.error("Failed to process deletion approval", e);
          alert("Failed to process action. Please try again.");
      }
  };

  const handleRestoreDeleted = async (event: CalendarEvent) => {
      try {
          await restoreDeletedEvent(event);
      } catch (e) {
          console.error("Failed to restore deleted event", e);
          alert("Failed to restore event. Please try again.");
      }
  };

  const handleHardDelete = async (event: CalendarEvent) => {
      try {
          await hardDeleteEvent(event.id);
          setEventToDelete(null);
      } catch (e) {
          console.error("Failed to permanently delete event", e);
          alert("Failed to permanently delete event. Please try again.");
      }
  };

  const handleHardDeleteRejected = async (event: CalendarEvent) => {
      try {
          await hardDeleteRejectedEvent(event.id);
          setRejectedEventToDelete(null);
      } catch (e) {
          console.error("Failed to permanently delete rejected event", e);
          alert("Failed to permanently delete event. Please try again.");
      }
  };

  // Helper to check for changes
  const hasChanges = (event: CalendarEvent) => {
      if (!event.originalData) return {};
      const orig = event.originalData;
      return {
          title: event.title !== orig.title,
          description: (event.description || '') !== (orig.description || ''),
          region: event.region !== orig.region,
          city: event.city !== orig.city,
          time: event.start !== orig.start || event.end !== orig.end || event.isAllDay !== orig.isAllDay,
          recurrence: (event.recurrence || 'none') !== (orig.recurrence || 'none')
      };
  };

  const renderTime = (e: CalendarEvent | undefined) => {
      if (!e) return null;
      return (
        <div className="flex flex-wrap gap-1 items-center flex-1 min-w-0">
            <span className="whitespace-normal break-words">
                {formatFriendlyDate(e.start)}
                {!e.isAllDay && <span className="ml-1.5 font-medium">{formatTime(e.start)}</span>}
            </span>
            <ArrowRight size={12} className="text-gray-400 shrink-0" />
            <span className="whitespace-normal break-words">
                {formatFriendlyDate(e.end)}
                {!e.isAllDay && <span className="ml-1.5 font-medium">{formatTime(e.end)}</span>}
            </span>
        </div>
      );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-full">
      {/* Analytics Overview */}
      <div className="mx-4 md:mx-6 mt-4 md:mt-6 hidden md:flex flex-wrap items-center justify-center gap-2 md:gap-4">
        {/* Visitor Count */}
        <div className="flex items-center gap-2 md:gap-3 text-gray-600 bg-white px-2.5 md:px-4 py-1.5 md:py-3 rounded-lg md:rounded-xl border border-gray-200 shadow-sm w-fit">
          <div className="p-1.5 md:p-2 bg-blue-50 text-blue-600 rounded-md md:rounded-lg">
            <Users className="w-3.5 h-3.5 md:w-5 md:h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] md:text-xs font-semibold uppercase tracking-wider text-gray-500 leading-tight">Unique Visitors</span>
            <span className="text-xs md:text-lg font-bold text-gray-900 leading-none mt-0.5">{visitorCount.toLocaleString()}</span>
          </div>
        </div>

        {/* Current Date */}
        <div className="flex items-center gap-2 md:gap-3 text-gray-600 bg-white px-2.5 md:px-4 py-1.5 md:py-3 rounded-lg md:rounded-xl border border-gray-200 shadow-sm w-fit">
          <div className="p-1.5 md:p-2 bg-emerald-50 text-emerald-600 rounded-md md:rounded-lg">
            <CalendarIcon className="w-3.5 h-3.5 md:w-5 md:h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] md:text-xs font-semibold uppercase tracking-wider text-gray-500 leading-tight">Current Date</span>
            <span className="text-xs md:text-lg font-bold text-gray-900 leading-none mt-0.5">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Placeholder 1 */}
        <div className="flex items-center gap-2 md:gap-3 text-gray-600 bg-white px-2.5 md:px-4 py-1.5 md:py-3 rounded-lg md:rounded-xl border border-gray-200 shadow-sm w-fit opacity-70">
          <div className="p-1.5 md:p-2 bg-purple-50 text-purple-600 rounded-md md:rounded-lg">
            <Activity className="w-3.5 h-3.5 md:w-5 md:h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] md:text-xs font-semibold uppercase tracking-wider text-gray-500 leading-tight">Placeholder</span>
            <span className="text-xs md:text-lg font-bold text-gray-900 leading-none mt-0.5">--</span>
          </div>
        </div>

        {/* Placeholder 2 */}
        <div className="flex items-center gap-2 md:gap-3 text-gray-600 bg-white px-2.5 md:px-4 py-1.5 md:py-3 rounded-lg md:rounded-xl border border-gray-200 shadow-sm w-fit opacity-70">
          <div className="p-1.5 md:p-2 bg-amber-50 text-amber-600 rounded-md md:rounded-lg">
            <BarChart2 className="w-3.5 h-3.5 md:w-5 md:h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] md:text-xs font-semibold uppercase tracking-wider text-gray-500 leading-tight">Placeholder</span>
            <span className="text-xs md:text-lg font-bold text-gray-900 leading-none mt-0.5">--</span>
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex flex-nowrap md:flex-wrap items-center justify-between md:justify-center gap-0.5 md:gap-1 p-0.5 md:p-1 bg-gray-100/80 rounded-xl mb-4 md:mb-6 w-full md:w-fit md:mx-auto mt-2 md:mt-4 shrink-0 transition-colors duration-200 overflow-x-auto custom-scrollbar md:overflow-visible">
        <button
            onClick={() => setActiveTab('new')}
            className={`flex flex-1 md:flex-none items-center justify-center gap-1 sm:gap-2 px-1.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'new' 
                ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5' 
                : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
            }`}
        >
            <LayoutList className={`w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 ${activeTab === 'new' ? 'text-blue-500' : 'text-gray-400'}`} />
            <span className="hidden md:inline">New Requests</span>
            <span className="md:hidden">New</span>
            {pendingEvents.length > 0 && (
                <span className={`text-[9px] sm:text-xs px-1 sm:px-2 py-0.5 rounded-full ${activeTab === 'new' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
                    {pendingEvents.length}
                </span>
            )}
        </button>
        <button
            onClick={() => setActiveTab('edits')}
            className={`flex flex-1 md:flex-none items-center justify-center gap-1 sm:gap-2 px-1.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'edits' 
                ? 'bg-white text-amber-700 shadow-sm ring-1 ring-black/5' 
                : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
            }`}
        >
            <Edit3 className={`w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 ${activeTab === 'edits' ? 'text-amber-500' : 'text-gray-400'}`} />
            <span className="hidden md:inline">Pending Edits</span>
            <span className="md:hidden">Edits</span>
            {editedEvents.length > 0 && (
                <span className={`text-[9px] sm:text-xs px-1 sm:px-2 py-0.5 rounded-full ${activeTab === 'edits' ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-600'}`}>
                    {editedEvents.length}
                </span>
            )}
        </button>
        <button
            onClick={() => setActiveTab('pending_deleted')}
            className={`flex flex-1 md:flex-none items-center justify-center gap-1 sm:gap-2 px-1.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'pending_deleted' 
                ? 'bg-white text-red-700 shadow-sm ring-1 ring-black/5' 
                : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
            }`}
        >
            <Trash2 className={`w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 ${activeTab === 'pending_deleted' ? 'text-red-500' : 'text-gray-400'}`} />
            <span className="hidden md:inline">Pending Deletions</span>
            <span className="md:hidden">Deletes</span>
            {pendingDeletedEvents.length > 0 && (
                <span className={`text-[9px] sm:text-xs px-1 sm:px-2 py-0.5 rounded-full ${activeTab === 'pending_deleted' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'}`}>
                    {pendingDeletedEvents.length}
                </span>
            )}
        </button>
        <button
            onClick={() => setActiveTab('rejected')}
            className={`flex flex-1 md:flex-none items-center justify-center gap-1 sm:gap-2 px-1.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'rejected' 
                ? 'bg-white text-gray-800 shadow-sm ring-1 ring-black/5' 
                : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
            }`}
        >
            <History className={`w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 ${activeTab === 'rejected' ? 'text-gray-800' : 'text-gray-400'}`} />
            <span className="hidden md:inline">Rejected History</span>
            <span className="md:hidden">Rejected</span>
            {rejectedEvents.length > 0 && (
                <span className={`text-[9px] sm:text-xs px-1 sm:px-2 py-0.5 rounded-full ${activeTab === 'rejected' ? 'bg-gray-100 text-gray-800' : 'bg-gray-200 text-gray-600'}`}>
                    {rejectedEvents.length}
                </span>
            )}
        </button>
        <button
            onClick={() => setActiveTab('deleted')}
            className={`flex flex-1 md:flex-none items-center justify-center gap-1 sm:gap-2 px-1.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'deleted' 
                ? 'bg-white text-red-800 shadow-sm ring-1 ring-black/5' 
                : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
            }`}
        >
            <Trash2 className={`w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 ${activeTab === 'deleted' ? 'text-red-800' : 'text-gray-400'}`} />
            <span className="hidden md:inline">Deleted History</span>
            <span className="md:hidden">Deleted</span>
            {deletedEvents.length > 0 && (
                <span className={`text-[9px] sm:text-xs px-1 sm:px-2 py-0.5 rounded-full ${activeTab === 'deleted' ? 'bg-red-100 text-red-800' : 'bg-gray-200 text-gray-600'}`}>
                    {deletedEvents.length}
                </span>
            )}
        </button>
      </div>
      
      {/* Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 md:px-6 pb-20 custom-scrollbar">

        {/* Pending Events (New Requests) Tab */}
        {activeTab === 'new' && (
            <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {pendingEvents.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-300">
                        <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-400">
                            <Check size={32} />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
                        <p className="text-gray-500 mt-1">There are no new events waiting for approval.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {pendingEvents.map((event) => (
                            <div key={event.id} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="space-y-3 flex-1 min-w-0">
                                        <div className="flex items-start justify-between md:justify-start gap-3 flex-wrap">
                                            {event.types && event.types.map(type => (
                                                <span key={type} className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-100 text-blue-800">
                                                    {type}
                                                </span>
                                            ))}
                                            <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold ${getRegionClasses(event.region)}`}>
                                                {event.region}
                                            </span>
                                            {event.city && event.city !== 'Whole Region' && (
                                                <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-800">
                                                    {event.city}
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className="min-w-0 w-full">
                                            <h3 className="text-lg font-bold text-gray-900 leading-tight break-words whitespace-normal">{event.title}</h3>
                                            {event.description && (
                                                <p className="text-gray-600 text-sm mt-1 line-clamp-3 break-words whitespace-normal">{event.description}</p>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-1.5 mt-1 min-w-0">
                                            <div className="flex items-start gap-2 text-sm text-gray-600 min-w-0">
                                                <CalendarIcon size={14} className="shrink-0 text-gray-400 mt-0.5" />
                                                <div className="flex flex-wrap gap-1 items-center flex-1 min-w-0">
                                                    <span className="whitespace-normal break-words">
                                                        {formatFriendlyDate(event.start)}
                                                        {!event.isAllDay && <span className="ml-1.5 font-medium text-gray-900">{formatTime(event.start)}</span>}
                                                    </span>
                                                    <ArrowRight size={12} className="text-gray-400 shrink-0" />
                                                    <span className="whitespace-normal break-words">
                                                        {formatFriendlyDate(event.end)}
                                                        {!event.isAllDay && <span className="ml-1.5 font-medium text-gray-900">{formatTime(event.end)}</span>}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-gray-100 shrink-0">
                                        <button 
                                            onClick={() => handleStatusChange(event, 'rejected')}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 hover:border-red-300 font-medium text-sm transition-colors"
                                        >
                                            <X size={16} />
                                            Reject
                                        </button>
                                        <button 
                                            onClick={() => handleStatusChange(event, 'approved')}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow font-medium text-sm transition-all"
                                        >
                                            <Check size={16} />
                                            Approve
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        )}
      
        {/* Edited Events Tab */}
        {activeTab === 'edits' && (
            <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {editedEvents.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-300">
                        <div className="mx-auto w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4 text-amber-300">
                            <Check size={32} />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No pending edits</h3>
                        <p className="text-gray-500 mt-1">There are no modified events waiting for approval.</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {editedEvents.map((event) => {
                            const changes = hasChanges(event);
                            const original = event.originalData;
                            
                            return (
                                <div key={event.id} className="bg-white rounded-xl border border-amber-200 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400"></div>
                                    
                                    <div className="p-5 flex flex-col gap-4">
                                        {/* Header: Status and Region */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-amber-600 uppercase tracking-wide bg-amber-50 px-2 py-1 rounded">
                                                    Edits for Review
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {event.types && event.types.map(type => (
                                                    <span key={type} className="px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-100 text-blue-800">
                                                        {type}
                                                    </span>
                                                ))}
                                                {changes.region ? (
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className={`px-2 py-0.5 rounded-md font-semibold opacity-50 ${original ? getRegionClasses(original.region) : ''}`}>
                                                            {original?.region}
                                                        </span>
                                                        <ArrowRight size={12} className="text-gray-400" />
                                                        <span className={`px-2 py-0.5 rounded-md font-semibold ring-2 ring-amber-400 ${getRegionClasses(event.region)}`}>
                                                            {event.region}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${getRegionClasses(event.region)}`}>
                                                        {event.region}
                                                    </span>
                                                )}
                                                {changes.city ? (
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="px-2 py-0.5 rounded-md font-semibold opacity-50 bg-gray-100 text-gray-800">
                                                            {original?.city || 'Whole Region'}
                                                        </span>
                                                        <ArrowRight size={12} className="text-gray-400" />
                                                        <span className="px-2 py-0.5 rounded-md font-semibold ring-2 ring-amber-400 bg-gray-100 text-gray-800">
                                                            {event.city || 'Whole Region'}
                                                        </span>
                                                    </div>
                                                ) : event.city && event.city !== 'Whole Region' ? (
                                                    <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-800">
                                                        {event.city}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>

                                        {/* Title Diff */}
                                        <div className="min-w-0">
                                            {changes.title ? (
                                                <div className="space-y-1 min-w-0">
                                                    <div className="flex items-start gap-2 min-w-0">
                                                        <h3 className="text-lg font-bold text-gray-900 leading-tight bg-green-50 px-1 rounded -ml-1 border border-green-100 break-words whitespace-normal">
                                                            {event.title}
                                                        </h3>
                                                    </div>
                                                    <p className="text-sm text-red-400 flex items-start flex-col sm:flex-row sm:items-center gap-1 min-w-0">
                                                        <span className="text-xs font-medium uppercase text-red-300 mr-1 shrink-0">Was:</span>
                                                        <span className="break-words whitespace-normal">{original?.title}</span>
                                                    </p>
                                                </div>
                                            ) : (
                                                <h3 className="text-lg font-bold text-gray-900 leading-tight break-words whitespace-normal">{event.title}</h3>
                                            )}
                                        </div>

                                        <div className="space-y-3">
                                            {/* Description Diff */}
                                            <div className={`p-3 rounded-lg ${changes.description ? 'bg-amber-50/50 border border-amber-100' : 'bg-gray-50'}`}>
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <FileText size={14} className="text-gray-400" />
                                                    <span className="text-xs font-semibold text-gray-500 uppercase">Description</span>
                                                    {changes.description && <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 rounded">MODIFIED</span>}
                                                </div>
                                                {changes.description ? (
                                                    <div className="space-y-2 text-sm">
                                                        <div className="text-gray-900 break-words whitespace-normal">{event.description || <span className="italic text-gray-400">No description</span>}</div>
                                                        <div className="pt-2 border-t border-amber-100 text-red-400 text-xs">
                                                            <span className="font-semibold uppercase text-red-300 mr-1">Previous:</span>
                                                            <span className="opacity-70 break-words whitespace-normal">{original?.description || 'No description'}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-600 line-clamp-3 break-words whitespace-normal">{event.description || <span className="italic text-gray-400">No description</span>}</p>
                                                )}
                                            </div>

                                            {/* Time Diff */}
                                            <div className={`p-3 rounded-lg ${changes.time ? 'bg-amber-50/50 border border-amber-100' : 'bg-gray-50'}`}>
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <Clock size={14} className="text-gray-400" />
                                                    <span className="text-xs font-semibold text-gray-500 uppercase">Date & Time</span>
                                                    {changes.time && <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 rounded">MODIFIED</span>}
                                                </div>
                                                {changes.time ? (
                                                    <div className="space-y-2 text-sm">
                                                        <div className="text-gray-900 font-medium">
                                                            {renderTime(event)}
                                                        </div>
                                                        <div className="pt-2 border-t border-amber-100 text-red-400 text-xs flex items-center gap-2">
                                                            <span className="font-semibold uppercase text-red-300 shrink-0">Was:</span>
                                                            <span className="opacity-70 flex flex-wrap gap-1">
                                                                {original && renderTime(original)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-sm text-gray-600">
                                                        {renderTime(event)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions Footer */}
                                    <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
                                        <button 
                                            onClick={() => handleEditApproval(event, false)}
                                            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 hover:text-red-600 hover:border-red-200 font-medium text-sm transition-colors w-full sm:w-auto"
                                        >
                                            <RotateCcw size={16} />
                                            Reject Changes
                                        </button>
                                        <button 
                                            onClick={() => handleEditApproval(event, true)}
                                            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 shadow-sm hover:shadow font-medium text-sm transition-all w-full sm:w-auto"
                                        >
                                            <Check size={16} />
                                            Approve Changes
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        )}

        {/* Pending Deleted Events Tab */}
        {activeTab === 'pending_deleted' && (
            <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {pendingDeletedEvents.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-300">
                        <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-300">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No pending deletions</h3>
                        <p className="text-gray-500 mt-1">There are no deletion requests waiting for approval.</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {pendingDeletedEvents.map((event) => {
                            return (
                                <div key={event.id} className="bg-white rounded-xl border border-red-200 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-red-400"></div>
                                    
                                    <div className="p-5 flex flex-col gap-4">
                                        {/* Header: Status and Region */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-red-600 uppercase tracking-wide bg-red-50 px-2 py-1 rounded">
                                                    Deletion Request
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {event.types && event.types.map(type => (
                                                    <span key={type} className="px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-100 text-blue-800">
                                                        {type}
                                                    </span>
                                                ))}
                                                <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${getRegionClasses(event.region)}`}>
                                                    {event.region}
                                                </span>
                                                {event.city && event.city !== 'Whole Region' && (
                                                    <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-800">
                                                        {event.city}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Title */}
                                        <div className="min-w-0">
                                            <h3 className="text-lg font-bold text-gray-900 leading-tight break-words whitespace-normal">{event.title}</h3>
                                        </div>

                                        <div className="space-y-3">
                                            {/* Description */}
                                            <div className="p-3 rounded-lg bg-gray-50">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <FileText size={14} className="text-gray-400" />
                                                    <span className="text-xs font-semibold text-gray-500 uppercase">Description</span>
                                                </div>
                                                <p className="text-sm text-gray-600 line-clamp-3 break-words whitespace-normal">{event.description || <span className="italic text-gray-400">No description</span>}</p>
                                            </div>

                                            {/* Time */}
                                            <div className="p-3 rounded-lg bg-gray-50">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <Clock size={14} className="text-gray-400" />
                                                    <span className="text-xs font-semibold text-gray-500 uppercase">Date & Time</span>
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    {renderTime(event)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions Footer */}
                                    <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
                                        <button 
                                            onClick={() => handleDeletionApproval(event, false)}
                                            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 hover:text-red-600 hover:border-red-200 font-medium text-sm transition-colors w-full sm:w-auto"
                                        >
                                            <RotateCcw size={16} />
                                            Reject Deletion
                                        </button>
                                        <button 
                                            onClick={() => handleDeletionApproval(event, true)}
                                            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow font-medium text-sm transition-all w-full sm:w-auto"
                                        >
                                            <Trash2 size={16} />
                                            Approve Deletion
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        )}

        {/* Rejected Events Tab */}
        {activeTab === 'rejected' && (
            <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {rejectedEvents.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-300">
                        <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-400">
                            <History size={32} />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No rejected events</h3>
                        <p className="text-gray-500 mt-1">Rejected events history will appear here.</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {rejectedEvents.map((event) => (
                            <div key={event.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 opacity-80 hover:opacity-100 transition-all">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div className="space-y-1 flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            {event.types && event.types.map(type => (
                                                <span key={type} className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded uppercase tracking-wider">
                                                    {type}
                                                </span>
                                            ))}
                                            {(event as any).originalPendingStatus === 'deleted' ? (
                                                <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded uppercase tracking-wider">
                                                    Rejected Deletion
                                                </span>
                                            ) : event.originalData ? (
                                                <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded uppercase tracking-wider">
                                                    Rejected Edit
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded uppercase tracking-wider">
                                                    Rejected Proposal
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="font-semibold text-gray-700 break-words whitespace-normal">{event.title}</h3>
                                        <p className="text-xs text-gray-500 break-words whitespace-normal">
                                            {formatFriendlyDate(event.start)} • {event.region}
                                        </p>
                                    </div>
                                    {rejectedEventToDelete === event.id ? (
                                        <div className="flex flex-col sm:flex-row items-center justify-between w-full md:w-auto animate-in fade-in slide-in-from-left-2 bg-red-50 p-3 rounded-lg border border-red-100 gap-3 mt-4 md:mt-0 shrink-0">
                                            <span className="text-sm font-semibold text-red-700 flex items-center gap-2">
                                                <AlertCircle size={16} />
                                                Permanently delete?
                                            </span>
                                            <div className="flex gap-2 w-full sm:w-auto">
                                                <button 
                                                    onClick={() => setRejectedEventToDelete(null)}
                                                    className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-md transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    onClick={() => handleHardDeleteRejected(event)}
                                                    className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors shadow-sm"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                onClick={() => handleStatusChange(event, 'pending')}
                                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-md transition-all shadow-sm"
                                            >
                                                <RotateCcw size={14} />
                                                Restore
                                            </button>
                                            <button
                                                onClick={() => setRejectedEventToDelete(event.id)}
                                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-gray-200 hover:border-red-300 hover:bg-red-50 rounded-md transition-all shadow-sm"
                                            >
                                                <Trash2 size={14} />
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        )}

        {/* Deleted Events Tab */}
        {activeTab === 'deleted' && (
            <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {deletedEvents.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-300">
                        <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-400">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No deleted events</h3>
                        <p className="text-gray-500 mt-1">Deleted events history will appear here.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {[...deletedEvents]
                            .sort((a, b) => {
                                const dateA = (a as any).deletedAt?.toMillis?.() || new Date(a.start).getTime();
                                const dateB = (b as any).deletedAt?.toMillis?.() || new Date(b.start).getTime();
                                return dateB - dateA;
                            })
                            .map((event) => (
                            <div key={event.id} className="bg-white rounded-xl p-5 border border-red-200 shadow-sm opacity-80 hover:opacity-100 transition-all overflow-hidden">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="space-y-3 flex-1 min-w-0">
                                        <div className="flex items-start justify-between md:justify-start gap-3 flex-wrap">
                                            {event.types && event.types.map(type => (
                                                <span key={type} className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-100 text-blue-800">
                                                    {type}
                                                </span>
                                            ))}
                                            <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold ${getRegionClasses(event.region)}`}>
                                                {event.region}
                                            </span>
                                            {event.city && event.city !== 'Whole Region' && (
                                                <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-800">
                                                    {event.city}
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className="min-w-0 w-full">
                                            <h3 className="text-lg font-bold text-gray-900 leading-tight break-words whitespace-normal">{event.title}</h3>
                                            {event.description && (
                                                <p className="text-gray-600 text-sm mt-1 line-clamp-3 break-words whitespace-normal">{event.description}</p>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-1.5 mt-1 min-w-0">
                                            <div className="flex items-start gap-2 text-sm text-gray-600 min-w-0">
                                                <CalendarIcon size={14} className="shrink-0 text-gray-400 mt-0.5" />
                                                <div className="flex flex-wrap gap-1 items-center flex-1 min-w-0">
                                                    <span className="whitespace-normal break-words">
                                                        {formatFriendlyDate(event.start)}
                                                        {!event.isAllDay && <span className="ml-1.5 font-medium text-gray-900">{formatTime(event.start)}</span>}
                                                    </span>
                                                    <ArrowRight size={12} className="text-gray-400 shrink-0" />
                                                    <span className="whitespace-normal break-words">
                                                        {formatFriendlyDate(event.end)}
                                                        {!event.isAllDay && <span className="ml-1.5 font-medium text-gray-900">{formatTime(event.end)}</span>}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {eventToDelete === event.id ? (
                                        <div className="flex flex-col sm:flex-row items-center justify-between w-full md:w-auto animate-in fade-in slide-in-from-left-2 bg-red-50 p-3 rounded-lg border border-red-100 gap-3 mt-4 md:mt-0 shrink-0">
                                            <span className="text-sm font-semibold text-red-700 flex items-center gap-2">
                                                <AlertCircle size={16} />
                                                Permanently delete?
                                            </span>
                                            <div className="flex gap-2 w-full sm:w-auto">
                                                <button 
                                                    onClick={() => setEventToDelete(null)}
                                                    className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-md transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    onClick={() => handleHardDelete(event)}
                                                    className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors shadow-sm"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-gray-100 shrink-0">
                                            <button
                                                onClick={() => handleRestoreDeleted(event)}
                                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                            >
                                                <RotateCcw size={16} />
                                                Restore
                                            </button>
                                            <button
                                                onClick={() => setEventToDelete(event.id)}
                                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        )}
      </div>
    </div>
  );
};
