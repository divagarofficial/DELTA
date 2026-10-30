import { BusinessTemplate, TemplateButton } from '@/types/business';

export interface InterpolationParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document';
  text?: string;
  image?: { link: string };
}

export interface TemplateComponentInput {
  type: 'header' | 'body' | 'button';
  sub_type?: 'url' | 'quick_reply';
  index?: number;
  parameters: InterpolationParameter[];
}

export interface RenderedTemplate {
  header?: string;
  headerImage?: string;
  body: string;
  footer?: string;
  buttons: TemplateButton[];
}

export function interpolateText(text: string, parameters: InterpolationParameter[]): string {
  if (!text || !parameters || parameters.length === 0) return text;
  let result = text;
  parameters.forEach((param, idx) => {
    const placeholder = new RegExp(`\\{\\{${idx + 1}\\}\\}`, 'g');
    const replacement = param.text || (param.type === 'image' && param.image ? '[Image]' : '');
    result = result.replace(placeholder, replacement);
  });
  return result;
}

export function renderTemplate(
  template: BusinessTemplate,
  components?: TemplateComponentInput[]
): RenderedTemplate {
  let renderedHeader = template.header_content;
  let headerImage: string | undefined;
  let renderedBody = template.body_text;
  const renderedFooter = template.footer_text;
  let renderedButtons: TemplateButton[] = template.buttons ? [...template.buttons] : [];

  if (components && components.length > 0) {
    for (const comp of components) {
      if (comp.type === 'header') {
        if (template.header_type === 'IMAGE') {
          const imgParam = comp.parameters.find((p) => p.type === 'image');
          if (imgParam?.image?.link) {
            headerImage = imgParam.image.link;
          }
        } else if (renderedHeader) {
          renderedHeader = interpolateText(renderedHeader, comp.parameters);
        }
      } else if (comp.type === 'body') {
        renderedBody = interpolateText(renderedBody, comp.parameters);
      } else if (comp.type === 'button') {
        if (typeof comp.index === 'number' && renderedButtons[comp.index]) {
          const btn = renderedButtons[comp.index];
          if (btn.url && comp.parameters[0]?.text) {
            btn.url = btn.url.replace(/\{\{1\}\}/g, comp.parameters[0].text);
          }
        }
      }
    }
  }

  return {
    header: renderedHeader,
    headerImage,
    body: renderedBody,
    footer: renderedFooter,
    buttons: renderedButtons,
  };
}

/**
 * Dynamically synthesizes and auto-provisions a BusinessTemplate on-the-fly
 * when a customer migrates existing WhatsApp templates that haven't been pre-configured.
 * Prevents 404 template rejection and provides zero-code-change drop-in migration.
 */
export function synthesizeTemplateFromComponents(
  templateName: string,
  components?: TemplateComponentInput[],
  language: string = 'en_US'
): BusinessTemplate {
  let headerContent: string | undefined;
  let headerType: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'NONE' = 'NONE';
  let bodyPlaceholders: string[] = [];
  let buttons: TemplateButton[] = [];

  if (components && components.length > 0) {
    for (const comp of components) {
      if (comp.type === 'header' && comp.parameters) {
        const hasImg = comp.parameters.some((p) => p.type === 'image');
        if (hasImg) {
          headerType = 'IMAGE';
        } else {
          headerType = 'TEXT';
          headerContent = comp.parameters.map((_, i) => `{{${i + 1}}}`).join(' ');
        }
      } else if (comp.type === 'body' && comp.parameters) {
        bodyPlaceholders = comp.parameters.map((_, i) => `{{${i + 1}}}`);
      } else if (comp.type === 'button') {
        buttons.push({
          type: comp.sub_type === 'url' ? 'URL' : 'QUICK_REPLY',
          text: 'Action',
          url: comp.sub_type === 'url' ? 'https://delta.chat' : undefined,
        });
      }
    }
  }

  const cleanName = templateName.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
  const bodyText =
    bodyPlaceholders.length > 0
      ? bodyPlaceholders.join(' • ')
      : `Notification from ${templateName.replace(/_/g, ' ')}`;

  return {
    id: `tmpl-dyn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: cleanName,
    category: 'UTILITY',
    language,
    status: 'APPROVED',
    header_type: headerType,
    header_content: headerContent,
    body_text: bodyText,
    footer_text: 'Delta Business Notification',
    buttons: buttons.length > 0 ? buttons : undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Converts a Delta BusinessTemplate into the official Meta WhatsApp Cloud API components format.
 */
export function toWhatsAppComponents(template: BusinessTemplate) {
  const components: any[] = [];

  if (template.header_content || template.header_type !== 'NONE') {
    components.push({
      type: 'HEADER',
      format: template.header_type || 'TEXT',
      text: template.header_content || undefined,
    });
  }

  components.push({
    type: 'BODY',
    text: template.body_text,
  });

  if (template.footer_text) {
    components.push({
      type: 'FOOTER',
      text: template.footer_text,
    });
  }

  if (template.buttons && template.buttons.length > 0) {
    components.push({
      type: 'BUTTONS',
      buttons: template.buttons.map((b) => ({
        type: b.type,
        text: b.text,
        url: b.url,
        phone_number: b.phone_number,
      })),
    });
  }

  return components;
}
