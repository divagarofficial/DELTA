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
    const useCase: string = body.use_case || body.prompt || 'order delivery notification';
    const category: string = (body.category || 'UTILITY').toUpperCase();
    const language: string = body.language || 'en_US';

    // Try Gemini AI for creative template generation
    const geminiRes = await callGeminiApi(
      `Generate an effective WhatsApp Business Template for the following use case: "${useCase}".
Category: ${category}
Language: ${language}
Include placeholders like {{1}}, {{2}} for dynamic variables.
Output strictly JSON matching this structure:
{
  "name": "template_slug_name",
  "category": "${category}",
  "header_type": "TEXT"|"NONE",
  "header_content": "optional header string",
  "body_text": "Body message text with {{1}}, {{2}} placeholders",
  "footer_text": "optional footer",
  "buttons": [
    {"type": "QUICK_REPLY", "text": "Button Label"},
    {"type": "URL", "text": "Visit Link", "url": "https://example.com/{{1}}"}
  ]
}`
    );

    if (geminiRes?.text) {
      try {
        const jsonMatch = geminiRes.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return NextResponse.json({
            success: true,
            provider: 'gemini',
            template: parsed,
          });
        }
      } catch (e) {}
    }

    // Sovereign Template Generator Fallback
    const cleanName = useCase.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30);
    const fallbackTemplate = {
      name: `${cleanName}_template`,
      category: category as 'MARKETING' | 'UTILITY' | 'AUTHENTICATION' | 'SERVICE',
      header_type: 'TEXT' as const,
      header_content: `🔔 Update regarding ${useCase}`,
      body_text: `Hi {{1}}, this is an automated update regarding your ${useCase}. Your reference number is {{2}}. Let us know if you need any assistance!`,
      footer_text: 'Delta Business Zero-Cost Delivery',
      buttons: [
        {
          type: 'QUICK_REPLY' as const,
          text: 'Confirm & Acknowledge',
        },
        {
          type: 'URL' as const,
          text: 'View Details Online',
          url: 'https://apexlogistics.com/ref/{{2}}',
        },
      ],
    };

    return NextResponse.json({
      success: true,
      provider: 'delta-sovereign',
      template: fallbackTemplate,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Template suggestion failed' }, { status: 500 });
  }
}

