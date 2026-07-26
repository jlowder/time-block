import { NextRequest, NextResponse } from 'next/server';
import { getPassword, setPassword, deletePassword } from 'keytar';
import { maskKey } from '@/lib/keyring';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const CONFIG_PATH = resolve(process.cwd(), '.llm-config.json');

function getConfig(): { apiKeyEnabled?: boolean } {
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function GET() {
  const config = getConfig();
  const apiKeyEnabled = config.apiKeyEnabled === true;

  if (!apiKeyEnabled) {
    return NextResponse.json({ hasKey: false, apiKey: null, apiKeyEnabled: false });
  }

  try {
    const password = await getPassword('time-block', 'llm-api-key');
    return NextResponse.json({
      apiKey: password ? maskKey(password) : null,
      hasKey: password !== null,
      apiKeyEnabled: true,
    });
  } catch {
    return NextResponse.json({ hasKey: false, apiKey: null, apiKeyEnabled: true });
  }
}

export async function POST(req: NextRequest) {
  const config = getConfig();
  const apiKeyEnabled = config.apiKeyEnabled === true;

  if (!apiKeyEnabled) {
    return NextResponse.json({ error: 'API key is disabled' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { key, endpoint, model } = body as { key?: string; endpoint?: string; model?: string };

    if (key === undefined || key === null) {
      return NextResponse.json({ error: 'Missing "key" field' }, { status: 400 });
    }

    await setPassword('time-block', 'llm-api-key', key);

    // Clear cache so next request picks up the new key
    const { clearConfigCache } = await import('@/lib/llm');
    clearConfigCache();

    if (endpoint || model) {
      const { writeFileSync } = await import('fs');
      const configPath = resolve(process.cwd(), '.llm-config.json');
      const cfg = { endpoint: endpoint || 'http://localhost:8080/v1', model: model || 'Qwen3.6-35B-A3B-MLX-8bit', apiKeyEnabled: true };
      writeFileSync(configPath, JSON.stringify(cfg, null, 2));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE() {
  const config = getConfig();
  const apiKeyEnabled = config.apiKeyEnabled === true;

  if (!apiKeyEnabled) {
    return NextResponse.json({ success: true });
  }

  try {
    await deletePassword('time-block', 'llm-api-key');

    // Clear cache so next request picks up the removed key
    const { clearConfigCache } = await import('@/lib/llm');
    clearConfigCache();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to remove key' }, { status: 500 });
  }
}
