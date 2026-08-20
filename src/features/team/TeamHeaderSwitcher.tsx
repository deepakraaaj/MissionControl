import { useEffect, useState } from 'react';
import { ChevronDown, Lock, User, Users } from 'lucide-react';
import { useAuthStore } from '../auth/auth-store';
import { useTeamStore } from './team-store';
import { getActiveTeamRoom, useTeamRoomStore } from './team-room-store';
import { TeamUnlockModal } from './TeamUnlockModal';
import { resumeLastTeamRoom } from './team-room-entry';

interface TeamHeaderSwitcherProps { onSwitchMode?: (mode: 'personal' | 'team') => void; }

export function TeamHeaderSwitcher({ onSwitchMode }: TeamHeaderSwitcherProps) {
  const workspaceMode = useTeamStore((state) => state.workspaceMode);
  const setWorkspaceMode = useTeamStore((state) => state.setWorkspaceMode);
  const teamUnlocked = useTeamStore((state) => state.teamUnlocked);
  const lockTeam = useTeamStore((state) => state.lockTeam);
  const setAuthenticatedPersona = useTeamStore((state) => state.setAuthenticatedPersona);
  const session = useAuthStore((state) => state.session);
  const roomState = useTeamRoomStore();
  const activeRoom = getActiveTeamRoom(roomState);
  const [switching, setSwitching] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(() => Boolean(new URLSearchParams(window.location.search).get('teamInvite')));

  const displayName = String(session?.user.user_metadata?.display_name || session?.user.user_metadata?.full_name || session?.user.email?.split('@')[0] || 'Member');
  const initials = displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  useEffect(() => {
    if (!session?.user) return;
    setAuthenticatedPersona({ id: session.user.id, name: displayName, role: 'General Member', initials, color: 'emerald', email: session.user.email });
  }, [displayName, initials, session?.user, setAuthenticatedPersona]);

  const openTeamRooms = () => setShowRoomModal(true);

  // Switching to Team resumes the room you were last in. The picker is only
  // for the cases it cannot decide: no rooms yet, or several to choose from.
  const goToTeam = async () => {
    if (switching) return;
    // Back from a Personal detour: the room never closed and its sync is still
    // live, so flip the mode instead of re-running room discovery — that round
    // trip can fail (offline, slow session refresh) and drop you in the picker.
    if (teamUnlocked && activeRoom) {
      setWorkspaceMode('team');
      onSwitchMode?.('team');
      return;
    }
    setSwitching(true);
    try {
      if (await resumeLastTeamRoom()) {
        setWorkspaceMode('team');
        onSwitchMode?.('team');
        return;
      }
      setShowRoomModal(true);
    } catch {
      setShowRoomModal(true);
    } finally {
      setSwitching(false);
    }
  };

  const switchPersonal = () => { setWorkspaceMode('personal'); onSwitchMode?.('personal'); };

  return <>
    <div className="flex items-center gap-2">
      {workspaceMode === 'personal' ? <div className="flex items-center rounded-2xl border border-borderSoft/30 bg-panel/55 p-1">
        <button type="button" onClick={switchPersonal} className="flex items-center gap-1.5 rounded-xl bg-panel2 px-3 py-1.5 text-xs font-semibold text-text-primary shadow-sm"><User className="h-3.5 w-3.5" /><span className="hidden sm:inline">Personal</span></button>
        <button type="button" onClick={() => void goToTeam()} disabled={switching} className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-text-primary disabled:opacity-60"><Users className="h-3.5 w-3.5 text-amber-400" /><span>{switching ? 'Opening…' : 'Team Hub'}</span></button>
      </div> : <button type="button" onClick={switchPersonal} className="flex h-10 w-10 items-center justify-center rounded-xl border border-borderSoft/30 bg-panel/45 text-text-muted hover:text-text-primary" aria-label="Switch to personal workspace"><User className="h-4 w-4" /></button>}

      {workspaceMode === 'team' && teamUnlocked && activeRoom && <button type="button" onClick={openTeamRooms} className="flex items-center gap-2 rounded-2xl border border-borderSoft/35 bg-panel/65 px-3 py-1.5 text-xs text-text-secondary hover:border-amber-500/35">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/35 bg-emerald-500/15 text-[10px] font-bold text-emerald-500">{initials}</div>
        <div className="hidden text-left md:block"><div className="max-w-[145px] truncate text-[9px] font-semibold uppercase tracking-wider text-amber-500">{activeRoom.name}</div><div className="max-w-[145px] truncate text-[11px] font-bold text-text-primary">{displayName} · {activeRoom.role}</div></div><ChevronDown className="h-3 w-3 text-text-muted" />
      </button>}

      {workspaceMode === 'team' && (!teamUnlocked || !activeRoom) && <button type="button" onClick={() => { lockTeam(); openTeamRooms(); }} className="flex items-center gap-1.5 rounded-xl border border-amber-500/25 px-3 py-2 text-xs text-amber-500"><Lock className="h-3.5 w-3.5" />Choose room</button>}
    </div>
    <TeamUnlockModal isOpen={showRoomModal} onClose={() => setShowRoomModal(false)} onSuccess={() => { setWorkspaceMode('team'); onSwitchMode?.('team'); }} />
  </>;
}
