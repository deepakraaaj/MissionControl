import { useMemo, useState } from 'react';
import { ExternalLink, Globe, Code2, Palette, FileText, Pencil, Plus, Trash2, Folder, Link2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTeamStore } from './team-store';
import { DiscussButton } from './DiscussButton';
import type { WorkLink, WorkLinkCategory } from './team-types';
import { confirmDialog } from '../../components/ui/native-dialog';

interface WorkLinksViewProps {
  missionId: string;
}

const CATEGORY_CONFIG: Record<WorkLinkCategory, { label: string; icon: LucideIcon; color: string; border: string }> = {
  demo: { label: 'Live Demo / Vercel', icon: Globe, color: 'text-emerald-400 bg-emerald-500/20', border: 'border-emerald-500/30' },
  repo: { label: 'Source Code / GitHub', icon: Code2, color: 'text-slate-200 bg-slate-800', border: 'border-slate-700' },
  design: { label: 'Design / Figma', icon: Palette, color: 'text-purple-400 bg-purple-500/20', border: 'border-purple-500/30' },
  doc: { label: 'Document / Terms', icon: FileText, color: 'text-blue-400 bg-blue-500/20', border: 'border-blue-500/30' },
  drive: { label: 'Assets / Drive', icon: Folder, color: 'text-amber-400 bg-amber-500/20', border: 'border-amber-500/30' },
};

export function WorkLinksView({ missionId }: WorkLinksViewProps) {
  const workLinks = useTeamStore((s) => s.workLinks);
  const addWorkLink = useTeamStore((s) => s.addWorkLink);
  const updateWorkLink = useTeamStore((s) => s.updateWorkLink);
  const deleteWorkLink = useTeamStore((s) => s.deleteWorkLink);
  const activePersona = useTeamStore((s) => s.activePersona);
  const missionLinks = useMemo(
    () => workLinks.filter((w) => w.missionId === missionId),
    [missionId, workLinks],
  );

  // One group per category, in the order CATEGORY_CONFIG declares, skipping
  // categories this project has no links for.
  const groups = useMemo(
    () =>
      (Object.keys(CATEGORY_CONFIG) as WorkLinkCategory[])
        .map((key) => ({ key, links: missionLinks.filter((link) => link.category === key) }))
        .filter((group) => group.links.length > 0),
    [missionLinks],
  );

  const [isAdding, setIsAdding] = useState(false);
  /** Link being edited; null means the form is in "add" mode. */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<WorkLinkCategory>('demo');
  const [description, setDescription] = useState('');

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setUrl('');
    setDescription('');
    setCategory('demo');
    setIsAdding(false);
  };

  const startEdit = (link: WorkLink) => {
    setEditingId(link.id);
    setTitle(link.title);
    setUrl(link.url);
    setCategory(link.category);
    setDescription(link.description ?? '');
    setIsAdding(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;

    const fields = {
      title: title.trim(),
      url: url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`,
      category,
      description: description.trim(),
    };

    if (editingId) updateWorkLink(editingId, fields);
    else addWorkLink({ missionId, ...fields, addedBy: activePersona.name });

    resetForm();
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800">
        <div>
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <Link2 className="w-4 h-4 text-cyan-400" />
            <span>Work Links & Live Prototypes</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              {missionLinks.length} Links
            </span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Quick-access links to live mobile prototypes, GitHub repositories, and field agreement documents.
          </p>
        </div>

        <button
          type="button"
          onClick={() => (isAdding ? resetForm() : setIsAdding(true))}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/20 hover:bg-accent/30 text-accent text-xs font-semibold rounded-xl border border-accent/40 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {isAdding ? 'Cancel' : 'Add Link'}
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="p-4 bg-slate-900 border border-accent/40 rounded-2xl space-y-3 animate-in fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Mobile Slot Booking Demo (Vercel)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">URL *</label>
              <input
                type="text"
                required
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as WorkLinkCategory)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-accent"
              >
                <option value="demo">Live Demo / Vercel</option>
                <option value="repo">Source Code / GitHub</option>
                <option value="design">Design / Figma</option>
                <option value="doc">Document / Terms</option>
                <option value="drive">Assets / Drive</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Description (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Show this demo on mobile during owner visits"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-accent hover:bg-accentSoft text-[rgb(var(--accent-contrast))] font-bold text-xs rounded-xl shadow-lg transition-colors"
          >
            {editingId ? 'Update Link' : 'Save Link'}
          </button>
        </form>
      )}

      {/* Links, grouped by category */}
      {groups.map((group) => {
        const cfg = CATEGORY_CONFIG[group.key];
        const IconComp = cfg.icon;

        return (
          <section key={group.key} className="space-y-2.5">
            <div className="flex items-center gap-2 px-0.5">
              <span className={`p-1.5 rounded-lg border ${cfg.color} ${cfg.border}`}>
                <IconComp className="w-3.5 h-3.5" />
              </span>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                {cfg.label}
              </h4>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                {group.links.length}
              </span>
              <span className="h-px flex-1 bg-slate-800" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {group.links.map((link) => (
                <div
                  key={link.id}
                  className="p-4 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all shadow-md flex items-start justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`p-2 rounded-xl border ${cfg.color} ${cfg.border} flex-shrink-0 mt-0.5`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-accent transition-colors">
                        {link.title}
                      </h4>
                      {link.description && (
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                          {link.description}
                        </p>
                      )}
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold text-accent hover:underline"
                      >
                        Open Link <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-0.5">
                    <DiscussButton
                      className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                      item={{ kind: 'link', id: link.id, label: link.title, detail: link.category }}
                    />
                    <button
                      type="button"
                      onClick={() => startEdit(link)}
                      className="p-1.5 text-slate-500 opacity-100 transition-opacity hover:text-accent lg:opacity-0 lg:group-hover:opacity-100"
                      title="Edit Link"
                      aria-label={`Edit ${link.title}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => { void confirmDialog(`Delete link “${link.title}”?`, { title: 'Delete link', confirmLabel: 'Delete', danger: true }).then((ok) => { if (ok) deleteWorkLink(link.id); }); }}
                      className="p-1.5 text-slate-500 opacity-100 transition-opacity hover:text-rose-400 lg:opacity-0 lg:group-hover:opacity-100"
                      title="Delete Link"
                      aria-label={`Delete ${link.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

    </div>
  );
}
