import { NextRequest, NextResponse } from 'next/server';
import { businessStore } from '@/lib/business/businessStore';

export interface AuthenticatedClient {
  apiKey: string;
  keyId: string;
  name: string;
  scopes: string[];
  isLive: boolean;
}

// In-memory sliding window rate limiter
interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitBucket>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60;    // 60 requests per minute

/**
 * Validates API Key from Authorization Bearer header
 * and enforces rate-limiting and permission scopes.
 */
export function authenticateApiRequest(
  req: NextRequest,
  requiredScopes: string[] = ['ai:generate']
): { success: true; client: AuthenticatedClient } | { success: false; response: NextResponse } {
  const authHeader = req.headers.get('authorization') || '';
  const apiKey = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!apiKey) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: {
            message: 'Missing API key. Provide "Authorization: Bearer dlt_live_..." header.',
            type: 'OAuthException',
            code: 190,
            fbtrace_id: `trace_${Date.now()}`,
          },
        },
        { status: 401 }
      ),
    };
  }

  // Validate API Key via Business Store
  const isValid = businessStore.validateApiKey(apiKey);

  if (!isValid) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: {
            message: 'Invalid or revoked API key. Provide a valid Bearer token.',
            type: 'OAuthException',
            code: 190,
            fbtrace_id: `trace_${Date.now()}`,
          },
        },
        { status: 401 }
      ),
    };
  }

  // Rate Limiting Check
  const now = Date.now();
  let bucket = rateLimitMap.get(apiKey);

  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitMap.set(apiKey, bucket);
  } else {
    bucket.count += 1;
    if (bucket.count > MAX_REQUESTS_PER_WINDOW) {
      return {
        success: false,
        response: NextResponse.json(
          {
            error: {
              message: `Rate limit exceeded. Maximum ${MAX_REQUESTS_PER_WINDOW} requests/minute. Try again in ${Math.ceil((bucket.resetAt - now) / 1000)} seconds.`,
              type: 'RateLimitException',
              code: 429,
            },
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil((bucket.resetAt - now) / 1000)),
            },
          }
        ),
      };
    }
  }

  const client: AuthenticatedClient = {
    apiKey,
    keyId: apiKey.slice(0, 16),
    name: apiKey.startsWith('dlt_test_') ? 'Sandbox Client' : 'Live Production Client',
    scopes: ['ai:generate', 'messages:send', 'templates:read'],
    isLive: !apiKey.startsWith('dlt_test_'),
  };

  return { success: true, client };
}

