'use client';

// Path: app/components/QuizVisual.tsx
// Title: Quiz Visual Component
// Purpose: Displays the quiz illustration securely with aspect ratio control.

import Image from 'next/image';
import type { QuizVisualData, QuizVisualMode } from '@/lib/quiz-translation-visual';

interface QuizVisualProps {
  imageUrl: string;
  alt: string;
  priority?: boolean;
  visualMode?: QuizVisualMode | null;
  visualData?: QuizVisualData | null;
  imageClassName?: string;
  containerClassName?: string;
  plain?: boolean;
  sizes?: string;
}

export default function QuizVisual({
  imageUrl,
  alt,
  priority = false,
  imageClassName,
  containerClassName,
  plain = false,
  sizes = '100vw',
}: QuizVisualProps) {
  const isDataUri = imageUrl.startsWith('data:');
  const baseContainerClassName = plain
    ? 'relative w-full aspect-video overflow-hidden group'
    : 'relative w-full aspect-video rounded-3xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shadow-xl border border-white/10 group';

  return (
    <div className={`${baseContainerClassName} ${containerClassName || ''}`}>
      <Image
        src={imageUrl}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className={`${imageClassName || 'object-cover'} transition-transform duration-700 group-hover:scale-105`}
        unoptimized={isDataUri}
      />
    </div>
  );
}
