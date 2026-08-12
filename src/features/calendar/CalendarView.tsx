import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookHeart,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock3,
  FileText,
  Flag,
  ArrowUpRight,
  Plus,
  PenLine,
  Timer,
  Target,
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/cn';
import { useTaskStore } from '../tasks/task-store';
import { useSessionStore } from '../sessions/session-store';
import { useJournalStore } from '../journal/journal-store';
import { useNoteStore } from '../notes/note-store';
import { useMissionStore } from '../missions/mission-store';
import { getSessionMetrics } from '../sessions/session-helpers';

type CalendarEvent = {
  id: string;
  type: 'task' | 'focus' | 'journal' | 'note' | 'mission';
  title: string;
  detail: string;
  date: string;
  time?: string;
  entityId?: string;
};

export type CalendarDestination = 'today' | 'tasks' | 'history' | 'journal' | 'notes' | 'missions';
export type CalendarOpenTarget = { destination: CalendarDestination; entityId?: string; date: string };

const typeMeta = {
  task: { label: 'Completed', icon: CheckCircle2, style: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500' },
  focus: { label: 'Focus', icon: Clock3, style: 'border-sky-500/20 bg-sky-500/10 text-sky-500' },
  journal: { label: 'Journal', icon: BookHeart, style: 'border-rose-500/20 bg-rose-500/10 text-rose-500' },
  note: { label: 'Note', icon: FileText, style: 'border-amber-500/20 bg-amber-500/10 text-amber-500' },
  mission: { label: 'Mission', icon: Target, style: 'border-violet-500/20 bg-violet-500/10 text-violet-500' },
} as const;

function localDate(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function timeLabel(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function cleanText(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function CalendarView({ onOpenTarget }: { onOpenTarget: (target: CalendarOpenTarget) => void }) {
  const tasks = useTaskStore((state) => state.tasks);
  const sessions = useSessionStore((state) => state.sessions);
  const journalEntries = useJournalStore((state) => state.entries);
  const journalDays = useJournalStore((state) => state.days);
  const notes = useNoteStore((state) => state.notes);
  const missions = useMissionStore((state) => state.missions);
  const today = new Date();
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => dateKey(today));
  const [openEventGroup, setOpenEventGroup] = useState<CalendarEvent['type'] | null>(null);

  const events = useMemo<CalendarEvent[]>(() => {
    const result: CalendarEvent[] = [];
    tasks.forEach((task) => {
      if (!task.completed_at) return;
      result.push({ id: `task-${task.id}`, entityId: task.id, type: 'task', title: task.title, detail: task.completion_note || task.outcome || 'Task completed', date: localDate(task.completed_at), time: timeLabel(task.completed_at) });
    });
    sessions.forEach((session) => {
      const minutes = Math.round(getSessionMetrics(session).focus_seconds / 60);
      result.push({ id: `session-${session.id}`, entityId: session.task_id, type: 'focus', title: session.task_title || 'Focus session', detail: `${minutes || session.planned_minutes} minutes focused`, date: localDate(session.started_at), time: timeLabel(session.started_at) });
    });
    journalEntries.forEach((entry) => result.push({ id: `journal-${entry.id}`, entityId: entry.id, type: 'journal', title: entry.kind.replace('_', ' '), detail: entry.content, date: entry.entry_date }));
    notes.forEach((note) => result.push({ id: `note-${note.id}`, entityId: note.id, type: 'note', title: note.title || 'Quick note', detail: cleanText(note.content), date: localDate(note.created_at), time: timeLabel(note.created_at) }));
    missions.forEach((mission) => {
      result.push({ id: `mission-start-${mission.id}`, entityId: mission.id, type: 'mission', title: mission.title, detail: 'Mission created', date: localDate(mission.created_at), time: timeLabel(mission.created_at) });
      if (mission.completed_at) result.push({ id: `mission-done-${mission.id}`, entityId: mission.id, type: 'mission', title: mission.title, detail: 'Mission completed', date: localDate(mission.completed_at), time: timeLabel(mission.completed_at) });
    });
    return result.sort((a, b) => (b.time ?? '').localeCompare(a.time ?? ''));
  }, [journalEntries, missions, notes, sessions, tasks]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => map.set(event.date, [...(map.get(event.date) ?? []), event]));
    return map;
  }, [events]);

  const selectedEvents = eventsByDate.get(selectedDate) ?? [];
  const eventGroups = (['journal', 'task', 'focus', 'note', 'mission'] as const)
    .map((type) => ({ type, events: selectedEvents.filter((event) => event.type === type) }))
    .filter((group) => group.events.length > 0);

  useEffect(() => {
    setOpenEventGroup(eventGroups[0]?.type ?? null);
  }, [selectedDate]);
  const selectedDay = journalDays.find((day) => day.entry_date === selectedDate);
  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const selectedLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const calendarDays = Array.from({ length: firstWeekday + daysInMonth }, (_, index) => index < firstWeekday ? null : index - firstWeekday + 1);
  const focusMinutes = selectedEvents.filter((event) => event.type === 'focus').reduce((sum, event) => sum + Number.parseInt(event.detail, 10) || sum, 0);
  const completedCount = selectedEvents.filter((event) => event.type === 'task').length;
  const monthPrefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
  const monthEvents = events.filter((event) => event.date.startsWith(monthPrefix));
  const activeDays = new Set(monthEvents.map((event) => event.date)).size;
  const monthCounts = {
    tasks: monthEvents.filter((event) => event.type === 'task').length,
    focus: monthEvents.filter((event) => event.type === 'focus').length,
    journal: monthEvents.filter((event) => event.type === 'journal').length,
    notes: monthEvents.filter((event) => event.type === 'note').length,
    missions: monthEvents.filter((event) => event.type === 'mission').length,
  };
  const nearbyActiveDates = [...new Set(monthEvents.map((event) => event.date))]
    .filter((date) => date !== selectedDate)
    .sort((a, b) => Math.abs(new Date(`${a}T00:00:00`).getTime() - new Date(`${selectedDate}T00:00:00`).getTime()) - Math.abs(new Date(`${b}T00:00:00`).getTime() - new Date(`${selectedDate}T00:00:00`).getTime()))
    .slice(0, 3);

  const changeMonth = (offset: number) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  const openEvent = (event: CalendarEvent) => {
    if (event.type === 'journal') useJournalStore.getState().selectDate(event.date);
    const destinations: Record<CalendarEvent['type'], CalendarDestination> = {
      task: 'tasks', focus: 'history', journal: 'journal', note: 'notes', mission: 'missions',
    };
    onOpenTarget({ destination: destinations[event.type], entityId: event.entityId, date: event.date });
  };

  return (
    <div className="calendar-shell grid min-h-full content-start items-start gap-4 rounded-[26px] border border-borderSoft/35 bg-panel2/30 p-3 min-[850px]:grid-cols-[minmax(430px,1.08fr)_minmax(340px,0.92fr)] sm:p-4">
      <Card className="calendar-panel h-fit rounded-[24px] border-borderSoft/45 bg-panel/80 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-text-primary">{monthLabel}</h2>
            <p className="mt-1 text-xs text-text-secondary">{activeDays} active {activeDays === 1 ? 'day' : 'days'} · {monthEvents.length} moments</p>
          </div>
          <div className="flex items-center gap-2">
            <Button aria-label="Previous month" onClick={() => changeMonth(-1)} size="sm" type="button" variant="ghost" className="h-8 w-8 rounded-[10px] p-0"><ChevronLeft className="h-4 w-4" /></Button>
            <Button onClick={() => { setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(dateKey(today)); }} size="sm" type="button" variant="secondary" className="h-8 rounded-[10px] px-3 text-[10px]">Today</Button>
            <Button aria-label="Next month" onClick={() => changeMonth(1)} size="sm" type="button" variant="ghost" className="h-8 w-8 rounded-[10px] p-0"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-1.5 text-center">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day} className="pb-2 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{day.slice(0, 1)}</div>)}
          {calendarDays.map((day, index) => {
            if (!day) return <div key={`empty-${index}`} />;
            const key = dateKey(new Date(month.getFullYear(), month.getMonth(), day));
            const dayEvents = eventsByDate.get(key) ?? [];
            const selected = key === selectedDate;
            const isToday = key === dateKey(today);
            return (
              <motion.button
                key={key}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedDate(key)}
                type="button"
                className={cn(
                  'relative flex min-h-[58px] flex-col items-start justify-between rounded-[12px] border p-2 transition-all sm:min-h-[64px]',
                  selected
                    ? 'border-accent/55 bg-accent/14 shadow-[inset_0_0_0_1px_rgba(var(--accent),0.10),0_7px_18px_rgba(var(--accent),0.10)]'
                    : dayEvents.length > 0
                      ? 'border-borderSoft/55 bg-panel2/70 hover:border-borderStrong/50 hover:bg-panel2/90'
                      : 'border-borderSoft/40 bg-panel2/55 hover:border-borderStrong/45 hover:bg-panel2/75',
                )}
              >
                <span className={cn('flex h-7 min-w-7 items-center justify-center rounded-[8px] px-1 text-[13px] font-semibold', isToday ? 'bg-accent text-[rgb(var(--accent-contrast))] shadow-sm' : selected ? 'bg-accent/14 text-accent' : 'text-text-primary')}>{day}</span>
                <div className="flex h-3 w-full items-end gap-0.5">
                  {dayEvents.slice(0, 4).map((event) => <span key={event.id} className={cn('h-1 flex-1 rounded-full', event.type === 'task' ? 'bg-emerald-400' : event.type === 'focus' ? 'bg-sky-400' : event.type === 'note' ? 'bg-amber-400' : 'bg-violet-400')} />)}
                  {dayEvents.length > 4 ? <span className="ml-0.5 text-[8px] leading-none text-text-muted">+{dayEvents.length - 4}</span> : null}
                </div>
              </motion.button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-borderSoft/30 pt-3 text-[11px] text-text-secondary">
          <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Tasks</span>
          <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-sky-400" />Focus</span>
          <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-amber-400" />Notes</span>
          <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-violet-400" />Reflections</span>
        </div>
      </Card>

      <div className="min-w-0 space-y-4">
        <Card className="calendar-panel rounded-[24px] border-borderSoft/45 bg-panel/80 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-secondary">Day story</p><h3 className="mt-1 text-base font-semibold tracking-tight text-text-primary">{selectedLabel}</h3></div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border border-accent/20 bg-accent/10 text-accent"><CalendarDays className="h-4 w-4" /></div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-[14px] border border-borderSoft/30 bg-panel2/60 p-3"><p className="text-lg font-semibold text-text-primary">{completedCount}</p><p className="text-[11px] text-text-secondary">tasks done</p></div>
            <div className="rounded-[14px] border border-borderSoft/30 bg-panel2/60 p-3"><p className="text-lg font-semibold text-text-primary">{focusMinutes}m</p><p className="text-[11px] text-text-secondary">deep focus</p></div>
            <div className="rounded-[14px] border border-borderSoft/30 bg-panel2/60 p-3"><p className="text-lg font-semibold text-text-primary">{selectedDay?.mood || '—'}</p><p className="text-[11px] text-text-secondary">mood / 5</p></div>
          </div>
          {selectedDay?.gratitude ? <div className="mt-3 rounded-[14px] border border-rose-500/15 bg-rose-500/6 px-4 py-3"><p className="text-[9px] font-semibold uppercase tracking-wider text-rose-500/80">Grateful for</p><p className="mt-1 text-[12px] leading-5 text-text-secondary">{selectedDay.gratitude}</p></div> : null}
        </Card>

        <Card className="calendar-panel relative overflow-hidden rounded-[24px] border-borderSoft/45 bg-panel/80 p-3 sm:p-4">
          {selectedEvents.length > 0 ? (
            <div className="space-y-2">
              {eventGroups.map((group) => {
                const meta = typeMeta[group.type];
                const Icon = meta.icon;
                const isOpen = openEventGroup === group.type;
                const groupLabel = group.type === 'focus' ? 'Focus sessions' : group.type === 'task' ? 'Completed tasks' : group.type === 'mission' ? 'Mission milestones' : group.type === 'journal' ? 'Journal reflections' : 'Notes';
                return (
                  <div key={group.type} className={cn('overflow-hidden rounded-[16px] border transition-colors', isOpen ? 'border-borderSoft/35 bg-panel2/28' : 'border-borderSoft/20 bg-panel2/12 hover:border-borderSoft/35')}>
                    <button type="button" onClick={() => setOpenEventGroup(isOpen ? null : group.type)} className="flex w-full items-center gap-3 px-3.5 py-3 text-left">
                      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border', meta.style)}><Icon className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1"><span className="block text-[12px] font-semibold text-text-primary">{groupLabel}</span><span className="mt-0.5 block text-[10px] text-text-muted">{group.events.length} {group.events.length === 1 ? 'entry' : 'entries'}</span></span>
                      <ChevronDown className={cn('h-4 w-4 text-text-muted transition-transform duration-200', isOpen && 'rotate-180 text-accent')} />
                    </button>

                    {isOpen ? (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="border-t border-borderSoft/18 px-3 py-3">
                        {group.events.map((event) => {
                          const destination = event.type === 'focus' ? 'History' : event.type === 'task' ? 'Tasks' : event.type === 'mission' ? 'Missions' : event.type === 'journal' ? 'Journal' : 'Notes';
                          return (
                            <button type="button" onClick={() => openEvent(event)} key={event.id} className="group flex w-full items-start gap-3 rounded-[14px] px-3 py-3 text-left transition-colors hover:bg-white/[0.035]">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                              <span className="min-w-0 flex-1">
                                <span className="flex items-start gap-3"><span className="min-w-0 flex-1 break-words text-sm font-semibold capitalize leading-5 text-text-primary">{event.title}</span>{event.time ? <span className="ml-auto shrink-0 pt-0.5 text-[10px] text-text-secondary">{event.time}</span> : null}</span>
                                <span className="mt-1.5 block max-h-[60px] overflow-hidden text-[13px] leading-5 text-text-secondary">{event.detail}</span>
                                <span className="mt-2 flex items-center justify-end gap-1 text-[11px] font-medium text-accent/85 transition-colors group-hover:text-accent">Open in {destination}<ArrowUpRight className="h-3.5 w-3.5" /></span>
                              </span>
                            </button>
                          );
                        })}
                      </motion.div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-2 py-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border border-borderSoft/25 bg-panel2/30 text-text-muted"><Flag className="h-4 w-4" /></div>
                <div><p className="text-sm font-semibold text-text-primary">Nothing recorded yet</p><p className="mt-1 text-xs leading-5 text-text-secondary">Make this day memorable, or jump to a day that already has a story.</p></div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <button type="button" onClick={() => onOpenTarget({ destination: 'tasks', date: selectedDate })} className="flex flex-col items-center gap-1.5 rounded-[13px] border border-borderSoft/40 bg-panel2/55 px-2 py-3 text-xs font-medium text-text-secondary transition-colors hover:border-accent/35 hover:bg-accent/8 hover:text-accent"><Plus className="h-4 w-4" />Add task</button>
                <button type="button" onClick={() => onOpenTarget({ destination: 'journal', date: selectedDate })} className="flex flex-col items-center gap-1.5 rounded-[13px] border border-borderSoft/40 bg-panel2/55 px-2 py-3 text-xs font-medium text-text-secondary transition-colors hover:border-accent/35 hover:bg-accent/8 hover:text-accent"><PenLine className="h-4 w-4" />Reflect</button>
                <button type="button" onClick={() => onOpenTarget({ destination: 'notes', date: selectedDate })} className="flex flex-col items-center gap-1.5 rounded-[13px] border border-borderSoft/40 bg-panel2/55 px-2 py-3 text-xs font-medium text-text-secondary transition-colors hover:border-accent/35 hover:bg-accent/8 hover:text-accent"><FileText className="h-4 w-4" />Add note</button>
              </div>

              {nearbyActiveDates.length > 0 ? (
                <div className="mt-4 border-t border-borderSoft/18 pt-3">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-text-muted/60">Days with a story</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {nearbyActiveDates.map((date) => (
                      <button key={date} type="button" onClick={() => setSelectedDate(date)} className="rounded-full border border-borderSoft/25 bg-panel2/25 px-3 py-1.5 text-[10px] font-medium text-text-secondary transition-colors hover:border-accent/30 hover:text-accent">
                        {new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {eventsByDate.get(date)?.length ?? 0}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </Card>
      </div>

      <Card className="calendar-panel rounded-[24px] border-borderSoft/45 bg-panel/75 p-4 min-[850px]:col-span-2 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-secondary">Month at a glance</p>
            <p className="mt-1 text-sm font-semibold text-text-primary">Your {monthLabel} footprint</p>
          </div>
          <div className="grid grid-cols-5 gap-2 sm:min-w-[560px]">
            {[
              { label: 'Done', value: monthCounts.tasks, color: 'text-emerald-500', icon: CheckCircle2 },
              { label: 'Focus', value: monthCounts.focus, color: 'text-sky-500', icon: Timer },
              { label: 'Reflections', value: monthCounts.journal, color: 'text-rose-500', icon: BookHeart },
              { label: 'Notes', value: monthCounts.notes, color: 'text-amber-500', icon: FileText },
              { label: 'Milestones', value: monthCounts.missions, color: 'text-violet-500', icon: Target },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="rounded-[13px] border border-borderSoft/35 bg-panel2/55 p-2.5 text-center">
                <Icon className={cn('mx-auto h-3.5 w-3.5', color)} />
                <p className="mt-1.5 text-base font-semibold tabular-nums text-text-primary">{value}</p>
                <p className="truncate text-[10px] text-text-secondary">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
