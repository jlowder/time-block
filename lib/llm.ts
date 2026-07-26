import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const CONFIG_PATH = resolve(process.cwd(), '.llm-config.json');
const DEFAULTS = {
  model: 'Qwen3.6-35B-A3B-MLX-8bit',
  endpoint: 'http://localhost:8080/v1',
};

let cachedConfig: { model: string; endpoint: string; apiKeyEnabled: boolean } | null = null;

export async function getModelInstance() {
  if (!cachedConfig) {
    try {
      const raw = readFileSync(CONFIG_PATH, 'utf-8');
      const config = JSON.parse(raw);
      cachedConfig = {
        model: config.model || DEFAULTS.model,
        endpoint: config.endpoint || DEFAULTS.endpoint,
        apiKeyEnabled: config.apiKeyEnabled === true,
      };
    } catch {
      cachedConfig = { model: DEFAULTS.model, endpoint: DEFAULTS.endpoint, apiKeyEnabled: false };
    }
  }

  // If API key is not enabled, use a harmless placeholder
  if (!cachedConfig.apiKeyEnabled) {
    const provider = createOpenAICompatible({
      name: 'local-llm',
      baseURL: cachedConfig.endpoint,
      apiKey: 'not-needed',
    });
    return provider(cachedConfig.model);
  }

  // API key enabled: read from env var, fall back to keychain
  let apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    try {
      const { getPassword } = await import('keytar');
      apiKey = (await getPassword('time-block', 'llm-api-key')) || undefined;
    } catch {
      // keytar not available (CI, etc.)
    }
  }
  if (!apiKey) {
    throw new Error(
      'No API key found. Set LLM_API_KEY env var, or add a key in the Settings dialog.'
    );
  }

  // Wrap fetch with a timeout so LLM requests fail fast instead of hanging
  const timeoutFetch = (url: string | URL | Request, options: RequestInit = {}) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 180000);
    
    const fetchUrl = typeof url === 'string' || url instanceof URL ? url : url.url;
    const fetchOptions = { ...options };
    
    if (options.signal) {
      // Combine signals: timeout OR inbound abort both trigger
      if (typeof (AbortSignal as any).any === 'function') {
        fetchOptions.signal = AbortSignal.any([options.signal, controller.signal]);
      } else {
        // Fallback: respect inbound signal, timeout via separate mechanism
        fetchOptions.signal = options.signal;
      }
    } else {
      fetchOptions.signal = controller.signal;
    }
    
    const fetchPromise = fetch(fetchUrl, fetchOptions);
    return fetchPromise.finally(() => clearTimeout(id));
  };

  const provider = createOpenAICompatible({
    name: 'local-llm',
    baseURL: cachedConfig.endpoint,
    apiKey,
    fetch: timeoutFetch,
  });

  return provider(cachedConfig.model);
}

export function clearConfigCache() { cachedConfig = null; }
