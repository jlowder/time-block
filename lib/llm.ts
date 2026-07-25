import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getApiKey } from './keyring';

const DEFAULTS = {
  model: 'Qwen3.6-35B-A3B-MLX-8bit',
  endpoint: 'http://localhost:8080/v1',
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

  // Get API key: env var → keychain → error
  const apiKey = process.env.LLM_API_KEY || (await getApiKey());
  if (!apiKey) {
    throw new Error(
      'No API key found. Set LLM_API_KEY env var, or configure via the Settings dialog in the app.'
    );
  }

  // Wrap fetch with a 15s timeout so LLM requests fail fast instead of hanging
  const timeoutFetch = (url: string | URL | Request, options: RequestInit = {}) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 15000);
    const fetchPromise = fetch(url, {
      ...options,
      signal: options.signal
        ? AbortSignal.any([options.signal, controller.signal])
        : controller.signal,
    });
    return fetchPromise.finally(() => clearTimeout(id));
  };

  // Create provider with timeout-aware fetch
  const provider = createOpenAICompatible({
    name: 'local-llm',
    baseURL: cachedConfig.endpoint,
    apiKey,
    fetch: timeoutFetch,
  });

  return provider(cachedConfig.model);
}

/** Clear cached config between requests to avoid stale data */
export function clearConfigCache() {
  cachedConfig = null;
}
