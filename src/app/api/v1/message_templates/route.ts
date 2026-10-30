import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/apiAuth';
import { businessStore } from '@/lib/business/businessStore';
import { BusinessTemplate } from '@/types/business';

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

    return NextResponse.json({
      data: templates,
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

    if (!body.name || !body.category || !body.body_text) {
      return NextResponse.json(
        {
          error: {
            message: 'Template name, category (MARKETING, UTILITY, AUTHENTICATION, SERVICE), and body_text are required.',
          },
        },
        { status: 400 }
      );
    }

    const template = businessStore.addTemplate({
      name: body.name.toLowerCase().trim().replace(/\s+/g, '_'),
      category: body.category,
      language: body.language || 'en_US',
      header_type: body.header_type || 'NONE',
      header_content: body.header_content,
      body_text: body.body_text,
      footer_text: body.footer_text,
      buttons: body.buttons || [],
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
