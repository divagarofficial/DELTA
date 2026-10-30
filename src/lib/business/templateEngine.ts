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
