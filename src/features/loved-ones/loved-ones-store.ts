import { create } from 'zustand';
import { useAuthStore } from '../auth/auth-store';

export interface Observation {
  id: string;
  text: string;
  createdAt: string;
}

export interface LovedOne {
  id: string;
  name: string;
  relationship: string;
  birthday: string;
  loves: string[];
  giftIdeas: string[];
  observations: Observation[];
}

const STORAGE_KEY = 'syncatch-loved-ones-v1';
const SUPABASE_CONFIGURED = Boolean(import.meta.env.VITE_SUPABASE_URL);

function usesSupabase() {
  return SUPABASE_CONFIGURED && !useAuthStore.getState().localMode;
}

function loadLocalPeople(): LovedOne[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as LovedOne[];
  } catch {
    return [];
  }
}

function persistLocal(people: LovedOne[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(people));
}

type LovedOnesStore = {
  people: LovedOne[];
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  savePerson: (person: LovedOne) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;
};

export const useLovedOnesStore = create<LovedOnesStore>((set, get) => ({
  people: [],
  hydrated: false,
  loading: false,
  error: null,

  hydrate: async () => {
    if (get().hydrated || get().loading) return;
    set({ loading: true, error: null });
    try {
      if (usesSupabase()) {
        const { selectLovedOnesByUser } = await import('../../lib/supabase');
        const people = await selectLovedOnesByUser();
        set({ people, hydrated: true, loading: false });
      } else {
        set({ people: loadLocalPeople(), hydrated: true, loading: false });
      }
    } catch (error) {
      console.error('hydrate loved ones error:', error);
      set({
        loading: false,
        hydrated: true,
        error: error instanceof Error ? error.message : 'Unable to load loved ones',
      });
    }
  },

  savePerson: async (person) => {
    const people = get().people.some((item) => item.id === person.id)
      ? get().people.map((item) => (item.id === person.id ? person : item))
      : [...get().people, person];
    set({ people });
    try {
      if (usesSupabase()) {
        const { upsertLovedOne } = await import('../../lib/supabase');
        await upsertLovedOne(person);
      } else {
        persistLocal(people);
      }
    } catch (error) {
      console.error('savePerson error:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to save loved one' });
    }
  },

  deletePerson: async (id) => {
    const people = get().people.filter((person) => person.id !== id);
    set({ people });
    try {
      if (usesSupabase()) {
        const { deleteLovedOneRow } = await import('../../lib/supabase');
        await deleteLovedOneRow(id);
      } else {
        persistLocal(people);
      }
    } catch (error) {
      console.error('deletePerson error:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to delete loved one' });
    }
  },
}));
