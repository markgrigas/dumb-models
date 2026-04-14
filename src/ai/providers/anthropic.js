import Anthropic from '@anthropic-ai/sdk';

export async function callModel({ systemPrompt, messages, settings, maxTokens }) {
  const client = new Anthropic({
    apiKey: settings.anthropicApiKey,
    dangerouslyAllowBrowser: true,
  });

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  });

  return response.content.find(b => b.type === 'text')?.text ?? '';
}
