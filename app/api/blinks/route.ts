import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// Solana Actions spec types
interface ActionParameter {
  name: string;
  label?: string;
  required?: boolean;
  pattern?: string;
  patternDescription?: string;
  min?: string | number;
  max?: string | number;
  type?: string;
}

interface ActionLink {
  label: string;
  href: string;
  parameters?: ActionParameter[];
}

interface LinkedAction {
  type?: string;
  label: string;
  href: string;
  parameters?: ActionParameter[];
}

interface ActionMetadata {
  icon: string;
  label: string;
  title: string;
  description: string;
  disabled?: boolean;
  error?: { message: string };
  links?: {
    actions: LinkedAction[];
  };
}

// Resolve blink URL to action API URL
// Supports: solana-action:, https://dial.to/..., https://blinks.dial.to/...
function resolveActionUrl(input: string): string {
  // solana-action: URI scheme
  if (input.startsWith('solana-action:')) {
    return decodeURIComponent(input.slice('solana-action:'.length));
  }

  // dial.to interstitial → extract apiUrl
  if (input.includes('dial.to') && input.includes('action=')) {
    const match = input.match(/[?&]action=([^&]+)/);
    if (match) return decodeURIComponent(match[1]);
  }

  // Direct action URL (api.dialect.to, actions.jupiterm etc.)
  return input;
}

// GET: Resolve and fetch action metadata
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url') ?? '';

  if (!url) return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });

  let actionUrl: string;
  try {
    actionUrl = resolveActionUrl(url);
    new URL(actionUrl); // validate
  } catch {
    return NextResponse.json({ error: 'Invalid action URL' }, { status: 400 });
  }

  try {
    const res = await fetch(actionUrl, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Action server returned ${res.status}` }, { status: 502 });
    }

    const data = await res.json() as ActionMetadata;

    return NextResponse.json({
      actionUrl,
      metadata: data,
    });
  } catch (e) {
    return NextResponse.json({ error: `Failed to fetch action: ${(e as Error).message}` }, { status: 502 });
  }
}

// POST: Execute a linked action and get transaction
export async function POST(req: NextRequest) {
  const body = await req.json() as {
    actionHref: string;
    account: string;
    params?: Record<string, string>;
  };

  const { actionHref, account, params } = body;

  if (!actionHref || !account) {
    return NextResponse.json({ error: 'Missing actionHref or account' }, { status: 400 });
  }

  // Resolve href (may be relative or template)
  let href = actionHref;
  if (params) {
    for (const [key, val] of Object.entries(params)) {
      href = href.replace(`{${key}}`, encodeURIComponent(val));
    }
  }

  try {
    const res = await fetch(href, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ account }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return NextResponse.json({ error: `Action POST returned ${res.status}: ${errText}` }, { status: 502 });
    }

    const data = await res.json() as { transaction: string; message?: string };
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: `Action POST failed: ${(e as Error).message}` }, { status: 502 });
  }
}

