import { useState } from 'react';
import { 
  Plus, 
  X, 
  Zap, 
  AlertOctagon, 
  Building2, 
  CheckCircle2 
} from 'lucide-react';
import { useTeamStore } from './team-store';
import type { LeadCategory, ProblemSeverity } from './team-types';

interface PocketDropModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMissionId?: string;
}

export function PocketDropModal({ isOpen, onClose, defaultMissionId }: PocketDropModalProps) {
  const [tab, setTab] = useState<'lead' | 'problem'>('lead');
  const teamMissions = useTeamStore((s) => s.teamMissions);
  const activePersona = useTeamStore((s) => s.activePersona);
  const pocketDropLead = useTeamStore((s) => s.pocketDropLead);
  const pocketDropProblem = useTeamStore((s) => s.pocketDropProblem);

  const [selectedMissionId, setSelectedMissionId] = useState(
    defaultMissionId || (teamMissions[0]?.id ?? '')
  );


  // Lead Form
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [leadNotes, setLeadNotes] = useState('');
  const [category, setCategory] = useState<LeadCategory>('Turf');

  // Problem Form
  const [problemTitle, setProblemTitle] = useState('');
  const [problemDesc, setProblemDesc] = useState('');
  const [problemSource, setProblemSource] = useState('');
  const [severity, setSeverity] = useState<ProblemSeverity>('blocker');

  const [showSuccess, setShowSuccess] = useState(false);

  if (!isOpen) return null;

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !selectedMissionId) return;

    pocketDropLead({
      missionId: selectedMissionId,
      businessName: businessName.trim(),
      ownerName: ownerName.trim() || 'Owner/Manager',
      phone: phone.trim(),
      notes: leadNotes.trim(),
      category,
    });

    setBusinessName('');
    setOwnerName('');
    setPhone('');
    setLeadNotes('');
    triggerSuccess();
  };

  const handleProblemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemTitle.trim() || !selectedMissionId) return;

    pocketDropProblem({
      missionId: selectedMissionId,
      title: problemTitle.trim(),
      description: problemDesc.trim(),
      source: problemSource.trim() || activePersona.name,
      severity,
    });

    setProblemTitle('');
    setProblemDesc('');
    setProblemSource('');
    triggerSuccess();
  };

  const triggerSuccess = () => {
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onClose();
    }, 900);
  };

  return (
    <div className="team-workspace fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-5 sm:p-6 text-slate-100 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                Fast Field Drop
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-800 text-slate-400 font-mono">
                  {activePersona.name}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Log a commercial lead or client objection in seconds without friction.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector: Lead vs Problem */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setTab('lead')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              tab === 'lead'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Drop Lead Contact</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('problem')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              tab === 'problem'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertOctagon className="w-4 h-4" />
            <span>Drop Friction Point</span>
          </button>
        </div>

        {/* Mission / Venture Target */}
        <div className="space-y-1">
          <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
            Target Venture
          </label>
          <select
            value={selectedMissionId}
            onChange={(e) => setSelectedMissionId(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-medium text-slate-100 focus:outline-none focus:border-amber-500 transition-all cursor-pointer"
          >
            <option value="" disabled>{teamMissions.length ? 'Select a project' : 'Create a project first'}</option>
            {teamMissions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </div>

        {/* Form Body */}
        {tab === 'lead' ? (
          <form onSubmit={handleLeadSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-300">Venue / Business Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Indiranagar Arena"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-300">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as LeadCategory)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="Turf">Turf</option>
                  <option value="Gym">Gym</option>
                  <option value="Retail">Retail</option>
                  <option value="Seasonal">Seasonal</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-300">Contact / Manager Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rajesh Kumar"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-300">Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300">Quick Field Note</label>
              <textarea
                rows={2}
                placeholder="Met on site. Struggles with Friday no-shows. Open for pilot..."
                value={leadNotes}
                onChange={(e) => setLeadNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-2xl shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Fast Drop Lead Contact</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleProblemSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300">Objection / Friction Title</label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Reluctant to change from personal UPI QR"
                value={problemTitle}
                onChange={(e) => setProblemTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-300">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as ProblemSeverity)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
                >
                  <option value="blocker">High Blocker</option>
                  <option value="friction">Friction Point</option>
                  <option value="idea">Future Idea</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-300">Source Encounter</label>
                <input
                  type="text"
                  placeholder="e.g. Indiranagar Pitch Visit"
                  value={problemSource}
                  onChange={(e) => setProblemSource(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300">Details / What Happened</label>
              <textarea
                rows={2}
                placeholder="Owner hesitated because they fear money will be held..."
                value={problemDesc}
                onChange={(e) => setProblemDesc(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs rounded-2xl shadow-xl shadow-rose-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Fast Drop Problem Item</span>
            </button>
          </form>
        )}

        {/* Success Splash */}
        {showSuccess && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center p-6 space-y-2 animate-in zoom-in-95">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
            <h3 className="text-sm font-bold text-white">Item Logged Successfully</h3>
            <p className="text-xs text-slate-400 font-mono">Saved to the team workspace</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function PocketDropFAB() {
  const [open, setOpen] = useState(false);
  const workspaceMode = useTeamStore((s) => s.workspaceMode);
  const teamUnlocked = useTeamStore((s) => s.teamUnlocked);

  if (workspaceMode !== 'team' || !teamUnlocked) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-5 z-40 flex h-12 w-12 items-center justify-center gap-2 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500 to-amber-600 p-0 text-xs font-bold text-slate-950 shadow-2xl shadow-amber-500/30 transition-all hover:scale-105 hover:from-amber-400 hover:to-amber-500 active:scale-95 cursor-pointer lg:bottom-6 lg:right-24 lg:h-auto lg:w-auto lg:px-4 lg:py-3"
      >
        <Zap className="w-4 h-4 fill-slate-950" />
        <span className="hidden sm:inline">Quick Drop</span>
      </button>

      <PocketDropModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
