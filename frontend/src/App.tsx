import { Activity, Bot, RotateCcw, Send, SlidersHorizontal, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  createMessage,
  loadConversation,
  saveConversation,
  streamChat,
  type ApiMessage,
  type ChatMessage,
  type ChatSettings
} from './chat';
import { presets } from './presets';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const defaultSettings: ChatSettings = {
  preset: 'general',
  temperature: 0.7,
  maxTokens: 800
};

function App() {
  const loaded = useMemo(() => loadConversation(), []);
  const [messages, setMessages] = useState<ChatMessage[]>(loaded?.messages ?? [
    createMessage('assistant', 'Welcome. Choose a preset, adjust the controls, and send a message.')
  ]);
  const [settings, setSettings] = useState<ChatSettings>(loaded?.settings ?? defaultSettings);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [health, setHealth] = useState('checking');
  const [error, setError] = useState('');

  const selectedPreset = presets.find((preset) => preset.id === settings.preset) ?? presets[0];

  useEffect(() => {
    saveConversation(messages, settings);
  }, [messages, settings]);

  useEffect(() => {
    fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/health`)
      .then((response) => response.json())
      .then((data: { model: string }) => setHealth(`online: ${data.model}`))
      .catch(() => setHealth('offline'));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    setError('');
    setInput('');

    const userMessage = createMessage('user', trimmed);
    const assistantMessage = createMessage('assistant', '');
    const nextMessages = [...messages, userMessage, assistantMessage];
    setMessages(nextMessages);
    setIsStreaming(true);

    const apiMessages: ApiMessage[] = [
      { role: 'system', content: selectedPreset.systemPrompt },
      ...messages.filter((message) => message.content.trim()).map((message) => ({
        role: message.role,
        content: message.content
      })),
      { role: 'user', content: trimmed }
    ];

    try {
      await streamChat(
        apiBaseUrl,
        {
          messages: apiMessages,
          preset: settings.preset,
          temperature: settings.temperature,
          max_tokens: settings.maxTokens
        },
        (token) => {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMessage.id
                ? { ...message, content: message.content + token }
                : message
            )
          );
        }
      );
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Chat request failed.';
      setError(message);
      setMessages((current) =>
        current.map((item) =>
          item.id === assistantMessage.id ? { ...item, content: `Error: ${message}` } : item
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }

  function clearConversation() {
    const welcome = createMessage('assistant', 'Conversation cleared. Ready for a new prompt.');
    setMessages([welcome]);
    setError('');
  }

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">Full-stack AI project</p>
          <h1>AI Chat Playground</h1>
        </div>
        <div className="health-pill">
          <Activity size={16} />
          <span>{health}</span>
        </div>
      </section>

      <section className="workspace">
        <aside className="control-panel" aria-label="Chat controls">
          <div className="panel-heading">
            <SlidersHorizontal size={18} />
            <h2>Controls</h2>
          </div>

          <label>
            Preset
            <select
              value={settings.preset}
              onChange={(event) => setSettings({ ...settings, preset: event.target.value })}
            >
              {presets.map((preset) => (
                <option value={preset.id} key={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Temperature
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.temperature}
              onChange={(event) =>
                setSettings({ ...settings, temperature: Number(event.target.value) })
              }
            />
            <span>{settings.temperature.toFixed(1)}</span>
          </label>

          <label>
            Max tokens
            <input
              type="number"
              min="64"
              max="4096"
              value={settings.maxTokens}
              onChange={(event) =>
                setSettings({ ...settings, maxTokens: Number(event.target.value) })
              }
            />
          </label>

          <button className="icon-button" type="button" onClick={clearConversation}>
            <Trash2 size={16} />
            Clear conversation
          </button>

          <button className="icon-button secondary" type="button" onClick={() => setSettings(defaultSettings)}>
            <RotateCcw size={16} />
            Reset controls
          </button>
        </aside>

        <section className="chat-panel">
          <div className="messages" aria-label="Conversation">
            {messages.map((message) => (
              <article className={`message ${message.role}`} key={message.id}>
                <div className="avatar">
                  {message.role === 'assistant' ? <Bot size={16} /> : 'You'}
                </div>
                <p>{message.content || (isStreaming ? 'Thinking...' : '')}</p>
              </article>
            ))}
          </div>

          {error ? <div className="error-banner">{error}</div> : null}

          <form className="composer" onSubmit={handleSubmit}>
            <textarea
              aria-label="Message"
              placeholder="Ask about code, resumes, product ideas, or anything you want to test..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <button type="submit" disabled={isStreaming || !input.trim()}>
              <Send size={18} />
              Send
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}

export default App;
