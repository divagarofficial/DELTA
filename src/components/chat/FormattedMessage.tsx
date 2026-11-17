'use client';

import React from 'react';

interface FormattedMessageProps {
  content: string;
  isOwn?: boolean;
}

/**
 * Tokenizes and renders inline rich text formatting:
 * - Bold: *text* or **text**
 * - Italic: _text_
 * - Strikethrough: ~text~
 * - Monospace / Code: `code`
 * - Safe clickable links: https://... or http://...
 */
export function renderInlineFormattedText(text: string, isOwn: boolean): React.ReactNode {
  // Regex pattern matching: URLs, Code, Bold, Italic, Strikethrough
  const pattern =
    /(https?:\/\/[^\s]+)|(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(_[^_]+_)|(~[^~]+~)/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const matchedStr = match[0];

    // 1. URL
    if (matchedStr.startsWith('http://') || matchedStr.startsWith('https://')) {
      parts.push(
        <a
          key={match.index}
          href={matchedStr}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline underline-offset-2 break-all font-semibold ${
            isOwn
              ? 'text-white hover:text-white/90'
              : 'text-delta-600 dark:text-delta-400 hover:text-delta-700 dark:hover:text-delta-300'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {matchedStr}
        </a>
      );
    }
    // 2. Monospace Code: `code`
    else if (matchedStr.startsWith('`') && matchedStr.endsWith('`')) {
      const codeContent = matchedStr.slice(1, -1);
      parts.push(
        <code
          key={match.index}
          className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
            isOwn
              ? 'bg-black/25 text-white ring-1 ring-white/20'
              : 'bg-muted text-foreground ring-1 ring-border/50'
          }`}
        >
          {codeContent}
        </code>
      );
    }
    // 3. Double Asterisk Bold: **bold**
    else if (matchedStr.startsWith('**') && matchedStr.endsWith('**')) {
      const boldContent = matchedStr.slice(2, -2);
      parts.push(
        <strong key={match.index} className="font-bold">
          {boldContent}
        </strong>
      );
    }
    // 4. Single Asterisk Bold (WhatsApp standard): *bold*
    else if (matchedStr.startsWith('*') && matchedStr.endsWith('*')) {
      const boldContent = matchedStr.slice(1, -1);
      parts.push(
        <strong key={match.index} className="font-bold">
          {boldContent}
        </strong>
      );
    }
    // 5. Underscore Italic: _italic_
    else if (matchedStr.startsWith('_') && matchedStr.endsWith('_')) {
      const italicContent = matchedStr.slice(1, -1);
      parts.push(
        <em key={match.index} className="italic">
          {italicContent}
        </em>
      );
    }
    // 6. Strikethrough: ~strike~
    else if (matchedStr.startsWith('~') && matchedStr.endsWith('~')) {
      const strikeContent = matchedStr.slice(1, -1);
      parts.push(
        <del key={match.index} className="line-through opacity-75">
          {strikeContent}
        </del>
      );
    }

    lastIndex = match.index + matchedStr.length;
  }

  if (lastIndex === 0) {
    return text;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}

/**
 * Modern chat message formatter supporting WhatsApp and Markdown styling.
 * Renders lists, quotes, emoji headers, inline code, and URLs cleanly.
 */
export function FormattedMessage({ content, isOwn = false }: FormattedMessageProps) {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <div className="space-y-1.5 leading-relaxed text-sm break-words select-text">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();

        // Empty line spacer
        if (!trimmed) {
          return <div key={lineIdx} className="h-1" />;
        }

        // Blockquote: > text
        if (trimmed.startsWith('>')) {
          const quoteText = trimmed.replace(/^>\s*/, '');
          return (
            <div
              key={lineIdx}
              className={`border-l-2 pl-2.5 py-0.5 my-1 italic rounded-r-md ${
                isOwn
                  ? 'border-white/50 text-white/90 bg-white/5'
                  : 'border-delta-500/50 text-muted-foreground bg-delta-500/5'
              }`}
            >
              {renderInlineFormattedText(quoteText, isOwn)}
            </div>
          );
        }

        // Bullet list: •, -, or * at start of line
        const bulletMatch = line.match(/^(\s*)([•\-\*])\s+(.*)$/);
        if (bulletMatch) {
          const indent = bulletMatch[1].length;
          const text = bulletMatch[3];
          return (
            <div
              key={lineIdx}
              className="flex items-start gap-2 text-[13px] leading-snug"
              style={{ paddingLeft: `${Math.min(indent * 8, 20)}px` }}
            >
              <span
                className={`select-none mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                  isOwn ? 'bg-white/80' : 'bg-delta-500 dark:bg-delta-400'
                }`}
              />
              <span className="flex-1">{renderInlineFormattedText(text, isOwn)}</span>
            </div>
          );
        }

        // Numbered list: 1., 2., etc.
        const numberedMatch = line.match(/^(\s*)(\d+[\.\)])\s+(.*)$/);
        if (numberedMatch) {
          const indent = numberedMatch[1].length;
          const num = numberedMatch[2];
          const text = numberedMatch[3];
          return (
            <div
              key={lineIdx}
              className="flex items-start gap-2 text-[13px] leading-snug"
              style={{ paddingLeft: `${Math.min(indent * 8, 20)}px` }}
            >
              <span
                className={`font-semibold shrink-0 text-xs font-mono mt-0.5 ${
                  isOwn ? 'text-white/85' : 'text-delta-600 dark:text-delta-400 font-bold'
                }`}
              >
                {num}
              </span>
              <span className="flex-1">{renderInlineFormattedText(text, isOwn)}</span>
            </div>
          );
        }

        // Standard text paragraph
        return (
          <p key={lineIdx} className="font-normal text-[13.5px]">
            {renderInlineFormattedText(line, isOwn)}
          </p>
        );
      })}
    </div>
  );
}
