import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/apiAuth';
import { generateAiResponse, generateSmartReplies, parseNaturalLanguageCommand } from '@/lib/ai/deltaAiEngine';
import { AiGenerateRequest } from '@/types/ai';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate request via API Key
    const authResult = authenticateApiRequest(req, ['ai:generate']);
    if (!authResult.success) {
      return authResult.response;
    }

    const body: AiGenerateRequest & { action?: string; incomingMessage?: string } = await req.json();

    // 2. Action: Generate Smart Replies (3-Intent Rule)
    if (body.action === 'smart_replies' && body.incomingMessage) {
      const replies = generateSmartReplies(body.incomingMessage, body.context?.userVoiceProfile as any);
      return NextResponse.json({
        success: true,
        action: 'smart_replies',
        replies,
        savings: {
          rate: '₹0.0000',
          currency: 'INR',
          saved_vs_meta: '₹0.8631',
        },
      });
    }

    // 3. Action: Parse Command
    if (body.action === 'parse_command' && body.prompt) {
      const parsed = parseNaturalLanguageCommand(body.prompt);
      return NextResponse.json({
        success: true,
        action: 'parse_command',
        result: parsed,
      });
    }

    // 4. Default: Full AI Text Generation
    if (!body.prompt) {
      return NextResponse.json(
        {
          error: {
            message: 'Parameter "prompt" is required.',
            type: 'DeltaAiParamException',
            code: 100,
          },
        },
        { status: 400 }
      );
    }

    const aiResult = await generateAiResponse(body);

    return NextResponse.json({
      success: true,
      data: aiResult,
      client: {
        id: authResult.client.keyId,
        is_live: authResult.client.isLive,
      },
    });
  } catch (error: any) {
    console.error('API AI Generate error:', error);
    return NextResponse.json(
      {
        error: {
          message: error.message || 'Internal AI Server Error',
          type: 'DeltaAiExecutionException',
          code: 500,
        },
      },
      { status: 500 }
    );
  }
}

