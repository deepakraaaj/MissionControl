// Provider registry — the "LiteLLM-style" catalog of backends the assistant
// can talk to. Each entry only describes *how to reach* a provider (wire
// format, base URL, which env vars hold the key/model); the actual request
// plumbing lives in openai-compatible.ts and gemini.ts.
//
// Every provider is read from .env.local via Vite's import.meta.env, so keys
// never need to touch the settings table — only the *choice* of provider and
// model does (see settings-store.ts / preferences-types.ts).

export type ProviderId = 'mistral' | 'groq' | 'gemini';
export type ProviderKind = 'openai' | 'gemini';

export interface ProviderDefinition {
  id: ProviderId;
  label: string;
  kind: ProviderKind;
  /** Local providers (Ollama, LM Studio) don't need an API key. */
  requiresApiKey: boolean;
  defaultBaseUrl: string;
  defaultModel: string;
  /** Models known to work well for tool-calling on this provider — shown in the picker. */
  models: string[];
  hint: string;
}

export const PROVIDERS: ProviderDefinition[] = [
  {
    id: 'mistral',
    label: 'Mistral',
    kind: 'openai',
    requiresApiKey: true,
    defaultBaseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-small-latest',
    models: ['mistral-small-latest'],
    hint: 'Default provider for the in-app assistant.',
  },
  {
    id: 'groq',
    label: 'Groq',
    kind: 'openai',
    requiresApiKey: true,
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'openai/gpt-oss-120b',
    models: ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile'],
    hint: 'Fast OpenAI-compatible inference.',
  },
  {
    id: 'gemini',
    label: 'Gemini',
    kind: 'gemini',
    requiresApiKey: true,
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-3.5-flash-lite',
    models: ['gemini-3.5-flash-lite', 'gemini-2.5-flash'],
    hint: 'Google Gemini with native tool-calling support.',
  },
];

export function getProviderDefinition(id: ProviderId): ProviderDefinition {
  const found = PROVIDERS.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown AI provider: ${id}`);
  return found;
}

// Vite only exposes VITE_-prefixed vars to the client, so every provider's
// key/model/base-url lives under a predictable VITE_<PROVIDER>_* name.
function envKeyFor(id: ProviderId, suffix: 'API_KEY' | 'MODEL' | 'BASE_URL'): string {
  return `VITE_${id.toUpperCase()}_${suffix}`;
}

function readEnv(name: string): string | undefined {
  const value = (import.meta.env as Record<string, string | undefined>)[name];
  return value && value.trim().length > 0 ? value : undefined;
}

export function getApiKey(id: ProviderId): string | undefined {
  return readEnv(envKeyFor(id, 'API_KEY'));
}

export function getModel(id: ProviderId): string {
  return readEnv(envKeyFor(id, 'MODEL')) ?? getProviderDefinition(id).defaultModel;
}

export function getBaseUrl(id: ProviderId): string {
  return readEnv(envKeyFor(id, 'BASE_URL')) ?? getProviderDefinition(id).defaultBaseUrl;
}

/** A provider is usable once it either needs no key, or a key is present in .env.local. */
export function isProviderConfigured(id: ProviderId): boolean {
  const def = getProviderDefinition(id);
  return !def.requiresApiKey || Boolean(getApiKey(id));
}

export function getConfiguredProviders(): ProviderId[] {
  return PROVIDERS.filter((p) => isProviderConfigured(p.id)).map((p) => p.id);
}

/** Mistral is the default; Gemini and Groq can be selected in Settings. */
export function getDefaultProviderId(): ProviderId {
  return 'mistral';
}

/**
 * Resolve what the assistant should actually use, given the user's saved
 * preference (from the settings table). Falls back to the env-driven default
 * whenever the saved choice is empty, unknown, or no longer configured —
 * e.g. a provider whose API key was removed from .env.local after the pick
 * was made.
 */
export function resolveActiveProvider(
  savedProviderId: string,
  savedModel: string,
): { providerId: ProviderId; model: string } {
  const candidate = PROVIDERS.find((provider) => provider.id === savedProviderId);
  const providerId = candidate && isProviderConfigured(candidate.id) ? candidate.id : getDefaultProviderId();
  const model = candidate && candidate.id === providerId && savedModel ? savedModel : getModel(providerId);
  return { providerId, model };
}
