export async function callModel({ systemPrompt, messages, settings, maxTokens }) {
  const url    = (settings.openaiCompatUrl ?? 'http://localhost:11434/v1').replace(/\/$/, '');
  const model  = settings.openaiCompatModel ?? 'llama3';
  const apiKey = settings.openaiCompatKey   ?? 'none';

  const body = {
    model,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
  };

  const response = await fetch(`${url}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => response.statusText);
    throw new Error(`OpenAI-compatible endpoint error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}
