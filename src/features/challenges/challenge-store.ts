import { create } from 'zustand';

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

function loadChallenges(): Challenge[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown;
    return Array.isArray(value) ? (value as Challenge[]) : [];
  } catch {
    return [];
  }
}

function persist(challenges: Challenge[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(challenges));
}

type ChallengeStore = {
  challenges: Challenge[];
  createChallenge: (title: string, emoji: string, targetDays: number, missionId?: string | null, sourceTaskId?: string | null) => void;
  toggleToday: (id: string) => void;
  deleteChallenge: (id: string) => void;
};

export const useChallengeStore = create<ChallengeStore>((set) => ({
  challenges: loadChallenges(),
  createChallenge: (title, emoji, targetDays, missionId = null, sourceTaskId = null) => set((state) => {
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
    const challenges = [challenge, ...state.challenges];
    persist(challenges);
    return { challenges };
  }),
  toggleToday: (id) => set((state) => {
    const today = new Date().toLocaleDateString('en-CA');
    const challenges = state.challenges.map((challenge) => challenge.id !== id ? challenge : {
      ...challenge,
      checkIns: challenge.checkIns.includes(today)
        ? challenge.checkIns.filter((date) => date !== today)
        : [...challenge.checkIns, today],
    });
    persist(challenges);
    return { challenges };
  }),
  deleteChallenge: (id) => set((state) => {
    const challenges = state.challenges.filter((challenge) => challenge.id !== id);
    persist(challenges);
    return { challenges };
  }),
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
