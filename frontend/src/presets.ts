export type Preset = {
  id: string;
  name: string;
  systemPrompt: string;
};

export const presets: Preset[] = [
  {
    id: 'general',
    name: 'General Assistant',
    systemPrompt: 'You are a helpful, concise assistant.'
  },
  {
    id: 'code-reviewer',
    name: 'Code Reviewer',
    systemPrompt: 'You review code for bugs, maintainability, security, and test gaps. Lead with findings.'
  },
  {
    id: 'resume-optimizer',
    name: 'Resume Optimizer',
    systemPrompt: 'You improve resumes with clear, outcome-focused bullets and truthful positioning.'
  },
  {
    id: 'product-brainstormer',
    name: 'Product Brainstormer',
    systemPrompt: 'You help brainstorm useful product ideas, tradeoffs, MVP scope, and implementation paths.'
  }
];
