import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/apiAuth';
import { businessStore } from '@/lib/business/businessStore';
import { renderTemplate } from '@/lib/business/templateEngine';
import { calculateMessageSavings } from '@/lib/business/costLedger';
import { notifyMessageStatusWebhook } from '@/lib/business/webhookDispatcher';
import { BusinessCategory, WhatsAppCompatibleSendMessageRequest } from '@/types/business';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate API request with scope 'messages:send'
    const authResult = authenticateApiRequest(req, ['messages:send']);
    if (!authResult.success) {
      return authResult.response;
    }

    const body: WhatsAppCompatibleSendMessageRequest = await req.json();

    if (!body.to) {
      return NextResponse.json(
        {
          error: {
            message: 'Parameter "to" is required (phone number e.g. +919876543210 or user ID).',
            type: 'DeltaParamException',
            code: 100,
          },
        },
        { status: 400 }
      );
    }

    const messageType = body.type || 'text';
    let category: BusinessCategory = 'SERVICE';
    let content = '';
    let attachments: any[] = [];
    let interactiveMeta: any = null;

    // Handle each WhatsApp message type with full fidelity
    if (messageType === 'template') {
      const templateName = body.template?.name || '';
      const template = businessStore.getTemplateByName(templateName);

      if (!template) {
        return NextResponse.json(
          {
            error: {
              message: `Template "${templateName}" not found or not approved in Delta Business Suite.`,
              type: 'DeltaTemplateException',
              code: 132000,
            },
          },
          { status: 404 }
        );
      }

      category = template.category;
      const rendered = renderTemplate(template, body.template?.components as any);
      content = rendered.body;
      if (rendered.header) content = `[${rendered.header}]\n\n${content}`;
      if (rendered.footer) content = `${content}\n\n_${rendered.footer}_`;

      interactiveMeta = {
        template: {
          name: template.name,
          category: template.category,
          rendered_header: rendered.header,
          rendered_footer: rendered.footer,
          buttons: rendered.buttons,
        },
      };
    } else if (messageType === 'text') {
      content = body.text?.body || '';
      category = 'SERVICE';
    } else if (messageType === 'interactive') {
      category = 'SERVICE';
      const interactivePayload = body.interactive;
      if (interactivePayload?.type === 'button') {
        content = interactivePayload.body.text || 'Interactive Selection';
        interactiveMeta = {
          interactive: {
            type: 'button',
            buttons: interactivePayload.action.buttons?.map((b) => ({
              id: b.reply.id,
              title: b.reply.title,
            })) || [],
          },
        };
      } else if (interactivePayload?.type === 'list') {
        content = interactivePayload.body.text || 'Menu Selection';
        interactiveMeta = {
          interactive: {
            type: 'list',
            button: interactivePayload.action.button || 'Select Option',
            sections: interactivePayload.action.sections || [],
          },
        };
      } else {
        content = interactivePayload?.body.text || 'Interactive Message';
      }
    } else if (messageType === 'image') {
      content = body.image?.caption || '';
      category = 'UTILITY';
      const imgUrl = body.image?.link || (body.image?.id ? businessStore.getMedia(body.image.id)?.url : '');
      if (imgUrl) {
        attachments.push({
          id: `att-${Date.now()}`,
          file_name: 'image.jpg',
          file_type: 'image/jpeg',
          file_size: 150000,
          file_url: imgUrl,
        });
      }
    } else if (messageType === 'document') {
      content = body.document?.caption || body.document?.filename || 'Document';
      category = 'UTILITY';
      const docUrl = body.document?.link || (body.document?.id ? businessStore.getMedia(body.document.id)?.url : '');
      if (docUrl) {
        attachments.push({
          id: `att-${Date.now()}`,
          file_name: body.document?.filename || 'document.pdf',
          file_type: 'application/pdf',
          file_size: 250000,
          file_url: docUrl,
        });
      }
    } else if (messageType === 'audio') {
      content = 'Voice audio note';
      category = 'UTILITY';
      const audioUrl = body.audio?.link || (body.audio?.id ? businessStore.getMedia(body.audio.id)?.url : '');
      if (audioUrl) {
        attachments.push({
          id: `att-${Date.now()}`,
          file_name: 'audio.mp3',
          file_type: 'audio/mp3',
          file_size: 80000,
          file_url: audioUrl,
        });
      }
    } else if (messageType === 'video') {
      content = body.video?.caption || 'Video';
      category = 'UTILITY';
      const videoUrl = body.video?.link || (body.video?.id ? businessStore.getMedia(body.video.id)?.url : '');
      if (videoUrl) {
        attachments.push({
          id: `att-${Date.now()}`,
          file_name: 'video.mp4',
          file_type: 'video/mp4',
          file_size: 1500000,
          file_url: videoUrl,
        });
      }
    } else if (messageType === 'location') {
      content = `📍 Location: ${body.location?.name || 'Shared Pin'}\n${body.location?.address || ''}\nCoordinates: ${body.location?.latitude}, ${body.location?.longitude}`;
      category = 'UTILITY';
    } else if (messageType === 'contacts') {
      content = `👤 Contact Card: ${body.contacts?.[0]?.name?.formatted_name || 'Shared Contact'}`;
      category = 'UTILITY';
    } else {
      content = `[${String(messageType).toUpperCase()} message]`;
      category = 'UTILITY';
    }

    // Generate unique WhatsApp-compatible message ID
    const randomHex = Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const cleanPhone = body.to.replace(/[^0-9]/g, '');
    const messageId = `wamid.HBgM${cleanPhone}${randomHex}`;

    // Record in zero-cost ledger
    const savings = calculateMessageSavings(category, 'INR');
    businessStore.recordLedgerEntry({
      recipient: body.to,
      category,
      message_type: `${messageType}${body.template?.name ? `:${body.template.name}` : ''}`,
      currency: 'INR',
      message_id: messageId,
    });

    // Queue for Realtime Multi-Window & Demo Mode Bridge
    businessStore.queueIncomingMessage({
      id: messageId,
      to: body.to,
      content,
      type: messageType === 'image' || messageType === 'document' ? messageType : 'text',
      metadata: {
        business: {
          is_business: true,
          verified: true,
          business_name: businessStore.getProfile().business_name,
          zero_charge: true,
          cost: '0.00',
          currency: 'INR',
        },
        ...interactiveMeta,
      },
      attachments,
      timestamp: new Date().toISOString(),
    });

    // In production with live Supabase, persist message to PostgreSQL
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin');
      const admin = createAdminClient();
      if (admin) {
        const cleanDigits = body.to.replace(/[^0-9]/g, '');
        const { data: profiles } = await admin
          .from('profiles')
          .select('id, username, display_name, phone_number')
          .or(`phone_number.ilike.%${cleanDigits.slice(-10)}%,username.eq.${body.to}`)
          .limit(1);

        const recipientProfile = profiles?.[0];
        if (recipientProfile) {
          const { data: convMembers } = await admin
            .from('conversation_members')
            .select('conversation_id')
            .eq('user_id', recipientProfile.id);

          let conversationId = convMembers?.[0]?.conversation_id;
          if (!conversationId) {
            const { data: newConv } = await admin
              .from('conversations')
              .insert({ type: 'direct', title: businessStore.getProfile().business_name })
              .select('id')
              .single();
            if (newConv) {
              conversationId = newConv.id;
              await admin.from('conversation_members').insert([
                { conversation_id: conversationId, user_id: recipientProfile.id, role: 'member' },
              ]);
            }
          }

          if (conversationId) {
            await admin.from('messages').insert({
              conversation_id: conversationId,
              content,
              type: messageType === 'image' ? 'image' : messageType === 'document' ? 'document' : 'text',
              metadata: {
                business: {
                  is_business: true,
                  business_name: businessStore.getProfile().business_name,
                  zero_charge: true,
                },
                ...interactiveMeta,
              },
            });
          }
        }
      }
    } catch (dbErr) {
      console.warn('Production Supabase sync fallback:', dbErr);
    }

    // Trigger Outbound Delivery Webhook Asynchronously
    notifyMessageStatusWebhook({
      messageId,
      status: 'delivered',
      recipientPhone: body.to,
      category: category.toLowerCase(),
    }).catch(() => {});

    // Return 100% WhatsApp Cloud API compatible payload with Zero-Charge pricing confirmation
    return NextResponse.json(
      {
        messaging_product: body.messaging_product || 'whatsapp',
        contacts: [
          {
            input: body.to,
            wa_id: cleanPhone,
            delta_id: `usr_${cleanPhone || 'client'}`,
          },
        ],
        messages: [
          {
            id: messageId,
            message_status: 'accepted',
            pricing: {
              billable: false,
              pricing_model: 'delta_zero_charge',
              category: category.toLowerCase(),
              rate: '0.00',
              currency: 'INR',
              saved_vs_whatsapp: savings.formattedSaved,
              meta_equivalent_rate: `₹${savings.whatsappRate.toFixed(4)}`,
            },
          },
        ],
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        error: {
          message: err.message || 'Internal server error processing Delta API request',
          type: 'DeltaServerException',
          code: 500,
        },
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Realtime Polling endpoint for frontend clients to retrieve queued API messages
  const { searchParams } = new URL(req.url);
  const since = searchParams.get('since') || undefined;
  const messages = businessStore.getPendingIncomingMessages(since);

  return NextResponse.json({
    messaging_product: 'delta_business',
    messages,
    count: messages.length,
    timestamp: new Date().toISOString(),
  });
}
