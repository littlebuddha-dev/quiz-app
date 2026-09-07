const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function loadTs(file, mocks = {}) {
  const filename = path.resolve(__dirname, '..', file);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = loaded.require.bind(loaded);
  loaded.require = name => Object.hasOwn(mocks, name) ? mocks[name] : original(name);
  loaded._compile(compiled, filename);
  return loaded.exports;
}
const models = loadTs('lib/ai-models.ts');
const provider = loadTs('lib/ai-provider.ts', {
  './ai-models': models, './nanobanana': {},
  '@google/genai': { GoogleGenAI: class { models = { generateContent: async () => ({ text: '{}', usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, thoughtsTokenCount: 30 } }) }; } },
});
test('latest default and explicit older modes resolve independently', () => {
  assert.equal(models.getModelById(models.DEFAULT_MODEL_ID).generatorId, 'gemini-3.8-flash');
  assert.equal(models.getModelById('hybrid-gemini37-flash').generatorId, 'gemini-3.7-flash');
  assert.equal(models.normalizeModelId(models.GEMINI_FALLBACK_TEXT_MODEL), 'gemini-3.6-flash');
  for (const model of models.AI_MODELS) assert.equal(models.getModelById(model.generatorId).provider, model.provider);
});
test('all selectable text models have explicit pricing', () => {
  for (const model of models.AI_MODELS) assert.ok(models.MODEL_PRICING[model.generatorId], model.generatorId);
  assert.equal(new Set(models.AI_MODELS.map(model => model.id)).size, models.AI_MODELS.length);
});
test('Gemini introductory pricing expires at the documented boundary', () => {
  assert.equal(models.calculateEstimatedCost('gemini-3.8-flash', 1e6, 1e6, new Date('2026-12-31T23:59:59Z')), 4.5);
  assert.equal(models.calculateEstimatedCost('gemini-3.8-flash', 1e6, 1e6, new Date('2027-01-01T00:00:00Z')), 9);
  assert.equal(models.calculateEstimatedCost(models.DEFAULT_MODEL_ID, 1e6, 1e6, new Date('2026-09-07')), 4.5);
});
test('new OpenAI models use their own rates and provider', () => {
  for (const [model, cost] of [['gpt-6-astra', 60], ['gpt-5.6-sol', 24], ['gpt-5.6-terra', 14], ['gpt-5.6-luna', 1.4]]) {
    assert.equal(provider.inferAIProvider(model), 'openai');
    assert.equal(models.calculateEstimatedCost(model, 1e6, 1e6), cost);
  }
});
test('unavailable models permit fallback, invalid requests and credentials do not', () => {
  for (const status of [404, 408, 429, 503]) {
    assert.equal(provider.isRetryableAIError(new provider.AIProviderError('test', { status })), true);
    assert.equal(provider.isRetryableAIError({ status }), true);
  }
  for (const status of [400, 401, 403]) assert.equal(provider.isRetryableAIError(new provider.AIProviderError('test', { status })), false);
});
test('Gemini usage includes billable thinking tokens', async () => {
  const result = await provider.generateAIText({ model: 'gemini-3.8-flash', prompt: 'JSON', env: { GEMINI_API_KEY: 'test-only' } });
  assert.deepEqual(result.usage, { promptTokens: 10, candidateTokens: 50 });
});
test('all current OpenAI tiers preserve the Responses JSON contract', async () => {
  const originalFetch = global.fetch;
  try {
    for (const model of ['gpt-6-astra', 'gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna']) {
      global.fetch = async (url, init) => {
        assert.equal(url, 'https://api.openai.com/v1/responses');
        const body = JSON.parse(init.body);
        assert.equal(body.model, model);
        assert.deepEqual(body.text, { format: { type: 'json_object' } });
        for (const unsupported of ['temperature', 'top_p', 'top_logprobs']) assert.equal(unsupported in body, false);
        return new Response(JSON.stringify({ output: [{ content: [{ type: 'output_text', text: '{"ok":true}' }] }], usage: { input_tokens: 10, output_tokens: 20 } }));
      };
      const result = await provider.generateAIText({ model, prompt: 'Return JSON', env: { OPENAI_API_KEY: 'test-only' } });
      assert.equal(result.text, '{"ok":true}');
      assert.deepEqual(result.usage, { promptTokens: 10, candidateTokens: 20 });
    }
  } finally { global.fetch = originalFetch; }
});
