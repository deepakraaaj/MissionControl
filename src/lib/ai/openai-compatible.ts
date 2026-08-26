// Adapter for any provider that speaks the OpenAI chat-completions wire
// format (currently Mistral and Groq). One
// implementation, parameterized by base URL / key / model — this is the
// bulk of what "LiteLLM-style" buys us: the app's tool-calling loop never
// has to change per provider.

import type { ChatCompletionResult, ChatMessage, ChatOptions, ToolDefinition, ToolCall } from './types';

export async function openAiCompatibleChat(
  baseUrl: string,
  apiKey: string | undefined,
  model: string,
  messages: ChatMessage[],
  tools: ToolDefinition[] | undefined,
  options: ChatOptions,
  providerLabel: string,
): Promise<ChatCompletionResult> {
  const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options.temperature ?? 0.4,
    max_tokens: options.maxTokens ?? 1024,
  };
  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  // Retry on transient errors (429 rate-limit / 503 overloaded) with backoff.
  const MAX_ATTEMPTS = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: options.signal,
      });
    } catch (error) {
      // Network-level failure (e.g. Ollama/LM Studio not running) — don't retry, fail fast with a useful hint.
      throw new Error(
        `Could not reach ${providerLabel} at ${baseUrl}. ${error instanceof Error ? error.message : 'Is it running?'}`,
      );
    }

    if (response.ok) {
      const json = await response.json();
      const message = json?.choices?.[0]?.message ?? {};
      return {
        content: typeof message.content === 'string' ? message.content : null,
        toolCalls: Array.isArray(message.tool_calls) ? (message.tool_calls as ToolCall[]) : [],
      };
    }

    const text = await response.text().catch(() => '');

    if ((response.status === 429 || response.status === 503) && attempt < MAX_ATTEMPTS) {
      const retryAfter = Number(response.headers.get('retry-after'));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 800 * 2 ** (attempt - 1); // 800ms, 1.6s
      await new Promise((r) => setTimeout(r, waitMs));
      lastError = new Error(`${providerLabel} is busy right now. Please try again in a moment.`);
      continue;
    }

    if (response.status === 429 || response.status === 503) {
      throw new Error(`${providerLabel} is busy right now (rate limited). Give it a few seconds and try again.`);
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error(`${providerLabel} rejected the API key (${response.status}). Check your .env.local.`);
    }
    throw new Error(`${providerLabel} request failed (${response.status}): ${text.slice(0, 300)}`);
  }

  throw lastError ?? new Error(`${providerLabel} request failed after retries.`);
}
