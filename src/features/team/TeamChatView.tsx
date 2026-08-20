import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertOctagon,
  AtSign,
  CheckSquare,
  FileText,
  Link2,
  ListPlus,
  Check,
  ChevronDown,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Reply,
  Send,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTeamStore } from './team-store';
import type { ChatRef, ChatRefKind, TeamChatMessage } from './team-types';

interface TeamChatViewProps {
  missionId: string;
  /** Jump to the module a referenced item lives in. */
  onOpenRef?: (ref: ChatRef) => void;
}

const REF_ICON: Record<ChatRefKind, LucideIcon> = {
  task: CheckSquare,
  lead: Users,
  workflow: ShieldCheck,
  link: Link2,
  problem: AlertOctagon,
  note: FileText,
};

const REF_LABEL: Record<ChatRefKind, string> = {
  task: 'Task',
  lead: 'Lead',
  workflow: 'Process',
  link: 'Link',
  problem: 'Issue',
  note: 'Note',
};

const QUICK_REACTIONS = ['👍', '🎉', '👀', '🔥'];

/** WhatsApp gives every participant in a group their own name colour. */
const AUTHOR_COLORS = [
  'text-emerald-400', 'text-sky-400', 'text-amber-400',
  'text-fuchsia-400', 'text-rose-400', 'text-cyan-400',
];
const authorColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AUTHOR_COLORS[hash % AUTHOR_COLORS.length];
};

const dayKey = (iso: string) => new Date(iso).toDateString();

const dayLabel = (iso: string) => {
  const date = new Date(iso);
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86_400_000).toDateString();
  if (date.toDateString() === today) return 'Today';
  if (date.toDateString() === yesterday) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
};

const clockTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/** Initials for anyone in the roster, falling back to the first two letters. */
const initialsOf = (name: string) =>
  name
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || name.slice(0, 2).toUpperCase();

function Avatar({ name, size = 'md' }: { name: string; size?: 'md' | 'sm' }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-lg bg-accent/15 font-semibold text-accent ${
        size === 'md' ? 'h-8 w-8 text-[11px]' : 'h-6 w-6 text-[10px]'
      }`}
      title={name}
    >
      {initialsOf(name)}
    </div>
  );
}

function RefCard({ item, onOpen }: { item: ChatRef; onOpen?: (ref: ChatRef) => void }) {
  const Icon = REF_ICON[item.kind];
  return (
    <button
      type="button"
      onClick={() => onOpen?.(item)}
      className="group/ref flex w-full min-w-0 items-center gap-2 rounded-lg border border-borderSoft bg-panel2/60 px-2.5 py-1.5 text-left transition-colors hover:border-accent/45 hover:bg-accent/10"
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-accent" />
      <span className="min-w-0 flex-1 truncate text-xs font-medium text-text-primary">{item.label}</span>
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
        {REF_LABEL[item.kind]}
      </span>
    </button>
  );
}

/** Renders @mentions as accent chips, everything else as plain text. */
function MessageBody({ body, mentions }: { body: string; mentions: string[] }) {
  if (mentions.length === 0) return <span className="whitespace-pre-wrap">{body}</span>;

  // Longest first so "@Deepak (Tech Lead)" wins over a shorter overlapping name.
  const ordered = [...mentions].sort((a, b) => b.length - a.length);
  const nodes: Array<string | { name: string }> = [body];

  ordered.forEach((name) => {
    const needle = `@${name}`;
    for (let i = nodes.length - 1; i >= 0; i -= 1) {
      const chunk = nodes[i];
      if (typeof chunk !== 'string') continue;
      const at = chunk.toLowerCase().indexOf(needle.toLowerCase());
      if (at === -1) continue;
      nodes.splice(i, 1, chunk.slice(0, at), { name }, chunk.slice(at + needle.length));
    }
  });

  return (
    <span className="whitespace-pre-wrap">
      {nodes.map((chunk, i) =>
        typeof chunk === 'string' ? (
          chunk
        ) : (
          <span key={i} className="rounded bg-accent/15 px-1 font-medium text-accent">
            @{chunk.name}
          </span>
        ),
      )}
    </span>
  );
}

/** Search-as-you-type picker over every module item in this project. */
function ItemPicker({
  missionId,
  onPick,
  onClose,
}: {
  missionId: string;
  onPick: (ref: ChatRef) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const state = useTeamStore();

  const options = useMemo<ChatRef[]>(() => {
    const mine = <T extends { missionId: string }>(rows: T[]) => rows.filter((r) => r.missionId === missionId);
    return [
      ...mine(state.teamTasks).map<ChatRef>((t) => ({ kind: 'task', id: t.id, label: t.title, detail: t.status })),
      ...mine(state.leads).map<ChatRef>((l) => ({ kind: 'lead', id: l.id, label: l.businessName, detail: l.status })),
      ...mine(state.problems).map<ChatRef>((p) => ({ kind: 'problem', id: p.id, label: p.title, detail: p.severity })),
      ...mine(state.teamNotes).map<ChatRef>((n) => ({ kind: 'note', id: n.id, label: n.title, detail: n.category })),
      ...mine(state.workLinks).map<ChatRef>((w) => ({ kind: 'link', id: w.id, label: w.title, detail: w.category })),
      ...mine(state.workflows).map<ChatRef>((w) => ({ kind: 'workflow', id: w.id, label: w.title, detail: w.status })),
    ];
  }, [missionId, state.teamTasks, state.leads, state.problems, state.teamNotes, state.workLinks, state.workflows]);

  const results = options
    .filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 40);

  return (
    <div className="absolute bottom-full left-0 z-30 mb-2 w-full max-w-md overflow-hidden rounded-xl border border-borderSoft bg-panel shadow-panel">
      <div className="flex items-center gap-2 border-b border-borderSoft/60 px-3 py-2">
        <Paperclip className="h-3.5 w-3.5 text-text-muted" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => event.key === 'Escape' && onClose()}
          placeholder="Attach a task, lead, issue, note, link…"
          className="flex-1 bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-muted"
        />
        <button type="button" onClick={onClose} aria-label="Close" className="text-text-muted hover:text-text-primary">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto py-1">
        {results.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-text-muted">Nothing in this project matches.</p>
        ) : (
          results.map((option) => {
            const Icon = REF_ICON[option.kind];
            return (
              <button
                key={`${option.kind}-${option.id}`}
                type="button"
                onClick={() => onPick(option)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-panel2"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-accent" />
                <span className="min-w-0 flex-1 truncate text-[13px] text-text-primary">{option.label}</span>
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                  {REF_LABEL[option.kind]}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function Composer({
  missionId,
  parentId,
  placeholder,
  autoFocus,
}: {
  missionId: string;
  parentId?: string;
  placeholder: string;
  autoFocus?: boolean;
}) {
  const sendChatMessage = useTeamStore((s) => s.sendChatMessage);
  const personas = useTeamStore((s) => s.personas);
  const chatDraftRef = useTeamStore((s) => s.chatDraftRef);
  const clearChatDraft = useTeamStore((s) => s.clearChatDraft);

  const [body, setBody] = useState('');
  const [refs, setRefs] = useState<ChatRef[]>([]);
  const [picker, setPicker] = useState<'item' | 'mention' | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // A "Discuss" action in another module hands its item to the channel composer.
  // Derived rather than copied into state, so the store stays the one source.
  const draft = !parentId && chatDraftRef && !refs.some((r) => r.kind === chatDraftRef.kind && r.id === chatDraftRef.id)
    ? chatDraftRef
    : null;
  const pendingRefs = draft ? [...refs, draft] : refs;

  const dropRef = (ref: ChatRef) => {
    if (draft && draft.kind === ref.kind && draft.id === ref.id) {
      clearChatDraft();
      return;
    }
    setRefs((current) => current.filter((r) => !(r.kind === ref.kind && r.id === ref.id)));
  };

  const submit = () => {
    const text = body.trim();
    if (!text && pendingRefs.length === 0) return;
    sendChatMessage({ missionId, body: text, refs: pendingRefs, parentId });
    setBody('');
    setRefs([]);
    setPicker(null);
  };

  return (
    <div className="relative border-t border-borderSoft/50 bg-panel/80 p-2 sm:p-3">
      {picker === 'item' && (
        <ItemPicker
          missionId={missionId}
          onClose={() => setPicker(null)}
          onPick={(ref) => {
            setRefs((current) =>
              current.some((r) => r.kind === ref.kind && r.id === ref.id) ? current : [...current, ref],
            );
            setPicker(null);
            inputRef.current?.focus();
          }}
        />
      )}

      {picker === 'mention' && (
        <div className="absolute bottom-full left-0 z-30 mb-2 w-64 overflow-hidden rounded-xl border border-borderSoft bg-panel py-1 shadow-panel">
          {personas.map((persona) => (
            <button
              key={persona.id}
              type="button"
              onClick={() => {
                setBody((current) => `${current}${current && !current.endsWith(' ') ? ' ' : ''}@${persona.name} `);
                setPicker(null);
                inputRef.current?.focus();
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-panel2"
            >
              <Avatar name={persona.name} size="sm" />
              <span className="min-w-0 flex-1 truncate text-[13px] text-text-primary">{persona.name}</span>
            </button>
          ))}
        </div>
      )}

      {pendingRefs.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {pendingRefs.map((ref) => {
            const Icon = REF_ICON[ref.kind];
            return (
              <span
                key={`${ref.kind}-${ref.id}`}
                className="flex items-center gap-1.5 rounded-lg border border-accent/35 bg-accent/10 px-2 py-1 text-xs text-text-primary"
              >
                <Icon className="h-3 w-3 shrink-0 text-accent" />
                <span className="max-w-[180px] truncate">{ref.label}</span>
                <button
                  type="button"
                  aria-label={`Remove ${ref.label}`}
                  onClick={() => dropRef(ref)}
                  className="text-text-muted transition-colors hover:text-danger"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div className="flex min-w-0 items-center gap-2">
        {/* Attach and mention sit inside the input pill, the way WhatsApp keeps
            its clip and emoji inside the rounded field. */}
        <div className="flex min-w-0 flex-1 items-center gap-0.5 rounded-[22px] border border-borderSoft/70 bg-panel2/70 px-1 py-0.5 transition-colors focus-within:border-accent/50 focus-within:bg-panel2">
          <button
            type="button"
            aria-label="Attach an item"
            onClick={() => setPicker((current) => (current === 'item' ? null : 'item'))}
            className="flex h-10 min-h-0 w-10 min-w-0 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-panel hover:text-text-primary"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Mention someone"
            onClick={() => setPicker((current) => (current === 'mention' ? null : 'mention'))}
            className="flex h-10 min-h-0 w-10 min-w-0 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-panel hover:text-text-primary"
          >
            <AtSign className="h-4 w-4" />
          </button>

        <textarea
          ref={inputRef}
          autoFocus={autoFocus}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit();
              return;
            }
            // Typing "/" on an empty composer opens the item picker, Teams-style.
            if (event.key === '/' && body === '') {
              event.preventDefault();
              setPicker('item');
            }
          }}
          rows={1}
          placeholder={placeholder}
          className="max-h-32 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-1 py-2.5 text-[13px] leading-5 text-text-primary outline-none placeholder:text-text-muted"
        />
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!body.trim() && pendingRefs.length === 0}
          aria-label="Send"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-[rgb(var(--accent-contrast))] shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-1.5 hidden pl-3 text-[11px] text-text-muted sm:block">
        Enter to send · Shift+Enter for a new line · / to attach an item
      </p>
    </div>
  );
}

function MessageRow({
  message,
  grouped,
  replyCount,
  onOpenRef,
  onOpenThread,
}: {
  message: TeamChatMessage;
  grouped: boolean;
  replyCount: number;
  onOpenRef?: (ref: ChatRef) => void;
  onOpenThread?: (id: string) => void;
}) {
  const me = useTeamStore((s) => s.activePersona.name);
  const toggleChatReaction = useTeamStore((s) => s.toggleChatReaction);
  const deleteChatMessage = useTeamStore((s) => s.deleteChatMessage);
  const promoteChatMessage = useTeamStore((s) => s.promoteChatMessage);
  const [showPromote, setShowPromote] = useState(false);
  // Touch screens never fire hover, so the bubble's action bar also opens from
  // an explicit "…" tap that only exists below the hover-friendly breakpoint.
  const [actionsOpen, setActionsOpen] = useState(false);
  const closeActions = () => { setActionsOpen(false); setShowPromote(false); };

  // Workspace activity reads as a centred notice, the way WhatsApp shows
  // "Messages are end-to-end encrypted" or a group rename.
  if (message.kind === 'system') {
    return (
      <div className="flex justify-center py-1.5">
        <div className="flex max-w-[90%] flex-wrap items-center justify-center gap-x-1.5 gap-y-1 rounded-full border border-borderSoft/30 bg-panel2/75 px-3 py-1.5 text-center text-[11px] text-text-secondary shadow-sm">
          <span className="font-medium">{message.authorName}</span>
          <span>{message.body}</span>
          {message.refs.map((ref) => (
            <button
              key={`${ref.kind}-${ref.id}`}
              type="button"
              onClick={() => onOpenRef?.(ref)}
              className="max-w-[220px] truncate font-medium text-accent hover:underline"
            >
              {ref.label}
            </button>
          ))}
          <span className="tabular-nums text-text-muted">{clockTime(message.createdAt)}</span>
        </div>
      </div>
    );
  }

  const isMine = message.authorName === me;

  return (
    <div className={`group flex gap-2 px-1 ${grouped ? 'pt-0.5' : 'pt-2'} ${isMine ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar rail — incoming only, and only on the first of a run. */}
      {!isMine && <div className="w-8 shrink-0">{grouped ? null : <Avatar name={message.authorName} />}</div>}

      <div className={`relative flex min-w-0 flex-col sm:max-w-[78%] ${isMine ? 'max-w-[88%] items-end' : 'max-w-[calc(100%-2.5rem)] items-start'}`}>
        <div
          className={`relative max-w-full min-w-0 rounded-xl px-2.5 py-1.5 shadow-[0_1px_1px_rgb(var(--shadow-color)/0.28)] ${
            isMine
              ? `bg-accent/20 ${grouped ? '' : 'rounded-tr-none'}`
              : `bg-panel2 ${grouped ? '' : 'rounded-tl-none'}`
          }`}
        >
          {/* The little notch WhatsApp hangs off the first bubble of a run. */}
          {!grouped && (
            <span
              aria-hidden
              className={`absolute top-0 h-2.5 w-2.5 ${
                isMine
                  ? '-right-2 bg-accent/20 [clip-path:polygon(0_0,0_100%,100%_0)]'
                  : '-left-2 bg-panel2 [clip-path:polygon(100%_0,100%_100%,0_0)]'
              }`}
            />
          )}

          {!grouped && !isMine && (
            <p className={`mb-0.5 text-[12px] font-semibold ${authorColor(message.authorName)}`}>
              {message.authorName}
            </p>
          )}

          {message.body && (
            <div className="max-w-full text-[13px] leading-relaxed text-text-primary [overflow-wrap:anywhere]">
              <MessageBody body={message.body} mentions={message.mentions} />
            </div>
          )}

          {message.refs.length > 0 && (
            <div className="mt-1.5 flex min-w-0 flex-col gap-1.5">
              {message.refs.map((ref) => (
                <RefCard key={`${ref.kind}-${ref.id}`} item={ref} onOpen={onOpenRef} />
              ))}
            </div>
          )}

          {message.spawned && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-text-secondary">
              <ListPlus className="h-3 w-3 shrink-0 text-success" />
              <span>Created</span>
              <button
                type="button"
                onClick={() => onOpenRef?.(message.spawned!)}
                className="max-w-[180px] truncate font-medium text-accent hover:underline"
              >
                {message.spawned.label}
              </button>
            </div>
          )}

          <div className="-mt-0.5 flex items-center justify-end gap-1 text-[10px] text-text-muted">
            {message.editedAt && <span>edited</span>}
            <span className="tabular-nums">{clockTime(message.createdAt)}</span>
            {isMine && <Check className="h-3 w-3 text-text-muted" aria-label="Sent" />}
            <button
              type="button"
              aria-label="Message actions"
              aria-expanded={actionsOpen}
              onClick={() => (actionsOpen ? closeActions() : setActionsOpen(true))}
              className="-mr-1 flex h-5 min-h-0 w-5 min-w-0 items-center justify-center rounded text-text-muted transition-colors hover:text-text-primary lg:hidden"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {message.reactions.length > 0 && (
          <div className={`-mt-1 flex flex-wrap gap-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
            {message.reactions.map((reaction) => {
              const mine = reaction.by.includes(me);
              return (
                <button
                  key={reaction.emoji}
                  type="button"
                  title={reaction.by.join(', ')}
                  onClick={() => toggleChatReaction(message.id, reaction.emoji)}
                  className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition-colors ${
                    mine
                      ? 'border-accent/45 bg-accent/12 text-accent'
                      : 'border-borderSoft bg-panel text-text-secondary hover:border-accent/35'
                  }`}
                >
                  <span>{reaction.emoji}</span>
                  <span className="tabular-nums">{reaction.by.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {replyCount > 0 && (
          <button
            type="button"
            onClick={() => onOpenThread?.(message.id)}
            className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-accent hover:underline"
          >
            <MessageSquare className="h-3 w-3" />
            {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
          </button>
        )}

        {/* Hover toolbar, tucked to the outer edge of the bubble. */}
        <div
          className={`absolute -top-3 z-10 items-center gap-0.5 rounded-lg border border-borderSoft bg-panel p-0.5 shadow-panel lg:group-hover:flex ${
            actionsOpen ? 'flex' : 'hidden'
          } ${isMine ? 'right-2' : 'left-2'}`}
        >
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={`React ${emoji}`}
              onClick={() => { toggleChatReaction(message.id, emoji); closeActions(); }}
              className="rounded px-1 py-0.5 text-sm transition-colors hover:bg-panel2"
            >
              {emoji}
            </button>
          ))}
          <span className="mx-0.5 h-4 w-px bg-borderSoft" />
          {onOpenThread && (
            <button
              type="button"
              aria-label="Reply in thread"
              onClick={() => { onOpenThread(message.id); closeActions(); }}
              className="rounded p-1 text-text-muted transition-colors hover:bg-panel2 hover:text-text-primary"
            >
              <Reply className="h-3.5 w-3.5" />
            </button>
          )}
          <div className="relative">
            <button
              type="button"
              aria-label="Create an item from this message"
              onClick={() => setShowPromote((current) => !current)}
              disabled={!message.body.trim() || Boolean(message.spawned)}
              className="rounded p-1 text-text-muted transition-colors hover:bg-panel2 hover:text-text-primary disabled:opacity-35"
            >
              <ListPlus className="h-3.5 w-3.5" />
            </button>
            {showPromote && (
              <div className="absolute right-0 top-full z-30 mt-1 w-40 overflow-hidden rounded-lg border border-borderSoft bg-panel py-1 shadow-panel">
                {([['task', 'Create task'], ['problem', 'Create issue'], ['note', 'Create note']] as const).map(
                  ([target, label]) => (
                    <button
                      key={target}
                      type="button"
                      onClick={() => {
                        promoteChatMessage(message.id, target);
                        closeActions();
                      }}
                      className="block w-full px-3 py-1.5 text-left text-xs text-text-secondary transition-colors hover:bg-panel2 hover:text-text-primary"
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
          {isMine && (
            <button
              type="button"
              aria-label="Delete message"
              onClick={() => { deleteChatMessage(message.id); closeActions(); }}
              className="rounded p-1 text-text-muted transition-colors hover:bg-panel2 hover:text-danger"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function TeamChatView({ missionId, onOpenRef }: TeamChatViewProps) {
  const chatMessages = useTeamStore((s) => s.chatMessages);
  const markChannelRead = useTeamStore((s) => s.markChannelRead);
  const setActiveChatChannel = useTeamStore((s) => s.setActiveChatChannel);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [showJump, setShowJump] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const jumpToLatest = () =>
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });

  const messages = useMemo(
    () =>
      chatMessages
        .filter((m) => m.missionId === missionId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [chatMessages, missionId],
  );

  const channel = messages.filter((m) => !m.parentId);
  const replyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    messages.forEach((m) => {
      if (m.parentId) counts[m.parentId] = (counts[m.parentId] ?? 0) + 1;
    });
    return counts;
  }, [messages]);

  const thread = threadId ? messages.find((m) => m.id === threadId) : null;
  const threadReplies = threadId ? messages.filter((m) => m.parentId === threadId) : [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [channel.length]);

  useEffect(() => {
    markChannelRead(missionId);
  }, [markChannelRead, missionId, messages.length]);

  useEffect(() => {
    setActiveChatChannel(missionId);
    return () => setActiveChatChannel(null);
  }, [missionId, setActiveChatChannel]);

  return (
    <div className="flex h-full min-h-0 gap-0 lg:gap-3">
      <section className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[20px] border border-borderSoft/60 bg-panel/40 shadow-[0_12px_32px_rgb(var(--shadow-color)/0.12)]">
        <div
          ref={scrollRef}
          onScroll={(event) => {
            const el = event.currentTarget;
            setShowJump(el.scrollHeight - el.scrollTop - el.clientHeight > 240);
          }}
          className="chat-wallpaper flex-1 scroll-pb-4 overflow-y-auto overflow-x-hidden px-2 py-3 overscroll-contain"
        >
          {channel.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                <MessageSquare className="h-7 w-7" />
              </div>
              <div>
                <p className="text-base font-semibold text-text-primary">No messages yet</p>
                <p className="mt-1 max-w-sm text-[13px] text-text-secondary">
                  This channel is wired to the project. Attach a task, lead or issue with the clip, mention a teammate
                  with @, and every move in the other tabs lands here automatically.
                </p>
              </div>
            </div>
          ) : (
            channel.map((message, index) => {
              const previous = channel[index - 1];
              const newDay = !previous || dayKey(previous.createdAt) !== dayKey(message.createdAt);
              const grouped =
                !newDay &&
                Boolean(previous) &&
                previous.kind === 'message' &&
                message.kind === 'message' &&
                previous.authorName === message.authorName &&
                new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() < 5 * 60 * 1000;

              return (
                <div key={message.id}>
                  {newDay && (
                    <div className="flex justify-center px-2 py-3">
                      <span className="rounded-lg bg-panel2/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-text-secondary shadow-sm">
                        {dayLabel(message.createdAt)}
                      </span>
                    </div>
                  )}
                  <MessageRow
                    message={message}
                    grouped={grouped}
                    replyCount={replyCounts[message.id] ?? 0}
                    onOpenRef={onOpenRef}
                    onOpenThread={setThreadId}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* WhatsApp's jump-to-latest chip, for when you have scrolled back. */}
        {showJump && (
          <button
            type="button"
            onClick={jumpToLatest}
            aria-label="Jump to latest messages"
            className="absolute bottom-24 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-borderSoft bg-panel text-text-secondary shadow-panel transition-colors hover:text-text-primary"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        )}

        <Composer missionId={missionId} placeholder="Message…" />
      </section>

      {/* Thread panel: full-screen on phones, but stopping above the fixed bottom
          nav — both sit at z-40 and the nav paints last, so an inset-0 panel
          would bury the reply composer underneath it. */}
      {thread && (
        <aside className="fixed inset-x-0 top-0 bottom-[var(--mobile-nav-height)] z-40 flex min-h-0 flex-col overflow-hidden border border-borderSoft/60 bg-panel lg:relative lg:inset-auto lg:bottom-auto lg:z-auto lg:w-[360px] lg:shrink-0 lg:rounded-2xl lg:bg-panel/40">
          <header className="flex items-center justify-between border-b border-borderSoft/60 px-3 py-2.5">
            <span className="text-[13px] font-semibold text-text-primary">Thread</span>
            <button
              type="button"
              aria-label="Close thread"
              onClick={() => setThreadId(null)}
              className="rounded-lg p-1 text-text-muted transition-colors hover:bg-panel2 hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="chat-wallpaper flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
            <MessageRow message={thread} grouped={false} replyCount={0} onOpenRef={onOpenRef} />
            <div className="my-2 border-t border-borderSoft/60" />
            {threadReplies.map((reply, index) => (
              <MessageRow
                key={reply.id}
                message={reply}
                grouped={
                  index > 0 &&
                  threadReplies[index - 1].authorName === reply.authorName &&
                  reply.kind === 'message'
                }
                replyCount={0}
                onOpenRef={onOpenRef}
              />
            ))}
          </div>

          <Composer autoFocus missionId={missionId} parentId={thread.id} placeholder="Reply…" />
        </aside>
      )}
    </div>
  );
}
