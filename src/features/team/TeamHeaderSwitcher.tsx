import { useEffect, useState } from 'react';
import { ChevronDown, Lock, User, Users } from 'lucide-react';
import { useAuthStore } from '../auth/auth-store';
import { useTeamStore } from './team-store';
import { getActiveTeamRoom, useTeamRoomStore } from './team-room-store';
import { TeamUnlockModal } from './TeamUnlockModal';

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
  const [showRoomModal, setShowRoomModal] = useState(false);

  const displayName = String(session?.user.user_metadata?.display_name || session?.user.user_metadata?.full_name || session?.user.email?.split('@')[0] || 'Member');
  const initials = displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  useEffect(() => {
    if (!session?.user) return;
    setAuthenticatedPersona({ id: session.user.id, name: displayName, role: 'General Member', initials, color: 'emerald', email: session.user.email });
  }, [displayName, initials, session?.user, setAuthenticatedPersona]);

  const openTeamRooms = () => setShowRoomModal(true);
  const switchPersonal = () => { setWorkspaceMode('personal'); onSwitchMode?.('personal'); };

  return <>
    <div className="flex items-center gap-2">
      {workspaceMode === 'personal' ? <div className="flex items-center rounded-2xl border border-borderSoft/30 bg-panel/55 p-1">
        <button type="button" onClick={switchPersonal} className="flex items-center gap-1.5 rounded-xl bg-panel2 px-3 py-1.5 text-xs font-semibold text-text-primary shadow-sm"><User className="h-3.5 w-3.5" /><span className="hidden sm:inline">Personal</span></button>
        <button type="button" onClick={openTeamRooms} className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-text-primary"><Users className="h-3.5 w-3.5 text-amber-400" /><span>Team Hub</span></button>
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
