// Path: app/components/LatexRenderer.tsx
// Title: LaTeX Renderer Component
// Purpose: Safely renders LaTeX mathematical formulas using KaTeX on the client side.
'use client';

import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface LatexRendererProps {
  text: string;
  className?: string;
}

function normalizeLatexText(value: string) {
  return value
    .trim()
    .replace(/\\\\/g, '\\') // Fix double escaping from server serialization
    .replace(/\\([a-zA-Z]+)/g, (match) => {
      // Avoid accidental unescaping of already correct commands
      return match;
    })
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$')
    .replace(/\\\[/g, '$$')
    .replace(/\\\]/g, '$$');
}

export default function LatexRenderer({ text, className = "" }: LatexRendererProps) {
  const containerRef = useRef<HTMLSpanElement>(null);

  const escapeHtml = (unsafe: string) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const getHtml = () => {
    const normalizedText = normalizeLatexText(text);

    // 1. デリミタ ($$ または $) が含まれているかチェック
    const hasDelimiters = /\$\$[\s\S]*?\$\$|\$[\s\S]*?\$/.test(normalizedText);

    if (!hasDelimiters && normalizedText.includes('\\')) {
      try {
        return katex.renderToString(normalizedText, { displayMode: false, throwOnError: false });
      } catch {
        return escapeHtml(normalizedText);
      }
    }

    // 2. デリミタ分割ロジック
    const parts = normalizedText.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);
    
    return parts.map(part => {
      if (!part) return '';

      if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
        const formula = part.slice(2, -2);
        try {
          return `<div class="my-4 overflow-x-auto text-center">${katex.renderToString(formula, { displayMode: true, throwOnError: false })}</div>`;
        } catch {
          return escapeHtml(part);
        }
      } else if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
        const formula = part.slice(1, -1);
        try {
          return katex.renderToString(formula, { displayMode: false, throwOnError: false });
        } catch {
          return escapeHtml(part);
        }
      } else if (part.includes('\\')) {
        const cleaned = part.replace(/^\$|\$$/g, '');
        try {
          return katex.renderToString(cleaned, { displayMode: false, throwOnError: false });
        } catch {
          return escapeHtml(part);
        }
      } else {
        return escapeHtml(part);
      }
    }).join('');
  };

  const html = getHtml();

  return (
    <span 
      className={`latex-container inline-block max-w-full min-w-0 align-top whitespace-pre-line break-words [overflow-wrap:anywhere] [word-break:break-word] ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
