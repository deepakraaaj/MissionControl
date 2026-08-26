import { create } from 'zustand';
import { useAuthStore } from '../auth/auth-store';

export type Challenge = {
  id: string;
  title: string;
  emoji: string;
  targetDays: number;
  missionId: string | null;
  sourceTaskId: string | null;
  cadence: 'daily';
  createdAt: string;
  checkIns: string[];
};

const STORAGE_KEY = 'missioncontrol-challenges-v1';
const SUPABASE_CONFIGURED = Boolean(import.meta.env.VITE_SUPABASE_URL);

function usesSupabase() {
  return SUPABASE_CONFIGURED && !useAuthStore.getState().localMode;
}

function loadLocalChallenges(): Challenge[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown;
    return Array.isArray(value) ? (value as Challenge[]) : [];
  } catch {
    return [];
  }
}

function persistLocal(challenges: Challenge[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(challenges));
}

type ChallengeStore = {
  challenges: Challenge[];
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  createChallenge: (title: string, emoji: string, targetDays: number, missionId?: string | null, sourceTaskId?: string | null) => Promise<void>;
  toggleToday: (id: string) => Promise<void>;
  deleteChallenge: (id: string) => Promise<void>;
};

export const useChallengeStore = create<ChallengeStore>((set, get) => ({
  challenges: [],
  hydrated: false,
  loading: false,
  error: null,

  hydrate: async () => {
    if (get().hydrated || get().loading) return;
    set({ loading: true, error: null });
    try {
      if (usesSupabase()) {
        const { selectChallengesByUser } = await import('../../lib/supabase');
        const challenges = await selectChallengesByUser();
        set({ challenges, hydrated: true, loading: false });
      } else {
        set({ challenges: loadLocalChallenges(), hydrated: true, loading: false });
      }
    } catch (error) {
      console.error('hydrate challenges error:', error);
      set({
        loading: false,
        hydrated: true,
        error: error instanceof Error ? error.message : 'Unable to load challenges',
      });
    }
  },

  createChallenge: async (title, emoji, targetDays, missionId = null, sourceTaskId = null) => {
    const challenge: Challenge = {
      id: crypto.randomUUID(),
      title: title.trim(),
      emoji,
      targetDays,
      missionId,
      sourceTaskId,
      cadence: 'daily',
      createdAt: new Date().toISOString(),
      checkIns: [],
    };
    const challenges = [challenge, ...get().challenges];
    set({ challenges });
    try {
      if (usesSupabase()) {
        const { insertChallenge } = await import('../../lib/supabase');
        await insertChallenge(challenge);
      } else {
        persistLocal(challenges);
      }
    } catch (error) {
      console.error('createChallenge error:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to create challenge' });
    }
  },

  toggleToday: async (id) => {
    const today = new Date().toLocaleDateString('en-CA');
    const target = get().challenges.find((challenge) => challenge.id === id);
    if (!target) return;
    const checkIns = target.checkIns.includes(today)
      ? target.checkIns.filter((date) => date !== today)
      : [...target.checkIns, today];
    const challenges = get().challenges.map((challenge) => (challenge.id === id ? { ...challenge, checkIns } : challenge));
    set({ challenges });
    try {
      if (usesSupabase()) {
        const { updateChallengeCheckIns } = await import('../../lib/supabase');
        await updateChallengeCheckIns(id, checkIns);
      } else {
        persistLocal(challenges);
      }
    } catch (error) {
      console.error('toggleToday error:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to update check-in' });
    }
  },

  deleteChallenge: async (id) => {
    const challenges = get().challenges.filter((challenge) => challenge.id !== id);
    set({ challenges });
    try {
      if (usesSupabase()) {
        const { deleteChallengeRow } = await import('../../lib/supabase');
        await deleteChallengeRow(id);
      } else {
        persistLocal(challenges);
      }
    } catch (error) {
      console.error('deleteChallenge error:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to delete challenge' });
    }
  },
}));

export function getChallengeStreak(checkIns: string[]) {
  const checked = new Set(checkIns);
  const cursor = new Date();
  const today = cursor.toLocaleDateString('en-CA');
  if (!checked.has(today)) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (checked.has(cursor.toLocaleDateString('en-CA'))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function getBestChallengeStreak(checkIns: string[]) {
  const dates = [...new Set(checkIns)].sort();
  let best = 0;
  let run = 0;
  let previous: Date | null = null;
  for (const value of dates) {
    const date = new Date(`${value}T00:00:00`);
    const consecutive = previous && date.getTime() - previous.getTime() === 86_400_000;
    run = consecutive ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }
  return best;
}
