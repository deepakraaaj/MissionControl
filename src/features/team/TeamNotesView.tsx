import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { FileText, Pin, Plus, Search } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { NoteCategoryIcon } from '../notes/note-helpers';
import { CategoryChip, NoteCard, NoteEditorModal, NoteViewerModal } from '../notes/NotesView';
import type { Note, NoteCategory } from '../notes/note-types';
import { useTeamStore } from './team-store';
import type { TeamNote } from './team-types';
import { confirmDialog } from '../../components/ui/native-dialog';

interface TeamNotesViewProps {
  filterMissionId?: string;
}

/**
 * The project notes tab is the personal Notes surface backed by team data.
 * Every piece of UI here — cards, chips, viewer, editor — is the component
 * from `features/notes`; this file only translates between `TeamNote` and
 * the `Note` shape those components already speak.
 */

const CATEGORY_META: Record<TeamNote['category'], { color: NoteCategory['color']; icon: string }> = {
  Playbook: { color: 'amber', icon: 'BookOpen' },
  Meeting: { color: 'purple', icon: 'Users' },
  'Field Intel': { color: 'green', icon: 'MapPin' },
  Strategy: { color: 'blue', icon: 'Flag' },
  General: { color: 'slate', icon: 'FileText' },
};

const TEAM_CATEGORIES: NoteCategory[] = (Object.keys(CATEGORY_META) as TeamNote['category'][]).map(
  (label, index) => ({
    id: label,
    label,
    color: CATEGORY_META[label].color,
    icon: CATEGORY_META[label].icon,
    sort_order: index,
    created_at: '',
    updated_at: '',
  }),
);

const isTeamCategory = (id: string): id is TeamNote['category'] => id in CATEGORY_META;

const toNote = (note: TeamNote): Note => ({
  id: note.id,
  title: note.title,
  content: note.content,
  category_id: note.category,
  mission_id: note.missionId,
  pinned: Boolean(note.pinned),
  sort_order: 0,
  created_at: note.createdAt,
  updated_at: note.updatedAt,
});

export function TeamNotesView({ filterMissionId }: TeamNotesViewProps) {
  const teamNotes = useTeamStore((s) => s.teamNotes);
  const teamMissions = useTeamStore((s) => s.teamMissions);
  const addTeamNote = useTeamStore((s) => s.addTeamNote);
  const updateTeamNote = useTeamStore((s) => s.updateTeamNote);
  const deleteTeamNote = useTeamStore((s) => s.deleteTeamNote);
  const activePersona = useTeamStore((s) => s.activePersona);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const scoped = useMemo(
    () => (filterMissionId ? teamNotes.filter((n) => n.missionId === filterMissionId) : teamNotes),
    [teamNotes, filterMissionId],
  );

  const notes = useMemo(() => scoped.map(toNote), [scoped]);

  const missionTitles = useMemo(
    () => Object.fromEntries(teamMissions.map((mission) => [mission.id, mission.title])),
    [teamMissions],
  );

  const pinnedCount = notes.filter((note) => note.pinned).length;
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    notes.forEach((note) => {
      counts[note.category_id] = (counts[note.category_id] ?? 0) + 1;
    });
    return counts;
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return notes
      .filter((note) => {
        if (activeCategoryId === 'pinned') return note.pinned;
        if (activeCategoryId !== 'all' && note.category_id !== activeCategoryId) return false;
        return true;
      })
      .filter(
        (note) =>
          !query ||
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query),
      )
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at));
  }, [notes, activeCategoryId, searchQuery]);

  const categoryOf = (note: Note) =>
    TEAM_CATEGORIES.find((category) => category.id === note.category_id) ?? TEAM_CATEGORIES[4];

  const viewing = viewingId ? notes.find((note) => note.id === viewingId) ?? null : null;
  const editing = editingId ? notes.find((note) => note.id === editingId) ?? null : null;

  const togglePin = (id: string) => {
    const note = scoped.find((item) => item.id === id);
    if (note) updateTeamNote(id, { pinned: !note.pinned });
  };

  const submitNote = async (draft: {
    title: string;
    content: string;
    category_id: string;
    mission_id: string | null;
    pinned: boolean;
  }) => {
    const category = isTeamCategory(draft.category_id) ? draft.category_id : 'General';
    const missionId = draft.mission_id ?? filterMissionId ?? teamMissions[0]?.id;
    if (!missionId) return;

    if (editing) {
      updateTeamNote(editing.id, {
        title: draft.title,
        content: draft.content,
        category,
        pinned: draft.pinned,
        missionId,
      });
      setEditingId(null);
      return;
    }

    addTeamNote({
      missionId,
      title: draft.title,
      content: draft.content,
      category,
      pinned: draft.pinned,
      author: activePersona.name,
    });
    setIsCreating(false);
  };

  return (
    <div className="space-y-4 bg-panel bg-dots-glow">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted/50" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="h-10 rounded-full pl-10 text-[13px]"
            />
          </div>
          <Button onClick={() => setIsCreating(true)} size="md" type="button" className="shrink-0 text-[13px] font-medium">
            <Plus className="h-4 w-4" />
            New note
          </Button>
        </div>
      </div>

      <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
        <CategoryChip active={activeCategoryId === 'all'} label="All" count={notes.length} onClick={() => setActiveCategoryId('all')} />
        <CategoryChip
          active={activeCategoryId === 'pinned'}
          label="Pinned"
          icon={<Pin className="h-3 w-3" />}
          count={pinnedCount}
          onClick={() => setActiveCategoryId('pinned')}
        />
        {TEAM_CATEGORIES.map((category) => (
          <CategoryChip
            key={category.id}
            active={activeCategoryId === category.id}
            label={category.label}
            icon={<NoteCategoryIcon icon={category.icon} className="h-3 w-3" />}
            color={category.color}
            count={categoryCounts[category.id] ?? 0}
            onClick={() => setActiveCategoryId(category.id)}
          />
        ))}
      </div>

      {filteredNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-borderSoft/30 bg-panel/15 px-6 py-16 text-center">
          <FileText className="h-10 w-10 text-text-muted/50" />
          <p className="mt-3 text-sm font-medium text-text-primary">No notes yet</p>
          <p className="mt-1 max-w-xs text-[13px] text-text-secondary">
            {notes.length === 0
              ? 'Capture playbooks, meeting notes, and field intel where the whole team can find them.'
              : 'Try a different search or category.'}
          </p>
          {notes.length === 0 && (
            <Button onClick={() => setIsCreating(true)} size="sm" type="button" className="mt-4 text-[13px] font-medium">
              <Plus className="h-4 w-4" />
              New note
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          <AnimatePresence>
            {filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                category={categoryOf(note)}
                missionTitle={filterMissionId ? null : missionTitles[note.mission_id ?? ''] ?? null}
                onView={(target) => setViewingId(target.id)}
                onEdit={(target) => {
                  setViewingId(null);
                  setEditingId(target.id);
                }}
                onDelete={(id) => { const note = notes.find((item) => item.id === id); void confirmDialog(`Delete note “${note?.title || 'Untitled'}”?`, { title: 'Delete note', confirmLabel: 'Delete', danger: true }).then((ok) => { if (ok) deleteTeamNote(id); }); }}
                onTogglePin={togglePin}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {viewing && (
          <NoteViewerModal
            note={viewing}
            category={categoryOf(viewing)}
            missionTitle={filterMissionId ? null : missionTitles[viewing.mission_id ?? ''] ?? null}
            onClose={() => setViewingId(null)}
            onEdit={(target) => {
              setViewingId(null);
              setEditingId(target.id);
            }}
            onTogglePin={togglePin}
          />
        )}
      </AnimatePresence>

      {(isCreating || editing) && (
        <NoteEditorModal
          mode={editing ? 'edit' : 'create'}
          note={editing ?? undefined}
          categories={TEAM_CATEGORIES}
          missions={filterMissionId ? [] : teamMissions.map((m) => ({ id: m.id, title: m.title }))}
          defaultCategoryId="General"
          onClose={() => {
            setIsCreating(false);
            setEditingId(null);
          }}
          onSubmit={submitNote}
        />
      )}
    </div>
  );
}
