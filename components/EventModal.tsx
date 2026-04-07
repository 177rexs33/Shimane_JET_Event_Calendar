
import React, { useState, useEffect, useRef } from 'react';
import { Modal } from './Modal';
import { CalendarEvent, Region, RecurrenceType, REGION_CITIES } from '../types';
import { toDateString, toTimeString } from '../utils/dateUtils';
import { Clock, MapPin, AlignLeft, Type, Calendar as CalendarIcon, Globe, ChevronDown, Repeat, Check, AlertCircle, Trash2 } from 'lucide-react';
import { MiniCalendar } from './MiniCalendar';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
  onDelete?: (event: CalendarEvent) => void;
  initialDate?: Date | null;
  existingEvent?: CalendarEvent | null;
  isAdmin?: boolean;
}

interface DateInputProps {
    dateStr: string; // ISO YYYY-MM-DD
    onChange: (iso: string) => void;
    onFocus: () => void;
    inputRef?: React.RefObject<HTMLInputElement | null>; 
    onComplete?: () => void; 
    hasError?: boolean;
}

const DateInput: React.FC<DateInputProps> = ({ dateStr, onChange, onFocus, inputRef, onComplete, hasError }) => {
    const [d, setD] = useState('');
    const [m, setM] = useState('');
    const [y, setY] = useState('');

    const monthRef = useRef<HTMLInputElement>(null);
    const yearRef = useRef<HTMLInputElement>(null);
    const isFocused = useRef(false);

    useEffect(() => {
        if (isFocused.current) return;
        if (dateStr) {
            const [year, month, day] = dateStr.split('-');
            setY(year);
            setM(month);
            setD(day);
        } else {
            setD(''); setM(''); setY('');
        }
    }, [dateStr]);

    const updateDate = (day: string, month: string, year: string) => {
        if (day.length >= 1 && month.length >= 1 && year.length === 4) {
             const newDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
             if (newDate.getDate() === parseInt(day) && newDate.getMonth() === parseInt(month) - 1) {
                 onChange(toDateString(newDate));
             }
        }
    };

    const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;
        if (!/^\d*$/.test(val)) return;
        setD(val);
        updateDate(val, m, y);
        if (val.length === 2) monthRef.current?.focus();
    };

    const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;
        if (!/^\d*$/.test(val)) return;
        setM(val);
        updateDate(d, val, y);
        if (val.length === 2) yearRef.current?.focus();
    };

    const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;
        if (!/^\d*$/.test(val)) return;
        setY(val);
        updateDate(d, m, val);
        if (val.length === 4 && onComplete) {
            onComplete();
        }
    };

    const handleDayBlur = () => {
        isFocused.current = false;
        if (d === '' && dateStr) {
             const [_, __, day] = dateStr.split('-');
             setD(day);
        }
    };

    const handleMonthBlur = () => {
        isFocused.current = false;
        if (m === '' && dateStr) {
             const [_, month, __] = dateStr.split('-');
             setM(month);
        }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        isFocused.current = true;
        setTimeout(() => e.target.select(), 0);
        onFocus();
    };

    return (
        <div className="flex items-center gap-0.5 w-full h-full">
            <input
                ref={inputRef}
                type="text"
                placeholder="DD"
                value={d}
                maxLength={2}
                onChange={handleDayChange}
                onBlur={handleDayBlur}
                onFocus={handleFocus}
                className={`bg-transparent outline-none font-medium text-center w-8 rounded transition-colors p-0 placeholder-gray-400 ${hasError ? 'text-red-700 focus:bg-red-100' : 'text-gray-700 focus:bg-blue-200'}`}
            />
            <span className={`select-none ${hasError ? 'text-red-400' : 'text-gray-400'}`}>/</span>
            <input
                ref={monthRef}
                type="text"
                placeholder="MM"
                value={m}
                maxLength={2}
                onChange={handleMonthChange}
                onBlur={handleMonthBlur}
                onFocus={handleFocus}
                className={`bg-transparent outline-none font-medium text-center w-8 rounded transition-colors p-0 placeholder-gray-400 ${hasError ? 'text-red-700 focus:bg-red-100' : 'text-gray-700 focus:bg-blue-200'}`}
            />
            <span className={`select-none ${hasError ? 'text-red-400' : 'text-gray-400'}`}>/</span>
            <input
                ref={yearRef}
                type="text"
                placeholder="YYYY"
                maxLength={4}
                value={y}
                onChange={handleYearChange}
                onFocus={handleFocus}
                className={`bg-transparent outline-none font-medium text-center w-12 rounded transition-colors p-0 placeholder-gray-400 ${hasError ? 'text-red-700 focus:bg-red-100' : 'text-gray-700 focus:bg-blue-200'}`}
            />
        </div>
    );
};

interface TimeSelectProps { 
    value: string; 
    onChange: (val: string) => void; 
    inputRef?: React.RefObject<HTMLInputElement | null>;
    onComplete?: () => void;
    onBlur?: (val: string) => void;
    hasError?: boolean;
}

const TimeSelect: React.FC<TimeSelectProps> = ({ value, onChange, inputRef, onComplete, onBlur, hasError }) => {
    // Ensure we have defaults, split safely
    const [h = '', m = ''] = value ? value.split(':') : ['', ''];
    const minuteRef = useRef<HTMLInputElement>(null);
    const isFocused = useRef(false);

    // Initialize state
    const [localH, setLocalH] = useState(h);
    const [localM, setLocalM] = useState(m);

    useEffect(() => {
        // Only update from props if not currently editing (prevents overwriting user input)
        if (isFocused.current) return;
        const [newH = '', newM = ''] = value ? value.split(':') : ['', ''];
        
        // Update local state respecting the incoming value without stripping zeros
        // The parent or onBlur logic handles the "09" vs "9" formatting preference
        setLocalH(newH);
        setLocalM(newM);
    }, [value]);

    const updateTime = (newH: string, newM: string) => {
        // Pass the raw values; parent or submit handler handles final formatting
        onChange(`${newH}:${newM}`);
    };

    const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;
        if (!/^\d*$/.test(val)) return;
        setLocalH(val);
        updateTime(val, localM);
    };

    const handleHourBlur = () => {
        isFocused.current = false;
        
        if (localH === '') {
            if (value) {
                const [h = ''] = value.split(':');
                setLocalH(h);
            }
            return;
        }

        let val = parseInt(localH, 10);
        if (isNaN(val)) {
            setLocalH('');
            updateTime('', localM);
            if (onBlur) onBlur(`:${localM}`);
            return;
        }
        
        const clamped = Math.min(23, Math.max(0, val));
        const formatted = clamped.toString().padStart(2, '0');
        const paddedM = localM === '' ? '' : localM.padStart(2, '0');
        
        setLocalH(formatted);
        const newVal = `${formatted}:${paddedM}`;
        updateTime(formatted, paddedM);
        if (onBlur) onBlur(newVal);
    };

    const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;
        if (!/^\d*$/.test(val)) return;
        setLocalM(val);
        updateTime(localH, val);
        if (val.length === 2 && onComplete) {
            onComplete();
        }
    };

    const handleMinuteBlur = () => {
        isFocused.current = false;
        
        if (localM === '') {
            if (value) {
                const [, m = ''] = value.split(':');
                setLocalM(m);
            }
            return;
        }

        let val = parseInt(localM, 10);
        if (isNaN(val)) {
            setLocalM('');
            updateTime(localH, '');
            if (onBlur) onBlur(`${localH}:`);
            return;
        }

        const clamped = Math.min(59, Math.max(0, val));
        const formatted = clamped.toString().padStart(2, '0');
        const paddedH = localH === '' ? '' : localH.padStart(2, '0');
        
        setLocalM(formatted);
        const newVal = `${paddedH}:${formatted}`;
        updateTime(paddedH, formatted);
        if (onBlur) onBlur(newVal);
    };

    const handleFocus = () => {
        isFocused.current = true;
    };

    return (
        <div className={`flex items-center border rounded-lg h-10 w-full sm:w-36 relative transition-all group ${hasError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}>
             <div className={`absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none z-10 ${hasError ? 'text-red-400' : 'text-gray-400'}`}>
                <Clock size={16} />
            </div>
            <div className="flex items-center pl-8 pr-2 w-full justify-between">
                <input 
                    ref={inputRef}
                    type="text"
                    value={localH} 
                    maxLength={2}
                    onChange={handleHourChange}
                    onBlur={handleHourBlur}
                    onFocus={handleFocus}
                    placeholder="HH"
                    className={`bg-transparent outline-none font-medium text-center w-10 rounded transition-colors p-0 placeholder-gray-400 ${hasError ? 'text-red-700 focus:bg-red-100' : 'text-gray-700 focus:bg-blue-200'}`}
                />
                <span className={`font-medium select-none ${hasError ? 'text-red-400' : 'text-gray-400'}`}>:</span>
                <input 
                    ref={minuteRef}
                    type="text"
                    value={localM} 
                    maxLength={2}
                    onChange={handleMinuteChange}
                    onBlur={handleMinuteBlur}
                    onFocus={handleFocus}
                    placeholder="MM"
                    className={`bg-transparent outline-none font-medium text-center w-10 rounded transition-colors p-0 placeholder-gray-400 ${hasError ? 'text-red-700 focus:bg-red-100' : 'text-gray-700 focus:bg-blue-200'}`}
                />
            </div>
        </div>
    );
};

export const EventModal: React.FC<EventModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  onDelete,
  initialDate, 
  existingEvent,
  isAdmin = false
}) => {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(''); 
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState(''); 
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [region, setRegion] = useState<Region | ''>('');
  const [city, setCity] = useState<string>('Whole Region');
  const [type, setType] = useState<'JET' | 'AJET' | 'Other' | ''>('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  
  const [timeError, setTimeError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{title?: boolean, startDate?: boolean, endDate?: boolean, type?: boolean, startTime?: boolean, endTime?: boolean, region?: boolean}>({});
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isSuggestingEdit, setIsSuggestingEdit] = useState(false);

  const [activeDateField, setActiveDateField] = useState<'start' | 'end' | null>(null);
  const [calendarPos, setCalendarPos] = useState<'top' | 'bottom'>('bottom');
  
  const startDateRef = useRef<HTMLDivElement>(null);
  const endDateRef = useRef<HTMLDivElement>(null);
  const startHourRef = useRef<HTMLInputElement>(null);
  const endDayInputRef = useRef<HTMLInputElement>(null);
  const endHourRef = useRef<HTMLInputElement>(null);
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const resizeTextarea = (ref: React.RefObject<HTMLTextAreaElement | null>) => {
      if (ref.current) {
        ref.current.style.height = 'auto';
        ref.current.style.height = `${ref.current.scrollHeight}px`;
      }
    };

    resizeTextarea(titleTextareaRef);
    resizeTextarea(descriptionTextareaRef);
  }, [title, description, isOpen, isSuggestingEdit]);

  useEffect(() => {
    if (isOpen) {
      setIsDeleteConfirmOpen(false); // Reset delete confirmation state
      setIsSuggestingEdit(false); // Reset suggesting edit state
      if (existingEvent) {
        setTitle(existingEvent.title);
        const s = new Date(existingEvent.start);
        const e = new Date(existingEvent.end);
        setStartDate(toDateString(s));
        setStartTime(toTimeString(s));
        setEndDate(toDateString(e));
        setEndTime(toTimeString(e));
        setDescription(existingEvent.description || '');
        setRegion(existingEvent.region || '');
        setCity(existingEvent.city || 'Whole Region');
        setType(existingEvent.type || '');
        setIsAllDay(existingEvent.isAllDay);
        setRecurrence(existingEvent.recurrence || 'none');
      } else {
        if (initialDate) {
             const s = new Date(initialDate);
             s.setHours(9, 0, 0, 0); 
             const e = new Date(s);
             e.setHours(10, 0, 0, 0); 
             setStartDate(toDateString(s));
             setStartTime(toTimeString(s));
             setEndDate(toDateString(e));
             setEndTime(toTimeString(e));
        } else {
             setStartDate('');
             setStartTime('');
             setEndDate('');
             setEndTime('');
        }
        setTitle('');
        setDescription('');
        setRegion('');
        setCity('Whole Region');
        setType('');
        setIsAllDay(false);
        setRecurrence('none');
      }
      setActiveDateField(null);
      setTimeError(null);
      setFormErrors({});
    }
  }, [isOpen, existingEvent, initialDate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (activeDateField === 'start' && startDateRef.current && !startDateRef.current.contains(event.target as Node)) {
            setActiveDateField(null);
        } else if (activeDateField === 'end' && endDateRef.current && !endDateRef.current.contains(event.target as Node)) {
            setActiveDateField(null);
        }
    };
    if (activeDateField) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDateField]);

  // Validation Effect for Same Day Time Constraint
  useEffect(() => {
    if (isAllDay) {
        setTimeError(null);
        return;
    }

    if (startDate && endDate && startDate === endDate) {
        const [sh, sm] = (startTime || '00:00').split(':').map(Number);
        const [eh, em] = (endTime || '00:00').split(':').map(Number);
        
        const startTotal = (sh || 0) * 60 + (sm || 0);
        const endTotal = (eh || 0) * 60 + (em || 0);

        if (endTotal < startTotal) {
            setTimeError("End time must be after start time");
        } else {
            setTimeError(null);
        }
    } else {
        setTimeError(null);
    }
  }, [startDate, endDate, startTime, endTime, isAllDay]);

  // Helper to ensure proper time formatting
  const padTime = (timeStr: string) => {
      const parts = (timeStr || '0:0').split(':');
      const h = parts[0] || '0';
      const m = parts[1] || '0';
      return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
  };

  const handleStartTimeBlur = (currentStartTime: string) => {
    if (!startDate || !endDate) return;

    const sTime = padTime(currentStartTime);
    const eTime = padTime(endTime);
    
    const startIso = `${startDate}T${sTime}:00`;
    const endIso = `${endDate}T${eTime}:00`;

    const startObj = new Date(startIso);
    const endObj = new Date(endIso);

    if (!isNaN(startObj.getTime()) && !isNaN(endObj.getTime())) {
        if (endObj < startObj) {
            // Set end to start + 1 hour
            const newEnd = new Date(startObj.getTime() + 60 * 60 * 1000);
            setEndDate(toDateString(newEnd));
            setEndTime(toTimeString(newEnd));
        }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errors: {title?: boolean, startDate?: boolean, endDate?: boolean, type?: boolean, startTime?: boolean, endTime?: boolean, region?: boolean} = {};
    if (!title.trim()) errors.title = true;
    if (!startDate) errors.startDate = true;
    if (!endDate) errors.endDate = true;
    if (!type) errors.type = true;
    if (!region) errors.region = true;
    
    if (!isAllDay) {
        if (!startTime || startTime === ':') errors.startTime = true;
        if (!endTime || endTime === ':') errors.endTime = true;
    }

    if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        alert("Please fill out all required fields.");
        return;
    }
    setFormErrors({});

    if (!startDate || !endDate) return; 
    
    if (timeError) {
        return;
    }

    const sTime = isAllDay ? '00:00' : padTime(startTime);
    const eTime = isAllDay ? '00:00' : padTime(endTime);
    
    const startIso = `${startDate}T${sTime}:00`;
    const endIso = `${endDate}T${eTime}:00`;

    const startDateObj = new Date(startIso);
    const endDateObj = new Date(endIso);

    if (endDateObj < startDateObj) {
        alert("End time cannot be before start time.");
        return;
    }

    const eventData = {
      id: existingEvent?.id || crypto.randomUUID(),
      title,
      start: startIso,
      end: endIso,
      description,
      type: type as 'JET' | 'AJET' | 'Other',
      region: region as Region,
      city,
      isAllDay,
      recurrence,
    };

    if (existingEvent) {
        // If editing an existing event, mark as edited and save the snapshot
        onSave({
            ...eventData,
            status: 'edited',
            originalData: existingEvent
        });
    } else {
        // New event
        onSave({
            ...eventData,
            status: 'pending'
        });
    }
    onClose();
  };

  const handleDateSelect = (field: 'start' | 'end', newDate: Date) => {
    const dateStr = toDateString(newDate);
    if (field === 'start') {
        setStartDate(dateStr);
        if (!endDate || new Date(dateStr) > new Date(endDate)) {
            setEndDate(dateStr);
        }
    } else {
        setEndDate(dateStr);
    }
    setActiveDateField(null);
  };

  const openCalendar = (field: 'start' | 'end') => {
    const ref = field === 'start' ? startDateRef : endDateRef;
    if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setCalendarPos(spaceBelow < 320 ? 'top' : 'bottom');
    }
    setActiveDateField(field);
  };

  const isFormValid = title.trim().length > 0 && startDate.length > 0 && endDate.length > 0 && type !== '' && region !== '' && !timeError;

  const isReadOnly = !isAdmin && existingEvent && !isSuggestingEdit;

  return (
    <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={existingEvent ? (isReadOnly ? 'Event Details' : (isAdmin ? 'Edit Event' : 'Suggest Edit')) : 'New Event'}
    >
      {isReadOnly ? (
        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-start gap-4">
                <h4 className="text-2xl font-bold text-gray-900 break-words min-w-0 flex-1">{title}</h4>
                <div className="flex items-center gap-1.5 text-gray-700 shrink-0 mt-1 flex-wrap justify-end">
                  {existingEvent?.type && (
                    <span className="text-sm font-medium px-2.5 py-1 bg-blue-100 text-blue-800 rounded-md">{existingEvent.type}</span>
                  )}
                  <span className="text-sm font-medium px-2.5 py-1 bg-gray-100 rounded-md flex items-center gap-1.5">
                    <Globe size={14} className="text-gray-500" />
                    {existingEvent?.region}
                  </span>
                  {existingEvent?.city && existingEvent.city !== 'Whole Region' && existingEvent.city !== 'N/A' && (
                    <span className="text-sm font-medium px-2.5 py-1 bg-gray-100 rounded-md flex items-center gap-1.5">
                      <MapPin size={14} className="text-gray-500" />
                      {existingEvent.city}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 mt-4">
                <CalendarIcon size={24} className="mt-1 text-gray-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-gray-800">
                    {startDate === endDate ? startDate : `${startDate} to ${endDate}`}
                  </span>
                  <span className="text-lg font-semibold text-gray-700 mt-0.5">
                    {isAllDay ? 'All day' : `${startTime} - ${endTime}`}
                  </span>
                </div>
              </div>
              {recurrence !== 'none' && (
                <div className="flex items-center gap-2 text-gray-500 mt-2 text-sm">
                  <Repeat size={16} />
                  <span className="capitalize">Repeats {recurrence}</span>
                </div>
              )}
            </div>

            {description && (
              <div className="flex items-start gap-2 text-gray-700">
                <AlignLeft size={18} className="text-gray-400 mt-0.5 shrink-0" />
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{description}</p>
              </div>
            )}
          </div>
          
          <div className="flex justify-between items-center pt-4 border-t border-gray-100 mt-6">
            <button 
              type="button" 
              onClick={() => setIsSuggestingEdit(true)}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
            >
              Suggest Edit
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Close</button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 relative" noValidate>
          <p className="text-xs text-gray-500 italic">* Indicates a required field</p>
          <div className="space-y-1">
            <label className={`text-xs font-semibold uppercase tracking-wider ${formErrors.title ? 'text-red-500' : 'text-gray-500'}`}>Event Title *</label>
            <div className="relative">
                <div className={`absolute top-2.5 left-3 pointer-events-none ${formErrors.title ? 'text-red-400' : 'text-gray-400'}`}>
                    <Type size={16} />
                </div>
                <textarea
                    ref={titleTextareaRef}
                    required
                    value={title}
                    onChange={(e) => {
                        setTitle(e.target.value);
                        if (formErrors.title) setFormErrors(prev => ({ ...prev, title: false }));
                    }}
                    placeholder="Add title"
                    rows={1}
                    className={`w-full pl-10 pr-3 py-2 text-gray-700 bg-gray-50 border rounded-lg focus:ring-2 focus:outline-none transition-all resize-none overflow-hidden ${
                        formErrors.title 
                            ? 'border-red-300 focus:ring-red-500 bg-red-50' 
                            : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
                    }`}
                />
            </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
             <div className="space-y-1">
                <label className={`text-xs font-semibold uppercase tracking-wider ${formErrors.startDate ? 'text-red-500' : 'text-gray-500'}`}>Start *</label>
                <div className="flex flex-col sm:flex-row gap-2">
                     <div 
                        className={`relative group flex-grow flex items-center border rounded-lg h-10 pl-10 focus-within:ring-2 focus-within:ring-blue-500 transition-all ${
                            formErrors.startDate 
                                ? 'border-red-300 bg-red-50' 
                                : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                        }`}
                        ref={startDateRef}
                     >
                        <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10 ${formErrors.startDate ? 'text-red-400' : 'text-gray-400'}`}>
                            <CalendarIcon size={16} />
                        </div>
                        <DateInput 
                            dateStr={startDate}
                            hasError={formErrors.startDate}
                            onChange={(iso) => {
                                setStartDate(iso);
                                if (formErrors.startDate) setFormErrors(prev => ({ ...prev, startDate: false }));
                                if (!endDate || new Date(iso) > new Date(endDate)) setEndDate(iso);
                            }}
                            onFocus={() => openCalendar('start')}
                            onComplete={() => isAllDay ? endDayInputRef.current?.focus() : startHourRef.current?.focus()}
                        />
                         {activeDateField === 'start' && (
                            <div className={`absolute left-0 z-50 ${calendarPos === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
                                 <MiniCalendar 
                                    initialDate={startDate ? new Date(startDate) : new Date()} 
                                    onSelectDate={(d) => {
                                        handleDateSelect('start', d);
                                        if (formErrors.startDate) setFormErrors(prev => ({ ...prev, startDate: false }));
                                    }} 
                                />
                            </div>
                        )}
                     </div>
                     {!isAllDay && (
                        <TimeSelect 
                            value={startTime} 
                            onChange={(val) => {
                                setStartTime(val);
                                if (formErrors.startTime) setFormErrors(prev => ({ ...prev, startTime: false }));
                            }} 
                            inputRef={startHourRef}
                            onBlur={handleStartTimeBlur}
                            hasError={formErrors.startTime}
                        />
                     )}
                </div>
            </div>

            <div className="space-y-1">
                <label className={`text-xs font-semibold uppercase tracking-wider ${formErrors.endDate ? 'text-red-500' : 'text-gray-500'}`}>End *</label>
                <div className="flex flex-col sm:flex-row gap-2 items-start">
                     <div 
                        className={`relative group flex-grow flex items-center border rounded-lg h-10 pl-10 focus-within:ring-2 focus-within:ring-blue-500 transition-all w-full ${
                            formErrors.endDate 
                                ? 'border-red-300 bg-red-50' 
                                : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                        }`}
                        ref={endDateRef}
                    >
                        <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10 ${formErrors.endDate ? 'text-red-400' : 'text-gray-400'}`}>
                            <CalendarIcon size={16} />
                        </div>
                         <DateInput 
                            dateStr={endDate}
                            hasError={formErrors.endDate}
                            onChange={(iso) => {
                                setEndDate(iso);
                                if (formErrors.endDate) setFormErrors(prev => ({ ...prev, endDate: false }));
                            }}
                            onFocus={() => openCalendar('end')}
                            inputRef={endDayInputRef}
                            onComplete={() => !isAllDay && endHourRef.current?.focus()}
                        />
                        {activeDateField === 'end' && (
                            <div className={`absolute left-0 z-50 ${calendarPos === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
                                <MiniCalendar 
                                    initialDate={endDate ? new Date(endDate) : new Date()} 
                                    onSelectDate={(d) => {
                                        handleDateSelect('end', d);
                                        if (formErrors.endDate) setFormErrors(prev => ({ ...prev, endDate: false }));
                                    }} 
                                />
                            </div>
                        )}
                    </div>
                    {!isAllDay && (
                         <div className="relative w-full sm:w-auto">
                            <TimeSelect 
                                value={endTime} 
                                onChange={(val) => {
                                    setEndTime(val);
                                    if (formErrors.endTime) setFormErrors(prev => ({ ...prev, endTime: false }));
                                }}
                                inputRef={endHourRef}
                                hasError={!!timeError || formErrors.endTime}
                            />
                            {timeError && (
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-20 w-max max-w-[200px]">
                                     <div className="bg-red-50 text-red-600 text-[10px] font-medium px-2 py-1 rounded-md border border-red-200 shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                                        <AlertCircle size={12} className="shrink-0" />
                                        <span>{timeError}</span>
                                     </div>
                                </div>
                            )}
                         </div>
                    )}
                </div>
            </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
                <label htmlFor="isAllDay" className="relative flex items-center gap-2 cursor-pointer group">
                    <input 
                        type="checkbox" 
                        id="isAllDay"
                        checked={isAllDay}
                        onChange={(e) => setIsAllDay(e.target.checked)}
                        className="sr-only"
                    />
                    <div className={`
                        w-5 h-5 flex items-center justify-center rounded border-2 transition-all
                        ${isAllDay ? 'bg-white border-gray-900' : 'bg-white border-gray-300 group-hover:border-gray-400'}
                    `}>
                        {isAllDay && <Check size={14} className="text-black stroke-[3.5px]" />}
                    </div>
                    <span className="text-sm text-gray-700 font-medium select-none">All day</span>
                </label>
            </div>

            <div className="flex items-center gap-2">
                <div className="text-gray-400">
                    <Repeat size={16} />
                </div>
                <select
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
                    className="bg-transparent border-none text-sm text-gray-700 font-medium focus:ring-0 cursor-pointer outline-none"
                >
                    <option value="none">No repeat</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                </select>
            </div>
        </div>

        <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</label>
            <div className="relative">
                 <div className="absolute top-2.5 left-3 flex items-start pointer-events-none text-gray-400">
                    <AlignLeft size={16} />
                </div>
                <textarea
                    ref={descriptionTextareaRef}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add description"
                    rows={1}
                    className="w-full pl-10 pr-3 py-2 text-gray-700 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none overflow-hidden"
                />
            </div>
        </div>

        <div className="space-y-1">
            <label className={`text-xs font-semibold uppercase tracking-wider ${formErrors.region ? 'text-red-500' : 'text-gray-500'}`}>Region *</label>
            <div className="relative">
                <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${formErrors.region ? 'text-red-400' : 'text-gray-400'}`}>
                    <Globe size={16} />
                </div>
                <select
                    value={region}
                    onChange={(e) => {
                        const newRegion = e.target.value as Region;
                        setRegion(newRegion);
                        if (newRegion === Region.OUTSIDE_SHIMANE) {
                            setCity('N/A');
                        } else {
                            setCity('Whole Region');
                        }
                        if (formErrors.region) setFormErrors(prev => ({ ...prev, region: false }));
                    }}
                    className={`w-full pl-10 pr-8 py-2 text-gray-700 bg-gray-50 border rounded-lg focus:ring-2 focus:outline-none appearance-none transition-all cursor-pointer ${
                        formErrors.region 
                            ? 'border-red-300 focus:ring-red-500 bg-red-50' 
                            : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
                    }`}
                >
                    <option value="" disabled hidden>Select one</option>
                    {Object.values(Region).map((r) => (
                        <option key={r} value={r}>{r}</option>
                    ))}
                </select>
                 <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                    <ChevronDown size={16} />
                 </div>
            </div>
        </div>

        {region !== Region.OUTSIDE_SHIMANE && (
        <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">City</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <MapPin size={16} />
                </div>
                <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full pl-10 pr-8 py-2 text-gray-700 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none transition-all cursor-pointer"
                >
                    {region ? REGION_CITIES[region as Region]?.filter(c => c !== 'N/A').map((c) => (
                        <option key={c} value={c}>{c}</option>
                    )) : (
                        <option value="Whole Region">Whole Region</option>
                    )}
                </select>
                 <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                    <ChevronDown size={16} />
                </div>
            </div>
        </div>
        )}

        <div className="space-y-1">
            <label className={`text-xs font-semibold uppercase tracking-wider ${formErrors.type ? 'text-red-500' : 'text-gray-500'}`}>Type *</label>
            <div className="relative">
                <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${formErrors.type ? 'text-red-400' : 'text-gray-400'}`}>
                    <Type size={16} />
                </div>
                <select
                    value={type}
                    onChange={(e) => {
                        setType(e.target.value as 'JET' | 'AJET' | 'Other');
                        if (formErrors.type) setFormErrors(prev => ({ ...prev, type: false }));
                    }}
                    className={`w-full pl-10 pr-8 py-2 text-gray-700 bg-gray-50 border rounded-lg focus:ring-2 focus:outline-none appearance-none transition-all cursor-pointer ${
                        formErrors.type 
                            ? 'border-red-300 focus:ring-red-500 bg-red-50' 
                            : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
                    }`}
                >
                    <option value="" disabled hidden>Select one</option>
                    <option value="JET">JET</option>
                    <option value="AJET">AJET</option>
                    <option value="Other">Other</option>
                </select>
                 <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                    <ChevronDown size={16} />
                 </div>
            </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-gray-100 mt-2">
            {isDeleteConfirmOpen ? (
                <div className="flex flex-col sm:flex-row items-center justify-between w-full animate-in fade-in slide-in-from-left-2 bg-red-50 p-2 rounded-lg border border-red-100 gap-2 sm:gap-0">
                    <span className="text-sm font-semibold text-red-700 flex items-center gap-2">
                        <AlertCircle size={16} />
                        Confirm deletion?
                    </span>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button 
                            type="button"
                            onClick={() => setIsDeleteConfirmOpen(false)}
                            className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="button"
                            onClick={() => onDelete && existingEvent && onDelete(existingEvent)}
                            className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors shadow-sm"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Left Side: Delete Button */}
                    <div className="w-full sm:w-auto">
                        {isAdmin && existingEvent && onDelete && (
                            <button 
                                type="button" 
                                onClick={() => setIsDeleteConfirmOpen(true)}
                                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <Trash2 size={16} />
                                Delete
                            </button>
                        )}
                    </div>

                    {/* Right Side: Action Buttons */}
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button 
                            type="button" 
                            onClick={() => {
                                if (!isAdmin && existingEvent && isSuggestingEdit) {
                                    setIsSuggestingEdit(false);
                                } else {
                                    onClose();
                                }
                            }} 
                            className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={!isFormValid}
                            className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm ${!isFormValid ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {isAdmin 
                                ? (existingEvent ? 'Update Event' : 'Create Event') 
                                : (existingEvent ? 'Request Edit' : 'Propose')
                            }
                        </button>
                    </div>
                </>
            )}
        </div>
      </form>
      )}
    </Modal>
  );
};