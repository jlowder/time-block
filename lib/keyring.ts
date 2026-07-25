import { getPassword } from 'keytar';

const KEY_SERVICE = 'time-block';
const KEY_ACCOUNT = 'llm-api-key';

/**
 * Get the stored API key from the system keychain.
 * Returns null if no key is stored.
 */
export async function getApiKey(): Promise<string | null> {
  try {
    const password = await getPassword(KEY_SERVICE, KEY_ACCOUNT);
    return password || null;
  } catch {
    return null;
  }
}

/**
 * Store an API key in the system keychain.
 */
export async function setApiKey(key: string): Promise<void> {
  try {
    const keytar = await import('keytar');
    await keytar.default?.setPassword(KEY_SERVICE, KEY_ACCOUNT, key);
  } catch (err) {
    throw new Error(`Failed to save API key to keyring: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Remove the API key from the system keychain.
 */
export async function deleteApiKey(): Promise<void> {
  try {
    const keytar = await import('keytar');
    await keytar.default?.deletePassword(KEY_SERVICE, KEY_ACCOUNT);
  } catch {
    // Ignore if key doesn't exist
  }
}

/**
 * Mask an API key for display (show last 4 chars).
 */
export function maskKey(key: string): string {
  if (key.length <= 8) return '••••';
  return '••••' + key.slice(-4);
}
