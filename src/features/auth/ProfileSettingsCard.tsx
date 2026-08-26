import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { CalendarDays, CheckCircle2, Clock3, Cloud, Copy, Globe2, ListTodo, LogOut, Mail, Target, Timer, UserRound } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { useAuthStore } from './auth-store';
import { showErrorToast, showInfoToast, showSuccessToast } from '../toasts/toast-store';

const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

interface ProfileSettingsCardProps {
  completedMissionCount: number;
  completedTaskCount: number;
  missionCount: number;
  rootTaskCount: number;
  sessionCount: number;
  syncModeLabel: string;
}

export function ProfileSettingsCard({
  completedMissionCount,
  completedTaskCount,
  missionCount,
  rootTaskCount,
  sessionCount,
  syncModeLabel,
}: ProfileSettingsCardProps) {
  const session = useAuthStore((state) => state.session);
  const profileSaving = useAuthStore((state) => state.profileSaving);
  const signOut = useAuthStore((state) => state.signOut);
  const updateProfile = useAuthStore((state) => state.updateProfile);

  const user = session?.user ?? null;
  const currentDisplayName = getUserDisplayName(user?.user_metadata, user?.email);
  const [displayNameDraft, setDisplayNameDraft] = useState(currentDisplayName);

  useEffect(() => {
    setDisplayNameDraft(currentDisplayName);
  }, [currentDisplayName]);

  if (!user) {
    return null;
  }

  const trimmedDraft = displayNameDraft.trim();
  const canSave = Boolean(trimmedDraft) && trimmedDraft !== currentDisplayName;
  const initials = getInitials(trimmedDraft || currentDisplayName, user.email);
  const completionRate = rootTaskCount ? Math.round((completedTaskCount / rootTaskCount) * 100) : 0;
  const memberSince = formatShortDate(user.created_at);
  const lastSignIn = formatDateTime(user.last_sign_in_at);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
  const userIdShort = `${user.id.slice(0, 8)}…${user.id.slice(-4)}`;

  async function handleCopy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      showSuccessToast(`${label} copied`, 'The value is ready to paste.');
    } catch (error) {
      showErrorToast(
        `Could not copy ${label.toLowerCase()}`,
        error instanceof Error ? error.message : 'Clipboard access was blocked.',
      );
    }
  }

  async function handleSaveProfile() {
    if (!canSave) {
      showInfoToast('No changes to save', 'Edit the display name before saving your profile.');
      return;
    }

    await updateProfile(trimmedDraft);
  }

  return (
    <Card className="rounded-[24px] p-4 sm:p-5">
      <div className="flex items-center gap-3 border-b border-borderSoft/20 pb-4">
        <div className="accent-avatar flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] text-base font-semibold uppercase">{initials}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-base font-semibold text-text-primary">{currentDisplayName}</h2>{user.email_confirmed_at ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Verify email</Badge>}</div>
          <p className="mt-0.5 truncate text-xs text-text-secondary">{user.email ?? 'No email'}</p>
        </div>
        <Button aria-label="Sign out" onClick={() => void signOut()} size="sm" type="button" variant="ghost"><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sign out</span></Button>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1"><UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" /><Input className="pl-10" onChange={(event) => setDisplayNameDraft(event.target.value)} placeholder="Display name" value={displayNameDraft} /></div>
        <Button disabled={!canSave || profileSaving} onClick={() => void handleSaveProfile()} type="button">{profileSaving ? 'Saving…' : 'Save name'}</Button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <ProfileRow icon={Mail} label="Email" value={user.email ?? 'No email'} action={<button aria-label="Copy email" className="text-accent" onClick={() => void handleCopy(user.email ?? '', 'Email')} type="button"><Copy className="h-3.5 w-3.5" /></button>} />
        <ProfileRow icon={UserRound} label="User ID" value={userIdShort} action={<button aria-label="Copy user ID" className="text-accent" onClick={() => void handleCopy(user.id, 'User ID')} type="button"><Copy className="h-3.5 w-3.5" /></button>} />
        <ProfileRow icon={CalendarDays} label="Member since" value={memberSince} />
        <ProfileRow icon={Clock3} label="Last sign in" value={lastSignIn} />
        <ProfileRow icon={Cloud} label="Sync" value={syncModeLabel} />
        <ProfileRow icon={Globe2} label="Time zone" value={timezone} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <CompactStat icon={ListTodo} label="Tasks" value={String(rootTaskCount)} />
        <CompactStat icon={CheckCircle2} label="Done" value={`${completionRate}%`} />
        <CompactStat icon={Target} label="Missions" value={String(missionCount)} />
        <CompactStat icon={Timer} label="Sessions" value={String(sessionCount)} />
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-[14px] border border-borderSoft/25 bg-panel2/35 p-3">
        <div className="min-w-0 flex-1"><div className="flex justify-between gap-3 text-xs"><span className="font-medium text-text-primary">Overall completion</span><span className="text-text-secondary">{completedTaskCount}/{rootTaskCount || 0}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel/70"><div className="h-full rounded-full bg-gradient-to-r from-accent/75 to-success/80" style={{ width: `${Math.min(100, Math.max(0, completionRate))}%` }} /></div></div>
        <span className="shrink-0 text-[10px] text-text-muted">{completedMissionCount} missions done</span>
      </div>
    </Card>
  );
}

function ProfileRow({ icon: Icon, label, value, action }: { icon: typeof UserRound; label: string; value: string; action?: ReactNode }) {
  return <div className="flex min-w-0 items-center gap-3 rounded-[14px] border border-borderSoft/24 bg-panel/25 p-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-accent/8 text-accent"><Icon className="h-3.5 w-3.5" /></span><div className="min-w-0 flex-1"><p className="text-[9px] uppercase tracking-[0.16em] text-text-muted">{label}</p><p className="mt-0.5 truncate text-xs font-medium text-text-primary">{value}</p></div>{action}</div>;
}

function CompactStat({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  return <div className="rounded-[14px] border border-borderSoft/24 bg-panel2/30 p-3"><Icon className="h-3.5 w-3.5 text-accent" /><p className="mt-2 text-lg font-semibold leading-none text-text-primary">{value}</p><p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-text-muted">{label}</p></div>;
}

function InfoCell({
  label,
  value,
  actionLabel,
  onAction,
}: {
  label: string;
  value: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-[20px] border border-borderSoft/24 bg-panel/20 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="shrink-0 whitespace-nowrap text-[10px] uppercase tracking-[0.24em] text-text-muted">{label}</p>
        {actionLabel && onAction ? (
          <button
            className="shrink-0 text-xs font-medium text-accent transition-colors hover:text-text-primary"
            onClick={onAction}
            type="button"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
      <p className="mt-2 truncate text-sm font-medium text-text-primary" title={value}>{value}</p>
    </div>
  );
}

function WorkspaceStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'accent' | 'success' | 'warning' | 'neutral';
}) {
  const valueTone =
    tone === 'success'
      ? 'text-success'
      : tone === 'warning'
        ? 'text-warning'
        : tone === 'neutral'
          ? 'text-text-primary'
          : 'text-accent';

  return (
    <div className="rounded-[20px] border border-borderSoft/24 bg-panel2/32 px-4 py-4">
      <p className="text-[10px] uppercase tracking-[0.24em] text-text-muted">{label}</p>
      <p className={`mt-2 text-[1.6rem] font-semibold leading-none tracking-[-0.05em] ${valueTone}`}>
        {value}
      </p>
    </div>
  );
}

export function getUserDisplayName(
  metadata: Record<string, unknown> | undefined,
  email: string | undefined,
) {
  if (metadata?.display_name && typeof metadata.display_name === 'string') {
    return metadata.display_name;
  }

  if (metadata?.full_name && typeof metadata.full_name === 'string') {
    return metadata.full_name;
  }

  if (email) {
    return email.split('@')[0];
  }

  return 'Mission Operator';
}

export function getInitials(name: string, email: string | undefined) {
  const source = name.trim() || email?.split('@')[0] || 'MC';
  const parts = source.split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
  return initials || 'MC';
}

function formatShortDate(value: string | null | undefined) {
  if (!value) {
    return 'Unknown';
  }

  return shortDateFormatter.format(new Date(value));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'No sign-in yet';
  }

  return dateTimeFormatter.format(new Date(value));
}
