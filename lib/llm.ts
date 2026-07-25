import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getApiKey } from './keyring';

const DEFAULTS = {
  model: 'Qwen3.6-35B-A3B-MLX-8bit',
  endpoint: 'http://localhost:8080/v1',
  apiKey: 'omlx-om5hh4rsln2h3f8w',
};

let cachedConfig: { model: string; endpoint: string } | null = null;

/**
 * Get a fresh LLM provider instance, reading settings from keyring + config file.
 * Each call creates a new provider with the current API key, so key changes
 * are picked up on the next API request.
 */
export async function getModelInstance() {
  // Load config (cached per-request for performance)
  if (!cachedConfig) {
    try {
      const raw = readFileSync(resolve(process.cwd(), '.llm-config.json'), 'utf-8');
      const config = JSON.parse(raw);
      cachedConfig = {
        model: config.model || DEFAULTS.model,
        endpoint: config.endpoint || DEFAULTS.endpoint,
      };
    } catch {
      cachedConfig = { model: DEFAULTS.model, endpoint: DEFAULTS.endpoint };
    }
  }

  // Get API key from keyring (async)
  const apiKey = (await getApiKey()) || DEFAULTS.apiKey;

  // Create provider with current settings
  const provider = createOpenAICompatible({
    name: 'local-llm',
    baseURL: cachedConfig.endpoint,
    apiKey,
  });

  return provider(cachedConfig.model);
}

/** Clear cached config between requests to avoid stale data */
export function clearConfigCache() {
  cachedConfig = null;
}
