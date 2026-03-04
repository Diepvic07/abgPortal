'use client';

import { useRef, useCallback } from 'react';

interface FilterValues {
  name: string;
  role: string;
  company: string;
  country: string;
  abg_class: string;
  expertise: string;
}

interface AdminMemberFiltersProps {
  filters: FilterValues;
  onFilterChange: (filters: FilterValues) => void;
  dropdownOptions: { countries: string[]; classes: string[]; industries: string[] };
}

export function AdminMemberFilters({ filters, onFilterChange, dropdownOptions }: AdminMemberFiltersProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const handleTextChange = useCallback((field: keyof FilterValues, value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onFilterChange({ ...filters, [field]: value });
    }, 300);
  }, [filters, onFilterChange]);

  const handleSelectChange = useCallback((field: keyof FilterValues, value: string) => {
    onFilterChange({ ...filters, [field]: value });
  }, [filters, onFilterChange]);

  const clearAll = () => {
    onFilterChange({ name: '', role: '', company: '', country: '', abg_class: '', expertise: '' });
  };

  const inputClass = 'w-full rounded-md bg-white border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none';
  const selectClass = 'w-full rounded-md bg-white border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none';

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input className={inputClass} placeholder="Search by name..." defaultValue={filters.name}
          onChange={e => handleTextChange('name', e.target.value)} />
        <input className={inputClass} placeholder="Search by title/role..." defaultValue={filters.role}
          onChange={e => handleTextChange('role', e.target.value)} />
        <input className={inputClass} placeholder="Search by company..." defaultValue={filters.company}
          onChange={e => handleTextChange('company', e.target.value)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <select className={selectClass} value={filters.country} onChange={e => handleSelectChange('country', e.target.value)}>
          <option value="">All Countries</option>
          {dropdownOptions.countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className={selectClass} value={filters.abg_class} onChange={e => handleSelectChange('abg_class', e.target.value)}>
          <option value="">All Classes</option>
          {dropdownOptions.classes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className={selectClass} value={filters.expertise} onChange={e => handleSelectChange('expertise', e.target.value)}>
          <option value="">All Industries</option>
          {dropdownOptions.industries.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
      </div>
      <button onClick={clearAll} className="text-sm text-gray-500 hover:text-gray-700 underline">
        Clear all filters
      </button>
    </div>
  );
}
