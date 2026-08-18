import { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock
} from 'lucide-react';
import { useTeamStore } from './team-store';

interface CalendarEventItem {
  id: string;
  date: string;
  title: string;
  type: 'pilot' | 'followup' | 'task_deadline' | 'venture_target';
  ventureTitle: string;
  color: string;
  detail?: string;
}

export function TeamCalendarView() {
  const teamMissions = useTeamStore((s) => s.teamMissions);
  const teamTasks = useTeamStore((s) => s.teamTasks);
  const leads = useTeamStore((s) => s.leads);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedVentureId, setSelectedVentureId] = useState<string>('all');
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const today = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(now.toISOString().split('T')[0]);
  };

  // Compile all team events
  const allEvents = useMemo<CalendarEventItem[]>(() => {
    const events: CalendarEventItem[] = [];

    // 1. Venture target launch dates
    teamMissions.forEach((m) => {
      if (m.target_date) {
        events.push({
          id: `vent-${m.id}`,
          date: m.target_date,
          title: `Launch Milestone: ${m.title}`,
          type: 'venture_target',
          ventureTitle: m.title,
          color: 'purple',
          detail: m.objective,
        });
      }
    });

    // 2. Leads Follow-ups & Pilot Dates
    leads.forEach((l) => {
      const vTitle = teamMissions.find((m) => m.id === l.missionId)?.title || 'Project';
      if (l.nextFollowUp) {
        events.push({
          id: `fup-${l.id}`,
          date: l.nextFollowUp,
          title: `CRM Follow-up: ${l.businessName}`,
          type: 'followup',
          ventureTitle: vTitle,
          color: 'amber',
          detail: `Contact ${l.ownerName} (${l.phone}) - ${l.notes}`,
        });
      }
      if (l.pilotEndDate) {
        events.push({
          id: `pilot-${l.id}`,
          date: l.pilotEndDate,
          title: `Pilot Review: ${l.businessName}`,
          type: 'pilot',
          ventureTitle: vTitle,
          color: 'emerald',
          detail: `14-Day Pilot conclusion & paid conversion review`,
        });
      }
    });

    // 3. Team Tasks Deadlines
    teamTasks.forEach((t) => {
      if (t.dueDate) {
        const vTitle = teamMissions.find((m) => m.id === t.missionId)?.title || 'Project';
        events.push({
          id: `task-${t.id}`,
          date: t.dueDate,
          title: `Task Due: ${t.title}`,
          type: 'task_deadline',
          ventureTitle: vTitle,
          color: 'blue',
          detail: `Assigned to ${t.assigneeRole} (${t.status})`,
        });
      }
    });

    return events;
  }, [teamMissions, leads, teamTasks]);

  const filteredEvents = useMemo(() => {
    if (selectedVentureId === 'all') return allEvents;
    const venture = teamMissions.find((m) => m.id === selectedVentureId);
    if (!venture) return allEvents;
    return allEvents.filter((e) => e.ventureTitle === venture.title);
  }, [allEvents, selectedVentureId, teamMissions]);

  // Calendar matrix calculations
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays = useMemo(() => {
    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];
    const prevMonthDays = new Date(year, month, 0).getDate();

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = month === 0 ? 12 : month;
      const y = month === 0 ? year - 1 : year;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: false });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: i, isCurrentMonth: true });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const m = month === 11 ? 1 : month + 2;
      const y = month === 11 ? year + 1 : year;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: i, isCurrentMonth: false });
    }

    return days;
  }, [year, month, firstDayIndex, daysInMonth]);

  const eventsForSelectedDay = filteredEvents.filter((e) => e.date === selectedDateStr);

  const getEventBadge = (type: CalendarEventItem['type']) => {
    switch (type) {
      case 'pilot':
        return 'bg-emerald-500/15 text-text-primary border-emerald-500/40';
      case 'followup':
        return 'bg-amber-500/15 text-text-primary border-amber-500/40';
      case 'task_deadline':
        return 'bg-blue-500/15 text-text-primary border-blue-500/40';
      case 'venture_target':
        return 'bg-purple-500/15 text-text-primary border-purple-500/40';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Calendar Header & Filter */}
      <div className="space-y-3 rounded-2xl border border-borderSoft/30 bg-panel/45 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="flex items-center gap-2 text-xs font-bold text-text-primary">
                Team Schedule & Milestones
                <span className="rounded-full bg-panel2/60 px-2 py-0.5 font-mono text-[10px] text-text-muted">
                  {filteredEvents.length} Events Logged
                </span>
              </h3>
              <p className="text-[11px] text-text-muted">
                Synchronized view of sprint task due dates, CRM venue follow-ups, and pilot review windows.
              </p>
            </div>
          </div>

          {/* Venture Switcher */}
          <select
            value={selectedVentureId}
            onChange={(e) => setSelectedVentureId(e.target.value)}
            className="rounded-xl border border-borderSoft/35 bg-panel2/55 px-3 py-1.5 text-xs font-medium text-text-primary focus:border-accent focus:outline-none cursor-pointer"
          >
            <option value="all">All projects</option>
            {teamMissions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </div>

        {/* Month Navigation Row */}
        <div className="flex items-center justify-between border-t border-borderSoft/25 pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-xl border border-borderSoft/35 bg-panel2/55 p-1.5 text-text-secondary transition-colors hover:border-borderSoft/60 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h4 className="min-w-[140px] text-center font-mono text-sm font-bold text-text-primary">
              {monthName} {year}
            </h4>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded-xl border border-borderSoft/35 bg-panel2/55 p-1.5 text-text-secondary transition-colors hover:border-borderSoft/60 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={today}
            className="rounded-xl bg-panel2/70 px-3 py-1 font-mono text-xs font-semibold text-text-secondary transition-colors hover:bg-panel2 cursor-pointer"
          >
            Today
          </button>
        </div>
      </div>

      {/* Main Grid: Calendar Matrix + Day Agenda */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar Matrix (2 cols on lg) */}
        <div className="space-y-2 rounded-2xl border border-borderSoft/30 bg-panel/45 p-4 lg:col-span-2">
          {/* Day Names */}
          <div className="grid grid-cols-7 gap-1 border-b border-borderSoft/25 pb-2 text-center font-mono text-[11px] font-bold text-text-muted">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Day Cells */}
          <div className="grid grid-cols-7 gap-1.5 pt-1">
            {calendarDays.map((d, idx) => {
              const dayEvents = filteredEvents.filter((e) => e.date === d.dateStr);
              const isSelected = selectedDateStr === d.dateStr;
              const isToday = d.dateStr === new Date().toISOString().split('T')[0];

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedDateStr(d.dateStr)}
                  className={`min-h-[64px] sm:min-h-[76px] p-1.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'border-amber-500/80 bg-amber-500/10 shadow-md'
                      : isToday
                      ? 'border-blue-500/60 bg-blue-500/5'
                      : d.isCurrentMonth
                      ? 'border-borderSoft/30 bg-panel2/40 hover:border-borderSoft/60 hover:bg-panel2/60'
                      : 'border-borderSoft/20 bg-panel2/15 opacity-35'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-mono font-bold ${
                        isSelected
                          ? 'text-amber-300'
                          : isToday
                          ? 'text-blue-400'
                          : d.isCurrentMonth
                          ? 'text-text-primary'
                          : 'text-text-muted'
                      }`}
                    >
                      {d.dayNum}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="rounded-full bg-panel2/70 px-1 font-mono text-[9px] font-bold text-text-secondary">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Tiny Event Pills */}
                  <div className="space-y-0.5 w-full overflow-hidden">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        className={`truncate rounded border px-1.5 py-0.5 text-left text-[10px] font-semibold text-text-primary sm:text-[11px] ${
                          ev.type === 'pilot'
                            ? 'border-emerald-500/35 bg-emerald-500/18'
                            : ev.type === 'followup'
                            ? 'border-amber-500/35 bg-amber-500/18'
                            : ev.type === 'venture_target'
                            ? 'border-purple-500/35 bg-purple-500/18'
                            : 'border-blue-500/35 bg-blue-500/18'
                        }`}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="pl-0.5 font-mono text-[10px] text-text-muted">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Agenda (1 col on lg) */}
        <div className="space-y-3 rounded-2xl border border-borderSoft/30 bg-panel/45 p-4">
          <div className="flex items-center justify-between border-b border-borderSoft/25 pb-2">
            <div>
              <div className="font-mono text-[10px] uppercase text-text-muted">Selected Agenda</div>
              <div className="font-mono text-sm font-bold text-text-primary">{selectedDateStr}</div>
            </div>
            <span className="rounded-full bg-panel2/60 px-2 py-0.5 font-mono text-[10px] text-text-secondary">
              {eventsForSelectedDay.length} Items
            </span>
          </div>

          {eventsForSelectedDay.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-borderSoft/25 bg-panel2/25 p-8 text-center">
              <Clock className="mb-2 h-8 w-8 text-text-muted/60" />
              <h5 className="text-xs font-semibold text-text-primary">No Events Scheduled</h5>
              <p className="mt-0.5 text-[11px] text-text-muted">
                No sprint tasks, pilot conclusions, or lead follow-ups for this date.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto">
              {eventsForSelectedDay.map((ev) => (
                <div
                  key={ev.id}
                  className="space-y-1.5 rounded-xl border border-borderSoft/30 bg-panel2/40 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[9px] px-2 py-0.2 rounded-full border font-mono uppercase font-bold ${getEventBadge(
                        ev.type
                      )}`}
                    >
                      {ev.type.replace('_', ' ')}
                    </span>
                    <span className="truncate font-mono text-[10px] text-text-muted">
                      {ev.ventureTitle}
                    </span>
                  </div>

                  <h5 className="text-xs font-bold leading-tight text-text-primary">{ev.title}</h5>

                  {ev.detail && <p className="text-[11px] leading-snug text-text-muted">{ev.detail}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
