// Path: app/components/LatexRenderer.tsx
// Title: LaTeX Math Renderer
// Purpose: Renders mathematical formulas using KaTeX.

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
    .replace(/\\\\([a-zA-Z]+)/g, '\\$1')
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$')
    .replace(/\\\[/g, '$$')
    .replace(/\\\]/g, '$$');
}

export default function LatexRenderer({ text, className = "" }: LatexRendererProps) {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.innerHTML = ''; // クリア
      const normalizedText = normalizeLatexText(text);

      // 1. デリミタ ($$ または $) が含まれているかチェック
      const hasDelimiters = /\$\$[\s\S]*?\$\$|\$[\s\S]*?\$/.test(normalizedText);

      if (!hasDelimiters && normalizedText.includes('\\')) {
        // デリミタはないがバックスラッシュがある場合、全体を数式として扱う（フォールバック）
        const span = document.createElement('span');
        try {
          katex.render(normalizedText, span, { displayMode: false, throwOnError: false });
        } catch {
          span.textContent = normalizedText;
        }
        containerRef.current.appendChild(span);
        return;
      }

      // 2. 従来のデリミタ分割ロジック
      const parts = normalizedText.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);
      
      parts.forEach(part => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          // ブロック数式
          const formula = part.slice(2, -2);
          const span = document.createElement('div');
          span.className = 'my-4 overflow-x-auto';
          try {
            katex.render(formula, span, { displayMode: true, throwOnError: false });
        } catch {
            span.textContent = part;
          }
          containerRef.current?.appendChild(span);
        } else if (part.startsWith('$') && part.endsWith('$')) {
          // インライン数式
          const formula = part.slice(1, -1);
          const span = document.createElement('span');
          try {
            katex.render(formula, span, { displayMode: false, throwOnError: false });
        } catch {
            span.textContent = part;
          }
          containerRef.current?.appendChild(span);
        } else {
          // 通常テキスト
          const span = document.createElement('span');
          span.textContent = part;
          containerRef.current?.appendChild(span);
        }
      });
    }
  }, [text]);

  return (
    <span 
      ref={containerRef} 
      className={`latex-container whitespace-pre-wrap ${className}`}
    />
  );
}
