import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowUpRight, FolderKanban, Loader2, Plus, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { cn } from '../../lib/cn';
import {
  fetchVellarcProjectSummaries,
  getNewVellarcProjectUrl,
  getVellarcUrl,
  type VellarcProjectSummary,
} from './vellarc-projects';

function openVellarc(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently updated';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

const statusTone: Record<string, string> = {
  Draft: 'border-amber-400/25 bg-amber-400/10 text-amber-500',
  'In Review': 'border-sky-400/25 bg-sky-400/10 text-sky-500',
  Approved: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-500',
};

export function ProjectsView() {
  const [projects, setProjects] = useState<VellarcProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProjects(await fetchVellarcProjectSummaries());
    } catch (reason) {
      console.error('Unable to load Vellarc project metadata', reason);
      setError(reason instanceof Error ? reason.message : 'Project metadata could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="min-h-full pb-8">
      <Card className="relative overflow-hidden rounded-[30px] border-borderSoft/25 p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-muted/75">Powered by Vellarc</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">Projects</h2>
            <p className="mt-1.5 max-w-xl text-[13px] leading-5 text-text-secondary">
              Keep project context visible here. Planning, architecture, and editing continue in Vellarc.
            </p>
          </div>
          <Button onClick={() => openVellarc(getNewVellarcProjectUrl())} type="button">
            <Plus className="mr-2 h-4 w-4" /> New in Vellarc <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </Card>

      {loading ? (
        <div className="flex min-h-[260px] items-center justify-center text-text-muted"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading projects</div>
      ) : error ? (
        <Card className="mt-5 rounded-[24px] border-rose-500/20 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-text-primary">Vellarc metadata is not connected yet</h3>
              <p className="mt-1 text-sm leading-6 text-text-secondary">{error}</p>
              <p className="mt-2 text-xs text-text-muted">Use the same Supabase project for both apps and run Vellarc's projects schema there.</p>
            </div>
            <Button onClick={() => void load()} size="sm" type="button" variant="secondary"><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>
          </div>
        </Card>
      ) : projects.length === 0 ? (
        <Card className="mt-5 flex min-h-[260px] flex-col items-center justify-center rounded-[24px] border-dashed border-borderSoft/35 p-8 text-center">
          <FolderKanban className="h-9 w-9 text-text-muted" />
          <h3 className="mt-4 font-semibold text-text-primary">No Vellarc projects yet</h3>
          <p className="mt-1 text-sm text-text-secondary">Create your first project in Vellarc, then refresh this view.</p>
        </Card>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const progress = project.featureCount === 0 ? 0 : Math.round((project.completedFeatureCount / project.featureCount) * 100);
            return (
              <button key={project.id} type="button" onClick={() => openVellarc(getVellarcUrl(project.id))} className="text-left">
                <Card className="group h-full rounded-[24px] border-borderSoft/25 p-5 transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-violet-400/20 bg-violet-400/10 text-violet-500"><FolderKanban className="h-5 w-5" /></div>
                    <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-semibold', statusTone[project.status] ?? 'border-borderSoft/30 bg-panel2/50 text-text-muted')}>{project.status}</span>
                  </div>
                  <h3 className="mt-4 truncate text-lg font-semibold text-text-primary">{project.title}</h3>
                  <p className="mt-1 line-clamp-2 min-h-10 text-[13px] leading-5 text-text-secondary">{project.tagline || 'Open this project in Vellarc to add its product brief.'}</p>
                  <div className="mt-5">
                    <div className="flex justify-between text-[11px] text-text-muted"><span>{project.completedFeatureCount}/{project.featureCount} features</span><span>{progress}%</span></div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel2"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} /></div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-borderSoft/20 pt-4 text-[11px] text-text-muted">
                    <span>Updated {formatUpdatedAt(project.updatedAt)}</span>
                    <span className="flex items-center font-semibold text-accent">Open in Vellarc <ArrowUpRight className="ml-1 h-3.5 w-3.5" /></span>
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      )}
      {!loading && !error && projects.length > 0 ? <div className="mt-5 flex justify-end"><Button onClick={() => void load()} size="sm" type="button" variant="ghost"><RefreshCw className="mr-2 h-4 w-4" />Refresh metadata</Button></div> : null}
    </div>
  );
}
