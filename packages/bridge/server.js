#!/usr/bin/env node
import MCPBridge from './lib/MCPBridge.js';
import ProxyServer from './lib/ProxyServer.js';

const PORT = process.env.PORT || 3333;

// Parse config from command line args
// Usage: node server.js --server name,command,arg1,arg2
//        node server.js --sse name,url
const args = process.argv.slice(2);
const serversToConnect = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--server' && args[i + 1]) {
    const parts = args[i + 1].split(',').map(part => part.trim());
    if (parts[0] && parts[1]) {
      serversToConnect.push({
        type: 'stdio',
        name: parts[0],
        command: parts[1],
        args: parts.slice(2).filter(Boolean)
      });
    } else {
      console.warn(`[mcp-drop-bridge] Ignoring invalid --server argument: ${args[i + 1]}`);
    }
    i++;
  } else if (args[i] === '--sse' && args[i + 1]) {
    const parts = args[i + 1].split(',').map(part => part.trim());
    if (parts[0] && parts[1]) {
      serversToConnect.push({
        type: 'sse',
        name: parts[0],
        url: parts[1]
      });
    } else {
      console.warn(`[mcp-drop-bridge] Ignoring invalid --sse argument: ${args[i + 1]}`);
    }
    i++;
  }
}

async function main() {
  console.info('\n╔════════════════════════════════╗');
  console.info('║     @mcp-drop/bridge v0.1.0     ║');
  console.info('╚════════════════════════════════╝\n');

  const bridge = new MCPBridge();
  const server = new ProxyServer(bridge, PORT);

  // Connect servers from CLI args
  for (const s of serversToConnect) {
    try {
      if (s.type === 'stdio') {
        await bridge.connectStdio(s.name, s.command, s.args);
      } else {
        await bridge.connectSSE(s.name, s.url);
      }
    } catch (err) {
      console.warn(`[mcp-drop-bridge] Could not connect to "${s.name}": ${err?.message || 'Unknown error'}`);
    }
  }

  server.start();

  // Graceful shutdown
  const shutdown = async () => {
    console.info('\n[mcp-drop-bridge] Shutting down...');
    await bridge.disconnectAll();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(err => {
  console.error(`[mcp-drop-bridge] Fatal error: ${err?.message || err}`);
  process.exit(1);
});
