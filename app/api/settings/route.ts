import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const CONFIG_PATH = resolve(process.cwd(), '.llm-config.json');

export async function GET() {
  try {
    let endpoint = 'http://localhost:8080/v1';
    let model = 'Qwen3.6-35B-A3B-MLX-8bit';
    let apiKeyEnabled = false;

    try {
      const raw = readFileSync(CONFIG_PATH, 'utf-8');
      const config = JSON.parse(raw);
      if (config.endpoint) endpoint = config.endpoint;
      if (config.model) model = config.model;
      apiKeyEnabled = config.apiKeyEnabled === true;
    } catch {
      // Use defaults
    }

    return NextResponse.json({
      endpoint,
      model,
      apiKeyEnabled,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint, model, apiKeyEnabled } = body as { endpoint?: string; model?: string; apiKeyEnabled?: boolean };

    let config: { endpoint: string; model: string; apiKeyEnabled: boolean };
    try {
      const raw = readFileSync(CONFIG_PATH, 'utf-8');
      config = JSON.parse(raw);
    } catch {
      config = { endpoint: 'http://localhost:8080/v1', model: 'Qwen3.6-35B-A3B-MLX-8bit', apiKeyEnabled: false };
    }

    if (endpoint !== undefined) config.endpoint = endpoint;
    if (model !== undefined) config.model = model;
    if (apiKeyEnabled !== undefined) config.apiKeyEnabled = apiKeyEnabled;

    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

    // Clear the LLM config cache so the next request reads the fresh config
    const { clearConfigCache } = await import('@/lib/llm');
    clearConfigCache();

    return NextResponse.json({ success: true, ...config });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
