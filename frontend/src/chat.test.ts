import { describe, expect, it, vi } from 'vitest';
import { loadConversation, saveConversation, streamChat, StreamInterruptedError } from './chat';

function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    }
  }), { status: 200 });
}

describe('chat streaming and persistence', () => {
  it('joins Chinese SSE tokens in arrival order', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(sseResponse([
      'event: token\ndata: {"content":"你"}\n\n',
      'event: token\ndata: {"content":"好"}\n\nevent: done\ndata: {}\n\n'
    ]));
    const tokens: string[] = [];
    await streamChat('https://api.example.test', {
      messages: [{ role: 'user', content: '问候' }], preset: 'general', temperature: 0.7, max_tokens: 800
    }, (token) => tokens.push(token));
    expect(tokens.join('')).toBe('你好');
  });

  it('throws a typed interruption when a stream ends with an incomplete event', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(sseResponse(['event: token\ndata: {"content":"未完成"}']));
    await expect(streamChat('https://api.example.test', {
      messages: [{ role: 'user', content: '测试' }], preset: 'general', temperature: 0.7, max_tokens: 800
    }, vi.fn())).rejects.toBeInstanceOf(StreamInterruptedError);
  });

  it('round-trips persisted messages and settings', () => {
    const state = { messages: [{ id: '1', role: 'assistant' as const, content: '已保存' }], settings: { preset: 'general', temperature: 0.3, maxTokens: 512 } };
    saveConversation(state.messages, state.settings);
    expect(loadConversation()).toEqual(state);
  });
});
