import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertOctagon,
  AtSign,
  CheckSquare,
  FileText,
  Link2,
  ListPlus,
  MessageSquare,
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
      className="group/ref flex max-w-full items-center gap-2 rounded-lg border border-borderSoft bg-panel2/60 px-2.5 py-1.5 text-left transition-colors hover:border-accent/45 hover:bg-accent/10"
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-accent" />
      <span className="truncate text-xs font-medium text-text-primary">{item.label}</span>
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
    <div className="relative border-t border-borderSoft/60 bg-panel/40 p-3">
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

      <div className="flex items-end gap-2">
        <div className="flex shrink-0 items-center gap-1 pb-1.5">
          <button
            type="button"
            aria-label="Attach an item"
            onClick={() => setPicker((current) => (current === 'item' ? null : 'item'))}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-panel2 hover:text-text-primary"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Mention someone"
            onClick={() => setPicker((current) => (current === 'mention' ? null : 'mention'))}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-panel2 hover:text-text-primary"
          >
            <AtSign className="h-4 w-4" />
          </button>
        </div>

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
          className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-borderSoft bg-panel2/50 px-3 py-2.5 text-[13px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent/45"
        />

        <button
          type="button"
          onClick={submit}
          disabled={!body.trim() && pendingRefs.length === 0}
          aria-label="Send"
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-accent text-[rgb(var(--accent-contrast))] transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-1.5 pl-[4.5rem] text-[11px] text-text-muted">
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

  if (message.kind === 'system') {
    return (
      <div className="flex items-center gap-2 py-1 pl-11 text-xs text-text-muted">
        <span className="font-medium text-text-secondary">{message.authorName}</span>
        <span>{message.body}</span>
        {message.refs.map((ref) => (
          <button
            key={`${ref.kind}-${ref.id}`}
            type="button"
            onClick={() => onOpenRef?.(ref)}
            className="max-w-[240px] truncate font-medium text-accent hover:underline"
          >
            {ref.label}
          </button>
        ))}
        <span className="ml-auto shrink-0 tabular-nums">{clockTime(message.createdAt)}</span>
      </div>
    );
  }

  const isMine = message.authorName === me;

  return (
    <div className={`group relative flex gap-3 rounded-lg px-2 transition-colors hover:bg-panel2/40 ${grouped ? 'py-0.5' : 'pt-2 pb-0.5'}`}>
      <div className="w-8 shrink-0">
        {grouped ? (
          <span className="hidden pt-1 text-[10px] tabular-nums text-text-muted group-hover:block">
            {clockTime(message.createdAt)}
          </span>
        ) : (
          <Avatar name={message.authorName} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        {!grouped && (
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] font-semibold text-text-primary">{message.authorName}</span>
            <span className="text-[11px] tabular-nums text-text-muted">{clockTime(message.createdAt)}</span>
            {message.editedAt && <span className="text-[10px] text-text-muted">edited</span>}
          </div>
        )}

        {message.body && (
          <div className="text-[13px] leading-relaxed text-text-secondary">
            <MessageBody body={message.body} mentions={message.mentions} />
          </div>
        )}

        {message.refs.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {message.refs.map((ref) => (
              <RefCard key={`${ref.kind}-${ref.id}`} item={ref} onOpen={onOpenRef} />
            ))}
          </div>
        )}

        {message.spawned && (
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-text-muted">
            <ListPlus className="h-3 w-3 text-success" />
            <span>Created</span>
            <button
              type="button"
              onClick={() => onOpenRef?.(message.spawned!)}
              className="max-w-[220px] truncate font-medium text-accent hover:underline"
            >
              {message.spawned.label}
            </button>
          </div>
        )}

        {message.reactions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
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
                      : 'border-borderSoft bg-panel2/60 text-text-secondary hover:border-accent/35'
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
            className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-accent hover:underline"
          >
            <MessageSquare className="h-3 w-3" />
            {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
          </button>
        )}
      </div>

      {/* Hover toolbar */}
      <div className="absolute -top-3 right-2 hidden items-center gap-0.5 rounded-lg border border-borderSoft bg-panel p-0.5 shadow-panel group-hover:flex">
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            aria-label={`React ${emoji}`}
            onClick={() => toggleChatReaction(message.id, emoji)}
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
            onClick={() => onOpenThread(message.id)}
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
                      setShowPromote(false);
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
            onClick={() => deleteChatMessage(message.id)}
            className="rounded p-1 text-text-muted transition-colors hover:bg-panel2 hover:text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export function TeamChatView({ missionId, onOpenRef }: TeamChatViewProps) {
  const chatMessages = useTeamStore((s) => s.chatMessages);
  const markChannelRead = useTeamStore((s) => s.markChannelRead);
  const [threadId, setThreadId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="flex h-full min-h-0 gap-3">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-borderSoft/60 bg-panel/40">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 py-3">
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
                    <div className="flex items-center gap-3 px-2 py-3">
                      <span className="h-px flex-1 bg-borderSoft" />
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                        {dayLabel(message.createdAt)}
                      </span>
                      <span className="h-px flex-1 bg-borderSoft" />
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

        <Composer missionId={missionId} placeholder="Message this project…" />
      </section>

      {thread && (
        <aside className="flex min-h-0 w-[360px] shrink-0 flex-col overflow-hidden rounded-2xl border border-borderSoft/60 bg-panel/40">
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

          <div className="flex-1 overflow-y-auto px-2 py-3">
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
