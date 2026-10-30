import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/apiAuth';
import { summarizeConversationThread } from '@/lib/ai/deltaAiEngine';

export async function POST(req: NextRequest) {
  try {
    const authResult = authenticateApiRequest(req, ['ai:generate']);
    if (!authResult.success) {
      return authResult.response;
    }

    const body = await req.json();
    const messages = body.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: { message: 'Parameter "messages" must be a non-empty array of objects with sender and content.' } },
        { status: 400 }
      );
    }

    const title = body.title || 'Customer Conversation';
    const summary = await summarizeConversationThread(messages, title);

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Summarization failed' }, { status: 500 });
  }
}
