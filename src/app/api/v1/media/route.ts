import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { authenticateApiRequest } from '@/lib/apiAuth';
import { businessStore } from '@/lib/business/businessStore';
import { BusinessMediaItem } from '@/types/business';

export async function POST(req: NextRequest) {
  try {
    const authResult = authenticateApiRequest(req, ['media:upload']);
    if (!authResult.success) {
      return authResult.response;
    }

    const contentType = req.headers.get('content-type') || '';
    let filename = 'attachment.bin';
    let mimeType = 'application/octet-stream';
    let fileSize = 0;
    let sha256 = '';
    let publicUrl = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json(
          { error: { message: 'Missing file in form-data payload' } },
          { status: 400 }
        );
      }

      filename = file.name || filename;
      mimeType = file.type || mimeType;
      fileSize = file.size;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

      // Try uploading to Supabase if configured
      try {
        const { createAdminClient } = await import('@/lib/supabase/admin');
        const admin = createAdminClient();
        if (admin) {
          const path = `business/${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const { data: uploadData, error: uploadErr } = await admin.storage
            .from('attachments')
            .upload(path, buffer, { contentType: mimeType, upsert: true });

          if (!uploadErr && uploadData) {
            const { data: urlData } = admin.storage.from('attachments').getPublicUrl(path);
            publicUrl = urlData?.publicUrl || '';
          }
        }
      } catch (err) {
        // Fallback
      }

      if (!publicUrl) {
        // Local base64 data URL fallback
        const base64Str = buffer.toString('base64');
        publicUrl = `data:${mimeType};base64,${base64Str.slice(0, 5000)}...`;
      }
    } else {
      // JSON body fallback with url/link
      const body = await req.json().catch(() => ({}));
      filename = body.filename || 'asset.jpg';
      mimeType = body.mime_type || 'image/jpeg';
      fileSize = body.file_size || 128000;
      publicUrl = body.url || 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800';
      sha256 = crypto.createHash('sha256').update(filename + Date.now()).digest('hex');
    }

    const mediaId = `media_delta_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const mediaItem: BusinessMediaItem = {
      id: mediaId,
      filename,
      mime_type: mimeType,
      file_size: fileSize,
      sha256,
      url: publicUrl,
      created_at: new Date().toISOString(),
    };

    businessStore.saveMedia(mediaItem);

    return NextResponse.json(
      {
        id: mediaId,
        messaging_product: 'whatsapp',
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Media upload failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authResult = authenticateApiRequest(req, ['media:read']);
    if (!authResult.success) {
      return authResult.response;
    }

    const { searchParams } = new URL(req.url);
    const mediaId = searchParams.get('id') || '';

    const media = businessStore.getMedia(mediaId);
    if (!media) {
      // Fallback response for default mock
      return NextResponse.json({
        messaging_product: 'whatsapp',
        url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800',
        mime_type: 'image/jpeg',
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        file_size: 142000,
        id: mediaId || 'media_delta_default',
      });
    }

    return NextResponse.json({
      messaging_product: 'whatsapp',
      url: media.url,
      mime_type: media.mime_type,
      sha256: media.sha256,
      file_size: media.file_size,
      id: media.id,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authResult = authenticateApiRequest(req, ['media:write']);
    if (!authResult.success) {
      return authResult.response;
    }

    const { searchParams } = new URL(req.url);
    const mediaId = searchParams.get('id');
    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
    }

    const deleted = businessStore.deleteMedia(mediaId);
    return NextResponse.json({ success: deleted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
