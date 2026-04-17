
import React from 'react';
import { Filter } from 'lucide-react';
import { Region, REGION_CITIES, EventCategory } from '../types';

interface FilterDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRegionFilter: Region | 'All';
  setSelectedRegionFilter: (region: Region | 'All') => void;
  selectedCityFilter: string;
  setSelectedCityFilter: (city: string) => void;
  selectedTypeFilters: EventCategory[];
  setSelectedTypeFilters: (updater: (prev: EventCategory[]) => EventCategory[]) => void;
  showNationalHolidays: boolean;
  setShowNationalHolidays: (show: boolean) => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

export const FilterDropdown: React.FC<FilterDropdownProps> = ({
  isOpen,
  onClose,
  selectedRegionFilter,
  setSelectedRegionFilter,
  selectedCityFilter,
  setSelectedCityFilter,
  selectedTypeFilters,
  setSelectedTypeFilters,
  showNationalHolidays,
  setShowNationalHolidays,
  containerRef,
  className = ""
}) => {
  if (!isOpen) return null;

  return (
    <div 
        className={`absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 p-4 z-50 animate-in fade-in slide-in-from-top-2 ${className}`}
        ref={containerRef as any}
    >
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
                        setSelectedTypeFilters(() => []);
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
  );
};
