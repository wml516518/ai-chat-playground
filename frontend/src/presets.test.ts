import { describe, expect, it } from 'vitest';
import { toPublicChatError, uiCopy } from './copy';
import { presets } from './presets';

describe('Chinese playground copy', () => {
  it('keeps stable preset IDs and exposes Chinese labels', () => {
    expect(presets.map(({ id, name }) => ({ id, name }))).toEqual([
      { id: 'general', name: '通用助手' },
      { id: 'code-reviewer', name: '代码审查' },
      { id: 'resume-optimizer', name: '简历优化' },
      { id: 'product-brainstormer', name: '产品构思' }
    ]);
    expect(presets.every((preset) => /[\u4e00-\u9fff]/.test(preset.systemPrompt))).toBe(true);
  });

  it('maps private or English failures to public Chinese messages', () => {
    expect(toPublicChatError(new TypeError('Failed to fetch'))).toBe(uiCopy.errors.offline);
    expect(toPublicChatError(new DOMException('Timed out', 'AbortError'))).toBe(uiCopy.errors.timeout);
    expect(toPublicChatError(new Error('OPENAI_API_KEY is not configured'))).toBe(uiCopy.errors.request);
  });
});
