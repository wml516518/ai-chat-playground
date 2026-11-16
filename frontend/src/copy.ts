export const uiCopy = {
  projectEyebrow: '全栈 AI 项目',
  title: 'AI 对话实验室',
  health: { checking: '正在检查', offline: '服务离线', online: '在线' },
  controls: '参数控制',
  preset: 'Prompt 预设',
  temperature: '温度',
  maxTokens: '最大生成长度',
  clear: '清空对话',
  reset: '恢复默认参数',
  conversation: '对话记录',
  message: '消息',
  placeholder: '输入你想测试的问题……',
  send: '发送',
  sending: '正在发送',
  thinking: '正在思考……',
  user: '你',
  assistant: '助手',
  welcome: '欢迎使用 AI 对话实验室。请选择 Prompt 预设、调整参数，然后发送一条消息开始测试。',
  cleared: '对话已清空，可以开始新的测试。',
  errors: {
    offline: '暂时无法连接 AI 服务，请稍后重试。',
    timeout: '回答生成超时，请缩短问题或稍后重试。',
    interrupted: '回答传输中断，请重新发送。',
    request: '请求失败，请稍后重试。'
  }
} as const;

export function toPublicChatError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'AbortError') return uiCopy.errors.timeout;
  if (error instanceof TypeError) return uiCopy.errors.offline;
  if (error instanceof Error && error.name === 'StreamInterruptedError') return uiCopy.errors.interrupted;
  return uiCopy.errors.request;
}
