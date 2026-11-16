import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { presets } from './presets';

function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    }
  }), { status: 200 });
}

function healthResponse(): Response {
  return new Response(JSON.stringify({ status: 'ok', model: 'deepseek-flash' }));
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(healthResponse()));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('renders the complete Chinese playground and online model state', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'AI 对话实验室' })).toBeInTheDocument();
    expect(screen.getByText('全栈 AI 项目')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '参数控制' })).toBeInTheDocument();
    expect(screen.getByLabelText('消息')).toHaveAttribute('placeholder', '输入你想测试的问题……');
    expect(screen.getByLabelText('Prompt 预设')).toHaveValue('general');
    expect(screen.getByLabelText('温度')).toHaveAttribute('type', 'range');
    expect(screen.getByLabelText('最大生成长度')).toHaveValue(800);
    expect(screen.getByRole('button', { name: '恢复默认参数' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '发送' })).toBeDisabled();
    expect(screen.getByText('欢迎使用 AI 对话实验室。请选择 Prompt 预设、调整参数，然后发送一条消息开始测试。')).toBeInTheDocument();
    expect(screen.getByLabelText('助手')).toBeInTheDocument();
    expect(screen.getByText('正在检查')).toBeInTheDocument();
    expect(await screen.findByText('在线 · deepseek-flash')).toBeInTheDocument();
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toMatch(/\/api\/health$/);
  });

  it('sends selected preset and numeric controls without changing the API contract', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(healthResponse()).mockResolvedValueOnce(sseResponse([
      'event: token\ndata: {"content":"已优化"}\n\n', 'event: done\ndata: {}\n\n'
    ])));
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByLabelText('Prompt 预设'), 'resume-optimizer');
    fireEvent.change(screen.getByLabelText('温度'), { target: { value: '0.2' } });
    await user.clear(screen.getByLabelText('最大生成长度'));
    await user.type(screen.getByLabelText('最大生成长度'), '512');
    await user.type(screen.getByLabelText('消息'), '优化这份简历');
    await user.click(screen.getByRole('button', { name: '发送' }));
    expect(await screen.findByText('已优化')).toBeInTheDocument();
    const [url, request] = vi.mocked(fetch).mock.calls[1];
    expect(String(url)).toMatch(/\/api\/chat$/);
    expect(request?.method).toBe('POST');
    expect(JSON.parse(String(request?.body))).toEqual({
      preset: 'resume-optimizer', temperature: 0.2, max_tokens: 512,
      messages: [
        { role: 'system', content: presets.find((preset) => preset.id === 'resume-optimizer')!.systemPrompt },
        { role: 'assistant', content: '欢迎使用 AI 对话实验室。请选择 Prompt 预设、调整参数，然后发送一条消息开始测试。' },
        { role: 'user', content: '优化这份简历' }
      ]
    });
    expect(screen.getByText('你')).toBeInTheDocument();
    await waitFor(() => expect(JSON.parse(localStorage.getItem('ai-chat-playground-state')!).messages.at(-1).content).toBe('已优化'));
    await user.click(screen.getByRole('button', { name: '恢复默认参数' }));
    expect(screen.getByLabelText('Prompt 预设')).toHaveValue('general');
    expect(screen.getByLabelText('温度')).toHaveValue('0.7');
    expect(screen.getByLabelText('最大生成长度')).toHaveValue(800);
  });

  it('clears the conversation with Chinese copy and persists the result', async () => {
    render(<App />);
    await screen.findByText('在线 · deepseek-flash');
    await userEvent.click(screen.getByRole('button', { name: '清空对话' }));
    expect(screen.getByText('对话已清空，可以开始新的测试。')).toBeInTheDocument();
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('ai-chat-playground-state')!).messages).toMatchObject([
        { role: 'assistant', content: '对话已清空，可以开始新的测试。' }
      ]);
    });
  });

  it.each([
    ['private backend error', () => Promise.resolve(sseResponse(['event: token\ndata: {"content":"部分回答"}\n\nevent: error\ndata: {"message":"OPENAI_API_KEY is missing"}\n\n'])), '请求失败，请稍后重试。'],
    ['network error', () => Promise.reject(new TypeError('private network detail')), '暂时无法连接 AI 服务，请稍后重试。'],
    ['timeout', () => Promise.reject(new DOMException('private timeout detail', 'AbortError')), '回答生成超时，请缩短问题或稍后重试。'],
    ['interrupted stream', () => Promise.resolve(sseResponse(['event: token\ndata: {"content":"未完成"}'])), '回答传输中断，请重新发送。']
  ])('shows a public Chinese message for %s', async (_name, respond, expected) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(healthResponse()).mockImplementationOnce(respond));
    render(<App />);
    await userEvent.type(screen.getByLabelText('消息'), '测试错误');
    await userEvent.click(screen.getByRole('button', { name: '发送' }));
    const conversation = screen.getByLabelText('对话记录');
    expect(await within(conversation).findByText(expected)).toBeInTheDocument();
    expect(screen.queryByText(/OPENAI_API_KEY|private|部分回答|Error:/)).not.toBeInTheDocument();
    await waitFor(() => expect(conversation).toHaveAttribute('aria-busy', 'false'));
  });

  it('announces streaming status politely without moving composer focus', async () => {
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(healthResponse()).mockResolvedValueOnce(new Response(new ReadableStream({
      start(streamController) { controller = streamController; }
    }))));
    render(<App />);
    const input = screen.getByLabelText('消息');
    await userEvent.type(input, '你好');
    fireEvent.submit(input.closest('form')!);
    const conversation = screen.getByLabelText('对话记录');
    expect(conversation).toHaveAttribute('aria-live', 'polite');
    expect(conversation).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('正在思考……')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '正在发送' })).toBeDisabled();
    expect(input).toHaveFocus();
    controller.enqueue(new TextEncoder().encode('event: token\ndata: {"content":"你好呀"}\n\nevent: done\ndata: {}\n\n'));
    controller.close();
    expect(await within(conversation).findByText('你好呀')).toBeInTheDocument();
    await waitFor(() => expect(conversation).toHaveAttribute('aria-busy', 'false'));
    expect(input).toHaveFocus();
  });

  it('shows Chinese offline status without exposing health errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('private health detail')));
    render(<App />);
    expect(await screen.findByText('服务离线')).toBeInTheDocument();
    expect(screen.queryByText(/private/)).not.toBeInTheDocument();
  });

  it('restores persisted conversation and numeric settings', async () => {
    localStorage.setItem('ai-chat-playground-state', JSON.stringify({
      messages: [{ id: 'saved', role: 'assistant', content: '之前的回答' }],
      settings: { preset: 'code-reviewer', temperature: 0.4, maxTokens: 512 }
    }));
    render(<App />);
    expect(screen.getByText('之前的回答')).toBeInTheDocument();
    expect(screen.getByLabelText('Prompt 预设')).toHaveValue('code-reviewer');
    expect(screen.getByLabelText('温度')).toHaveValue('0.4');
    expect(screen.getByLabelText('最大生成长度')).toHaveValue(512);
    await screen.findByText('在线 · deepseek-flash');
  });
});
