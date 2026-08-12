import { useState } from 'react';
import { Check, Flame, Plus, Target, Trash2, Trophy, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { cn } from '../../lib/cn';
import { getBestChallengeStreak, getChallengeStreak, useChallengeStore } from './challenge-store';
import { useMissionStore } from '../missions/mission-store';
import { MissionIcon } from '../../components/ui/mission-icon';
import { useTaskStore } from '../tasks/task-store';

const EMOJIS = ['🔥', '💪', '📚', '🧘', '🏃', '💧', '🎨', '💻'];
const DURATIONS = [7, 14, 30, 60, 100];

function recentDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return { key: date.toLocaleDateString('en-CA'), label: date.toLocaleDateString(undefined, { weekday: 'narrow' }) };
  });
}

export function ChallengesView() {
  const challenges = useChallengeStore((state) => state.challenges);
  const createChallenge = useChallengeStore((state) => state.createChallenge);
  const toggleToday = useChallengeStore((state) => state.toggleToday);
  const deleteChallenge = useChallengeStore((state) => state.deleteChallenge);
  const missions = useMissionStore((state) => state.missions);
  const tasks = useTaskStore((state) => state.tasks);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🔥');
  const [targetDays, setTargetDays] = useState(30);
  const [missionId, setMissionId] = useState('');
  const [sourceTaskId, setSourceTaskId] = useState('');
  const today = new Date().toLocaleDateString('en-CA');
  const days = recentDays();
  const doneToday = challenges.filter((challenge) => challenge.checkIns.includes(today)).length;

  function save() {
    if (!title.trim()) return;
    createChallenge(title, emoji, targetDays, missionId || null, sourceTaskId || null);
    setTitle('');
    setSourceTaskId('');
    setCreating(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-[28px] border border-borderSoft/40 bg-panel/70 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Build consistency</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-text-primary">Your daily challenges</h2>
          <p className="mt-1 text-sm text-text-secondary">Show up once today. Keep the streak alive tomorrow.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-panel2/65 px-4 py-2.5 text-center">
            <p className="text-xl font-semibold text-text-primary">{doneToday}/{challenges.length}</p>
            <p className="text-[10px] text-text-secondary">done today</p>
          </div>
          <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />New challenge</Button>
        </div>
      </div>

      {creating ? (
        <Card className="rounded-[24px] border-accent/25 p-5">
          <div className="flex items-center justify-between"><h3 className="font-semibold text-text-primary">Start a challenge</h3><button onClick={() => setCreating(false)} className="text-text-muted hover:text-text-primary"><X className="h-4 w-4" /></button></div>
          <Input autoFocus className="mt-4" value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && save()} placeholder="e.g. Read for 20 minutes" />
          <div className="mt-4">
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Start from a task <span className="normal-case font-normal text-text-muted">(optional)</span></label>
            <select
              value={sourceTaskId}
              onChange={(event) => {
                const taskId = event.target.value;
                const task = tasks.find((item) => item.id === taskId);
                setSourceTaskId(taskId);
                if (task) {
                  setTitle(task.title);
                  setMissionId(task.mission_id ?? '');
                }
              }}
              className="h-11 w-full rounded-xl border border-borderSoft/40 bg-panel2/65 px-3 text-sm text-text-primary outline-none focus:border-accent/40"
            >
              <option value="">Write a new daily action</option>
              {tasks.filter((task) => !task.parent_task_id && task.lane !== 'done').map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
            </select>
          </div>
          {sourceTaskId ? (
            <div className="mt-3 flex items-start gap-3 rounded-xl border border-accent/25 bg-accent/8 p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[rgb(var(--accent-contrast))]"><Check className="h-3.5 w-3.5" /></span>
              <div><p className="text-sm font-medium text-text-primary">Turn this into a recurring challenge?</p><p className="mt-0.5 text-xs leading-5 text-text-secondary">It will repeat daily. The original task stays unchanged and acts as the template.</p></div>
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">{EMOJIS.map((value) => <button key={value} onClick={() => setEmoji(value)} className={cn('flex h-10 w-10 items-center justify-center rounded-xl border text-lg', emoji === value ? 'border-accent/50 bg-accent/12' : 'border-borderSoft/35 bg-panel2/40')}>{value}</button>)}</div>
          <div className="mt-4 flex flex-wrap gap-2">{DURATIONS.map((value) => <button key={value} onClick={() => setTargetDays(value)} className={cn('rounded-full border px-3 py-1.5 text-xs font-medium', targetDays === value ? 'border-accent/45 bg-accent/12 text-accent' : 'border-borderSoft/35 text-text-secondary')}>{value} days</button>)}</div>
          <div className="mt-4">
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Supports mission</label>
            <select value={missionId} onChange={(event) => setMissionId(event.target.value)} className="h-11 w-full rounded-xl border border-borderSoft/40 bg-panel2/65 px-3 text-sm text-text-primary outline-none focus:border-accent/40">
              <option value="">No mission</option>
              {missions.filter((mission) => mission.status !== 'archived').map((mission) => <option key={mission.id} value={mission.id}>{mission.title}</option>)}
            </select>
          </div>
          <Button className="mt-5" disabled={!title.trim()} onClick={save}>Start challenge</Button>
        </Card>
      ) : null}

      {challenges.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {challenges.map((challenge) => {
            const mission = missions.find((item) => item.id === challenge.missionId);
            const sourceTask = tasks.find((item) => item.id === challenge.sourceTaskId);
            const completed = challenge.checkIns.includes(today);
            const streak = getChallengeStreak(challenge.checkIns);
            const best = getBestChallengeStreak(challenge.checkIns);
            const progress = Math.min(100, (challenge.checkIns.length / challenge.targetDays) * 100);
            return (
              <Card key={challenge.id} className="group rounded-[26px] border-borderSoft/40 bg-panel/75 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-panel2/70 text-2xl">{challenge.emoji}</div>
                  <div className="min-w-0 flex-1"><h3 className="break-words text-lg font-semibold text-text-primary">{challenge.title}</h3>{mission ? <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-accent"><MissionIcon icon={mission.emoji} className="h-3.5 w-3.5" />{mission.title}</div> : null}<p className="mt-1 text-xs text-text-secondary">{challenge.checkIns.length} of {challenge.targetDays} days completed · repeats daily{sourceTask ? ' · linked task' : ''}</p></div>
                  <button aria-label="Delete challenge" onClick={() => deleteChallenge(challenge.id)} className="p-2 text-text-muted opacity-0 transition group-hover:opacity-100 hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 rounded-xl bg-panel2/55 px-3 py-2"><Flame className="h-4 w-4 text-warning" /><span className="text-sm font-semibold text-text-primary">{streak}</span><span className="text-xs text-text-secondary">day streak</span></div>
                  <div className="flex items-center gap-2 rounded-xl bg-panel2/55 px-3 py-2"><Trophy className="h-4 w-4 text-accent" /><span className="text-sm font-semibold text-text-primary">{best}</span><span className="text-xs text-text-secondary">best</span></div>
                </div>
                <div className="mt-5 flex items-center justify-between gap-2">{days.map((day) => { const checked = challenge.checkIns.includes(day.key); return <div key={day.key} className="flex flex-1 flex-col items-center gap-1.5"><span className={cn('flex h-8 w-8 items-center justify-center rounded-full border', checked ? 'border-success/40 bg-success/18 text-success' : 'border-borderSoft/40 bg-panel2/35 text-text-muted')}>{checked ? <Check className="h-4 w-4" /> : null}</span><span className="text-[10px] text-text-secondary">{day.label}</span></div>; })}</div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-panel2/70"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} /></div>
                <Button className="mt-4 w-full" variant={completed ? 'secondary' : 'primary'} onClick={() => toggleToday(challenge.id)}>{completed ? <><Check className="h-4 w-4" />Done today</> : <><Target className="h-4 w-4" />Check in today</>}</Button>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="flex min-h-[280px] flex-col items-center justify-center rounded-[28px] border-dashed p-8 text-center"><div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-accent/12 text-accent"><Trophy className="h-8 w-8" /></div><h3 className="mt-4 text-lg font-semibold text-text-primary">Start your first streak</h3><p className="mt-2 max-w-sm text-sm text-text-secondary">Choose one small action you want to repeat every day.</p><Button className="mt-5" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Create challenge</Button></Card>
      )}
    </div>
  );
}
