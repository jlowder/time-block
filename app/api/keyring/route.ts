import { NextRequest, NextResponse } from 'next/server';
import { getPassword, setPassword, deletePassword } from 'keytar';
import { maskKey } from '@/lib/keyring';

/**
 * GET /api/keyring
 * Returns masked API key or null.
 */
export async function GET() {
  try {
    const password = await getPassword('time-block', 'llm-api-key');
    return NextResponse.json({ apiKey: password ? maskKey(password) : null, hasKey: password !== null });
  } catch {
    return NextResponse.json({ hasKey: false, apiKey: null });
  }
}

/**
 * POST /api/keyring
 * Accepts { key } to store, and optionally { endpoint, model } to update config.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, endpoint, model } = body as { key?: string; endpoint?: string; model?: string };

    if (key === undefined || key === null) {
      return NextResponse.json({ error: 'Missing "key" field' }, { status: 400 });
    }

    await setPassword('time-block', 'llm-api-key', key);

    // Also update .llm-config.json if endpoint or model provided
    if (endpoint || model) {
      const { writeFileSync } = await import('fs');
      const { resolve } = await import('path');
      const configPath = resolve(process.cwd(), '.llm-config.json');
      const config = {
        endpoint: endpoint || 'http://localhost:8080/v1',
        model: model || 'Qwen3.6-35B-A3B-MLX-8bit',
      };
      writeFileSync(configPath, JSON.stringify(config, null, 2));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * DELETE /api/keyring
 * Removes the stored API key.
 */
export async function DELETE() {
  try {
    await deletePassword('time-block', 'llm-api-key');
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to remove key' }, { status: 500 });
  }
}
