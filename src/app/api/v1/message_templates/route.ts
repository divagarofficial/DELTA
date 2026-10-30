import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/apiAuth';
import { businessStore } from '@/lib/business/businessStore';
import { toWhatsAppComponents } from '@/lib/business/templateEngine';
import { BusinessTemplate, TemplateButton, TemplateHeaderType } from '@/types/business';

export async function GET(req: NextRequest) {
  try {
    const authResult = authenticateApiRequest(req, ['templates:read']);
    if (!authResult.success) {
      return authResult.response;
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const name = searchParams.get('name');

    let templates = businessStore.getTemplates();
    if (category) {
      templates = templates.filter((t) => t.category.toLowerCase() === category.toLowerCase());
    }
    if (name) {
      templates = templates.filter((t) => t.name.toLowerCase() === name.toLowerCase());
    }

    // Return both flat Delta fields and official Meta WhatsApp Cloud API components
    const templatesWithComponents = templates.map((t) => ({
      ...t,
      components: toWhatsAppComponents(t),
    }));

    return NextResponse.json({
      data: templatesWithComponents,
      paging: {
        cursors: {
          before: 'start',
          after: 'end',
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { message: err.message || 'Failed to list templates' } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = authenticateApiRequest(req, ['templates:write']);
    if (!authResult.success) {
      return authResult.response;
    }

    const body = await req.json();

    if (!body.name || !body.category) {
      return NextResponse.json(
        {
          error: {
            message: 'Template name and category (MARKETING, UTILITY, AUTHENTICATION, SERVICE) are required.',
          },
        },
        { status: 400 }
      );
    }

    let bodyText = body.body_text || '';
    let headerContent = body.header_content || '';
    let headerType: TemplateHeaderType = body.header_type || 'NONE';
    let footerText = body.footer_text || '';
    let buttons: TemplateButton[] = body.buttons || [];

    // Parse Meta WhatsApp Cloud API official "components" structure if provided
    if (Array.isArray(body.components) && body.components.length > 0) {
      for (const comp of body.components) {
        const compType = String(comp.type).toUpperCase();
        if (compType === 'HEADER') {
          headerContent = comp.text || comp.example?.header_text?.[0] || '';
          headerType = (comp.format as TemplateHeaderType) || 'TEXT';
        } else if (compType === 'BODY') {
          bodyText = comp.text || '';
        } else if (compType === 'FOOTER') {
          footerText = comp.text || '';
        } else if (compType === 'BUTTONS' && Array.isArray(comp.buttons)) {
          buttons = comp.buttons.map((b: any) => ({
            type: b.type === 'URL' ? 'URL' : b.type === 'PHONE_NUMBER' ? 'PHONE_NUMBER' : 'QUICK_REPLY',
            text: b.text || 'Action',
            url: b.url,
            phone_number: b.phone_number,
          }));
        }
      }
    }

    if (!bodyText) {
      bodyText = `Notification message for ${body.name}`;
    }

    const template = businessStore.addTemplate({
      name: body.name.toLowerCase().trim().replace(/\s+/g, '_'),
      category: body.category,
      language: body.language || 'en_US',
      header_type: headerType,
      header_content: headerContent || undefined,
      body_text: bodyText,
      footer_text: footerText || undefined,
      buttons: buttons.length > 0 ? buttons : undefined,
    });

    return NextResponse.json({
      id: template.id,
      status: template.status,
      category: template.category,
      message: 'Template approved instantly on Delta Business with zero review wait time.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { message: err.message || 'Failed to create template' } },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authResult = authenticateApiRequest(req, ['templates:write']);
    if (!authResult.success) {
      return authResult.response;
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const name = searchParams.get('name');

    if (!id && !name) {
      return NextResponse.json(
        { error: { message: 'Parameter "id" or "name" is required to delete template.' } },
        { status: 400 }
      );
    }

    let deleted = false;
    if (id) {
      deleted = businessStore.deleteTemplate(id);
    } else if (name) {
      const tmpl = businessStore.getTemplateByName(name);
      if (tmpl) {
        deleted = businessStore.deleteTemplate(tmpl.id);
      }
    }

    return NextResponse.json({
      success: deleted,
      message: deleted ? 'Template deleted successfully' : 'Template not found',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { message: err.message || 'Failed to delete template' } },
      { status: 500 }
    );
  }
}
