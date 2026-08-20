import { useEffect, useRef, useState } from 'react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { DatePicker } from '../../components/ui/date-picker';
import { Input, Textarea } from '../../components/ui/input';
import { MissionIcon } from '../../components/ui/mission-icon';
import { confirmDialog } from '../../components/ui/native-dialog';
import { cn } from '../../lib/cn';
import { useMissionStore } from '../missions/mission-store';
import { getSubtasks, humanizeEnergy, humanizeLane, humanizePriority } from './task-helpers';
import { useTaskStore } from './task-store';
import type { Task, TaskEnergy, TaskLane, TaskPriority } from './task-types';
import { AssigneeSelect } from '../collaborators/AssigneeSelect';
import {
  CalendarDays,
  Check,
  ChevronRight,
  CircleGauge,
  Flag,
  ListChecks,
  Tag,
  Trash2,
  Users,
  X,
  Zap,
} from 'lucide-react';

interface TaskDetailPanelProps {
  task: Task;
  allTasks: Task[];
  onClose?: () => void;
  onOpenTask?: (taskId: string) => void;
}

const LANE_OPTIONS: TaskLane[] = ['inbox', 'now', 'next', 'later', 'done'];
const PRIORITY_OPTIONS: TaskPriority[] = ['low', 'normal', 'high', 'critical'];
const ENERGY_OPTIONS: TaskEnergy[] = ['admin', 'shallow', 'deep'];
const ESTIMATE_PRESETS = [15, 30, 45, 60, 90, 120, 240];

/** "45m", "1h", "1h 30m" — minutes stay the stored unit; this is display-only. */
function humanizeMinutes(total: number) {
  if (!total || total < 60) {
    return `${total || 0}m`;
  }
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function ChipSelect<T extends string>({
  options,
  value,
  onChange,
  label,
  toneMap,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  label: (v: T) => string;
  toneMap?: (v: T) => 'default' | 'accent' | 'warning' | 'success' | 'attention';
}) {
  return (
    <div className="flex w-fit max-w-full flex-wrap gap-1 rounded-xl bg-black/20 p-1">
      {options.map((opt) => {
        const active = opt === value;
        const tone = toneMap?.(opt) ?? 'default';
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              'inline-flex h-8 items-center rounded-lg border px-3 text-xs font-medium transition-all duration-200',
              active
                ? tone === 'warning'
                  ? 'border-warning/15 bg-warning/18 text-warning shadow-sm'
                  : tone === 'success'
                    ? 'border-success/15 bg-success/18 text-success shadow-sm'
                    : 'border-white/10 bg-white/[0.09] text-text-primary shadow-sm'
                : 'border-transparent text-text-muted hover:bg-white/[0.04] hover:text-text-primary',
            )}
          >
            {label(opt)}
          </button>
        );
      })}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.28em] text-text-muted">{children}</p>
  );
}

function SectionLabel({
  icon: Icon,
  children,
  aside,
}: {
  icon: typeof Flag;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-xs font-medium text-text-secondary">
        <Icon size={14} className="text-text-muted" />
        <span>{children}</span>
      </div>
      {aside}
    </div>
  );
}

function SubtaskRow({
  subtask,
  onMarkDone,
  onDelete,
}: {
  subtask: Task;
  onMarkDone: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-[14px] border border-borderSoft/30 bg-panel/30 px-3 py-2.5">
      <button
        type="button"
        onClick={onMarkDone}
        disabled={subtask.lane === 'done'}
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors',
          subtask.lane === 'done'
            ? 'border-success/40 bg-success/20 text-success'
            : 'border-borderStrong/30 text-text-muted hover:border-accent/40 hover:text-accent',
        )}
      >
        {subtask.lane === 'done' ? '✓' : ''}
      </button>
      <span className={cn('flex-1 text-sm', subtask.lane === 'done' ? 'text-text-muted line-through' : 'text-text-primary')}>
        {subtask.title}
      </span>
      <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        {subtask.energy !== 'shallow' ? (
          <span className="text-[10px] text-text-muted">{humanizeEnergy(subtask.energy)}</span>
        ) : null}
        <span className="text-[10px] text-text-muted">{subtask.estimated_minutes}m</span>
        <button
          type="button"
          onClick={onDelete}
          className="ml-1 rounded p-1 text-text-muted hover:bg-warning/10 hover:text-warning"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

function AddSubtaskRow({
  onAdd,
}: {
  onAdd: (title: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function handleSave() {
    const trimmed = title.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await onAdd(trimmed);
      setTitle('');
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-[14px] border border-dashed border-borderSoft/40 px-3 py-2 text-sm text-text-muted transition-colors hover:border-accent/30 hover:text-accent"
      >
        <span className="text-base leading-none">+</span>
        Add subtask
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void handleSave();
          if (e.key === 'Escape') { setOpen(false); setTitle(''); }
        }}
        placeholder="Subtask title…"
        className="h-9 flex-1 text-sm"
      />
      <Button size="sm" type="button" onClick={() => void handleSave()} disabled={!title.trim() || saving}>
        {saving ? '…' : 'Add'}
      </Button>
      <Button size="sm" type="button" variant="ghost" onClick={() => { setOpen(false); setTitle(''); }}>
        ✕
      </Button>
    </div>
  );
}

export function TaskDetailPanel({ task, allTasks, onClose, onOpenTask }: TaskDetailPanelProps) {
  const saveTask = useTaskStore((s) => s.saveTask);
  const createSubtask = useTaskStore((s) => s.createSubtask);
  const markDone = useTaskStore((s) => s.markDone);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const missions = useMissionStore((s) => s.missions);

  const [draft, setDraft] = useState<Task>(task);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Sync when selected task changes
  useEffect(() => {
    setDraft(task);
    setDirty(false);
  }, [task.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!onClose) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const subtasks = getSubtasks(allTasks, task.id);
  const doneSubtasks = subtasks.filter((s) => s.lane === 'done').length;
  const mission = missions.find((m) => m.id === draft.mission_id);
  const parentTask = task.parent_task_id ? allTasks.find((t) => t.id === task.parent_task_id) : null;

  function update<K extends keyof Task>(field: K, value: Task[K]) {
    setDraft((d) => ({ ...d, [field]: value }));
    setDirty(true);
  }

  async function handleSave() {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      await saveTask({ ...draft, updated_at: new Date().toISOString() });
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddSubtask(title: string) {
    await createSubtask(task.id, {
      title,
      mission_id: task.mission_id,
      lane: 'inbox',
      energy: 'shallow',
      priority: 'normal',
    });
  }

  async function handleDelete() {
    if (confirmDelete) {
      await deleteTask(task.id);
      onClose?.();
    } else {
      setConfirmDelete(true);
    }
  }

  const progress = subtasks.length ? Math.round((doneSubtasks / subtasks.length) * 100) : 0;

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_85%_0%,rgb(var(--accent)/0.07),transparent_28%),rgb(var(--panel))]">
      {/* Header */}
      <div className="border-b border-white/[0.055] px-7 pb-6 pt-7">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {mission ? (
              <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-text-muted">
                <MissionIcon icon={mission.emoji} className="h-3 w-3" /> {mission.title}
              </p>
            ) : (
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-text-muted">Task details</p>
            )}
            {parentTask ? (
              <button
                type="button"
                onClick={() => onOpenTask?.(parentTask.id)}
                className="mt-2 flex max-w-full items-center gap-1 text-xs text-accent hover:text-accent/80"
              >
                <span className="truncate">{parentTask.title}</span><ChevronRight size={12} />
              </button>
            ) : null}
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close task details"
              className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-panel2 hover:text-text-primary"
            >
              <X size={18} />
            </button>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <textarea
            value={draft.title}
            onChange={(e) => update('title', e.target.value)}
            onBlur={() => void handleSave()}
            rows={2}
              className="w-full resize-none bg-transparent text-[24px] font-semibold leading-[1.2] tracking-[-0.025em] text-text-primary outline-none placeholder:text-text-muted"
            placeholder="Task title"
          />
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-text-muted">
          <span className="rounded-md bg-white/[0.06] px-2.5 py-1 text-text-secondary">{humanizeLane(draft.lane)}</span>
          <span>{humanizePriority(draft.priority)} priority</span>
          <span className="text-borderStrong">•</span>
          <span>{humanizeMinutes(draft.estimated_minutes)}</span>
        </div>
      </div>

      {/* Body — scrollable */}
      <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-7 py-7">
        {/* Description */}
        <div className="space-y-2.5">
          <SectionLabel icon={ListChecks}>Description</SectionLabel>
          <Textarea
            value={draft.notes}
            onChange={(e) => update('notes', e.target.value)}
            onBlur={() => void handleSave()}
            placeholder="Add context, links, or anything you need to remember…"
            rows={5}
            className="min-h-[124px] resize-y rounded-2xl border-white/[0.055] bg-black/20 px-4 py-3.5 leading-6 shadow-inner shadow-black/10 focus:border-accent/25 focus:bg-black/25"
          />
        </div>

        {/* Status chips */}
        <div className="space-y-4">
          <SectionLabel icon={CircleGauge}>Properties</SectionLabel>
          <div className="space-y-5 rounded-2xl bg-white/[0.025] p-4 ring-1 ring-inset ring-white/[0.045]">
          <div className="space-y-2">
            <FieldLabel>Status</FieldLabel>
            <ChipSelect
              options={LANE_OPTIONS}
              value={draft.lane}
              onChange={(v) => update('lane', v)}
              label={humanizeLane}
              toneMap={(v) => v === 'now' ? 'accent' : v === 'done' ? 'success' : 'default'}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 border-t border-borderSoft/20 pt-4 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5"><Flag size={12} className="text-text-muted" /><FieldLabel>Priority</FieldLabel></div>
            <ChipSelect
              options={PRIORITY_OPTIONS}
              value={draft.priority}
              onChange={(v) => update('priority', v)}
              label={humanizePriority}
              toneMap={(v) => v === 'critical' ? 'warning' : v === 'high' ? 'attention' : 'default'}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5"><Zap size={12} className="text-text-muted" /><FieldLabel>Energy</FieldLabel></div>
            <ChipSelect
              options={ENERGY_OPTIONS}
              value={draft.energy}
              onChange={(v) => update('energy', v)}
              label={humanizeEnergy}
              toneMap={(v) => v === 'deep' ? 'attention' : 'default'}
            />
          </div>
          </div>
          <div className="space-y-2 border-t border-borderSoft/20 pt-4">
            <FieldLabel>Estimate</FieldLabel>
            <div className="flex flex-wrap gap-1 rounded-xl bg-black/20 p-1">
              {ESTIMATE_PRESETS.map((preset) => {
                const active = draft.estimated_minutes === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      update('estimated_minutes', preset);
                      void handleSave();
                    }}
                    className={cn(
                      'inline-flex h-8 items-center rounded-lg border px-2.5 text-xs font-medium transition-all',
                      active
                        ? 'border-white/10 bg-white/[0.09] text-text-primary shadow-sm'
                        : 'border-transparent text-text-muted hover:bg-white/[0.04] hover:text-text-primary',
                    )}
                  >
                    {humanizeMinutes(preset)}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={5}
                  max={480}
                  step={5}
                  value={draft.estimated_minutes}
                  onChange={(e) => update('estimated_minutes', Number(e.target.value))}
                  onBlur={() => void handleSave()}
                  className="h-8 w-16 rounded-lg border border-white/[0.06] bg-black/20 px-2 text-sm text-text-primary outline-none focus:border-accent/30"
                />
                <span className="text-xs text-text-muted">min</span>
              </div>
              {draft.estimated_minutes >= 60 ? (
                <span className="text-xs text-text-muted">= {humanizeMinutes(draft.estimated_minutes)}</span>
              ) : null}
            </div>
          </div>

          <div className="space-y-2 border-t border-borderSoft/20 pt-4">
            <div className="flex items-center gap-1.5"><CalendarDays size={12} className="text-text-muted" /><FieldLabel>Due date</FieldLabel></div>
            <DatePicker
              value={draft.due_date}
              onChange={(date) => {
                update('due_date', date);
                void handleSave();
              }}
            />
          </div>
          </div>
        </div>

        {/* Assignees */}
        <div className="space-y-2.5">
          <SectionLabel icon={Users}>Assignees</SectionLabel>
          <AssigneeSelect
            value={draft.assignee_ids}
            onChange={(ids) => {
              const next = { ...draft, assignee_ids: ids, updated_at: new Date().toISOString() };
              setDraft(next);
              setDirty(false);
              void saveTask(next);
            }}
          />
        </div>

        {/* Completion note — appears once the task is done */}
        {draft.lane === 'done' ? (
          <div className="space-y-1.5 rounded-[14px] border border-success/25 bg-success/[0.06] p-3">
            <FieldLabel>
              <span className="text-success">Completion note</span>
            </FieldLabel>
            <Textarea
              value={draft.completion_note}
              onChange={(e) => update('completion_note', e.target.value)}
              onBlur={() => void handleSave()}
              placeholder="What actually got done? Outcome, blockers, follow-ups…"
              rows={3}
              className="resize-none text-sm"
            />
          </div>
        ) : null}

        {/* Tags */}
        <div className="space-y-2.5">
          <SectionLabel icon={Tag}>Tags</SectionLabel>
          <Input
            value={draft.tags.join(', ')}
            onChange={(e) =>
              update(
                'tags',
                e.target.value
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean),
              )
            }
            onBlur={() => void handleSave()}
            placeholder="Add tags, separated by commas"
            className="h-11 rounded-xl border-white/[0.055] bg-black/20 text-sm focus:bg-black/25"
          />
          {draft.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {draft.tags.map((tag) => (
                <Badge key={tag} tone="neutral">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        {/* Subtasks */}
        <div className="space-y-3">
          <SectionLabel
            icon={ListChecks}
            aside={subtasks.length > 0 ? <span className="text-xs text-text-muted">{doneSubtasks}/{subtasks.length} done</span> : null}
          >Subtasks</SectionLabel>
          {subtasks.length > 0 ? (
            <div className="h-1 overflow-hidden rounded-full bg-panel2">
              <div className="h-full rounded-full bg-success transition-all" style={{ width: `${progress}%` }} />
            </div>
          ) : null}
          <div className="space-y-2">
            {subtasks.map((sub) => (
              <SubtaskRow
                key={sub.id}
                subtask={sub}
                onMarkDone={() => void markDone(sub.id)}
                onDelete={() => { void confirmDialog(`Delete subtask “${sub.title}”?`, { title: 'Delete subtask', confirmLabel: 'Delete', danger: true }).then((ok) => { if (ok) void deleteTask(sub.id); }); }}
              />
            ))}
            <AddSubtaskRow onAdd={handleAddSubtask} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-white/[0.055] bg-black/15 px-7 py-4 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            size="sm"
            onClick={async () => {
              if (dirty) await handleSave();
              await markDone(task.id);
              // Reflect completion locally (without marking dirty) so the
              // completion-note field appears right away to capture a summary.
              setDraft((d) => ({
                ...d,
                lane: 'done',
                status: 'done',
                completed_at: d.completed_at ?? new Date().toISOString(),
              }));
            }}
            disabled={task.lane === 'done'}
            variant={task.lane === 'done' ? 'secondary' : 'primary'}
            className="min-w-[116px]"
          >
            <Check size={16} />
            {task.lane === 'done' ? 'Completed' : 'Mark done'}
          </Button>
          {dirty ? <span className="truncate text-xs text-text-muted">{saving ? 'Saving…' : 'Unsaved changes'}</span> : null}
        </div>
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button className="px-2 py-2 text-xs text-text-muted hover:text-text-primary" onClick={() => setConfirmDelete(false)}>Cancel</button>
            <button className="rounded-xl bg-warning/12 px-3 py-2 text-xs font-medium text-warning hover:bg-warning/20" onClick={() => void handleDelete()}>Delete task</button>
          </div>
        ) : (
          <button type="button" onClick={() => void handleDelete()} aria-label="Delete task" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-text-muted transition-colors hover:bg-warning/10 hover:text-warning">
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
