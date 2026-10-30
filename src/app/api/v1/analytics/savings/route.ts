import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/apiAuth';
import { businessStore } from '@/lib/business/businessStore';

export async function GET(req: NextRequest) {
  const authResult = authenticateApiRequest(req, ['analytics:read']);
  if (!authResult.success) {
    return authResult.response;
  }

  const savings = businessStore.getCumulativeSavings();
  const recentLedger = businessStore.getLedger();

  return NextResponse.json({
    metrics: savings,
    recent_transactions: recentLedger,
    billing_status: 'ACTIVE_ZERO_CHARGE',
    disclaimer: 'Delta charges ₹0.00 for all business messages, templates, OTPs, and interactive payloads.',
  });
}
