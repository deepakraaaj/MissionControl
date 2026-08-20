import { useState } from 'react';
import { 
  Phone, 
  Building2, 
  User, 
  MapPin, 
  Plus, 
  Trash2, 
  Clock,
  Search,
  ExternalLink,
  Pencil,
  X
} from 'lucide-react';
import { useTeamStore } from './team-store';
import { DiscussButton } from './DiscussButton';
import type { Lead, LeadCategory, LeadStatus } from './team-types';
import { confirmDialog } from '../../components/ui/native-dialog';

interface LeadsCRMViewProps {
  missionId?: string;
}

const STATUS_CONFIG: Record<LeadStatus, { label: string; bg: string; text: string; border: string }> = {
  new: { label: 'New Lead', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  contacted: { label: 'Contacted', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  meeting_set: { label: 'Meeting Set', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  active_pilot: { label: 'Trial', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  paid_client: { label: 'Paid Client', bg: 'bg-green-500/20', text: 'text-green-300', border: 'border-green-500/40' },
  lost: { label: 'Lost / Closed', bg: 'bg-slate-800', text: 'text-slate-400', border: 'border-slate-700' },
};

export function LeadsCRMView({ missionId }: LeadsCRMViewProps) {
  const leads = useTeamStore((s) => s.leads);
  const teamMissions = useTeamStore((s) => s.teamMissions);
  const updateLeadStatus = useTeamStore((s) => s.updateLeadStatus);
  const updateLead = useTeamStore((s) => s.updateLead);
  const deleteLead = useTeamStore((s) => s.deleteLead);
  const addLead = useTeamStore((s) => s.addLead);
  const activePersona = useTeamStore((s) => s.activePersona);

  const [selectedMissionFilter, setSelectedMissionFilter] = useState<string>(
    missionId || 'all'
  );
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);

  // Form State
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [locationUrl, setLocationUrl] = useState('');
  const [leadNotes, setLeadNotes] = useState('');
  const [category, setCategory] = useState<LeadCategory>('Turf');
  const [targetMissionId, setTargetMissionId] = useState(
    missionId || teamMissions[0]?.id || ''
  );
  const hasProjects = teamMissions.length > 0;


  const activeLeads = leads.filter((l) => {
    const matchesMission =
      missionId ? l.missionId === missionId : selectedMissionFilter === 'all' || l.missionId === selectedMissionFilter;
    const matchesStatus = filterStatus === 'all' || l.status === filterStatus;
    const missionName = teamMissions.find((mission) => mission.id === l.missionId)?.title || '';
    const haystack = [l.businessName, l.ownerName, l.phone, l.location, l.locationUrl, l.notes, missionName]
      .join(' ')
      .toLowerCase();
    return matchesMission && matchesStatus && haystack.includes(searchQuery.trim().toLowerCase());
  });

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !targetMissionId) return;
    const existingLead = editingLeadId ? leads.find((lead) => lead.id === editingLeadId) : undefined;

    const leadData = {
      missionId: targetMissionId,
      businessName: businessName.trim(),
      category,
      ownerName: ownerName.trim() || 'Owner/Manager',
      phone: phone.trim(),
      location: location.trim() || 'Field Visit',
      locationUrl: locationUrl.trim() || undefined,
      status: existingLead?.status || 'contacted',
      notes: leadNotes.trim(),
      nextFollowUp: existingLead?.nextFollowUp || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdBy: existingLead?.createdBy || activePersona.name,
    };

    if (editingLeadId) updateLead(editingLeadId, leadData);
    else addLead(leadData);

    setBusinessName('');
    setOwnerName('');
    setPhone('');
    setLocation('');
    setLocationUrl('');
    setLeadNotes('');
    setIsAdding(false);
    setEditingLeadId(null);
  };

  const openEditor = (lead: Lead) => {
    setEditingLeadId(lead.id);
    setBusinessName(lead.businessName);
    setOwnerName(lead.ownerName);
    setPhone(lead.phone);
    setLocation(lead.location);
    setLocationUrl(lead.locationUrl || '');
    setLeadNotes(lead.notes);
    setCategory(lead.category);
    setTargetMissionId(lead.missionId);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeEditor = () => {
    setIsAdding(false);
    setEditingLeadId(null);
    setBusinessName('');
    setOwnerName('');
    setPhone('');
    setLocation('');
    setLocationUrl('');
    setLeadNotes('');
  };

  const getLocationHref = (lead: Lead) =>
    lead.locationUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.location)}`;

  const getMissionName = (mId: string) => {
    return teamMissions.find((m) => m.id === mId)?.title || 'Project';
  };

  return (
    <div className="w-full min-w-0 space-y-4 overflow-x-hidden">
      {/* Top Filter Bar */}
      <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-3 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-3 sm:space-y-0 sm:p-4">
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
          {!missionId && (
            <select
              value={selectedMissionFilter}
              onChange={(e) => setSelectedMissionFilter(e.target.value)}
              className="h-10 min-h-0 max-w-full shrink-0 cursor-pointer rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 focus:border-emerald-500 focus:outline-none"
            >
              <option value="all">All projects</option>
              {teamMissions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          )}

          <select
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
            aria-label="Filter leads by stage"
            className="h-10 min-h-0 min-w-0 flex-1 cursor-pointer rounded-xl border border-borderSoft/35 bg-panel2/55 px-3 text-xs font-medium text-text-primary outline-none focus:border-emerald-500 sm:hidden"
          >
            <option value="all">All stages ({leads.filter((lead) => (missionId ? lead.missionId === missionId : true)).length})</option>
            {(['active_pilot', 'meeting_set', 'contacted', 'new', 'paid_client'] as LeadStatus[]).map((status) => {
              const count = leads.filter((lead) => (missionId ? lead.missionId === missionId : true) && lead.status === status).length;
              return <option key={status} value={status}>{STATUS_CONFIG[status].label} ({count})</option>;
            })}
          </select>

          <div className="hidden min-w-0 items-center gap-1 overflow-x-auto overscroll-x-contain pb-1 scrollbar-none sm:flex sm:w-auto sm:flex-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({leads.filter((l) => (missionId ? l.missionId === missionId : true)).length})
            </button>
            {(['active_pilot', 'meeting_set', 'contacted', 'new', 'paid_client'] as LeadStatus[]).map((st) => {
              const count = leads
                .filter((l) => (missionId ? l.missionId === missionId : true))
                .filter((l) => l.status === st).length;
              const cfg = STATUS_CONFIG[st];
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all border cursor-pointer whitespace-nowrap ${
                    filterStatus === st
                      ? `${cfg.bg} ${cfg.text} ${cfg.border} font-bold`
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cfg.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
          <label className="relative min-w-0 flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search business, owner, phone, location…" className="w-full rounded-xl border border-borderSoft/40 bg-panel2/55 py-2 pl-9 pr-9 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-emerald-500" />
            {searchQuery && <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary" aria-label="Clear search"><X className="h-4 w-4" /></button>}
          </label>
        <button
          type="button"
          disabled={!hasProjects}
          title={hasProjects ? 'Add lead' : 'Create a project from the Mission tab first'}
          onClick={() => { if (isAdding) closeEditor(); else setIsAdding(true); }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-accent hover:bg-accentSoft text-[rgb(var(--accent-contrast))] font-bold text-xs rounded-xl shadow-glow transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Lead</span>
        </button>
        </div>
      </div>

      {/* Add Lead Form */}
      {isAdding && (
        <form
          onSubmit={handleCreateLead}
          className="p-4 bg-slate-900 border border-emerald-500/40 rounded-2xl space-y-3 animate-in fade-in shadow-xl"
        >
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
            {editingLeadId ? 'Edit Lead Details' : 'Log New Venue / Commercial Lead'}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-medium">Business / Venue Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Champions Turf Arena"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-[11px] text-slate-400 font-medium">Google Maps / WhatsApp Location Link</label>
              <input
                type="url"
                placeholder="Paste a maps.app.goo.gl, google.com/maps, or WhatsApp location URL"
                value={locationUrl}
                onChange={(e) => setLocationUrl(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-slate-500">Open the shared location, copy its link, and paste it here. The address stays searchable separately.</p>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-medium">Owner / Manager Name</label>
              <input
                type="text"
                placeholder="e.g. Rajesh Kumar"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-medium">Contact Phone</label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-medium">Project</label>
              <select
                value={targetMissionId}
                onChange={(e) => setTargetMissionId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="" disabled>Select a project</option>
                {teamMissions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-medium">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as LeadCategory)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Turf">Turf</option>
                <option value="Gym">Gym</option>
                <option value="Retail">Retail</option>
                <option value="Seasonal">Seasonal</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-medium">Location / Area</label>
              <input
                type="text"
                placeholder="e.g. Indiranagar 100ft Rd"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-medium">Field Notes & Observations</label>
            <textarea
              rows={2}
              placeholder="e.g. 2 pitches, struggles with Friday cancellation, interested in UPI split link..."
              value={leadNotes}
              onChange={(e) => setLeadNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={closeEditor}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-accent hover:bg-accentSoft text-[rgb(var(--accent-contrast))] font-bold text-xs rounded-xl shadow-glow transition-all cursor-pointer"
            >
              {editingLeadId ? 'Save Changes' : 'Save Lead to Pipeline'}
            </button>
          </div>
        </form>
      )}

      {/* Leads List */}
      {activeLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
          <Building2 className="w-10 h-10 text-slate-600 mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">No Leads in this Stage</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Use the Quick Log button to log venue contacts from the field.
          </p>
        </div>
      ) : (
        <>
        <div className="hidden overflow-hidden rounded-2xl border border-borderSoft/30 bg-panel/40 md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead className="border-b border-borderSoft/30 bg-panel2/45 text-xs font-semibold uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Follow-up</th>
                  <th className="px-4 py-3 text-right">Value</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderSoft/25">
                {activeLeads.map((lead) => {
                  const cfg = STATUS_CONFIG[lead.status];
                  return (
                    <tr key={lead.id} className="transition-colors hover:bg-panel/65">
                      <td className="px-4 py-4 align-top">
                        <div className="font-semibold text-text-primary">{lead.businessName}</div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-text-muted">
                          <span className="rounded-full bg-panel2/65 px-2 py-0.5">{lead.category}</span>
                          <a href={getLocationHref(lead)} target="_blank" rel="noreferrer" className="flex max-w-[260px] items-center gap-1 truncate text-blue-500 hover:underline" title="Open location in Maps"><MapPin className="h-3 w-3 shrink-0" />{lead.location}<ExternalLink className="h-3 w-3 shrink-0" /></a>
                        </div>
                        {lead.notes && <p className="mt-2 max-w-md line-clamp-1 text-xs text-text-muted" title={lead.notes}>{lead.notes}</p>}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex items-center gap-1.5 text-sm text-text-primary"><User className="h-3.5 w-3.5 text-text-muted" />{lead.ownerName}</div>
                        <a href={`tel:${lead.phone}`} className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:underline"><Phone className="h-3.5 w-3.5" />{lead.phone || 'No phone'}</a>
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-text-secondary">{getMissionName(lead.missionId)}</td>
                      <td className="px-4 py-4 align-top">
                        <select value={lead.status} onChange={(event) => updateLeadStatus(lead.id, event.target.value as LeadStatus)} className={`rounded-xl border px-2.5 py-1.5 text-xs font-bold uppercase focus:outline-none ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                          <option value="new">New Lead</option><option value="contacted">Contacted</option><option value="meeting_set">Meeting Set</option><option value="active_pilot">Trial</option><option value="paid_client">Paid Client</option><option value="lost">Lost</option>
                        </select>
                      </td>
                      <td className="px-4 py-4 align-top">
                        {lead.nextFollowUp ? <span className="flex items-center gap-1.5 text-sm text-text-secondary"><Clock className="h-3.5 w-3.5 text-amber-500" />{lead.nextFollowUp}</span> : <span className="text-sm text-text-muted">Not scheduled</span>}
                      </td>
                      <td className="px-4 py-4 text-right align-top text-sm font-semibold text-text-primary">{lead.monthlyValue ? `₹${lead.monthlyValue.toLocaleString()}/mo` : '—'}</td>
                      <td className="px-4 py-4 align-top"><div className="flex justify-end gap-1"><button type="button" onClick={() => openEditor(lead)} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-500 hover:bg-blue-500/10" aria-label={`Edit ${lead.businessName}`}><Pencil className="h-3.5 w-3.5" />Edit</button><DiscussButton item={{ kind: 'lead', id: lead.id, label: lead.businessName, detail: lead.status }} /><button type="button" onClick={() => { void confirmDialog(`Delete lead “${lead.businessName}”?`, { title: 'Delete lead', confirmLabel: 'Delete', danger: true }).then((ok) => { if (ok) deleteLead(lead.id); }); }} className="rounded-lg p-1.5 text-text-muted hover:bg-rose-500/10 hover:text-rose-500" aria-label={`Delete ${lead.businessName}`}><Trash2 className="h-4 w-4" /></button></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid w-full min-w-0 grid-cols-1 gap-3 overflow-hidden md:hidden">
          {activeLeads.map((lead) => {
            const cfg = STATUS_CONFIG[lead.status];
            return (
              <div
                key={lead.id}
                className="min-w-0 space-y-3 overflow-hidden rounded-2xl border border-borderSoft/35 bg-panel/70 p-3.5 shadow-sm transition-colors hover:border-borderSoft/60 hover:bg-panel"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-panel2 px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                        {lead.category}
                      </span>
                      {!missionId && (
                        <span className="max-w-[140px] truncate text-[10px] text-text-muted">
                          {getMissionName(lead.missionId)}
                        </span>
                      )}
                    </div>
                    <h4 className="truncate text-[15px] font-bold text-text-primary">{lead.businessName}</h4>
                  </div>

                  <select
                    value={lead.status}
                    onChange={(e) => updateLeadStatus(lead.id, e.target.value as LeadStatus)}
                    aria-label={`Stage for ${lead.businessName}`}
                    className={`h-10 min-h-0 w-[114px] shrink-0 cursor-pointer rounded-xl border px-2.5 py-1 text-[11px] font-bold uppercase focus:outline-none ${cfg.bg} ${cfg.text} ${cfg.border}`}
                  >
                    <option value="new">New Lead</option>
                    <option value="contacted">Contacted</option>
                    <option value="meeting_set">Meeting Set</option>
                    <option value="active_pilot">Trial</option>
                    <option value="paid_client">Paid Client</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>

                {/* Contact & Location Info */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-text-secondary">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <User className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                    <span className="truncate">{lead.ownerName}</span>
                  </div>

                  <div className="flex min-w-0 items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    <a href={`tel:${lead.phone}`} className="truncate font-medium text-emerald-600 hover:underline">
                      {lead.phone || 'No phone'}
                    </a>
                  </div>

                  <a href={getLocationHref(lead)} target="_blank" rel="noreferrer" className="col-span-2 flex min-w-0 items-center gap-1.5 text-blue-500 hover:underline">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                    <span className="truncate">{lead.location}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>

                {/* Notes */}
                {lead.notes && (
                  <p className="rounded-xl border border-borderSoft/30 bg-panel2/55 p-2.5 text-xs leading-relaxed text-text-secondary">
                    {lead.notes}
                  </p>
                )}

                {/* Footer Info */}
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 border-t border-borderSoft/30 pt-3">
                  <div className="min-w-0">
                    {lead.nextFollowUp ? (
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500"><Clock className="h-3.5 w-3.5" /></span>
                        <span className="min-w-0"><span className="block text-[9px] font-semibold uppercase tracking-wider text-text-muted">Next follow-up</span><span className="block truncate text-xs font-medium text-text-primary">{lead.nextFollowUp}</span></span>
                      </div>
                    ) : <span className="text-xs text-text-muted">No follow-up scheduled</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    {lead.monthlyValue ? <span className="mr-1 whitespace-nowrap text-xs font-bold text-emerald-600">₹{lead.monthlyValue.toLocaleString()}/mo</span> : null}
                    <button type="button" onClick={() => openEditor(lead)} className="flex h-9 min-h-0 w-9 min-w-0 items-center justify-center rounded-lg text-blue-500 hover:bg-blue-500/10" aria-label={`Edit ${lead.businessName}`}><Pencil className="h-4 w-4" /></button>
                  <button
                    type="button"
                    onClick={() => { void confirmDialog(`Delete lead “${lead.businessName}”?`, { title: 'Delete lead', confirmLabel: 'Delete', danger: true }).then((ok) => { if (ok) deleteLead(lead.id); }); }}
                    className="flex h-9 min-h-0 w-9 min-w-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-500"
                    aria-label={`Delete ${lead.businessName}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </>
      )}
    </div>
  );
}
