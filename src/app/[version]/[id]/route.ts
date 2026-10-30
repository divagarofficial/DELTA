import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/apiAuth';
import { businessStore } from '@/lib/business/businessStore';

/**
 * WhatsApp Cloud API Drop-in Resource Endpoint
 * Handles:
 * - GET /{version}/{phone_number_id} (Fetch phone number details, verified name, quality rating)
 * - GET /{version}/{waba_id} (Fetch WhatsApp Business Account information)
 * - GET /{version}/{media_id} (Retrieve media download URL & metadata)
 * - DELETE /{version}/{media_id} (Delete media asset)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ version: string; id: string }> }
) {
  try {
    const authResult = authenticateApiRequest(req, ['profile:read']);
    if (!authResult.success) {
      return authResult.response;
    }

    const { id, version } = await params;
    const { searchParams } = new URL(req.url);
    const fields = searchParams.get('fields') || '';

    // 1. Check if ID matches a Media Item
    const media = businessStore.getMedia(id);
    if (media || id.startsWith('media_') || id.startsWith('att-')) {
      if (media) {
        return NextResponse.json({
          messaging_product: 'whatsapp',
          url: media.url,
          mime_type: media.mime_type,
          sha256: media.sha256,
          file_size: media.file_size,
          id: media.id,
        });
      }
      return NextResponse.json({
        messaging_product: 'whatsapp',
        url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800',
        mime_type: 'image/jpeg',
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        file_size: 142000,
        id,
      });
    }

    const profile = businessStore.getProfile();

    // 2. Check if ID represents a WABA (WhatsApp Business Account)
    if (id.startsWith('waba_') || fields.includes('message_template_namespace')) {
      return NextResponse.json({
        id,
        name: profile.business_name,
        timezone_id: '1',
        message_template_namespace: 'delta_business_ns',
        currency: 'INR',
        account_review_status: 'APPROVED',
      });
    }

    // 3. Default: Phone Number Details (Standard WhatsApp Cloud API phone lookup)
    return NextResponse.json({
      verified_name: profile.business_name,
      code_verification_status: 'VERIFIED',
      display_phone_number: profile.phone_number,
      quality_rating: 'GREEN',
      id,
      messaging_product: 'whatsapp',
      platform_type: 'CLOUD_API',
      throughput: { level: 'STANDARD' },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: {
          message: err.message || 'Error resolving resource',
          type: 'OAuthException',
          code: 500,
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ version: string; id: string }> }
) {
  try {
    const authResult = authenticateApiRequest(req, ['media:write']);
    if (!authResult.success) {
      return authResult.response;
    }

    const { id } = await params;
    businessStore.deleteMedia(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message } }, { status: 500 });
  }
}

