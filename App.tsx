
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Repeat, ShieldCheck, LayoutDashboard, Filter, LogOut, Clock, Menu, ShieldAlert, HelpCircle, List, Calendar as CalendarIcon } from 'lucide-react';
import { CalendarEvent, Region, REGION_CITIES, EventCategory } from './types';
import { 
    generateCalendarGrid, 
    MONTH_NAMES, 
    WEEK_DAYS, 
    isSameDay, 
    isEventActiveOnDate,
    formatTime,
    getRegionClasses,
    getEnglishHolidayName
} from './utils/dateUtils';
import { EventModal } from './components/EventModal';
import { MonthYearSelector } from './components/MonthYearSelector';
import { AdminDashboard } from './components/AdminDashboard';
import { LoginModal } from './components/LoginModal';
import { PendingRequestsModal } from './components/PendingRequestsModal';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { ContactModal } from './components/ContactModal';
import { getEvents, addEvent, updateEvent, softDeleteEvent, auth, onAuthStateChanged, signOut } from './lib/firebase';

export const App: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isEventView, setIsEventView] = useState(window.innerWidth < 768);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<Region | 'All'>('All');
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('Whole Region');
  const [selectedTypeFilters, setSelectedTypeFilters] = useState<EventCategory[]>([]);
  const [showNationalHolidays, setShowNationalHolidays] = useState(true);
  
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isPendingRequestsModalOpen, setIsPendingRequestsModalOpen] = useState(false);
  const [isPrivacyPolicyModalOpen, setIsPrivacyPolicyModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  
  const [view, setView] = useState<'calendar' | 'admin'>('calendar');
  const [isAdminSession, setIsAdminSession] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [holidays, setHolidays] = useState<Record<string, string>>({});
  const [scrollbarWidth, setScrollbarWidth] = useState(0);
  
  const monthPickerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  useEffect(() => {
    const updateScrollbarWidth = () => {
      if (scrollContainerRef.current) {
        const width = scrollContainerRef.current.offsetWidth - scrollContainerRef.current.clientWidth;
        setScrollbarWidth(width);
      }
    };

    updateScrollbarWidth();
    window.addEventListener('resize', updateScrollbarWidth);
    
    let observer: ResizeObserver | null = null;
    if (scrollContainerRef.current) {
      observer = new ResizeObserver(updateScrollbarWidth);
      observer.observe(scrollContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateScrollbarWidth);
      if (observer) observer.disconnect();
    };
  }, [view, currentDate]);

  useEffect(() => {
    fetch('https://holidays-jp.github.io/api/v1/date.json')
      .then(res => res.json())
      .then(data => setHolidays(data))
      .catch(err => console.error('Failed to fetch holidays:', err));
  }, []);

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
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    };
    if (isMonthPickerOpen || isMenuOpen || isFilterMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMonthPickerOpen, isMenuOpen, isFilterMenuOpen]);

  useEffect(() => {
    if (isEventView && view !== 'admin' && events.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const gridData = generateCalendarGrid(currentDate);
      const approvedEvents = events.filter(e => {
          const isApproved = e.status === 'approved';
          const matchesRegion = selectedRegionFilter === 'All' || e.region === selectedRegionFilter;
          const matchesCity = selectedCityFilter === 'Whole Region' || e.city === selectedCityFilter || e.city === 'Whole Region';
          const matchesType = selectedTypeFilters.length === 0 || (e.types && selectedTypeFilters.every(filter => e.types!.includes(filter)));
          return isApproved && matchesRegion && matchesCity && matchesType;
      });

      const daysWithEvents = gridData.filter(cell => {
        if (!cell.isCurrentMonth) return false;
        const dayEvents = approvedEvents.filter(e => isEventActiveOnDate(cell.date, e));
        return dayEvents.length > 0;
      });
      
      const upcomingDay = daysWithEvents.find(cell => {
        const cellDate = new Date(cell.date);
        cellDate.setHours(0, 0, 0, 0);
        return cellDate.getTime() >= today.getTime();
      });
      
      if (upcomingDay) {
        const year = upcomingDay.date.getFullYear();
        const month = String(upcomingDay.date.getMonth() + 1).padStart(2, '0');
        const day = String(upcomingDay.date.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        
        setTimeout(() => {
          const element = document.getElementById(`event-day-${dateString}`);
          if (element && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const elementRect = element.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            
            // Only scroll if the element is not already visible at the top
            if (elementRect.top < containerRect.top || elementRect.top > containerRect.bottom) {
                container.scrollTop += (elementRect.top - containerRect.top) - 16;
            }
          }
        }, 100);
      }
    }
  }, [isEventView, view, currentDate, events.length, selectedRegionFilter, selectedCityFilter, selectedTypeFilters]);

  useEffect(() => {
    if (!isEventView && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [isEventView]);

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
      const matchesCity = selectedCityFilter === 'Whole Region' || e.city === selectedCityFilter || e.city === 'Whole Region';
      const matchesType = selectedTypeFilters.length === 0 || (e.types && selectedTypeFilters.every(filter => e.types!.includes(filter)));
      return isApproved && matchesRegion && matchesCity && matchesType;
  });

  const renderEventView = () => {
    const daysWithEvents = gridData.filter(cell => {
      if (!cell.isCurrentMonth) return false;
      const dayEvents = approvedEvents.filter(e => isEventActiveOnDate(cell.date, e));
      return dayEvents.length > 0;
    });

    if (daysWithEvents.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
          <CalendarIcon size={48} className="mb-4 opacity-20" />
          <p className="text-lg font-medium">No events this month</p>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" ref={scrollContainerRef}>
        {daysWithEvents.map((cell, index) => {
          const isToday = isSameDay(cell.date, new Date());
          const dayEvents = approvedEvents.filter(e => isEventActiveOnDate(cell.date, e))
                                  .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
          
          const year = cell.date.getFullYear();
          const month = String(cell.date.getMonth() + 1).padStart(2, '0');
          const day = String(cell.date.getDate()).padStart(2, '0');
          const dateString = `${year}-${month}-${day}`;
          const holidayName = showNationalHolidays ? holidays[dateString] : undefined;

          return (
            <div key={index} id={`event-day-${dateString}`} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className={`px-4 py-3 border-b flex items-center justify-between ${isToday ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex items-center gap-3">
                  <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg ${isToday ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 shadow-sm border border-gray-200'}`}>
                    <span className="text-xs font-bold uppercase">{WEEK_DAYS[cell.date.getDay()].substring(0, 3)}</span>
                    <span className="text-lg font-bold leading-none">{cell.date.getDate()}</span>
                  </div>
                  {holidayName && (
                    <span className="text-xs font-medium px-2 py-1 bg-red-50 text-red-600 rounded-md border border-red-100">
                      {getEnglishHolidayName(holidayName)}
                    </span>
                  )}
                </div>
              </div>
              <div className="p-2 space-y-2">
                {dayEvents.map(event => (
                  <div 
                    key={event.id}
                    onClick={(e) => handleEventClick(e, event)}
                    className={`
                      p-3 rounded-lg border-l-4 cursor-pointer hover:bg-gray-50 transition-colors
                      ${getRegionClasses(event.region)}
                    `}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-gray-900">{event.title}</span>
                        <span className="text-xs font-medium text-gray-500 whitespace-nowrap shrink-0">
                          {event.isAllDay ? 'All Day' : formatTime(event.start)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {event.types && event.types.length > 0 && (
                          <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            {event.types.join(', ')}
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                          {event.region}
                        </span>
                        {event.city && event.city !== 'Whole Region' && (
                          <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            {event.city}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="h-[100dvh] overflow-hidden flex flex-col bg-gray-50 text-gray-900 font-sans">
      <div className="flex-none z-30 flex flex-col shadow-sm">
        <header 
            className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-2 flex flex-col md:grid md:grid-cols-[1fr_auto_1fr] items-center gap-3"
            style={{ paddingRight: `calc(1.5rem + ${scrollbarWidth}px)` }}
        >
          <div className="flex items-center gap-3 justify-self-start min-w-0 w-full">
            <a 
                href="https://shimaneparesources.wordpress.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block hover:opacity-80 transition-opacity cursor-pointer flex items-center shrink-0"
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
                className="text-lg font-bold tracking-tight text-gray-800 cursor-pointer truncate"
                onClick={() => setView('calendar')}
            >
                Shimane JET Event Calendar
            </h1>
        </div>

        {view === 'calendar' ? (
            <div className="flex flex-col items-center gap-1 justify-self-center">
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
                            />
                        )}
                    </div>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-white rounded-xl text-gray-600 transition-all shadow-sm hover:shadow-md">
                        <ChevronRight size={20} />
                    </button>
                </div>
                {isEventView ? (
                    <div className="px-4 py-1 text-xs font-medium text-gray-500">
                        {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                ) : (
                    <button onClick={handleJumpToToday} className="px-4 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors border border-transparent hover:border-gray-200">
                        Today
                    </button>
                )}
            </div>
        ) : (
            <div />
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 w-full md:w-auto justify-self-end min-w-0">
            {view === 'calendar' ? (
                <>
                    {/* Filter Menu */}
                    <div className="relative" ref={filterMenuRef}>
                        <button 
                            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                            className={`flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium bg-white border rounded-lg transition-all shadow-sm hover:shadow-md h-[38px] w-[64px] sm:w-[120px] ${
                                selectedRegionFilter !== 'All' || selectedCityFilter !== 'Whole Region' || selectedTypeFilters.length > 0 
                                    ? 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100' 
                                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                            title="Filter Events"
                        >
                            <Filter size={16} className="shrink-0" />
                            <span className="hidden sm:inline">Filters</span>
                            {(selectedRegionFilter !== 'All' || selectedCityFilter !== 'Whole Region' || selectedTypeFilters.length > 0) && (
                                <span className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full shrink-0">
                                    {(selectedRegionFilter !== 'All' ? 1 : 0) + (selectedCityFilter !== 'Whole Region' ? 1 : 0) + selectedTypeFilters.length}
                                </span>
                            )}
                        </button>

                        {isFilterMenuOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Region</label>
                                        <select
                                            value={selectedRegionFilter}
                                            onChange={(e) => {
                                                setSelectedRegionFilter(e.target.value as Region | 'All');
                                                setSelectedCityFilter('Whole Region');
                                            }}
                                            className="w-full px-3 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                                        >
                                            <option value="All">All Regions</option>
                                            {Object.values(Region).map((r) => (
                                                <option key={r} value={r}>{r}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {selectedRegionFilter !== 'All' && selectedRegionFilter !== Region.OUTSIDE_SHIMANE && (
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">City</label>
                                            <select
                                                value={selectedCityFilter}
                                                onChange={(e) => setSelectedCityFilter(e.target.value)}
                                                className="w-full px-3 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                                            >
                                                {REGION_CITIES[selectedRegionFilter as Region].filter(city => city !== 'N/A').map((city) => (
                                                    <option key={city} value={city}>{city}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Event Category</label>
                                        {selectedTypeFilters.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mb-2">
                                                {selectedTypeFilters.map(filter => (
                                                    <span key={filter} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-md">
                                                        {filter}
                                                        <button
                                                            onClick={() => setSelectedTypeFilters(prev => prev.filter(f => f !== filter))}
                                                            className="text-blue-600 hover:text-blue-900 focus:outline-none"
                                                        >
                                                            &times;
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <select
                                            value=""
                                            onChange={(e) => {
                                                const val = e.target.value as EventCategory;
                                                if (val && !selectedTypeFilters.includes(val)) {
                                                    setSelectedTypeFilters(prev => [...prev, val]);
                                                }
                                            }}
                                            className="w-full px-3 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                                        >
                                            <option value="" disabled hidden>Select Category</option>
                                            {!selectedTypeFilters.includes('JET') && <option value="JET">JET</option>}
                                            {!selectedTypeFilters.includes('AJET') && <option value="AJET">AJET</option>}
                                            {!selectedTypeFilters.includes('Local Event') && <option value="Local Event">Local Event</option>}
                                            {!selectedTypeFilters.includes('Festival') && <option value="Festival">Festival</option>}
                                            {!selectedTypeFilters.includes('Sports') && <option value="Sports">Sports</option>}
                                            {!selectedTypeFilters.includes('Music') && <option value="Music">Music</option>}
                                            {!selectedTypeFilters.includes('Cultural Exchange') && <option value="Cultural Exchange">Cultural Exchange</option>}
                                            {!selectedTypeFilters.includes('Other') && <option value="Other">Other</option>}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">National Holidays</label>
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id="showNationalHolidays"
                                                checked={showNationalHolidays}
                                                onChange={(e) => setShowNationalHolidays(e.target.checked)}
                                                className="w-4 h-4 text-blue-600 bg-gray-50 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                            <label htmlFor="showNationalHolidays" className="text-sm text-gray-700 cursor-pointer">
                                                Show National Holidays
                                            </label>
                                        </div>
                                    </div>
                                    {(selectedRegionFilter !== 'All' || selectedCityFilter !== 'Whole Region' || selectedTypeFilters.length > 0 || !showNationalHolidays) && (
                                        <div className="pt-2 border-t border-gray-100">
                                            <button
                                                onClick={() => {
                                                    setSelectedRegionFilter('All');
                                                    setSelectedCityFilter('Whole Region');
                                                    setSelectedTypeFilters([]);
                                                    setShowNationalHolidays(true);
                                                }}
                                                className="w-full py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                Reset Filters
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <button onClick={() => { setSelectedDate(null); setSelectedEvent(null); setIsEventModalOpen(true); }} className="flex items-center justify-center p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-100 hover:shadow-lg">
                        <Plus size={20} />
                    </button>

                    {isAdminSession && (
                        <button 
                            onClick={() => setView('admin')}
                            className="flex items-center justify-center p-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all shadow-sm hover:shadow-md"
                            title="Admin Dashboard"
                        >
                            <ShieldCheck size={20} />
                        </button>
                    )}
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
                                    onClick={() => { setIsEventView(!isEventView); setIsMenuOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    <List size={16} />
                                    {isEventView ? 'Calendar View' : 'Event View'}
                                </button>
                                {isAdminSession ? (
                                    <button 
                                        onClick={() => { handleLogout(); setIsMenuOpen(false); }} 
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        <LogOut size={16} />
                                        Logout
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => { handleAdminAccess(); setIsMenuOpen(false); }} 
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        <ShieldCheck size={16} />
                                        Admin Login
                                    </button>
                                )}
                                <button 
                                    onClick={() => { setIsPrivacyPolicyModalOpen(true); setIsMenuOpen(false); }} 
                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    <ShieldAlert size={16} />
                                    Privacy Policy
                                </button>
                                <button 
                                    onClick={() => { setIsContactModalOpen(true); setIsMenuOpen(false); }} 
                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors text-left"
                                >
                                    <HelpCircle size={16} className="shrink-0" />
                                    <span>
                                        Request Feature/<br />Broken Site?
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>
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
            <div 
                className="bg-gray-900 text-white px-6 py-2 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2"
                style={{ paddingRight: `calc(1.5rem + ${scrollbarWidth}px)` }}
            >
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
        ) : isEventView ? (
            renderEventView()
        ) : (
            <>
                <div className="w-full flex-1 flex flex-col overflow-auto" ref={scrollContainerRef}>
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

                                const year = cell.date.getFullYear();
                                const month = String(cell.date.getMonth() + 1).padStart(2, '0');
                                const day = String(cell.date.getDate()).padStart(2, '0');
                                const dateString = `${year}-${month}-${day}`;
                                const holidayName = showNationalHolidays ? holidays[dateString] : undefined;

                                return (
                                    <div 
                                        key={index} 
                                        className={`
                                            relative bg-white rounded-2xl p-2 border border-gray-100 
                                            transition-all hover:shadow-md flex flex-col gap-1 overflow-hidden group
                                            ${!cell.isCurrentMonth ? 'bg-gray-50/50 text-gray-400' : 'text-gray-700'}
                                            ${isToday ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                                            ${holidayName ? 'holiday' : ''}
                                        `}
                                    >
                                        <div className="flex justify-between items-start">
                                            <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday && !holidayName ? 'bg-blue-600 text-white' : ''} ${isToday && holidayName ? 'bg-red-600 text-white' : ''}`}>
                                                {cell.date.getDate()}
                                            </span>
                                            {holidayName && (
                                                <div className="flex flex-col items-end ml-1 flex-1 overflow-hidden">
                                                    <span className="text-[10px] font-semibold truncate w-full text-right leading-tight holiday-text">
                                                        {holidayName}
                                                    </span>
                                                    <span className="text-[9px] opacity-75 truncate w-full text-right leading-tight holiday-text">
                                                        {getEnglishHolidayName(holidayName)}
                                                    </span>
                                                </div>
                                            )}
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
                                                    title={`${event.types && event.types.length > 0 ? `[${event.types.join(', ')}] ` : ''}${event.title} (${event.isAllDay ? 'All Day' : formatTime(event.start)})${event.recurrence !== 'none' ? ' - Repeats ' + event.recurrence : ''}`}
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

      <PrivacyPolicyModal
        isOpen={isPrivacyPolicyModalOpen}
        onClose={() => setIsPrivacyPolicyModalOpen(false)}
      />

      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />
    </div>
  );
};