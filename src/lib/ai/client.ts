// Unified entry point for the assistant: one `chat()` call that dispatches
// to whichever provider is currently selected, normalizing request/response
// shape across backends (the "LiteLLM" role in this app). Callers (the
// assistant store) never import a specific provider adapter directly.

import { getApiKey, getBaseUrl, getProviderDefinition, isProviderConfigured, type ProviderId } from './providers';
import { openAiCompatibleChat } from './openai-compatible';
import { geminiChat } from './gemini';
import type { ChatCompletionResult, ChatMessage, ChatOptions, ToolDefinition } from './types';

export type { ChatMessage, ChatOptions, ChatCompletionResult, ToolCall, ToolDefinition } from './types';
export {
  PROVIDERS,
  getConfiguredProviders,
  getDefaultProviderId,
  getProviderDefinition,
  isProviderConfigured,
  getModel,
  resolveActiveProvider,
} from './providers';
export type { ProviderId, ProviderDefinition } from './providers';

export function isProviderReady(providerId: ProviderId): boolean {
  return isProviderConfigured(providerId);
}

export async function chatWithProvider(
  providerId: ProviderId,
  model: string,
  messages: ChatMessage[],
  tools: ToolDefinition[] | undefined,
  options: ChatOptions = {},
): Promise<ChatCompletionResult> {
  const def = getProviderDefinition(providerId);

  if (!isProviderConfigured(providerId)) {
    throw new Error(
      def.requiresApiKey
        ? `${def.label} is not configured. Set ${providerId.toUpperCase()}_API_KEY in .env.local and restart.`
        : `${def.label} is not reachable. Is it running?`,
    );
  }

  const baseUrl = getBaseUrl(providerId);
  const apiKey = getApiKey(providerId);

  if (def.kind === 'gemini') {
    return geminiChat(baseUrl, apiKey, model, messages, tools, options);
  }
  return openAiCompatibleChat(baseUrl, apiKey, model, messages, tools, options, def.label);
}
