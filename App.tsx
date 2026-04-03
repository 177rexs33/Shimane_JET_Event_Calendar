
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Repeat, ShieldCheck, LayoutDashboard, Filter, ChevronDown, LogOut, Clock, Menu } from 'lucide-react';
import { CalendarEvent, Region } from './types';
import { 
    generateCalendarGrid, 
    MONTH_NAMES, 
    WEEK_DAYS, 
    isSameDay, 
    isEventActiveOnDate,
    formatTime,
    getRegionClasses 
} from './utils/dateUtils';
import { EventModal } from './components/EventModal';
import { MonthYearSelector } from './components/MonthYearSelector';
import { AdminDashboard } from './components/AdminDashboard';
import { LoginModal } from './components/LoginModal';
import { PendingRequestsModal } from './components/PendingRequestsModal';
import { getEvents, addEvent, updateEvent, softDeleteEvent, auth, onAuthStateChanged, signOut } from './lib/firebase';

export const App: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<Region | 'All'>('All');
  
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isPendingRequestsModalOpen, setIsPendingRequestsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [view, setView] = useState<'calendar' | 'admin'>('calendar');
  const [isAdminSession, setIsAdminSession] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const monthPickerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      const isIpUser = user?.email?.endsWith('@anonymous-ip.local');
      const isAdmin = !!user && !user.isAnonymous && !isIpUser;

      setIsAuthReady(!!user);
      setIsAdminSession(isAdmin);

      if (!isAdmin) {
        setView((prevView) => prevView === 'admin' ? 'calendar' : prevView);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    // Subscribe to Firebase updates from the 'events' collection only
    const unsubscribe = getEvents((fetchedEvents) => {
        setEvents(fetchedEvents);
    });

    return () => unsubscribe();
  }, [isAuthReady]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(event.target as Node)) {
        setIsMonthPickerOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMonthPickerOpen || isMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMonthPickerOpen, isMenuOpen]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleJumpToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedEvent(null);
    setIsEventModalOpen(true);
  };

  const handleEventClick = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setSelectedDate(new Date(event.start));
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async (event: CalendarEvent) => {
    // Check if we are updating an existing event
    const isUpdate = !!selectedEvent || events.some(e => e.id === event.id);

    // Prepare the event data based on session type
    const finalEvent = { ...event };

    if (isAdminSession) {
        // Admins: Direct approval and update
        finalEvent.status = 'approved';
        // Cleanup snapshot data as it's not needed for direct updates
        if (finalEvent.originalData) {
            delete finalEvent.originalData;
        }
    } 
    // Non-Admins: status is already set to 'pending' or 'edited' by EventModal

    if (isUpdate) {
        // This will route to 'pending_events' if status is 'edited', or update 'events' if 'approved'
        await updateEvent(finalEvent);
    } else {
        // This will route to 'pending_events' if status is 'pending', or add to 'events' if 'approved'
        const { id, ...eventData } = finalEvent;
        await addEvent(eventData);
    }
  };

  const handleDeleteEvent = async (event: CalendarEvent) => {
    try {
        await softDeleteEvent(event);
        setIsEventModalOpen(false);
        setSelectedEvent(null);
    } catch (error) {
        console.error("Failed to delete event", error);
        alert("Failed to delete event. Please try again.");
    }
  };
  
  const handleAdminAccess = () => {
      if (isAdminSession) {
          setView('admin');
      } else {
          setIsLoginModalOpen(true);
      }
  };

  const handleLoginSuccess = () => {
      setIsAdminSession(true);
      setIsLoginModalOpen(false);
      setView('admin');
  };

  const handleLogout = () => {
      setIsAuthReady(false);
      setIsAdminSession(false);
      setView('calendar');
      setTimeout(async () => {
          try {
              await signOut(auth);
          } catch (error) {
              console.error("Error signing out: ", error);
          }
      }, 0);
  };

  const gridData = generateCalendarGrid(currentDate);
  
  // Filter events for the calendar view (only show approved events and match region filter)
  // Note: 'events' state comes strictly from the 'events' collection
  const approvedEvents = events.filter(e => {
      const isApproved = e.status === 'approved';
      const matchesRegion = selectedRegionFilter === 'All' || e.region === selectedRegionFilter;
      return isApproved && matchesRegion;
  });

  return (
    <div className="h-[100dvh] overflow-hidden flex flex-col bg-gray-50 text-gray-900 font-sans">
      <div className="flex-none z-30 flex flex-col shadow-sm">
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-2 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <a 
                href="https://shimaneparesources.wordpress.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block hover:opacity-80 transition-opacity cursor-pointer flex items-center"
                title="Visit Shimane PA Resources"
            >
                <img 
                    src="https://github.com/user-attachments/assets/c39f0492-fddb-4772-9774-2ca0ae1d1f39" 
                    alt="Shimane PA Logo" 
                    className="h-10 w-auto object-contain"
                    referrerPolicy="no-referrer"
                />
            </a>
            <h1 
                className="text-lg font-bold tracking-tight text-gray-800 cursor-pointer"
                onClick={() => setView('calendar')}
            >
                Shimane JET Event Calendar
            </h1>
        </div>

        {view === 'calendar' && (
            <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2 sm:gap-4 bg-gray-100/50 p-1.5 rounded-2xl border border-gray-200/50 w-full sm:w-auto justify-center">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-white rounded-xl text-gray-600 transition-all shadow-sm hover:shadow-md">
                        <ChevronLeft size={20} />
                    </button>
                    <div className="relative" ref={monthPickerRef}>
                        <button onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)} className="px-2 sm:px-3 py-1 hover:bg-white rounded-xl text-gray-800 transition-all shadow-sm hover:shadow-md border border-transparent hover:border-gray-200 w-[120px] sm:w-[180px] min-h-[48px] flex items-center justify-center">
                            <span className="text-base sm:text-lg font-semibold select-none text-center leading-tight flex flex-wrap justify-center items-center gap-x-1">
                                <span>{MONTH_NAMES[currentDate.getMonth()]}</span>
                                <span>{currentDate.getFullYear()}</span>
                            </span>
                        </button>
                        {isMonthPickerOpen && (
                            <MonthYearSelector 
                                currentDate={currentDate} 
                                onChange={(date) => { setCurrentDate(date); setIsMonthPickerOpen(false); }}
                                onClose={() => setIsMonthPickerOpen(false)}
                            />
                        )}
                    </div>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-white rounded-xl text-gray-600 transition-all shadow-sm hover:shadow-md">
                        <ChevronRight size={20} />
                    </button>
                </div>
                <button onClick={handleJumpToToday} className="px-4 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors border border-transparent hover:border-gray-200">
                    Today
                </button>
            </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 w-full md:w-auto">
            {view === 'calendar' ? (
                <>
                    {/* Region Filter */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                            <Filter size={14} />
                        </div>
                        <select
                            value={selectedRegionFilter}
                            onChange={(e) => setSelectedRegionFilter(e.target.value as Region | 'All')}
                            className="pl-8 pr-8 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer shadow-sm transition-all h-[38px] min-w-[150px]"
                        >
                            <option value="All">All Regions</option>
                            {Object.values(Region).map((r) => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-gray-400">
                            <ChevronDown size={14} />
                        </div>
                    </div>

                    <button onClick={() => { setSelectedDate(null); setSelectedEvent(null); setIsEventModalOpen(true); }} className="flex items-center justify-center p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-100 hover:shadow-lg">
                        <Plus size={20} />
                    </button>

                    {isAdminSession ? (
                        <button 
                            onClick={() => setView('admin')}
                            className="flex items-center justify-center p-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all shadow-sm hover:shadow-md"
                            title="Admin Dashboard"
                        >
                            <ShieldCheck size={20} />
                        </button>
                    ) : (
                        <div className="relative" ref={menuRef}>
                            <button 
                                onClick={() => setIsMenuOpen(!isMenuOpen)} 
                                className="flex items-center justify-center p-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all shadow-sm hover:shadow-md"
                                title="Menu"
                            >
                                <Menu size={20} />
                            </button>
                            
                            {isMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                                    <button 
                                        onClick={() => { setIsPendingRequestsModalOpen(true); setIsMenuOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors"
                                    >
                                        <Clock size={16} />
                                        Pending Requests
                                    </button>
                                    <button 
                                        onClick={() => { handleAdminAccess(); setIsMenuOpen(false); }} 
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        <ShieldCheck size={16} />
                                        Admin Login
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </>
            ) : (
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <LogOut size={18} />
                        <span className="hidden sm:inline">Log Out</span>
                    </button>
                    <button 
                        onClick={() => setView('calendar')} 
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 bg-white"
                    >
                        <LayoutDashboard size={18} />
                        Back to Calendar
                    </button>
                </div>
            )}
          </div>
        </header>
        {isAdminSession && view === 'calendar' && (
            <div className="bg-gray-900 text-white px-6 py-2 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                    <div className="p-1 bg-gray-800 rounded-md border border-gray-700">
                        <ShieldCheck size={16} className="text-emerald-400" />
                    </div>
                    <h3 className="text-sm font-bold text-white">Admin Session Active</h3>
                </div>
                <button 
                    onClick={handleLogout}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-1 text-xs font-semibold text-red-300 bg-red-950/30 hover:bg-red-950/50 border border-red-900/50 rounded-md transition-colors"
                >
                    <LogOut size={14} />
                    Log Out
                </button>
            </div>
        )}
      </div>

      <main className="flex-1 overflow-hidden flex flex-col relative">
        {view === 'admin' && isAdminSession ? (
            <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden"><AdminDashboard /></div>
        ) : view === 'admin' ? (
             <div className="flex items-center justify-center h-full p-4 md:p-6">
                 <p className="text-gray-500">Please log in to view the dashboard.</p>
             </div>
        ) : (
            <>
                <div className="w-full flex-1 flex flex-col overflow-auto">
                    <div className="min-w-[700px] flex flex-col h-full px-4 md:px-6 pb-8">
                        <div className="grid grid-cols-7 mb-4 sticky top-0 z-20 bg-gray-50 py-3 -mx-4 px-4 md:-mx-6 md:px-6 shadow-sm border-b border-gray-200/50 backdrop-blur-sm bg-gray-50/90">
                            {WEEK_DAYS.map(day => (
                                <div key={day} className="text-center text-sm font-semibold text-gray-500 uppercase tracking-wider">{day}</div>
                            ))}
                        </div>

                        <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-2 md:gap-4 min-h-[750px]">
                            {gridData.map((cell, index) => {
                                const isToday = isSameDay(cell.date, new Date());
                                const dayEvents = approvedEvents.filter(e => isEventActiveOnDate(cell.date, e))
                                                        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

                                return (
                                    <div 
                                        key={index} 
                                        className={`
                                            relative bg-white rounded-2xl p-2 border border-gray-100 
                                            transition-all hover:shadow-md flex flex-col gap-1 overflow-hidden group
                                            ${!cell.isCurrentMonth ? 'bg-gray-50/50 text-gray-400' : 'text-gray-700'}
                                            ${isToday ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                                        `}
                                    >
                                        <div className="flex justify-between items-start">
                                            <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : ''}`}>
                                                {cell.date.getDate()}
                                            </span>
                                        </div>

                                        <div className="flex-1 flex flex-col gap-1 overflow-y-auto overflow-x-hidden custom-scrollbar mt-1">
                                            {dayEvents.map(event => (
                                                <div 
                                                    key={event.id}
                                                    data-id={event.id}
                                                    onClick={(e) => handleEventClick(e, event)}
                                                    className={`
                                                        text-xs px-2 py-1 rounded-md font-medium border-l-2 hover:opacity-90 cursor-pointer flex items-center gap-1 overflow-hidden
                                                        ${getRegionClasses(event.region)}
                                                    `}
                                                    title={`${event.title} (${event.isAllDay ? 'All Day' : formatTime(event.start)})${event.recurrence !== 'none' ? ' - Repeats ' + event.recurrence : ''}`}
                                                >
                                                    {event.isAllDay ? <span className="opacity-75 text-[10px] shrink-0 whitespace-nowrap font-semibold">All day</span> : <span className="opacity-75 text-[10px] shrink-0 whitespace-nowrap">{formatTime(event.start)}</span>}
                                                    <span className="truncate flex-1">{event.title}</span>
                                                    {event.recurrence && event.recurrence !== 'none' && (
                                                        <Repeat size={10} className="shrink-0 opacity-60" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        
                                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
                                            <button onClick={(e) => { e.stopPropagation(); handleDateClick(cell.date); }} className="bg-gray-100 p-1 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer">
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </>
        )}
      </main>

      <EventModal 
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        initialDate={selectedDate}
        existingEvent={selectedEvent}
        isAdmin={isAdminSession}
      />
      
      <LoginModal 
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <PendingRequestsModal
        isOpen={isPendingRequestsModalOpen}
        onClose={() => setIsPendingRequestsModalOpen(false)}
      />
    </div>
  );
};