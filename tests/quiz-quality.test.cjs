const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateQuizContract, parseQualityReview } = require(process.env.QUIZ_QUALITY_MODULE);

function quiz() {
  return Object.fromEntries(['ja', 'en', 'zh'].map(locale => [locale, {
    title: 'Addition', question: 'What is 2 + 2?', hint: 'Add two pairs.', answer: '4',
    explanation: 'Two pairs total four.', detailedExplanation: 'Count both pairs together.',
    learningPoints: 'Addition combines groups.', relatedKnowledge: 'Repeated addition leads to multiplication.',
    type: 'CHOICE', options: ['3', '4', '5', '6'], sources: '', references: '',
  }]));
}

test('accepts shared numeric answers and honest empty sources across all locales', () => {
  assert.deepEqual(validateQuizContract(quiz()), []);
});
test('validates each locale, not only Japanese', () => {
  for (const locale of ['ja', 'en', 'zh']) {
    const value = quiz(); value[locale].answer = '7';
    assert.ok(validateQuizContract(value).some(issue => issue.startsWith(locale)));
  }
});
test('rejects missing translation or required content', () => {
  const value = quiz(); delete value.zh; value.en.explanation = '  ';
  assert.equal(validateQuizContract(value).length, 2);
  assert.equal(validateQuizContract(null).length, 3);
});
test('rejects duplicate, blank, and non-array options', () => {
  for (const options of [['3', '4', '4', '6'], ['3', '4', '  ', '6'], '3,4,5,6', ['3', '4', '５', '5']]) {
    const value = quiz(); value.zh.options = options;
    assert.ok(validateQuizContract(value).length);
  }
});
test('rejects inconsistent correct-answer position and quiz types', () => {
  const value = quiz(); value.en.options = ['4', '3', '5', '6']; value.zh.type = 'TEXT';
  assert.equal(validateQuizContract(value).length, 2);
});
test('allows case-sensitive language/code options and text answers', () => {
  const value = quiz();
  for (const entry of Object.values(value)) { entry.options = ['A', 'a', 'B', 'b']; entry.answer = 'A'; }
  assert.deepEqual(validateQuizContract(value), []);
  for (const entry of Object.values(value)) { entry.type = 'TEXT'; delete entry.options; }
  assert.deepEqual(validateQuizContract(value), []);
});
test('requires explicit complete approval with finite score in range', () => {
  const valid = { pass: true, score: 90, issues: [], summary: 'Checked.' };
  assert.equal(parseQualityReview(JSON.stringify(valid)).pass, true);
  for (const patch of [{ score: 79 }, { pass: false }, { issues: ['Multiple answers'] }]) {
    assert.equal(parseQualityReview(JSON.stringify({ ...valid, ...patch })).pass, false);
  }
  for (const patch of [{ issues: null }, { issues: [4] }, { score: '90' }, { score: 101 }, { summary: '' }, { pass: 'true' }]) {
    assert.throws(() => parseQualityReview(JSON.stringify({ ...valid, ...patch })));
  }
  assert.throws(() => parseQualityReview('{"pass":true,"score":90}'));
});
