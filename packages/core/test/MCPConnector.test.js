import assert from 'node:assert/strict';
import { test } from 'node:test';

import MCPConnector from '../src/core/MCPConnector.js';

test('createSession returns isolated connector instances', async () => {
  const connectorA = MCPConnector.createSession();
  const connectorB = MCPConnector.createSession();

  connectorA._connectServer = async () => ({
    transport: 'bridge',
    tools: [{ name: 'alpha__tool', description: 'A', inputSchema: {} }],
    nextId: 2
  });
  connectorB._connectServer = async () => ({
    transport: 'bridge',
    tools: [{ name: 'beta__tool', description: 'B', inputSchema: {} }],
    nextId: 2
  });

  await connectorA.connect([{ name: 'alpha', url: 'http://localhost:3333', type: 'bridge' }]);
  await connectorB.connect([{ name: 'beta', url: 'http://localhost:4444', type: 'bridge' }]);

  assert.deepEqual(
    connectorA.tools.map((tool) => tool.name),
    ['alpha__tool']
  );
  assert.deepEqual(
    connectorB.tools.map((tool) => tool.name),
    ['beta__tool']
  );
});

test('attempt order respects declared server type', () => {
  const connector = MCPConnector.createSession();

  assert.deepEqual(connector._getAttemptOrder({ type: 'bridge' }), ['bridge']);
  assert.deepEqual(connector._getAttemptOrder({ type: 'remote' }), ['streamable-http', 'sse']);
  assert.deepEqual(connector._getAttemptOrder({ type: 'sse' }), ['sse', 'streamable-http']);
});

test('rejects unsupported MCP server URL protocols', () => {
  const connector = MCPConnector.createSession();

  assert.throws(
    () => connector._normalizeServerConfig({ name: 'bad', url: 'ftp://example.com' }, new Set()),
    /must use http:\/\/ or https:\/\//
  );
});

test('reuses cached large tool results for identical calls', async () => {
  const connector = MCPConnector.createSession();
  let bridgeCalls = 0;

  connector._connectServer = async () => ({
    transport: 'bridge',
    tools: [{ name: 'alpha__tool', description: 'Large tool', inputSchema: {} }],
    nextId: 2,
    url: 'http://localhost:3333',
    name: 'alpha'
  });

  connector._callBridgeTool = async () => {
    bridgeCalls += 1;
    return 'x'.repeat(900);
  };

  await connector.connect([{ name: 'alpha', url: 'http://localhost:3333', type: 'bridge' }]);

  await connector.tools[0].execute({ path: '/tmp/demo' });
  await connector.tools[0].execute({ path: '/tmp/demo' });

  assert.equal(bridgeCalls, 1);
});

test('combines all text blocks from MCP tool content results', async () => {
  const connector = MCPConnector.createSession();
  let postCalls = 0;

  connector._connectServer = async () => ({
    transport: 'bridge',
    tools: [{ name: 'alpha__tool', description: 'Multi block tool', inputSchema: {} }],
    nextId: 2,
    url: 'http://localhost:3333',
    name: 'alpha'
  });

  connector._postJson = async () => {
    postCalls += 1;
    return {
      result: {
        content: [
          { type: 'text', text: 'first' },
          { type: 'text', text: 'second' }
        ]
      }
    };
  };

  await connector.connect([{ name: 'alpha', url: 'http://localhost:3333', type: 'bridge' }]);

  const result = await connector.tools[0].execute({ path: '/tmp/demo' });

  assert.equal(result, 'first\n\nsecond');
  assert.equal(postCalls, 1);
});
