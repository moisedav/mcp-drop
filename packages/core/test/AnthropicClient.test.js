import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import APIKeyManager from '../src/core/APIKeyManager.js';
import AnthropicClient from '../src/core/AnthropicClient.js';

const originalFetch = globalThis.fetch;
const originalStream = AnthropicClient.stream;
const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;
const originalConsoleWarn = console.warn;

function createSseResponse(events) {
  const encoder = new TextEncoder();

  return new Response(new ReadableStream({
    start(controller) {
      events.forEach((event) => {
        controller.enqueue(encoder.encode(event));
      });
      controller.close();
    }
  }), {
    headers: {
      'content-type': 'text/event-stream'
    }
  });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.setTimeout = originalSetTimeout;
  globalThis.clearTimeout = originalClearTimeout;
  console.warn = originalConsoleWarn;
  AnthropicClient.stream = originalStream;
  APIKeyManager.clear();
});

test('parses Anthropic SSE streaming events into text content', async () => {
  APIKeyManager.set('sk-ant-demo', false);

  globalThis.fetch = async () => createSseResponse([
    'event: message_start\ndata: {"type":"message_start","message":{"stop_reason":null}}\n\n',
    'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n',
    'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hel"}}\n\n',
    'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"lo"}}\n\n',
    'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n',
    'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}\n\n',
    'event: message_stop\ndata: {"type":"message_stop"}\n\n'
  ]);

  const deltas = [];
  const response = await AnthropicClient.stream({
    messages: [{ role: 'user', content: 'Hi' }],
    onTextDelta: (delta) => {
      deltas.push(delta);
    }
  });

  assert.deepEqual(deltas, ['Hel', 'lo']);
  assert.equal(response.stop_reason, 'end_turn');
  assert.deepEqual(response.content, [{ type: 'text', text: 'Hello' }]);
});

test('truncates oversized tool results before sending them back to the model', async () => {
  const calls = [];

  AnthropicClient.stream = async ({ messages }) => {
    calls.push(messages);

    if (calls.length === 1) {
      return {
        stop_reason: 'tool_use',
        content: [
          { type: 'tool_use', id: 'tool-1', name: 'demo_tool', input: {} }
        ]
      };
    }

    return {
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'done' }]
    };
  };

  const reply = await AnthropicClient.sendWithTools({
    messages: [{ role: 'user', content: 'run the tool' }],
    tools: [
      {
        name: 'demo_tool',
        description: 'Demo tool',
        input_schema: {},
        execute: async () => 'x'.repeat(23050)
      }
    ]
  });

  const toolResult = calls[1][calls[1].length - 1].content[0].content;

  assert.equal(reply, 'done');
  assert.match(toolResult, /\[truncated \d+ chars - ask for specific details\]/);
  assert.ok(toolResult.length < 20500);
});

test('streams partial text back to the UI callback', async () => {
  AnthropicClient.stream = async ({ onTextDelta }) => {
    onTextDelta?.('Hel');
    onTextDelta?.('lo');
    return {
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Hello' }]
    };
  };

  const partials = [];
  const reply = await AnthropicClient.sendWithTools({
    messages: [{ role: 'user', content: 'Say hello' }],
    onTextDelta: ({ text }) => {
      partials.push(text);
    }
  });

  assert.equal(reply, 'Hello');
  assert.deepEqual(partials, ['Hel', 'Hello']);
});

test('returns a denied tool result when the user rejects approval', async () => {
  const calls = [];
  let executeCount = 0;

  AnthropicClient.stream = async ({ messages }) => {
    calls.push(messages);

    if (calls.length === 1) {
      return {
        stop_reason: 'tool_use',
        content: [
          { type: 'tool_use', id: 'tool-1', name: 'demo_tool', input: { target: 'repo' } }
        ]
      };
    }

    return {
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Tool was skipped.' }]
    };
  };

  const reply = await AnthropicClient.sendWithTools({
    messages: [{ role: 'user', content: 'Run the tool' }],
    tools: [
      {
        name: 'demo_tool',
        description: 'Demo tool',
        input_schema: {},
        execute: async () => {
          executeCount += 1;
          return 'should not run';
        }
      }
    ],
    onToolApproval: async () => ({ allowed: false })
  });

  const deniedToolResult = calls[1][calls[1].length - 1].content[0];

  assert.equal(reply, 'Tool was skipped.');
  assert.equal(executeCount, 0);
  assert.equal(deniedToolResult.is_error, true);
  assert.match(deniedToolResult.content, /denied by the user/);
});

test('stops runaway tool loops after the maximum iteration count', async () => {
  AnthropicClient.stream = async () => ({
    stop_reason: 'tool_use',
    content: [
      { type: 'tool_use', id: 'loop-tool', name: 'demo_tool', input: {} }
    ]
  });

  await assert.rejects(
    AnthropicClient.sendWithTools({
      messages: [{ role: 'user', content: 'loop forever' }],
      tools: [
        {
          name: 'demo_tool',
          description: 'Loop tool',
          input_schema: {},
          execute: async () => 'ok'
        }
      ]
    }),
    /Tool loop exceeded 8 rounds/
  );
});

test('blocks identical repeated tool calls so the model proceeds with the edit', async () => {
  let executeCount = 0;

  AnthropicClient.stream = async ({ messages }) => {
    const lastMessage = messages[messages.length - 1];
    const blockedRepeat = Array.isArray(lastMessage?.content)
      && lastMessage.content.some((block) =>
        block?.type === 'tool_result' && /already used multiple times/.test(block.content)
      );

    if (blockedRepeat) {
      return {
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Proceeding with the change.' }]
      };
    }

    return {
      stop_reason: 'tool_use',
      content: [{ type: 'tool_use', id: 'tool-1', name: 'demo_tool', input: { page: '/old-home' } }]
    };
  };

  const reply = await AnthropicClient.sendWithTools({
    messages: [{ role: 'user', content: 'Change that red section to blue.' }],
    tools: [
      {
        name: 'demo_tool',
        description: 'Inspect page',
        input_schema: {},
        execute: async () => {
          executeCount += 1;
          return '<html>large page dump</html>';
        }
      }
    ]
  });

  assert.equal(reply, 'Proceeding with the change.');
  assert.equal(executeCount, 2);
});

test('does not surface interim narration from tool_use rounds to the UI', async () => {
  const seenTexts = [];
  let callCount = 0;

  AnthropicClient.stream = async ({ onTextDelta }) => {
    callCount += 1;

    if (callCount === 1) {
      onTextDelta?.('I will inspect the page first.');
      return {
        stop_reason: 'tool_use',
        content: [{ type: 'tool_use', id: 'tool-1', name: 'demo_tool', input: {} }]
      };
    }

    onTextDelta?.('Done.');
    return {
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Done.' }]
    };
  };

  const reply = await AnthropicClient.sendWithTools({
    messages: [{ role: 'user', content: 'Make the edit.' }],
    tools: [
      {
        name: 'demo_tool',
        description: 'Inspect page',
        input_schema: {},
        execute: async () => 'context'
      }
    ],
    onTextDelta: ({ text }) => {
      seenTexts.push(text);
    }
  });

  assert.equal(reply, 'Done.');
  assert.deepEqual(seenTexts, ['Done.']);
});

test('removes orphaned tool_result blocks before calling the API', async () => {
  APIKeyManager.set('sk-ant-demo', false);
  let requestBody = null;
  const warnings = [];

  console.warn = (message) => warnings.push(message);

  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({ content: [{ type: 'text', text: 'ok' }] }), {
      headers: { 'content-type': 'application/json' }
    });
  };

  const messages = [
    { role: 'user', content: 'opening request '.repeat(120) },
    {
      role: 'user',
      content: [
        { type: 'tool_result', tool_use_id: 'missing-tool', content: 'x'.repeat(1200) }
      ]
    },
    ...Array.from({ length: 10 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: `message-${index} `.repeat(80)
    }))
  ];

  await AnthropicClient.send({ messages });

  assert.ok(requestBody.messages.length <= 24);
  assert.doesNotMatch(JSON.stringify(requestBody.messages), /tool_result/);
  assert.ok(warnings.some((message) => /Removed orphaned tool_result/.test(message)));
});

test('trims old tool rounds together so tool_result blocks never lose their tool_use', async () => {
  APIKeyManager.set('sk-ant-demo', false);
  let requestBody = null;

  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({ content: [{ type: 'text', text: 'ok' }] }), {
      headers: { 'content-type': 'application/json' }
    });
  };

  const messages = [
    { role: 'user', content: 'First request' },
    {
      role: 'assistant',
      content: [{ type: 'tool_use', id: 'tool-1', name: 'demo_tool', input: { path: '/' } }]
    },
    {
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: 'tool-1', content: 'x'.repeat(900) }]
    },
    ...Array.from({ length: 9 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: `follow-up-${index} `.repeat(120)
    }))
  ];

  await AnthropicClient.send({ messages });

  const serializedMessages = JSON.stringify(requestBody.messages);
  assert.match(serializedMessages, /Context from earlier conversation/);
  assert.doesNotMatch(serializedMessages, /"type":"tool_result"/);
  assert.doesNotMatch(serializedMessages, /"type":"tool_use"/);
});

test('retries once after a 429 response and emits countdown updates', async () => {
  APIKeyManager.set('sk-ant-demo', false);
  let attempt = 0;
  const countdowns = [];

  globalThis.setTimeout = (fn) => {
    fn();
    return 0;
  };
  globalThis.clearTimeout = () => {};

  globalThis.fetch = async () => {
    attempt += 1;

    if (attempt === 1) {
      return new Response(JSON.stringify({ error: { message: 'rate limited' } }), {
        status: 429,
        headers: { 'content-type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ content: [{ type: 'text', text: 'retried ok' }] }), {
      headers: { 'content-type': 'application/json' }
    });
  };

  const response = await AnthropicClient.send({
    messages: [{ role: 'user', content: 'Hello' }],
    onRetryCountdown: (seconds) => countdowns.push(seconds)
  });

  assert.equal(response.content[0].text, 'retried ok');
  assert.equal(attempt, 2);
  assert.equal(countdowns[0], 15);
  assert.equal(countdowns[countdowns.length - 1], 0);
});
