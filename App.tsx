
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Repeat, ShieldCheck, LayoutDashboard, Filter, LogOut, Clock, Menu, ShieldAlert, HelpCircle, List, Calendar as CalendarIcon, Search, Loader2, Download } from 'lucide-react';
import { CalendarEvent, Region, REGION_CITIES, EventCategory } from './types';
import { 
    generateCalendarGrid, 
    MONTH_NAMES, 
    WEEK_DAYS, 
    isSameDay, 
    isEventActiveOnDate,
    formatTime,
    getRegionClasses,
    getEnglishHolidayName,
    sortEventTypes
} from './utils/dateUtils';
import { EventModal } from './components/EventModal';
import { MonthYearSelector } from './components/MonthYearSelector';
import { AdminDashboard } from './components/AdminDashboard';
import { LoginModal } from './components/LoginModal';
import { PendingRequestsModal } from './components/PendingRequestsModal';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { ContactModal } from './components/ContactModal';
import { SearchModal } from './components/SearchModal';
import { DayViewModal } from './components/DayViewModal';
import { FilterDropdown } from './components/FilterDropdown';
import { getEventsForMonth, addEvent, updateEvent, softDeleteEvent, auth, onAuthStateChanged, signOut } from './lib/firebase';

export const App: React.FC = () => {
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
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isDayViewModalOpen, setIsDayViewModalOpen] = useState(false);
  const [selectedDayViewDate, setSelectedDayViewDate] = useState<Date | null>(null);
  const [eventModalSource, setEventModalSource] = useState<'calendar' | 'dayView' | 'search' | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  
  const [view, setView] = useState<'calendar' | 'admin'>('calendar');
  const [isAdminSession, setIsAdminSession] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [holidays, setHolidays] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);
  
  const monthPickerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Cache refs for performance
  const loadedGridsRef = useRef<Set<string>>(new Set());
  const fetchingGridsRef = useRef<Set<string>>(new Set());
  const allEventsMapRef = useRef<Map<string, CalendarEvent>>(new Map());

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
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      const isIpUser = user?.email?.endsWith('@anonymous-ip.local');
      const isAdmin = !!user && !user.isAnonymous && !isIpUser;

      setIsAuthReady(true); // Always ready once the listener fires
      setIsAdminSession(isAdmin);

      if (!isAdmin) {
        setView((prevView) => prevView === 'admin' ? 'calendar' : prevView);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;

    const loadCalendarData = async (targetDate: Date, isPrefetch = false) => {
      // Calculate the start and end of the visible calendar grid
      const grid = generateCalendarGrid(targetDate);
      // To catch events that might start/end exactly on the edges, use 00:00 and 23:59
      const gridStart = new Date(grid[0].date);
      gridStart.setHours(0, 0, 0, 0);
      const gridEnd = new Date(grid[grid.length - 1].date);
      gridEnd.setHours(23, 59, 59, 999);

      const gridKey = `${gridStart.getTime()}-${gridEnd.getTime()}`;

      if (loadedGridsRef.current.has(gridKey)) {
        if (!isPrefetch) {
          setEvents(Array.from(allEventsMapRef.current.values()));
          setIsLoading(false);
        }
        return;
      }

      if (fetchingGridsRef.current.has(gridKey)) {
        if (!isPrefetch && events.length === 0) setIsLoading(true);
        return;
      }

      fetchingGridsRef.current.add(gridKey);
      if (!isPrefetch) setIsLoading(true);

      const startISO = gridStart.toISOString();
      const endISO = gridEnd.toISOString();

      try {
        // Parallel fetching of holidays and Firestore events
        const [holidayResponse, eventData] = await Promise.all([
          fetch('https://holidays-jp.github.io/api/v1/date.json'),
          getEventsForMonth(startISO, endISO)
        ]);
        
        if (holidayResponse.ok) {
          const holidayData = await holidayResponse.json();
          setHolidays(prev => ({...prev, ...holidayData}));
        }
        
        loadedGridsRef.current.add(gridKey);
        eventData.forEach(e => allEventsMapRef.current.set(e.id, e));
        
        // Single update of data states conceptually
        // Re-rendering will occur after this block
        setEvents(Array.from(allEventsMapRef.current.values()));
      } catch (error) {
        console.error("Error loading calendar data:", error);
      } finally {
        fetchingGridsRef.current.delete(gridKey);
        if (!isPrefetch) {
          setIsLoading(false);
        }
      }
    };

    // 1. Immediately load the currently requested month
    loadCalendarData(currentDate, false);

    // 2. Set timeout to prefetch adjacent months if the user stays on this month
    const prefetchTimeout = setTimeout(() => {
      const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      
      loadCalendarData(prevMonth, true);
      loadCalendarData(nextMonth, true);
    }, 600); // 600ms linger time

    // 3. Clear timeout if user rapidly navigates away
    return () => clearTimeout(prefetchTimeout);
  }, [currentDate, isAuthReady]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      
      if (monthPickerRef.current && !monthPickerRef.current.contains(targetNode)) {
        setIsMonthPickerOpen(false);
      }
      
      const isInsideAnyMenu = 
        (menuRef.current && menuRef.current.contains(targetNode)) || 
        (mobileMenuRef.current && mobileMenuRef.current.contains(targetNode));
        
      if (!isInsideAnyMenu) {
        setIsMenuOpen(false);
      }
      
      const isInsideAnyFilter = 
        (filterMenuRef.current && filterMenuRef.current.contains(targetNode)) || 
        (filterDropdownRef.current && filterDropdownRef.current.contains(targetNode));
        
      if (!isInsideAnyFilter) {
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
    setEventModalSource('calendar');
    setIsEventModalOpen(true);
  };

  const handleEventClick = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setSelectedDate(new Date(event.start));
    setEventModalSource('calendar');
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
        if (eventModalSource === 'dayView') {
          setIsDayViewModalOpen(true);
        } else if (eventModalSource === 'search') {
          setIsSearchModalOpen(true);
        }
        setEventModalSource(null);
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
                        <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                          {event.region}
                        </span>
                        {event.city && event.city !== 'Whole Region' && (
                          <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            {event.city}
                          </span>
                        )}
                        {event.types && event.types.length > 0 && sortEventTypes(event.types).map(type => (
                          <span key={type} className="text-[10px] font-bold text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            {type}
                          </span>
                        ))}
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

  const selectedDayHoliday = useMemo(() => {
    if (!selectedDayViewDate || !showNationalHolidays) return undefined;
    const year = selectedDayViewDate.getFullYear();
    const month = String(selectedDayViewDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDayViewDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    return holidays[dateString];
  }, [selectedDayViewDate, showNationalHolidays, holidays]);

  const exportToICS = () => {
    const officialEvents = events.filter(e => e.status === 'approved' || e.status === undefined);

    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Shimane JET Event Calendar//EN\n";

    officialEvents.forEach(event => {
      icsContent += "BEGIN:VEVENT\n";
      icsContent += `UID:${event.id}@shimane-jet.com\n`;
      
      const now = new Date();
      icsContent += `DTSTAMP:${now.toISOString().replace(/[-:]/g, '').split('.')[0]}Z\n`;

      if (event.isAllDay) {
        const start = new Date(event.start);
        const end = new Date(event.end);
        end.setDate(end.getDate() + 1);
        
        const formatAllDay = (d: Date) => {
          return d.getFullYear() +
                 String(d.getMonth() + 1).padStart(2, '0') +
                 String(d.getDate()).padStart(2, '0');
        };
        
        icsContent += `DTSTART;VALUE=DATE:${formatAllDay(start)}\n`;
        icsContent += `DTEND;VALUE=DATE:${formatAllDay(end)}\n`;
      } else {
        const start = new Date(event.start);
        const end = new Date(event.end);
        
        const formatTimeEvent = (d: Date) => {
             return d.getUTCFullYear() +
                    String(d.getUTCMonth() + 1).padStart(2, '0') +
                    String(d.getUTCDate()).padStart(2, '0') + 'T' +
                    String(d.getUTCHours()).padStart(2, '0') +
                    String(d.getUTCMinutes()).padStart(2, '0') +
                    String(d.getUTCSeconds()).padStart(2, '0') + 'Z';
        };

        icsContent += `DTSTART:${formatTimeEvent(start)}\n`;
        icsContent += `DTEND:${formatTimeEvent(end)}\n`;
      }

      let summary = event.title || '';
      summary = summary.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
      icsContent += `SUMMARY:${summary}\n`;
      
      if (event.description) {
         let desc = event.description.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
         icsContent += `DESCRIPTION:${desc}\n`;
      }
      
      const locations = [event.city, event.region].filter(Boolean);
      if (locations.length > 0) {
         let locStr = locations.join(', ').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
         icsContent += `LOCATION:${locStr}\n`;
      }

      icsContent += "END:VEVENT\n";
    });

    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shimane-jet-events.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-[100dvh] overflow-hidden flex flex-col bg-gray-50 text-gray-900 font-sans">
      <div className="flex-none z-40 flex flex-col shadow-sm">
        <header 
            className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-1.5 flex flex-col md:grid md:grid-cols-[1fr_auto_1fr] items-center gap-2 relative"
            style={{ paddingRight: `calc(1rem + ${scrollbarWidth}px)` }}
        >
          <div className="flex items-center justify-between gap-2 justify-self-start min-w-0 w-full">
            <div className="flex items-center gap-2 min-w-0">
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
                        className="h-8 w-auto object-contain"
                        referrerPolicy="no-referrer"
                    />
                </a>
                <h1 
                    className="text-base font-bold tracking-tight text-gray-800 cursor-pointer truncate"
                    onClick={() => setView('calendar')}
                >
                    Shimane JET Event Calendar
                </h1>
            </div>

            {/* Mobile Menu Button - positioned top right */}
            <div className="md:hidden flex items-center gap-2">
                {isAdminSession && (
                    <button 
                        onClick={() => setView(view === 'admin' ? 'calendar' : 'admin')}
                        className="p-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all shadow-sm"
                        title={view === 'admin' ? (isEventView ? "Back to Event View" : "Back to Calendar") : "Admin Dashboard"}
                    >
                        {view === 'admin' ? (isEventView ? <List size={20} /> : <CalendarIcon size={20} />) : <ShieldCheck size={20} />}
                    </button>
                )}
                <div className="relative" ref={mobileMenuRef}>
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)} 
                        className={`flex items-center justify-center p-2 rounded-lg transition-all shadow-sm hover:shadow-md border ${
                            isMenuOpen ? 'bg-gray-100 text-blue-600 border-gray-300' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                        title="Menu"
                    >
                        <Menu size={20} />
                    </button>
                    
                    {isMenuOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                            {view === 'calendar' && (
                                <>
                                    <button 
                                        onClick={() => { setSelectedDate(null); setSelectedEvent(null); setEventModalSource('calendar'); setIsEventModalOpen(true); setIsMenuOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                                    >
                                        <Plus size={18} />
                                        New Event
                                    </button>
                                    <button 
                                        onClick={() => { setIsSearchModalOpen(true); setIsMenuOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        <Search size={18} />
                                        Search Events
                                    </button>
                                    <button 
                                        onClick={() => { setIsFilterMenuOpen(!isFilterMenuOpen); setIsMenuOpen(false); }}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                                            selectedRegionFilter !== 'All' || selectedCityFilter !== 'Whole Region' || selectedTypeFilters.length > 0 
                                                ? 'text-blue-700 bg-blue-50 hover:bg-blue-100' 
                                                : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        <Filter size={18} />
                                        Filters
                                        {(selectedRegionFilter !== 'All' || selectedCityFilter !== 'Whole Region' || selectedTypeFilters.length > 0) && (
                                            <span className="ml-auto bg-blue-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                                                {(selectedRegionFilter !== 'All' ? 1 : 0) + (selectedCityFilter !== 'Whole Region' ? 1 : 0) + selectedTypeFilters.length}
                                            </span>
                                        )}
                                    </button>
                                    <div className="h-px bg-gray-100 my-1" />
                                </>
                            )}
                            <button 
                                onClick={() => { handleJumpToToday(); setIsMenuOpen(false); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                <CalendarIcon size={18} />
                                Today
                            </button>
                            <button 
                                onClick={() => { setIsPendingRequestsModalOpen(true); setIsMenuOpen(false); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors"
                            >
                                <Clock size={18} />
                                Pending Requests
                            </button>
                            <button 
                                onClick={() => { setIsEventView(!isEventView); setIsMenuOpen(false); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                <List size={18} />
                                {isEventView ? 'Calendar View' : 'Event View'}
                            </button>
                            <button 
                                onClick={() => { exportToICS(); setIsMenuOpen(false); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                <Download size={18} />
                                Export Calendar
                            </button>
                            {isAdminSession ? (
                                <button 
                                    onClick={() => { handleLogout(); setIsMenuOpen(false); }} 
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    <LogOut size={18} />
                                    Logout
                                </button>
                            ) : (
                                <button 
                                    onClick={() => { handleAdminAccess(); setIsMenuOpen(false); }} 
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    <ShieldCheck size={18} />
                                    Admin Login
                                </button>
                            )}
                            <button 
                                onClick={() => { setIsPrivacyPolicyModalOpen(true); setIsMenuOpen(false); }} 
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                <ShieldAlert size={18} />
                                Privacy Policy
                            </button>
                            <button 
                                onClick={() => { setIsContactModalOpen(true); setIsMenuOpen(false); }} 
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors text-left"
                            >
                                <HelpCircle size={18} className="shrink-0" />
                                <span>
                                    Request Feature/<br />Broken Site?
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {view === 'calendar' ? (
            <div className="flex items-center gap-2 sm:gap-4 bg-gray-100/50 p-1.5 rounded-2xl border border-gray-200/50 w-full sm:w-auto justify-self-center justify-center mb-1 md:mb-0">
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
        ) : (
            <div />
        )}

        <div className="hidden md:flex items-center justify-end gap-3 w-full md:w-auto justify-self-end min-w-0">
            {view === 'calendar' && (
                <>
                    {/* Filter Dropdown */}
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
                    </div>

                    <button onClick={() => setIsSearchModalOpen(true)} className="flex items-center justify-center p-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all shadow-sm hover:shadow-md" title="Search Events">
                        <Search size={20} />
                    </button>

                    <button onClick={() => { setSelectedDate(null); setSelectedEvent(null); setEventModalSource('calendar'); setIsEventModalOpen(true); }} className="flex items-center justify-center p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-100 hover:shadow-lg" title="New Event">
                        <Plus size={20} />
                    </button>
                </>
            )}

            {isAdminSession && (
                <button 
                    onClick={() => setView(view === 'admin' ? 'calendar' : 'admin')}
                    className="flex items-center justify-center p-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all shadow-sm hover:shadow-md"
                    title={view === 'admin' ? (isEventView ? "Back to Event View" : "Back to Calendar") : "Admin Dashboard"}
                >
                    {view === 'admin' ? (isEventView ? <List size={20} /> : <CalendarIcon size={20} />) : <ShieldCheck size={20} />}
                </button>
            )}
            <div className="relative" ref={menuRef}>
                <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)} 
                    className={`flex items-center justify-center p-2 rounded-lg transition-all shadow-sm hover:shadow-md border ${
                        isMenuOpen ? 'bg-gray-100 text-blue-600 border-gray-300' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                    title="Menu"
                >
                    <Menu size={20} />
                </button>
                
                {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                        <button 
                            onClick={() => { handleJumpToToday(); setIsMenuOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <CalendarIcon size={16} />
                            Today
                        </button>
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
                        <button 
                            onClick={() => { exportToICS(); setIsMenuOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <Download size={16} />
                            Export Calendar
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
        </div>

        {/* Global Filter Dropdown - accessible by both mobile and desktop menus */}
        {view === 'calendar' && (
            <FilterDropdown 
                isOpen={isFilterMenuOpen}
                onClose={() => setIsFilterMenuOpen(false)}
                selectedRegionFilter={selectedRegionFilter}
                setSelectedRegionFilter={setSelectedRegionFilter}
                selectedCityFilter={selectedCityFilter}
                setSelectedCityFilter={setSelectedCityFilter}
                selectedTypeFilters={selectedTypeFilters}
                setSelectedTypeFilters={setSelectedTypeFilters}
                showNationalHolidays={showNationalHolidays}
                setShowNationalHolidays={setShowNationalHolidays}
                className="top-full right-4 mt-1"
                containerRef={filterDropdownRef}
            />
        )}
        </header>
        {isAdminSession && view === 'calendar' && (
            <div 
                className="bg-gray-900 text-white px-3 py-1.5 md:px-6 md:py-2 flex flex-row items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2"
                style={{ paddingRight: `calc(0.75rem + ${scrollbarWidth}px)` }}
            >
                <div className="flex items-center gap-1.5 md:gap-2">
                    <div className="p-0.5 md:p-1 bg-gray-800 rounded md:rounded-md border border-gray-700">
                        <ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-400" />
                    </div>
                    <h3 className="text-xs md:text-sm font-bold text-white leading-none">Admin Session Active</h3>
                </div>
                <button 
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-1.5 px-2 py-0.5 md:px-3 md:py-1 text-[10px] md:text-xs font-semibold text-red-300 bg-red-950/30 hover:bg-red-950/50 border border-red-900/50 rounded md:rounded-md transition-colors"
                >
                    <LogOut className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    Log Out
                </button>
            </div>
        )}
      </div>

      <main className="flex-1 overflow-hidden flex flex-col relative">
        {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-4">
                <Loader2 size={48} className="animate-spin text-blue-500" />
                <p className="text-lg font-medium">Loading calendar...</p>
            </div>
        ) : view === 'admin' && isAdminSession ? (
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
                    <div className="min-w-[700px] flex flex-col h-full px-4 md:px-6 pb-4">
                        <div className="grid grid-cols-7 mb-2 sticky top-0 z-20 bg-gray-50 py-1.5 -mx-4 px-4 md:-mx-6 md:px-6 shadow-sm border-b border-gray-200/50 backdrop-blur-sm bg-gray-50/90">
                            {WEEK_DAYS.map(day => (
                                <div key={day} className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{day}</div>
                            ))}
                        </div>

                        <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-1 md:gap-2 min-h-[500px]">
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
                                        onClick={() => {
                                            setSelectedDayViewDate(cell.date);
                                            setIsDayViewModalOpen(true);
                                        }}
                                        className={`
                                            relative bg-white rounded-2xl p-1.5 border border-gray-100 
                                            transition-all hover:shadow-md flex flex-col gap-0.5 overflow-hidden group cursor-pointer
                                            ${!cell.isCurrentMonth ? 'bg-gray-50/50 text-gray-400' : 'text-gray-700'}
                                            ${isToday ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                                            ${holidayName ? 'holiday' : ''}
                                        `}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="relative w-5 h-5 shrink-0">
                                                <span className={`absolute inset-0 text-xs font-medium flex items-center justify-center rounded-full transition-opacity md:group-hover:opacity-0 ${isToday && !holidayName ? 'bg-blue-600 text-white' : ''} ${isToday && holidayName ? 'bg-red-600 text-white' : ''}`}>
                                                    {cell.date.getDate()}
                                                </span>
                                                <button onClick={(e) => { e.stopPropagation(); handleDateClick(cell.date); }} className="absolute inset-0 opacity-0 md:group-hover:opacity-100 transition-opacity bg-blue-100 text-blue-600 rounded-full hidden md:flex items-center justify-center cursor-pointer">
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                            {holidayName && (
                                                <div className="flex flex-col items-end ml-1 flex-1 overflow-hidden">
                                                    <span className="text-[9px] font-semibold truncate w-full text-right leading-tight holiday-text">
                                                        {holidayName}
                                                    </span>
                                                    <span className="text-[8px] opacity-75 truncate w-full text-right leading-tight holiday-text">
                                                        {getEnglishHolidayName(holidayName)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden custom-scrollbar mt-0.5">
                                            {dayEvents.length > 3 ? (
                                                <div className="flex-1 flex flex-col justify-center min-h-0 h-full">
                                                    <div className="grid grid-cols-2 auto-rows-fr gap-1 h-full">
                                                        {Object.entries(
                                                            dayEvents.reduce((acc, event) => {
                                                                acc[event.region] = (acc[event.region] || 0) + 1;
                                                                return acc;
                                                            }, {} as Record<string, number>)
                                                        ).map(([region, count]) => {
                                                            const shortName = region.split(' ')[0];
                                                            return (
                                                                <div 
                                                                    key={region}
                                                                    title={`${region}: ${count} events`}
                                                                    className={`
                                                                        flex flex-col items-center justify-center p-0.5 rounded-[6px] border w-full h-full min-h-0
                                                                        ${getRegionClasses(region as Region)}
                                                                    `}
                                                                >
                                                                    <span className="text-[8px] font-bold uppercase tracking-tight leading-none opacity-80 mb-0.5 truncate w-full text-center">{shortName}</span>
                                                                    <span className="text-[12px] font-bold leading-none">{count}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ) : (
                                                dayEvents.map(event => (
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
                                                ))
                                            )}
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
        onClose={() => {
          setIsEventModalOpen(false);
          if (eventModalSource === 'dayView') {
            setIsDayViewModalOpen(true);
          } else if (eventModalSource === 'search') {
            setIsSearchModalOpen(true);
          }
          setEventModalSource(null);
        }}
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

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        events={events}
        onEventClick={(event) => {
          setSelectedEvent(event);
          setEventModalSource('search');
          setIsEventModalOpen(true);
        }}
      />

      <DayViewModal
        isOpen={isDayViewModalOpen}
        onClose={() => setIsDayViewModalOpen(false)}
        date={selectedDayViewDate}
        events={events}
        holidayName={selectedDayHoliday}
        onEventClick={(event) => {
          setSelectedEvent(event);
          setEventModalSource('dayView');
          setIsEventModalOpen(true);
        }}
      />
    </div>
  );
};