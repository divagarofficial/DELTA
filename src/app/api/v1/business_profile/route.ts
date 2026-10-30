import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/apiAuth';
import { businessStore } from '@/lib/business/businessStore';

export async function GET(req: NextRequest) {
  const authResult = authenticateApiRequest(req, ['profile:read']);
  if (!authResult.success) {
    return authResult.response;
  }

  const profile = businessStore.getProfile();
  return NextResponse.json({
    data: [
      {
        about: profile.about,
        address: profile.description,
        description: profile.description,
        email: profile.email,
        profile_picture_url: profile.avatar_url,
        websites: profile.websites,
        vertical: profile.vertical,
        messaging_product: 'delta_business',
        verified: profile.verified_status,
      },
    ],
  });
}

export async function POST(req: NextRequest) {
  try {
    const authResult = authenticateApiRequest(req, ['profile:write']);
    if (!authResult.success) {
      return authResult.response;
    }

    const body = await req.json();
    const updated = businessStore.updateProfile({
      business_name: body.business_name,
      about: body.about,
      description: body.description || body.address,
      email: body.email,
      vertical: body.vertical,
      websites: body.websites,
      avatar_url: body.profile_picture_url || body.avatar_url,
    });

    return NextResponse.json({
      success: true,
      profile: updated,
      message: 'Business profile updated successfully',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
