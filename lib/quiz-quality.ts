/** Structural invariants required even when optional AI review is disabled. */
export function validateQuizContract(value: unknown): string[] {
  const issues: string[] = [];
  const root = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  let sharedType: unknown;
  let answerIndex: number | undefined;
  for (const locale of ['ja', 'en', 'zh']) {
    const raw = root[locale];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      issues.push(`${locale}: 翻訳データがありません。`);
      continue;
    }
    const entry = raw as Record<string, unknown>;
    for (const field of ['title', 'question', 'hint', 'answer', 'explanation', 'detailedExplanation', 'learningPoints', 'relatedKnowledge']) {
      if (typeof entry[field] !== 'string' || !entry[field].trim()) {
        issues.push(`${locale}.${field}: 空でない文字列が必要です。`);
      }
    }
    if (entry.type !== 'TEXT' && entry.type !== 'CHOICE') {
      issues.push(`${locale}.type: TEXT または CHOICE が必要です。`);
    }
    if (sharedType === undefined) sharedType = entry.type;
    else if (entry.type !== sharedType) issues.push(`${locale}: 全言語で出題形式をそろえてください。`);
    if (entry.type !== 'CHOICE') continue;
    const options = entry.options;
    if (!Array.isArray(options) || options.length !== 4 || options.some(option => typeof option !== 'string' || !option.trim())) {
      issues.push(`${locale}.options: 空でない文字列4件の配列が必要です。`);
      continue;
    }
    // Preserve case: A/a and other case-sensitive language/code choices can differ.
    const normalized = options.map(option => option.normalize('NFKC').trim().replace(/\s+/g, ' '));
    if (new Set(normalized).size !== 4) issues.push(`${locale}: 選択肢に重複があります。`);
    const index = options.indexOf(entry.answer);
    if (index < 0 || options.filter(option => option === entry.answer).length !== 1) {
      issues.push(`${locale}: answer は選択肢のちょうど1件と完全一致させてください。`);
    } else if (answerIndex === undefined) answerIndex = index;
    else if (index !== answerIndex) issues.push(`${locale}: 選択肢の意味と正答の位置を全言語でそろえてください。`);
  }
  return issues;
}

export function parseQualityReview(raw: string) {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid quality review');
  const review = parsed as Record<string, unknown>;
  if (typeof review.pass !== 'boolean' || typeof review.score !== 'number' || !Number.isFinite(review.score)
    || review.score < 0 || review.score > 100 || !Array.isArray(review.issues)
    || review.issues.some(issue => typeof issue !== 'string' || !issue.trim())
    || typeof review.summary !== 'string' || !review.summary.trim()) {
    throw new Error('Incomplete quality review');
  }
  const issues = review.issues as string[];
  return { pass: review.pass && review.score >= 80 && issues.length === 0, score: review.score, issues, summary: review.summary };
}
