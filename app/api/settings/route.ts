import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { getApiKey, maskKey } from '@/lib/keyring';

const CONFIG_PATH = resolve(process.cwd(), '.llm-config.json');

/**
 * GET /api/settings
 * Returns current settings: endpoint, model, masked apiKey, hasApiKey.
 */
export async function GET() {
  try {
    let endpoint = 'http://localhost:8080/v1';
    let model = 'Qwen3.6-35B-A3B-MLX-8bit';

    try {
      const raw = readFileSync(CONFIG_PATH, 'utf-8');
      const config = JSON.parse(raw);
      if (config.endpoint) endpoint = config.endpoint;
      if (config.model) model = config.model;
    } catch {
      // Use defaults
    }

    const key = await getApiKey();

    return NextResponse.json({
      endpoint,
      model,
      apiKey: key ? maskKey(key) : null,
      hasApiKey: key !== null,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * POST /api/settings
 * Updates endpoint and/or model in .llm-config.json.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint, model } = body as { endpoint?: string; model?: string };

    // Read existing config
    let config: { endpoint: string; model: string };
    try {
      const raw = readFileSync(CONFIG_PATH, 'utf-8');
      config = JSON.parse(raw);
    } catch {
      config = { endpoint: 'http://localhost:8080/v1', model: 'Qwen3.6-35B-A3B-MLX-8bit' };
    }

    if (endpoint !== undefined) config.endpoint = endpoint;
    if (model !== undefined) config.model = model;

    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

    return NextResponse.json({ success: true, endpoint: config.endpoint, model: config.model });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
