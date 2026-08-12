// Provider registry — the "LiteLLM-style" catalog of backends the assistant
// can talk to. Each entry only describes *how to reach* a provider (wire
// format, base URL, which env vars hold the key/model); the actual request
// plumbing lives in openai-compatible.ts and gemini.ts.
//
// Every provider is read from .env.local via Vite's import.meta.env, so keys
// never need to touch the settings table — only the *choice* of provider and
// model does (see settings-store.ts / preferences-types.ts).

export type ProviderId = 'cerebras' | 'groq' | 'gemini' | 'ollama' | 'lmstudio' | 'huggingface';
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
    id: 'cerebras',
    label: 'Cerebras',
    kind: 'openai',
    requiresApiKey: true,
    defaultBaseUrl: 'https://api.cerebras.ai/v1',
    defaultModel: 'gpt-oss-120b',
    models: ['gpt-oss-120b', 'zai-glm-4.7'],
    hint: '1M tokens/day free tier, fast inference.',
  },
  {
    id: 'groq',
    label: 'Groq',
    kind: 'openai',
    requiresApiKey: true,
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
    hint: 'OpenAI-compatible, generous free tier.',
  },
  {
    id: 'gemini',
    label: 'Gemini',
    kind: 'gemini',
    requiresApiKey: true,
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-3.5-flash-lite',
    models: ['gemini-3.5-flash-lite', 'gemini-2.5-flash'],
    hint: "Google's models. Flash Lite has the highest free-tier quota.",
  },
  {
    id: 'ollama',
    label: 'Ollama',
    kind: 'openai',
    requiresApiKey: false,
    defaultBaseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.1',
    models: ['llama3.1', 'qwen2.5', 'mistral'],
    hint: 'Runs fully on-device — no key, no cloud, needs `ollama serve` running.',
  },
  {
    id: 'lmstudio',
    label: 'LM Studio',
    kind: 'openai',
    requiresApiKey: false,
    defaultBaseUrl: 'http://localhost:1234/v1',
    defaultModel: 'local-model',
    models: ['local-model'],
    hint: 'Local server started from the LM Studio app.',
  },
  {
    id: 'huggingface',
    label: 'Hugging Face',
    kind: 'openai',
    requiresApiKey: true,
    defaultBaseUrl: 'https://router.huggingface.co/v1',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct',
    models: ['meta-llama/Llama-3.3-70B-Instruct', 'Qwen/Qwen2.5-72B-Instruct'],
    hint: 'Inference router — OpenAI-compatible across many hosted models.',
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

/** Default provider: VITE_AI_PROVIDER if set and configured, else the first configured provider. */
export function getDefaultProviderId(): ProviderId {
  const requested = readEnv('VITE_AI_PROVIDER') as ProviderId | undefined;
  if (requested && PROVIDERS.some((p) => p.id === requested) && isProviderConfigured(requested)) {
    return requested;
  }
  return getConfiguredProviders()[0] ?? 'cerebras';
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
  const candidate = PROVIDERS.find((p) => p.id === savedProviderId);
  const providerId = candidate && isProviderConfigured(candidate.id) ? candidate.id : getDefaultProviderId();
  const model = candidate && isProviderConfigured(candidate.id) && savedModel ? savedModel : getModel(providerId);
  return { providerId, model };
}
