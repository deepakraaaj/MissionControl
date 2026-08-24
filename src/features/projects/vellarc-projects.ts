import { getSupabaseClient } from '../../lib/auth';
import { getSupabaseUser } from '../../lib/supabase';

export type VellarcProjectStatus = 'Draft' | 'In Review' | 'Approved' | string;

export interface VellarcProjectSummary {
  id: string;
  title: string;
  tagline: string;
  status: VellarcProjectStatus;
  featureCount: number;
  completedFeatureCount: number;
  updatedAt: string;
}

interface VellarcProjectRow {
  id: string;
  data: {
    title?: unknown;
    tagline?: unknown;
    status?: unknown;
    features?: Array<{ status?: unknown }>;
  } | null;
  updated_at: string;
}

export async function fetchVellarcProjectSummaries(): Promise<VellarcProjectSummary[]> {
  const user = await getSupabaseUser();
  if (!user) throw new Error('Sign in to see your Vellarc projects.');

  const client = getSupabaseClient();
  const { data, error } = await client
    .from('projects')
    .select('id, data, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return ((data ?? []) as VellarcProjectRow[]).map((row) => {
    const features = Array.isArray(row.data?.features) ? row.data.features : [];
    return {
      id: row.id,
      title: typeof row.data?.title === 'string' ? row.data.title : 'Untitled project',
      tagline: typeof row.data?.tagline === 'string' ? row.data.tagline : '',
      status: typeof row.data?.status === 'string' ? row.data.status : 'Draft',
      featureCount: features.length,
      completedFeatureCount: features.filter((feature) => feature.status === 'Completed').length,
      updatedAt: row.updated_at,
    };
  });
}

const VELLARC_URL = (import.meta.env.VITE_VELLARC_URL as string | undefined)?.replace(/\/$/, '')
  || 'http://localhost:3000';

export function getVellarcUrl(projectId?: string) {
  const url = new URL(VELLARC_URL);
  if (projectId) url.searchParams.set('project', projectId);
  return url.toString();
}

export function getNewVellarcProjectUrl() {
  const url = new URL(VELLARC_URL);
  url.searchParams.set('action', 'new');
  return url.toString();
}
