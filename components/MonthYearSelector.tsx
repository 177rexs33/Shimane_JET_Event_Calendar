import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MONTH_NAMES } from '../utils/dateUtils';

interface MonthYearSelectorProps {
  currentDate: Date;
  onChange: (date: Date) => void;
}

export const MonthYearSelector: React.FC<MonthYearSelectorProps> = ({ currentDate, onChange }) => {
  const [viewYear, setViewYear] = useState(currentDate.getFullYear());

  const handleMonthSelect = (monthIndex: number) => {
    // Navigate to the selected month/year, resetting to day 1 to avoid overflow
    const newDate = new Date(viewYear, monthIndex, 1);
    onChange(newDate);
  };

  return (
      <div 
        className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl border border-gray-100 p-4 w-64 z-50 animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setViewYear(y => y - 1); }}
            className="p-1 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-lg font-bold text-gray-800 select-none">{viewYear}</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setViewYear(y => y + 1); }}
            className="p-1 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MONTH_NAMES.map((month, index) => (
            <button
              key={month}
              type="button"
              onClick={(e) => { e.stopPropagation(); handleMonthSelect(index); }}
              className={`
                p-2 rounded-lg text-sm font-medium transition-colors
                ${index === currentDate.getMonth() && viewYear === currentDate.getFullYear()
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              {month.substring(0, 3)}
            </button>
          ))}
        </div>
      </div>
  );
};