import { useState } from 'react';
import { 
  Users, 
  Plus, 
  ArrowRight, 
  Activity, 
  Dumbbell, 
  Tag, 
  Compass, 
  Layers
} from 'lucide-react';
import { useTeamStore } from './team-store';
import { UnifiedMissionHub } from './UnifiedMissionHub';
import type { TeamMissionItem } from './team-seed';
import { getActiveTeamRoom, useTeamRoomStore } from './team-room-store';

export function TeamHubView() {
  const teamMissions = useTeamStore((s) => s.teamMissions);
  const addTeamMission = useTeamStore((s) => s.addTeamMission);
  const roomState = useTeamRoomStore();
  const activeRoom = getActiveTeamRoom(roomState);
  const leads = useTeamStore((s) => s.leads);
  const teamTasks = useTeamStore((s) => s.teamTasks);
  const problems = useTeamStore((s) => s.problems);

  const [activeVentureDetail, setActiveVentureDetail] = useState<TeamMissionItem | null>(null);
  const [isCreatingVenture, setIsCreatingVenture] = useState(false);

  // New Venture Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newObjective, setNewObjective] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [newColor] = useState('emerald');

  const handleCreateVenture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const created = addTeamMission({
      title: newTitle.trim(),
      description: newDescription.trim(),
      iconName: 'Target',
      color: newColor,
      objective: newObjective.trim(),
      why_it_matters: 'Critical milestone for commercial validation and partner revenue.',
      definition_of_success: '3 paying pilot venues live and active.',
      status: 'active',
      is_pinned: false,
      target_date: newTargetDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      tags: ['Venture', 'Team-Priority'],
    });

    setNewTitle('');
    setNewDescription('');
    setNewObjective('');
    setNewTargetDate('');
    setIsCreatingVenture(false);
    setActiveVentureDetail(created);
  };

  const getVentureIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('turf')) return <Activity className="w-6 h-6 text-emerald-400" />;
    if (t.includes('gym')) return <Dumbbell className="w-6 h-6 text-blue-400" />;
    if (t.includes('deal') || t.includes('flash')) return <Tag className="w-6 h-6 text-amber-400" />;
    if (t.includes('popup') || t.includes('radar')) return <Compass className="w-6 h-6 text-purple-400" />;
    return <Layers className="w-6 h-6 text-cyan-400" />;
  };

  // If viewing a single venture's deep Unified Hub
  if (activeVentureDetail) {
    return (
      <UnifiedMissionHub
        mission={activeVentureDetail}
        onBack={() => setActiveVentureDetail(null)}
      />
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in">
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/55">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-white">Projects</h1>
              <p className="mt-1 text-sm text-text-secondary">
                {activeRoom?.name || 'Team room'} <span className="mx-1.5 text-text-muted">·</span> <span className="capitalize">{activeRoom?.role || 'member'}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCreatingVenture((value) => !value)}
            className="flex items-center gap-2 rounded-xl bg-accent hover:bg-accentSoft text-[rgb(var(--accent-contrast))] px-4 py-2.5 text-sm font-bold shadow-glow transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            New project
          </button>
        </div>
      </section>

      <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Active projects', teamMissions.filter((mission) => mission.status === 'active').length],
              ['Open tasks', teamTasks.filter((task) => task.status !== 'done').length],
              ['Active clients', leads.filter((lead) => lead.status === 'active_pilot').length],
              ['Open issues', problems.filter((problem) => problem.status !== 'solved').length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-borderSoft/40 bg-panel/65 px-4 py-4">
                <div className="text-2xl font-bold text-text-primary">{value}</div>
                <div className="mt-1 text-sm font-medium text-text-secondary">{label}</div>
              </div>
            ))}
          </div>

          {/* New Venture Form */}
          {isCreatingVenture && (
            <form
              onSubmit={handleCreateVenture}
              className="mx-auto max-w-4xl space-y-6 rounded-3xl border border-accent/35 bg-panel p-5 shadow-2xl shadow-black/20 animate-in fade-in sm:p-7"
            >
              <div className="border-b border-borderSoft/35 pb-5">
                <h2 className="text-xl font-bold text-text-primary">Create a new project</h2>
                <p className="mt-1 text-sm text-text-secondary">Add the basics now. You can add tasks, clients, files, and notes afterward.</p>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,1fr)_240px]">
                <div className="space-y-2">
                  <label htmlFor="team-project-name" className="block text-sm font-semibold text-text-primary">Project name <span className="text-rose-500">*</span></label>
                  <input
                    id="team-project-name"
                    type="text"
                    required
                    autoFocus
                    placeholder="Example: Website redesign"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="h-12 w-full rounded-xl border border-borderSoft/70 bg-panel2 px-4 text-base text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/15"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="team-project-date" className="block text-sm font-semibold text-text-primary">Due date <span className="font-normal text-text-muted">(optional)</span></label>
                  <input
                    id="team-project-date"
                    type="date"
                    value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    className="h-12 w-full rounded-xl border border-borderSoft/70 bg-panel2 px-4 text-base text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="team-project-summary" className="block text-sm font-semibold text-text-primary">Short description <span className="text-rose-500">*</span></label>
                <input
                  id="team-project-summary"
                  type="text"
                  required
                  placeholder="What are you delivering for the client?"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="h-12 w-full rounded-xl border border-borderSoft/70 bg-panel2 px-4 text-base text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/15"
                />
                <p className="text-xs text-text-muted">Keep it to one clear sentence.</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="team-project-goal" className="block text-sm font-semibold text-text-primary">Project goal <span className="font-normal text-text-muted">(optional)</span></label>
                <textarea
                  id="team-project-goal"
                  rows={4}
                  placeholder="What should be true when this project is finished?"
                  value={newObjective}
                  onChange={(e) => setNewObjective(e.target.value)}
                  className="w-full resize-y rounded-xl border border-borderSoft/70 bg-panel2 px-4 py-3 text-base leading-relaxed text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/15"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-borderSoft/35 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsCreatingVenture(false)}
                  className="h-11 rounded-xl px-5 text-sm font-semibold text-text-secondary transition-colors hover:bg-panel2 hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-11 rounded-xl bg-accent hover:bg-accentSoft text-[rgb(var(--accent-contrast))] px-6 text-sm font-bold shadow-glow transition-all"
                >
                  Create project
                </button>
              </div>
            </form>
          )}

          {/* Ventures Cards Grid */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {teamMissions.map((mission) => {
              const missionTasks = teamTasks.filter((t) => t.missionId === mission.id);
              const missionLeads = leads.filter((l) => l.missionId === mission.id);
              const missionProblems = problems.filter((p) => p.missionId === mission.id);
              const completedTasks = missionTasks.filter((t) => t.status === 'done').length;
              const taskProgress = missionTasks.length > 0 ? Math.round((completedTasks / missionTasks.length) * 100) : 0;

              return (
                <div
                  key={mission.id}
                  onClick={() => setActiveVentureDetail(mission)}
                  className="group rounded-2xl border border-slate-800 bg-slate-900/55 p-4 transition-colors hover:border-slate-700 hover:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-950">
                        {getVentureIcon(mission.title)}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">
                          {mission.title}
                        </h4>
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{mission.description}</p>
                      </div>
                    </div>

                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors group-hover:bg-slate-800 group-hover:text-white">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>

                  {mission.objective && (
                    <p className="mt-4 line-clamp-2 text-xs leading-relaxed text-slate-300">
                      <span className="text-slate-500">Objective · </span>
                      {mission.objective}
                    </p>
                  )}

                  <div className="mt-4 flex items-center gap-4 border-t border-slate-800/70 pt-3 text-xs text-slate-400">
                    <span><strong className="font-medium text-slate-200">{taskProgress}%</strong> complete</span>
                    <span><strong className="font-medium text-slate-200">{missionLeads.length}</strong> leads</span>
                    <span><strong className="font-medium text-slate-200">{missionProblems.length}</strong> issues</span>
                    <span className="ml-auto rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase text-emerald-400">
                      {mission.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
      </div>

    </div>
  );
}
