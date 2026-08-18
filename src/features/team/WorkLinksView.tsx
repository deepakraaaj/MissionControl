import { useState } from 'react';
import { ExternalLink, Globe, Code2, Palette, FileText, Plus, Trash2, Folder, Link2 } from 'lucide-react';
import { useTeamStore } from './team-store';
import type { WorkLink, WorkLinkCategory } from './team-types';

interface WorkLinksViewProps {
  missionId: string;
}

const CATEGORY_CONFIG: Record<WorkLinkCategory, { label: string; icon: any; color: string; border: string }> = {
  demo: { label: 'Live Demo / Vercel', icon: Globe, color: 'text-emerald-400 bg-emerald-500/20', border: 'border-emerald-500/30' },
  repo: { label: 'Source Code / GitHub', icon: Code2, color: 'text-slate-200 bg-slate-800', border: 'border-slate-700' },
  design: { label: 'Design / Figma', icon: Palette, color: 'text-purple-400 bg-purple-500/20', border: 'border-purple-500/30' },
  doc: { label: 'Document / Terms', icon: FileText, color: 'text-blue-400 bg-blue-500/20', border: 'border-blue-500/30' },
  drive: { label: 'Assets / Drive', icon: Folder, color: 'text-amber-400 bg-amber-500/20', border: 'border-amber-500/30' },
};

export function WorkLinksView({ missionId }: WorkLinksViewProps) {
  const workLinks = useTeamStore((s) => s.workLinks);
  const addWorkLink = useTeamStore((s) => s.addWorkLink);
  const deleteWorkLink = useTeamStore((s) => s.deleteWorkLink);
  const activePersona = useTeamStore((s) => s.activePersona);
  const missionLinks = workLinks.filter((w) => w.missionId === missionId);

  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<WorkLinkCategory>('demo');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;

    addWorkLink({
      missionId,
      title: title.trim(),
      url: url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`,
      category,
      description: description.trim(),
      addedBy: activePersona.name,
    });

    setTitle('');
    setUrl('');
    setDescription('');
    setIsAdding(false);
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
          onClick={() => setIsAdding(!isAdding)}
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
            className="w-full py-2 bg-accent hover:bg-accent/90 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-colors"
          >
            Save Link
          </button>
        </form>
      )}

      {/* Links Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {missionLinks.map((link) => {
          const cfg = CATEGORY_CONFIG[link.category] || CATEGORY_CONFIG.demo;
          const IconComp = cfg.icon;

          return (
            <div
              key={link.id}
              className="p-4 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all shadow-md flex items-start justify-between gap-3 group"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className={`p-2 rounded-xl border ${cfg.color} ${cfg.border} flex-shrink-0 mt-0.5`}>
                  <IconComp className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    {cfg.label}
                  </span>
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

              <button
                type="button"
                onClick={() => deleteWorkLink(link.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-rose-400 transition-opacity"
                title="Delete Link"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
