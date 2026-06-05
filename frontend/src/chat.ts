export type ChatRole = 'system' | 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: Exclude<ChatRole, 'system'>;
  content: string;
};

export type ApiMessage = {
  role: ChatRole;
  content: string;
};

export type ChatSettings = {
  preset: string;
  temperature: number;
  maxTokens: number;
};

export const storageKey = 'ai-chat-playground-state';

export function createMessage(role: ChatMessage['role'], content: string): ChatMessage {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    role,
    content
  };
}

export function saveConversation(messages: ChatMessage[], settings: ChatSettings): void {
  localStorage.setItem(storageKey, JSON.stringify({ messages, settings }));
}

export function loadConversation(): { messages: ChatMessage[]; settings: ChatSettings } | null {
  const stored = localStorage.getItem(storageKey);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as { messages: ChatMessage[]; settings: ChatSettings };
    if (!Array.isArray(parsed.messages)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function streamChat(
  apiBaseUrl: string,
  payload: {
    messages: ApiMessage[];
    preset: string;
    temperature: number;
    max_tokens: number;
  },
  onToken: (token: string) => void
): Promise<void> {
  const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok || !response.body) {
    throw new Error(`Chat request failed with status ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const event of events) {
      const eventType = event.split('\n').find((line) => line.startsWith('event: '))?.replace('event: ', '');
      const dataLine = event.split('\n').find((line) => line.startsWith('data: '));
      if (!dataLine) continue;
      const data = JSON.parse(dataLine.replace('data: ', '')) as { content?: string; message?: string };
      if (eventType === 'token' && data.content) onToken(data.content);
      if (eventType === 'error') throw new Error(data.message ?? 'Backend error');
    }
  }
}
