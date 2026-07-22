import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadConfig() {
  try {
    const configPath = resolve(process.cwd(), '.llm-config.json');
    return JSON.parse(readFileSync(configPath, 'utf-8')) as {
      model?: string;
      endpoint?: string;
      apiKey?: string;
    };
  } catch {
    return {
      model: 'Qwen3-Coder-Next-MLX-6bit',
      endpoint: 'http://localhost:8080/v1',
      apiKey: 'omlx-om5hh4rsln2h3f8w',
    };
  }
}

const config = loadConfig();

export const llmProvider = createOpenAICompatible({
  name: 'local-llm',
  baseURL: config.endpoint ?? 'http://localhost:8080/v1',
  apiKey: config.apiKey ?? 'omlx-om5hh4rsln2h3f8w',
});

export function getModelInstance() {
  return llmProvider(config.model ?? 'Qwen3-Coder-Next-MLX-6bit');
}
