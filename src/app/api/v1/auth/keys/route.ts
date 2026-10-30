import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/apiAuth';
import { businessStore } from '@/lib/business/businessStore';

export async function GET(req: NextRequest) {
  const authResult = authenticateApiRequest(req, ['keys:read']);
  if (!authResult.success) {
    return authResult.response;
  }

  const keys = businessStore.getApiKeys();
  return NextResponse.json({
    keys: keys.map((k) => ({
      id: k.id,
      name: k.name,
      hint: k.hint,
      created_at: k.created_at,
      last_used_at: k.last_used_at,
      is_active: k.is_active,
    })),
  });
}

export async function POST(req: NextRequest) {
  try {
    const authResult = authenticateApiRequest(req, ['keys:write']);
    if (!authResult.success) {
      return authResult.response;
    }

    const body = await req.json();
    const newKey = businessStore.generateApiKey(body.name || 'API Key');
    return NextResponse.json({
      success: true,
      key: newKey,
      warning: 'Make sure to save this secret token. You will not be able to view the full key again.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authResult = authenticateApiRequest(req, ['keys:write']);
    if (!authResult.success) {
      return authResult.response;
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Key ID required' }, { status: 400 });

    businessStore.revokeApiKey(id);
    return NextResponse.json({ success: true, message: 'Key revoked' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
