'use client';

import { useEffect, useState, useCallback } from 'react';
import { Member } from '@/types';
import { AdminMemberFilters } from './admin-member-filters';
import { AdminMemberCard } from './admin-member-card';
import { AdminMemberModal } from './admin-member-modal';

interface FilterValues {
  name: string;
  role: string;
  company: string;
  country: string;
  abg_class: string;
  expertise: string;
}

interface DropdownOptions {
  countries: string[];
  classes: string[];
  industries: string[];
}

const emptyFilters: FilterValues = { name: '', role: '', company: '', country: '', abg_class: '', expertise: '' };

export function AdminMemberDirectory() {
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<FilterValues>(emptyFilters);
  const [dropdownOptions, setDropdownOptions] = useState<DropdownOptions>({ countries: [], classes: [], industries: [] });
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async (f: FilterValues) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f.name) params.set('name', f.name);
      if (f.role) params.set('role', f.role);
      if (f.company) params.set('company', f.company);
      if (f.country) params.set('country', f.country);
      if (f.abg_class) params.set('abg_class', f.abg_class);
      if (f.expertise) params.set('expertise', f.expertise);

      const res = await fetch(`/api/admin/members/search?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setMembers(data.members || []);
      setTotal(data.total || 0);
      if (data.filters) setDropdownOptions(data.filters);
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMembers(emptyFilters); }, [fetchMembers]);

  const handleFilterChange = useCallback((newFilters: FilterValues) => {
    setFilters(newFilters);
    fetchMembers(newFilters);
  }, [fetchMembers]);

  return (
    <div className="space-y-6">
      <AdminMemberFilters filters={filters} onFilterChange={handleFilterChange} dropdownOptions={dropdownOptions} />

      <div className="text-sm text-gray-400">
        Showing {members.length} of {total} members
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading members...</div>
      ) : members.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No members found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map(member => (
            <AdminMemberCard key={member.id} member={member} onSelect={setSelectedMember} />
          ))}
        </div>
      )}

      <AdminMemberModal member={selectedMember} onClose={() => setSelectedMember(null)} />
    </div>
  );
}
