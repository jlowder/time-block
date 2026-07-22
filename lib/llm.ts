import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

export const llmProvider = createOpenAICompatible({
  name: 'local-llm',
  baseURL: 'http://localhost:8080/v1',
  apiKey: process.env.OPENAI_COMPATIBLE_API_KEY || 'omlx-om5hh4rsln2h3f8w',
});

export function getModelInstance() {
  return llmProvider('Qwen3-Coder-Next-MLX-6bit');
}
