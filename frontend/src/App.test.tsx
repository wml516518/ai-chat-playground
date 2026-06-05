import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ status: 'ok', model: 'deepseek-V4-flash' })
    }) as unknown as typeof fetch;
  });

  it('renders the chat playground controls', async () => {
    render(<App />);

    expect(screen.getByText('AI Chat Playground')).toBeInTheDocument();
    expect(screen.getByLabelText('Message')).toBeInTheDocument();
    expect(await screen.findByText('online: deepseek-V4-flash')).toBeInTheDocument();
  });

  it('allows changing prompt preset', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByLabelText('Preset'), 'resume-optimizer');

    expect(screen.getByLabelText('Preset')).toHaveValue('resume-optimizer');
  });
});
