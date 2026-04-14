/**
 * MCP provider — delegates generation to a user-hosted MCP server.
 *
 * The server must expose a tool named "generate_scene" with this input schema:
 *   { prompt, systemPrompt, examples, history? }
 * and return the scene JSON as a string in the tool result content.
 *
 * Transport: HTTP (Streamable HTTP MCP) or WebSocket.
 * The server URL is stored in settings.mcpServerUrl.
 */

export async function callModel({ systemPrompt, messages, settings }) {
  const serverUrl = settings.mcpServerUrl;
  if (!serverUrl) throw new Error('MCP server URL not configured');

  // Extract user prompt and optional history from messages array
  const userMessage  = messages.at(-1)?.content ?? '';
  const history      = messages.slice(0, -1);

  // MCP Streamable HTTP: POST to /mcp with a tools/call request
  const mcpRequest = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: 'generate_scene',
      arguments: {
        prompt: userMessage,
        systemPrompt,
        history,
      },
    },
  };

  const endpoint = serverUrl.replace(/^ws/, 'http').replace(/\/$/, '') + '/mcp';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mcpRequest),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => response.statusText);
    throw new Error(`MCP server error ${response.status}: ${err}`);
  }

  const data = await response.json();

  // MCP tool result content is an array of content blocks
  const content = data.result?.content;
  if (!Array.isArray(content)) throw new Error('Invalid MCP response — expected content array');

  const textBlock = content.find(b => b.type === 'text');
  if (!textBlock) throw new Error('MCP server returned no text content');

  return textBlock.text;
}
