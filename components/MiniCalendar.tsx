import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { generateCalendarGrid, MONTH_NAMES, WEEK_DAYS, isSameDay, getEnglishHolidayName, getCustomHoliday, isCustomHoliday } from '../utils/dateUtils';

interface MiniCalendarProps {
  initialDate: Date;
  onSelectDate: (date: Date) => void;
  holidays?: Record<string, string>;
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({ initialDate, onSelectDate, holidays }) => {
  // If initialDate is invalid (empty input), default view to today
  const safeInitialDate = isNaN(initialDate.getTime()) ? new Date() : initialDate;
  const [viewDate, setViewDate] = useState(new Date(safeInitialDate));
  
  useEffect(() => {
    if (!isNaN(initialDate.getTime())) {
        setViewDate(new Date(initialDate));
    }
  }, [initialDate]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const grid = generateCalendarGrid(viewDate);

  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-3 w-64 select-none">
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
            <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-gray-800">
            {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
        </span>
        <button type="button" onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
            <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEK_DAYS.map(d => (
            <div key={d} className="text-center text-[10px] font-medium text-gray-400">
                {d.charAt(0)}
            </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {grid.map((cell, idx) => {
            const isValidInitial = !isNaN(initialDate.getTime());
            const isSelected = isValidInitial && isSameDay(cell.date, initialDate);
            const isToday = isSameDay(cell.date, new Date());
            
            const dateString = `${cell.date.getFullYear()}-${String(cell.date.getMonth() + 1).padStart(2, '0')}-${String(cell.date.getDate()).padStart(2, '0')}`;
            const holidayName = holidays ? (holidays[dateString] || getCustomHoliday(dateString)) : getCustomHoliday(dateString);
            const isCustom = holidayName ? isCustomHoliday(holidayName) : false;
            
            let baseColorClasses = !cell.isCurrentMonth ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-100';
            let holidayClasses = '';
            let selectedClasses = '';
            let todayClasses = '';

            if (holidayName) {
                if (!cell.isCurrentMonth) {
                    baseColorClasses = isCustom ? 'text-orange-300 bg-orange-50/50' : 'text-red-300 bg-red-50/50';
                } else {
                    baseColorClasses = isCustom ? 'text-orange-600 bg-orange-50 hover:bg-orange-100' : 'text-red-600 bg-red-50 hover:bg-red-100';
                }
            }

            if (isSelected) {
                if (holidayName) {
                    selectedClasses = isCustom ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-sm ring-2 ring-orange-200 ring-offset-1' : 'bg-red-600 text-white hover:bg-red-700 shadow-sm ring-2 ring-red-200 ring-offset-1';
                } else {
                    selectedClasses = 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm ring-2 ring-blue-200 ring-offset-1';
                }
            } else if (isToday) {
                if (holidayName) {
                    todayClasses = isCustom ? 'font-bold ring-2 ring-orange-400 text-orange-700' : 'font-bold ring-2 ring-red-400 text-red-700';
                } else {
                    todayClasses = 'text-blue-600 font-semibold bg-blue-50 ring-1 ring-blue-200';
                }
            }

            return (
                <button
                    key={idx}
                    type="button"
                    title={holidayName ? getEnglishHolidayName(holidayName) : undefined}
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelectDate(cell.date);
                    }}
                    className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs transition-all ${baseColorClasses} ${selectedClasses} ${todayClasses}`}
                >
                    {cell.date.getDate()}
                </button>
            )
        })}
      </div>
    </div>
  );
};