import { useState, type DragEvent } from 'react';
import { AlertOctagon, CheckCircle2, Plus, Search, Trash2 } from 'lucide-react';
import { useTeamStore } from './team-store';
import type { ProblemItem, ProblemSeverity, ProblemStatus } from './team-types';

interface ProblemBankViewProps { missionId?: string }

const severityStyle: Record<ProblemSeverity, string> = {
  blocker: 'border-rose-500/40 bg-rose-500/12 text-rose-600',
  friction: 'border-amber-500/40 bg-amber-500/12 text-amber-600',
  idea: 'border-blue-500/40 bg-blue-500/12 text-blue-600',
};

const columns: Array<{ status: ProblemStatus; label: string; caption: string; dot: string }> = [
  { status: 'open', label: 'Open', caption: 'Needs triage', dot: 'bg-rose-500' },
  { status: 'investigating', label: 'Investigating', caption: 'Finding the cause', dot: 'bg-amber-500' },
  { status: 'solved', label: 'Solved', caption: 'Reusable learning', dot: 'bg-emerald-500' },
];

export function ProblemBankView({ missionId }: ProblemBankViewProps) {
  const problems = useTeamStore((s) => s.problems);
  const missions = useTeamStore((s) => s.teamMissions);
  const updateStatus = useTeamStore((s) => s.updateProblemStatus);
  const deleteProblem = useTeamStore((s) => s.deleteProblem);
  const addProblem = useTeamStore((s) => s.addProblem);
  const persona = useTeamStore((s) => s.activePersona);
  const [venture, setVenture] = useState(missionId ?? 'all');
  const [severityFilter, setSeverityFilter] = useState<'all' | ProblemSeverity>('all');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropStatus, setDropStatus] = useState<ProblemStatus | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState('');
  const [audience, setAudience] = useState('Venue Owner');
  const [severity, setSeverity] = useState<ProblemSeverity>('friction');
  const [target, setTarget] = useState(missionId ?? missions[0]?.id ?? '');
  const hasProjects = missions.length > 0;


  const visible = problems.filter((problem) => {
    const text = `${problem.title} ${problem.description} ${problem.source} ${problem.audienceCategory}`.toLowerCase();
    return (missionId ? problem.missionId === missionId : venture === 'all' || problem.missionId === venture)
      && (severityFilter === 'all' || problem.severity === severityFilter)
      && (!query.trim() || text.includes(query.toLowerCase()));
  });
  const missionName = (id: string) => missions.find((item) => item.id === id)?.title ?? 'Project';

  const createProblem = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !target) return;
    addProblem({ missionId: target, audienceCategory: audience || 'Customer', title: title.trim(), description: description.trim() || title.trim(), source: source.trim() || 'Team observation', severity, status: 'open', tags: [severity], loggedBy: persona.name });
    setTitle(''); setDescription(''); setSource(''); setAdding(false);
  };
  const drop = (event: DragEvent<HTMLElement>, status: ProblemStatus) => {
    event.preventDefault();
    const id = draggedId || event.dataTransfer.getData('text/plain');
    if (id) updateStatus(id, status);
    setDraggedId(null); setDropStatus(null);
  };

  const card = (problem: ProblemItem) => (
    <article key={problem.id} draggable onDragStart={(event) => { setDraggedId(problem.id); event.dataTransfer.setData('text/plain', problem.id); }} onDragEnd={() => { setDraggedId(null); setDropStatus(null); }} className={`group rounded-2xl border border-borderSoft/35 bg-panel p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-borderSoft/60 hover:shadow-md ${draggedId === problem.id ? 'opacity-40' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5"><span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase ${severityStyle[problem.severity]}`}>{problem.severity}</span><span className="rounded-full bg-panel2/65 px-2 py-0.5 text-[11px] text-text-secondary">{problem.audienceCategory}</span></div>
        <button type="button" onClick={() => deleteProblem(problem.id)} className="rounded-lg p-1.5 text-text-muted opacity-100 hover:bg-rose-500/10 hover:text-rose-500 lg:opacity-0 lg:group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
      </div>
      <h3 className="mt-3 text-[15px] font-bold leading-snug text-text-primary">{problem.title}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-text-secondary">{problem.description}</p>
      {problem.solvedNotes && <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3"><div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Resolution</div><p className="mt-1 text-sm leading-relaxed text-text-primary">{problem.solvedNotes}</p></div>}
      <div className="mt-4 border-t border-borderSoft/25 pt-3"><div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-text-muted"><strong className="text-text-secondary">{missionName(problem.missionId)}</strong><span>·</span><span>{problem.source}</span><span>·</span><span>{problem.loggedBy}</span></div><select value={problem.status} onChange={(event) => updateStatus(problem.id, event.target.value as ProblemStatus)} className="mt-3 w-full rounded-xl border border-borderSoft/35 bg-panel2/55 px-3 py-2 text-sm text-text-primary lg:hidden">{columns.map((column) => <option key={column.status} value={column.status}>{column.label}</option>)}</select></div>
    </article>
  );

  return <div className="space-y-4">
    <section className="rounded-2xl border border-borderSoft/30 bg-panel/45 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-500/25 bg-rose-500/10 text-rose-500"><AlertOctagon className="h-5 w-5" /></div><div><h2 className="text-base font-bold text-text-primary">Issues</h2><p className="mt-0.5 text-xs text-text-muted">Track problems, feedback, and ideas.</p></div></div><button type="button" disabled={!hasProjects} onClick={() => setAdding(!adding)} title={hasProjects ? 'Add issue' : 'Create a project from the Mission tab first'} className="flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-500/15 disabled:cursor-not-allowed disabled:opacity-45"><Plus className="h-4 w-4" /> Add issue</button></div>
      {!hasProjects && <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-500"><strong>No projects in this room yet.</strong> Open the Mission tab and create your first project before logging issues.</div>}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-borderSoft/25 pt-3">
        {!missionId && <select value={venture} onChange={(e) => setVenture(e.target.value)} className="rounded-xl border border-borderSoft/35 bg-panel2/55 px-3 py-2 text-sm text-text-primary"><option value="all">All projects</option>{missions.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>}
        <div className="flex rounded-xl border border-borderSoft/30 bg-panel2/35 p-1">{(['all', 'blocker', 'friction', 'idea'] as const).map((item) => <button key={item} type="button" onClick={() => setSeverityFilter(item)} className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize ${severityFilter === item ? 'bg-panel text-text-primary shadow-sm' : 'text-text-muted'}`}>{item}</button>)}</div>
        <div className="relative min-w-[210px] flex-1 sm:ml-auto sm:max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search issues" className="w-full rounded-xl border border-borderSoft/35 bg-panel2/55 py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted" /></div>
      </div>
    </section>
    {adding && <form onSubmit={createProblem} className="grid grid-cols-1 gap-3 rounded-2xl border border-rose-500/30 bg-panel/60 p-4 sm:grid-cols-2 lg:grid-cols-4"><input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What happened?" className="rounded-xl border border-borderSoft/35 bg-panel2/55 px-3 py-2.5 text-sm text-text-primary sm:col-span-2" /><select required value={target} onChange={(e) => setTarget(e.target.value)} className="rounded-xl border border-borderSoft/35 bg-panel2/55 px-3 py-2.5 text-sm text-text-primary"><option value="" disabled>Select a project</option>{missions.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><select value={severity} onChange={(e) => setSeverity(e.target.value as ProblemSeverity)} className="rounded-xl border border-borderSoft/35 bg-panel2/55 px-3 py-2.5 text-sm text-text-primary"><option value="blocker">Blocker</option><option value="friction">Friction</option><option value="idea">Idea</option></select><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Context and impact" className="resize-none rounded-xl border border-borderSoft/35 bg-panel2/55 px-3 py-2.5 text-sm text-text-primary sm:col-span-2" /><input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Who experienced it?" className="rounded-xl border border-borderSoft/35 bg-panel2/55 px-3 py-2.5 text-sm text-text-primary" /><input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source / meeting" className="rounded-xl border border-borderSoft/35 bg-panel2/55 px-3 py-2.5 text-sm text-text-primary" /><div className="flex justify-end gap-2 sm:col-span-2 lg:col-span-4"><button type="button" onClick={() => setAdding(false)} className="px-4 py-2 text-sm text-text-muted">Cancel</button><button type="submit" disabled={!target} className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">Add to Open</button></div></form>}
    <p className="px-1 text-xs text-text-muted lg:hidden">Swipe columns · use the card menu to change status</p>
    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 scrollbar-none lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0">{columns.map((column) => { const items = visible.filter((problem) => problem.status === column.status); return <section key={column.status} onDragEnter={() => setDropStatus(column.status)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => drop(e, column.status)} className={`min-h-[520px] w-[calc(100vw-3rem)] max-w-[390px] shrink-0 snap-start rounded-2xl border p-3 sm:w-[390px] lg:w-auto lg:max-w-none ${dropStatus === column.status ? 'border-accent/55 bg-accent/8' : 'border-borderSoft/30 bg-panel/25'}`}><header className="mb-3 flex items-center justify-between px-1"><div><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${column.dot}`} /><h2 className="text-sm font-bold text-text-primary">{column.label}</h2></div><p className="ml-[18px] mt-0.5 text-[11px] text-text-muted">{column.caption}</p></div><span className="rounded-full bg-panel2/70 px-2.5 py-1 text-xs font-semibold text-text-secondary">{items.length}</span></header><div className="space-y-3">{items.map(card)}{!items.length && <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-borderSoft/30 text-xs text-text-muted">Drop problems here</div>}</div></section>; })}</div>
  </div>;
}
