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

export default function LatexRenderer({ text, className = "" }: LatexRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.innerHTML = ''; // クリア

      // 1. デリミタ ($$ または $) が含まれているかチェック
      const hasDelimiters = /\$\$[\s\S]*?\$\$|\$[\s\S]*?\$/.test(text);

      if (!hasDelimiters && text.includes('\\')) {
        // デリミタはないがバックスラッシュがある場合、全体を数式として扱う（フォールバック）
        const span = document.createElement('span');
        try {
          katex.render(text, span, { displayMode: false, throwOnError: false });
        } catch (e) {
          span.textContent = text;
        }
        containerRef.current.appendChild(span);
        return;
      }

      // 2. 従来のデリミタ分割ロジック
      const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);
      
      parts.forEach(part => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          // ブロック数式
          const formula = part.slice(2, -2);
          const span = document.createElement('div');
          span.className = 'my-4 overflow-x-auto';
          try {
            katex.render(formula, span, { displayMode: true, throwOnError: false });
          } catch (e) {
            span.textContent = part;
          }
          containerRef.current?.appendChild(span);
        } else if (part.startsWith('$') && part.endsWith('$')) {
          // インライン数式
          const formula = part.slice(1, -1);
          const span = document.createElement('span');
          try {
            katex.render(formula, span, { displayMode: false, throwOnError: false });
          } catch (e) {
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
    <div 
      ref={containerRef} 
      className={`latex-container whitespace-pre-wrap ${className}`}
    />
  );
}
