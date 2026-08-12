// Shared wire types for the multi-provider AI layer. Every provider adapter
// (OpenAI-compatible or Gemini) speaks this shape at the boundary, so the
// rest of the app — assistant-store, assistant-tools — never needs to know
// which backend answered.

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  // assistant messages may request tool calls
  tool_calls?: ToolCall[];
  // tool messages must reference the call they answer
  tool_call_id?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>; // JSON Schema
  };
}

export interface ChatCompletionResult {
  content: string | null;
  toolCalls: ToolCall[];
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}
