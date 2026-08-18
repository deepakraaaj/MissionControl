import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Clock3, Copy, Crown, DoorOpen, Plus, RefreshCw, ShieldCheck, UserCheck, UserRound, UserX, Users, X } from 'lucide-react';
import { useTeamStore } from './team-store';
import { getActiveTeamRoom, useTeamRoomStore } from './team-room-store';
import { connectTeamRoomSync } from './team-room-sync';

interface TeamUnlockModalProps { isOpen: boolean; onClose: () => void; onSuccess?: () => void; }

export function TeamUnlockModal({ isOpen, onClose, onSuccess }: TeamUnlockModalProps) {
  const roomState = useTeamRoomStore();
  const { rooms, activeRoomId, members, loading, membersLoading, error } = roomState;
  const hydrateRooms = roomState.hydrate;
  const loadMembers = roomState.loadMembers;
  const activeRoom = getActiveTeamRoom(roomState);
  const grantApprovedTeamAccess = useTeamStore((state) => state.grantApprovedTeamAccess);
  const [mode, setMode] = useState<'rooms' | 'create' | 'join' | 'members'>('rooms');
  const [roomName, setRoomName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);
  const approvedRooms = useMemo(() => rooms.filter((room) => room.status === 'approved'), [rooms]);
  const pendingRooms = useMemo(() => rooms.filter((room) => room.status === 'pending'), [rooms]);
  const isAdmin = activeRoom?.role === 'owner' || activeRoom?.role === 'admin';

  useEffect(() => { if (isOpen) void hydrateRooms(); }, [hydrateRooms, isOpen]);
  useEffect(() => { if (mode === 'members' && activeRoomId) void loadMembers(activeRoomId); }, [activeRoomId, loadMembers, mode]);
  if (!isOpen) return null;

  const closeModal = () => {
    setMode('rooms');
    roomState.clearError();
    onClose();
  };

  const enterRoom = async (roomId: string) => {
    roomState.selectRoom(roomId);
    await connectTeamRoomSync(roomId);
    grantApprovedTeamAccess();
    onSuccess?.();
    closeModal();
  };
  const createRoom = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!roomName.trim()) return;
    try {
      const room = await roomState.createRoom(roomName);
      setRoomName('');
      await enterRoom(room.roomId);
    } catch { /* Store exposes the actionable error in the modal. */ }
  };
  const requestAccess = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!inviteCode.trim()) return;
    try {
      const room = await roomState.requestAccess(inviteCode);
      setInviteCode('');
      if (room.status === 'approved') await enterRoom(room.roomId);
      else setMode('rooms');
    } catch { /* Store exposes the actionable error in the modal. */ }
  };
  const copyInvite = async () => {
    if (!activeRoom?.inviteCode) return;
    await navigator.clipboard.writeText(activeRoom.inviteCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="team-workspace fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-700/80 bg-slate-900 p-5 text-slate-100 shadow-2xl sm:p-6">
        <button type="button" onClick={closeModal} className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Close"><X className="h-5 w-5" /></button>
        <div className="mb-5 flex items-center gap-3 pr-10">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/15 text-amber-400"><Users className="h-5 w-5" /></div>
          <div><h2 className="text-lg font-bold text-white">{approvedRooms.length ? 'Your workspaces' : 'Join your team'}</h2><p className="text-xs text-slate-400">{approvedRooms.length ? 'Open a workspace or manage your team access.' : 'Create a workspace or request approval to join one.'}</p></div>
        </div>
        {error && <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</div>}

        {mode === 'rooms' && <div className="space-y-5">
          {loading ? <div className="py-10 text-center text-sm text-slate-400">Checking your workspaces…</div> : <>
            {approvedRooms.length > 0 && <div className="space-y-3">{approvedRooms.map((room) => { const ownsRoom = room.role === 'owner'; const canManage = ownsRoom || room.role === 'admin'; const selected = room.roomId === activeRoomId; return <div key={room.roomId} className={`rounded-2xl border p-4 transition ${selected ? 'border-amber-500/35 bg-amber-500/[0.06]' : 'border-slate-700 bg-slate-950/55'}`}>
              <div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-start gap-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${ownsRoom ? 'border-amber-500/30 bg-amber-500/15 text-amber-400' : 'border-blue-500/25 bg-blue-500/10 text-blue-400'}`}>{ownsRoom ? <Crown className="h-4.5 w-4.5" /> : <UserRound className="h-4.5 w-4.5" />}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-bold text-white">{room.name}</h3>{selected && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-400">Current</span>}</div><p className="mt-1 text-[11px] text-slate-400">{ownsRoom ? 'You own this workspace' : room.role === 'admin' ? 'You help manage this workspace' : 'You joined as an approved member'}</p>{room.pendingCount > 0 && <p className="mt-1.5 text-[11px] font-semibold text-amber-400">{room.pendingCount} access request{room.pendingCount === 1 ? '' : 's'} waiting</p>}</div></div><button type="button" onClick={() => void enterRoom(room.roomId)} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400">Open workspace <ArrowRight className="h-3.5 w-3.5" /></button></div>
              {canManage && <div className="mt-3 flex justify-end border-t border-slate-700/60 pt-3"><button type="button" onClick={() => { roomState.selectRoom(room.roomId); setMode('members'); }} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"><Users className="h-3.5 w-3.5" />Members & access{room.pendingCount ? ` (${room.pendingCount})` : ''}</button></div>}
            </div>; })}</div>}
            {pendingRooms.length > 0 && <div className="space-y-2"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Awaiting approval</p>{pendingRooms.map((room) => <div key={room.roomId} className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3"><Clock3 className="h-5 w-5 shrink-0 text-amber-400" /><div><div className="text-sm font-semibold">{room.name}</div><div className="text-[11px] text-slate-400">Your request is with the workspace admin. We’ll unlock it after approval.</div></div></div>)}</div>}
            {!approvedRooms.length && !pendingRooms.length && <div className="rounded-2xl border border-dashed border-slate-700 py-9 text-center"><ShieldCheck className="mx-auto h-8 w-8 text-slate-600" /><p className="mt-3 text-sm font-semibold">No workspace access yet</p><p className="mt-1 text-xs text-slate-500">Join your existing team with an invite code, or create a new workspace.</p></div>}
          </>}
          <div className="border-t border-slate-800 pt-4"><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{approvedRooms.length ? 'Add another workspace' : 'Get started'}</p><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => { roomState.clearError(); setMode('join'); }} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold ${approvedRooms.length ? 'border border-slate-700 bg-slate-800/55 hover:bg-slate-800' : 'bg-amber-500 text-slate-950 hover:bg-amber-400'}`}><DoorOpen className="h-4 w-4" />Join existing team</button><button type="button" onClick={() => { roomState.clearError(); setMode('create'); }} className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-3 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"><Plus className="h-4 w-4" />Create new workspace</button></div></div>
        </div>}

        {mode === 'create' && <form onSubmit={createRoom} className="space-y-4"><div><label className="mb-1.5 block text-xs font-semibold">Room name</label><input autoFocus required minLength={2} maxLength={80} value={roomName} onChange={(event) => setRoomName(event.target.value)} placeholder="e.g. SynCatch Freelance Studio" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-amber-500" /></div><p className="rounded-xl bg-slate-800/60 p-3 text-xs leading-relaxed text-slate-400">You become the room owner. Share its generated code and approve each member request.</p><div className="flex justify-end gap-2"><button type="button" onClick={() => setMode('rooms')} className="px-3 py-2 text-xs text-slate-400">Back</button><button disabled={loading} className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950">{loading ? 'Creating…' : 'Create room'}</button></div></form>}
        {mode === 'join' && <form onSubmit={requestAccess} className="space-y-4"><div><label className="mb-1.5 block text-xs font-semibold">Room invite code</label><input autoFocus required value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} placeholder="AB12-CD34" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-center font-mono text-lg font-bold uppercase tracking-[0.2em] text-amber-300 outline-none focus:border-amber-500" /></div><p className="rounded-xl bg-slate-800/60 p-3 text-xs leading-relaxed text-slate-400">The code sends an access request. It does not unlock the room until an admin approves your account.</p><div className="flex justify-end gap-2"><button type="button" onClick={() => setMode('rooms')} className="px-3 py-2 text-xs text-slate-400">Back</button><button disabled={loading} className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950">{loading ? 'Sending…' : 'Request access'}</button></div></form>}

        {mode === 'members' && activeRoom && isAdmin && <div className="space-y-4">
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-sm font-bold">{activeRoom.name}</div><div className="mt-1 font-mono text-lg font-bold tracking-widest text-amber-300">{activeRoom.inviteCode}</div></div><div className="flex gap-2"><button type="button" onClick={copyInvite} className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs"><Copy className="h-3.5 w-3.5" />{copied ? 'Copied' : 'Copy code'}</button><button type="button" onClick={() => void roomState.regenerateCode(activeRoom.roomId)} className="rounded-lg border border-slate-700 p-2" title="Generate a new invite code"><RefreshCw className="h-3.5 w-3.5" /></button></div></div></div>
          <div className="space-y-2"><div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Members and requests</p><button type="button" onClick={() => void roomState.loadMembers(activeRoom.roomId)} className="text-xs text-blue-400">Refresh</button></div>{membersLoading ? <div className="py-6 text-center text-xs text-slate-400">Loading members…</div> : members.map((member) => <div key={member.membershipId} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/45 p-3"><div className="min-w-0"><div className="truncate text-sm font-semibold">{member.displayName || member.email}</div><div className="truncate text-[11px] text-slate-500">{member.email} · <span className="capitalize">{member.role}</span> · <span className="capitalize">{member.status}</span></div></div>{member.role !== 'owner' && <div className="flex gap-1.5">{member.status === 'pending' && <><button type="button" onClick={() => void roomState.reviewMember(member.membershipId, 'approved')} className="flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1.5 text-xs font-semibold text-emerald-400"><UserCheck className="h-3.5 w-3.5" />Approve</button><button type="button" onClick={() => void roomState.reviewMember(member.membershipId, 'rejected')} className="rounded-lg bg-rose-500/10 p-1.5 text-rose-400" title="Reject"><UserX className="h-4 w-4" /></button></>}{member.status === 'approved' && <button type="button" onClick={() => void roomState.reviewMember(member.membershipId, 'revoked')} className="rounded-lg border border-rose-500/25 px-2.5 py-1.5 text-xs text-rose-400">Revoke</button>}{member.status === 'rejected' && <button type="button" onClick={() => void roomState.reviewMember(member.membershipId, 'approved')} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400"><Check className="h-3.5 w-3.5" />Approve</button>}</div>}</div>)}</div>
          <button type="button" onClick={() => setMode('rooms')} className="text-xs text-slate-400 hover:text-white">← Back to rooms</button>
        </div>}
      </div>
    </div>
  );
}
