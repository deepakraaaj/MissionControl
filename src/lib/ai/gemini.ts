// Adapter for Google's Gemini API, which speaks a different wire format
// (contents/parts/functionCall instead of messages/tool_calls) than the
// OpenAI-style providers. Translates in both directions at the boundary so
// the rest of the app only ever sees the shared ChatMessage/ToolCall shape.

import type { ChatCompletionResult, ChatMessage, ChatOptions, ToolDefinition, ToolCall } from './types';

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

let callCounter = 0;
const nextCallId = () => `gemini-call-${Date.now()}-${callCounter++}`;

function toGeminiTools(tools: ToolDefinition[] | undefined) {
  if (!tools || tools.length === 0) return undefined;
  return [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      })),
    },
  ];
}

// Map our flat ChatMessage[] history onto Gemini's systemInstruction + contents.
// A tool call's `name` (carried on the tool-result message) is what links a
// functionResponse back to its functionCall — Gemini has no call-id concept.
function toGeminiRequest(messages: ChatMessage[]) {
  let systemInstruction: { parts: GeminiPart[] } | undefined;
  const contents: GeminiContent[] = [];
  const callIdToName = new Map<string, string>();

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = { parts: [{ text: msg.content ?? '' }] };
      continue;
    }
    if (msg.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: msg.content ?? '' }] });
      continue;
    }
    if (msg.role === 'assistant') {
      const parts: GeminiPart[] = [];
      if (msg.content) parts.push({ text: msg.content });
      for (const call of msg.tool_calls ?? []) {
        callIdToName.set(call.id, call.function.name);
        let args: Record<string, unknown> = {};
        try {
          args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
        } catch {
          args = {};
        }
        parts.push({ functionCall: { name: call.function.name, args } });
      }
      if (parts.length > 0) contents.push({ role: 'model', parts });
      continue;
    }
    if (msg.role === 'tool') {
      const name = msg.name ?? (msg.tool_call_id ? callIdToName.get(msg.tool_call_id) : undefined) ?? 'unknown';
      let response: Record<string, unknown>;
      try {
        response = msg.content ? JSON.parse(msg.content) : {};
      } catch {
        response = { result: msg.content };
      }
      contents.push({ role: 'user', parts: [{ functionResponse: { name, response } }] });
    }
  }

  return { systemInstruction, contents };
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
}

function fromGeminiResponse(json: GeminiGenerateContentResponse): ChatCompletionResult {
  const parts: GeminiPart[] = json.candidates?.[0]?.content?.parts ?? [];
  const textParts = parts.filter((p) => typeof p.text === 'string').map((p) => p.text as string);
  const toolCalls: ToolCall[] = parts
    .filter((p) => p.functionCall)
    .map((p) => ({
      id: nextCallId(),
      type: 'function',
      function: {
        name: p.functionCall!.name,
        arguments: JSON.stringify(p.functionCall!.args ?? {}),
      },
    }));

  return {
    content: textParts.length > 0 ? textParts.join('\n') : null,
    toolCalls,
  };
}

export async function geminiChat(
  baseUrl: string,
  apiKey: string | undefined,
  model: string,
  messages: ChatMessage[],
  tools: ToolDefinition[] | undefined,
  options: ChatOptions,
): Promise<ChatCompletionResult> {
  if (!apiKey) {
    throw new Error('Gemini API key missing. Set VITE_GEMINI_API_KEY in .env.local');
  }

  const { systemInstruction, contents } = toGeminiRequest(messages);
  const endpoint = `${baseUrl.replace(/\/+$/, '')}/models/${model}:generateContent?key=${apiKey}`;

  const body: Record<string, unknown> = {
    contents,
    ...(systemInstruction ? { system_instruction: systemInstruction } : {}),
    ...(toGeminiTools(tools) ? { tools: toGeminiTools(tools) } : {}),
    generationConfig: {
      temperature: options.temperature ?? 0.4,
      maxOutputTokens: options.maxTokens ?? 1024,
    },
  };

  const MAX_ATTEMPTS = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: options.signal,
      });
    } catch (error) {
      throw new Error(`Could not reach Gemini. ${error instanceof Error ? error.message : 'Check your connection.'}`);
    }

    if (response.ok) {
      const json = await response.json();
      return fromGeminiResponse(json);
    }

    const text = await response.text().catch(() => '');

    if ((response.status === 429 || response.status === 503) && attempt < MAX_ATTEMPTS) {
      const waitMs = 800 * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, waitMs));
      lastError = new Error('Gemini is busy right now. Please try again in a moment.');
      continue;
    }

    if (response.status === 429 || response.status === 503) {
      throw new Error('Gemini is busy right now (rate limited or quota exceeded). Try again shortly.');
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Gemini rejected the API key (${response.status}). Check your .env.local.`);
    }
    throw new Error(`Gemini request failed (${response.status}): ${text.slice(0, 300)}`);
  }

  throw lastError ?? new Error('Gemini request failed after retries.');
}
