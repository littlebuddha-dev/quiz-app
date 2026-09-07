// Lists account-visible models; --smoke performs one text generation per configured provider.
// --images additionally generates one image per configured provider (billable).
import fs from 'node:fs';
import dotenv from 'dotenv';
import ts from 'typescript';
import { GoogleGenAI } from '@google/genai';

const fileEnv = {};
for (const file of ['.env', '.env.local']) {
  if (fs.existsSync(file)) Object.assign(fileEnv, dotenv.parse(fs.readFileSync(file)));
}
const env = { ...fileEnv, ...process.env };
const source = ts.transpileModule(fs.readFileSync(new URL('../lib/ai-models.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const catalog = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const results = [];
for (const provider of ['gemini', 'openai']) {
  const key = env[provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY']?.trim();
  if (!key) { results.push({ provider, status: 'not_configured' }); continue; }
  try {
    const base = provider === 'gemini' ? 'https://generativelanguage.googleapis.com/v1beta/models' : 'https://api.openai.com/v1/models';
    const headers = provider === 'gemini' ? { 'x-goog-api-key': key } : { Authorization: `Bearer ${key}` };
    const listed = new Map();
    let pageToken;
    do {
      const url = new URL(base);
      if (provider === 'gemini') { url.searchParams.set('pageSize', '1000'); if (pageToken) url.searchParams.set('pageToken', pageToken); }
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw Object.assign(new Error('Model list failed'), { status: response.status });
      const body = await response.json();
      for (const model of body.models || body.data || []) listed.set((model.name || model.id).replace(/^models\//, ''), model.supportedGenerationMethods);
      pageToken = body.nextPageToken;
    } while (provider === 'gemini' && pageToken);
    const ids = [...new Set(catalog.AI_MODELS.filter(model => model.provider === provider).flatMap(model => [model.generatorId, model.imageModelId]))];
    results.push({ provider, status: 'listed', models: ids.map(id => ({ id, listed: listed.has(id), methods: listed.get(id) })) });
    if (process.argv.includes('--smoke')) {
      const model = provider === 'gemini' ? catalog.GEMINI_PRIMARY_TEXT_MODEL : catalog.OPENAI_PRIMARY_TEXT_MODEL;
      const prompt = 'Return only JSON {"ja":"確認済み","en":"verified","zh":"已验证"}.';
      let text;
      if (provider === 'gemini') {
        const response = await new GoogleGenAI({ apiKey: key, httpOptions: { timeout: 60000 } }).models.generateContent({ model, contents: prompt, config: { responseMimeType: 'application/json', maxOutputTokens: 2048 } });
        text = response.text;
      } else {
        const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(60000), body: JSON.stringify({ model, input: prompt, max_output_tokens: 2048, text: { format: { type: 'json_object' } } }) });
        if (!response.ok) throw Object.assign(new Error('Text smoke failed'), { status: response.status });
        const body = await response.json();
        text = body.output?.flatMap(item => item.content || []).filter(part => part.type === 'output_text').map(part => part.text).join('');
      }
      const parsed = JSON.parse(text);
      if (!['ja', 'en', 'zh'].every(locale => typeof parsed[locale] === 'string' && parsed[locale])) throw new Error('Invalid multilingual JSON');
      results.push({ provider, model, status: 'text_generation_verified' });
    }
    if (process.argv.includes('--images')) {
      const model = provider === 'gemini' ? catalog.GEMINI_IMAGE_MODEL : catalog.OPENAI_IMAGE_MODEL;
      const prompt = 'One simple blue circle centered on a white background. No text.';
      let hasImage;
      if (provider === 'gemini') {
        const response = await new GoogleGenAI({ apiKey: key, httpOptions: { timeout: 60000 } }).models.generateContent({ model, contents: prompt, config: { responseModalities: ['IMAGE'] } });
        hasImage = response.candidates?.some(candidate => candidate.content?.parts?.some(part => part.inlineData?.data && part.inlineData?.mimeType?.startsWith('image/')));
      } else {
        const response = await fetch('https://api.openai.com/v1/images/generations', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(60000), body: JSON.stringify({ model, prompt, size: '1536x1024', quality: 'medium', output_format: 'png' }) });
        if (!response.ok) throw Object.assign(new Error('Image smoke failed'), { status: response.status });
        hasImage = Boolean((await response.json()).data?.[0]?.b64_json);
      }
      if (!hasImage) throw new Error('No image returned');
      results.push({ provider, model, status: 'image_generation_verified' });
    }
  } catch (error) {
    // Never print provider error bodies, URLs, headers, keys, or generated image data.
    results.push({ provider, status: 'verification_failed', error: error.name, httpStatus: error.status });
    process.exitCode = 1;
  }
}
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));
