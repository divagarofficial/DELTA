import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/apiAuth';
import { callGeminiApi } from '@/lib/ai/deltaAiEngine';

export async function POST(req: NextRequest) {
  try {
    const authResult = authenticateApiRequest(req, ['ai:generate']);
    if (!authResult.success) {
      return authResult.response;
    }

    const body = await req.json();
    const text: string = body.text || (Array.isArray(body.messages) ? body.messages.join('\n') : '');

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: { message: 'Parameter "text" or "messages" array is required.' } },
        { status: 400 }
      );
    }

    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    let score = 0.5;
    let confidence = 0.85;

    // Try Gemini AI if available
    const geminiRes = await callGeminiApi(
      `Analyze the sentiment of the following customer interaction:\n\n"${text}"\n\nRespond strictly with valid JSON: {"sentiment": "positive"|"negative"|"neutral", "score": 0.0-1.0, "reason": "brief explanation"}`
    );

    if (geminiRes?.text) {
      try {
        const jsonMatch = geminiRes.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return NextResponse.json({
            success: true,
            provider: 'gemini',
            sentiment: parsed.sentiment || 'neutral',
            score: parsed.score ?? 0.5,
            reason: parsed.reason || 'Analyzed with Gemini 1.5 Flash',
          });
        }
      } catch (e) {}
    }

    // Sovereign Heuristic Fallback
    const lower = text.toLowerCase();
    const posWords = ['thank', 'great', 'good', 'awesome', 'excellent', 'love', 'happy', 'fast', 'super', 'semma'];
    const negWords = ['bad', 'terrible', 'slow', 'delay', 'issue', 'problem', 'angry', 'hate', 'refund', 'broken', 'worst'];

    const posMatches = posWords.filter((w) => lower.includes(w)).length;
    const negMatches = negWords.filter((w) => lower.includes(w)).length;

    if (posMatches > negMatches) {
      sentiment = 'positive';
      score = Math.min(0.6 + posMatches * 0.1, 0.98);
    } else if (negMatches > posMatches) {
      sentiment = 'negative';
      score = Math.max(0.4 - negMatches * 0.1, 0.05);
    }

    return NextResponse.json({
      success: true,
      provider: 'delta-sovereign',
      sentiment,
      score,
      analysis: `Detected ${posMatches} positive indicators and ${negMatches} negative indicators.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Sentiment analysis failed' }, { status: 500 });
  }
}

