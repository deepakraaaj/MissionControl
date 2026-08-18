import { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Pin, 
  Search, 
  User, 
  BookOpen,
  Edit3,
} from 'lucide-react';
import { useTeamStore } from './team-store';
import type { TeamNote } from './team-types';

interface TeamNotesViewProps {
  filterMissionId?: string;
}

export function TeamNotesView({ filterMissionId }: TeamNotesViewProps) {
  const teamNotes = useTeamStore((s) => s.teamNotes);
  const teamMissions = useTeamStore((s) => s.teamMissions);
  const addTeamNote = useTeamStore((s) => s.addTeamNote);
  const updateTeamNote = useTeamStore((s) => s.updateTeamNote);
  const deleteTeamNote = useTeamStore((s) => s.deleteTeamNote);
  const activePersona = useTeamStore((s) => s.activePersona);

  const [selectedMissionFilter, setSelectedMissionFilter] = useState<string>(
    filterMissionId || 'all'
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedNoteId, setSelectedNoteId] = useState<string>(
    teamNotes[0]?.id || ''
  );

  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<TeamNote['category']>('Playbook');
  const [missionId, setMissionId] = useState(
    filterMissionId || teamMissions[0]?.id || ''
  );


  const filteredNotes = teamNotes.filter((n) => {
    const matchesMission =
      filterMissionId ? n.missionId === filterMissionId : selectedMissionFilter === 'all' || n.missionId === selectedMissionFilter;
    const matchesCategory = selectedCategory === 'all' || n.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMission && matchesCategory && matchesSearch;
  });

  const activeNote =
    teamNotes.find((n) => n.id === selectedNoteId) || filteredNotes[0] || null;

  const handleStartCreate = () => {
    setTitle('');
    setContent('');
    setCategory('Playbook');
    setMissionId(filterMissionId || teamMissions[0]?.id || '');
    setIsCreating(true);
    setIsEditing(false);
  };

  const handleStartEdit = (note: TeamNote) => {
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category);
    setMissionId(note.missionId);
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !missionId) return;

    if (isCreating) {
      const created = addTeamNote({
        missionId,
        title: title.trim(),
        content: content.trim(),
        category,
        author: activePersona.name,
        pinned: false,
      });
      setSelectedNoteId(created.id);
      setIsCreating(false);
    } else if (isEditing && activeNote) {
      updateTeamNote(activeNote.id, {
        title: title.trim(),
        content: content.trim(),
        category,
        missionId,
      });
      setIsEditing(false);
    }
  };

  const togglePin = (note: TeamNote) => {
    updateTeamNote(note.id, { pinned: !note.pinned });
  };

  const getMissionName = (mId: string) => {
    return teamMissions.find((m) => m.id === mId)?.title || 'Project';
  };

  const getCategoryBadge = (cat: TeamNote['category']) => {
    switch (cat) {
      case 'Playbook':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'Strategy':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'Field Intel':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'Meeting':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Actions Header */}
      <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                Team Notes & Knowledge Base
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                  {filteredNotes.length} Docs
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Shared playbooks, field visit debriefs, partner meeting notes, and SOP documentation.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={!teamMissions.length}
            onClick={handleStartCreate}
            title={teamMissions.length ? 'Create note' : 'Create a project from the Mission tab first'}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-teal-500/20 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Team Note</span>
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2">
            {!filterMissionId && (
              <select
                value={selectedMissionFilter}
                onChange={(e) => setSelectedMissionFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500 font-medium cursor-pointer"
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
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500 font-medium cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="Playbook">Playbooks</option>
              <option value="Field Intel">Field Intel</option>
              <option value="Strategy">Strategy</option>
              <option value="Meeting">Meeting Notes</option>
              <option value="General">General</option>
            </select>
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search team notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Main Split View: Note List + Note Reader / Editor */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Note List (4 cols) */}
        <div className="md:col-span-5 space-y-2.5">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
              <FileText className="w-8 h-8 text-slate-600 mb-2" />
              <h5 className="text-xs font-semibold text-slate-300">No Notes Found</h5>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Create playbooks, partner notes, or field debriefs.
              </p>
            </div>
          ) : (
            filteredNotes.map((note) => {
              const isSelected = activeNote?.id === note.id && !isCreating;
              return (
                <div
                  key={note.id}
                  onClick={() => {
                    setSelectedNoteId(note.id);
                    setIsCreating(false);
                    setIsEditing(false);
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    isSelected
                      ? 'bg-teal-500/10 border-teal-500/60 shadow-md'
                      : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {note.pinned && <Pin className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                        <span
                          className={`text-[9px] px-2 py-0.2 rounded-full border font-mono uppercase font-bold ${getCategoryBadge(
                            note.category
                          )}`}
                        >
                          {note.category}
                        </span>
                        {!filterMissionId && (
                          <span className="text-[10px] text-slate-400 font-mono truncate">
                            {getMissionName(note.missionId)}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-white truncate">{note.title}</h4>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePin(note);
                      }}
                      className={`p-1 rounded-lg transition-colors ${
                        note.pinned ? 'text-amber-400 hover:text-amber-300' : 'text-slate-600 hover:text-slate-400'
                      }`}
                      title={note.pinned ? 'Unpin Note' : 'Pin Note'}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {note.content.replace(/[#*`_]/g, '')}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px] text-slate-500 font-mono">
                    <span className="flex items-center gap-1 text-slate-400">
                      <User className="w-3 h-3 text-teal-400" /> {note.author}
                    </span>
                    <span>{note.updatedAt ? new Date(note.updatedAt).toLocaleDateString() : ''}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Note Reader / Editor (7 cols) */}
        <div className="md:col-span-7">
          {isCreating || isEditing ? (
            <form
              onSubmit={handleSave}
              className="p-5 bg-slate-900 border border-teal-500/40 rounded-2xl space-y-4 shadow-xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="text-xs font-bold text-teal-400 uppercase tracking-wider font-mono">
                  {isCreating ? 'Create New Team Note' : 'Edit Team Note'}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setIsEditing(false);
                  }}
                  className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-medium">Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pitch Script & Objection Handling for Turf Owners"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-medium">Project</label>
                  <select
                    value={missionId}
                    onChange={(e) => setMissionId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                  >
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
                    onChange={(e) => setCategory(e.target.value as TeamNote['category'])}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="Playbook">Playbook</option>
                    <option value="Field Intel">Field Intel</option>
                    <option value="Strategy">Strategy</option>
                    <option value="Meeting">Meeting</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-medium">
                  Content (Markdown Supported)
                </label>
                <textarea
                  rows={12}
                  required
                  placeholder="Write documentation, scripts, partner decisions..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 font-mono leading-relaxed resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {isCreating ? 'Publish Team Note' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : activeNote ? (
            <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full border font-mono uppercase font-bold ${getCategoryBadge(
                        activeNote.category
                      )}`}
                    >
                      {activeNote.category}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                      {getMissionName(activeNote.missionId)}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white tracking-tight leading-snug">
                    {activeNote.title}
                  </h2>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                    <span>Logged by <strong>{activeNote.author}</strong></span>
                    <span>•</span>
                    <span>Updated {new Date(activeNote.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(activeNote)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Edit Note"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTeamNote(activeNote.id)}
                    className="p-2 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl transition-colors cursor-pointer"
                    title="Delete Note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Content Body */}
              <div className="prose prose-invert max-w-none text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {activeNote.content}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
              <BookOpen className="w-10 h-10 text-slate-600 mb-3" />
              <h4 className="text-sm font-semibold text-slate-300">Select a Note to Read</h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Choose any playbook, field intel report, or strategic document from the left list.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
