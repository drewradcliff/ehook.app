#!/usr/bin/env node

import { Command } from 'commander';
import { startProxy } from './proxy.js';
import type { ProxyOptions } from './types.js';
import { displayUI } from './ui.js';

const program = new Command();

program
  .name('ehook')
  .description('Proxy webhook events from ehook.app to your localhost')
  .version('0.1.0');

program
  .command('listen')
  .description('Listen for webhook events and forward them to localhost')
  .argument('<port>', 'localhost port to forward requests to')
  .option('-p, --path <path>', 'optional path to append to localhost URL', '')
  .action(async (port: string, options: { path?: string }) => {
    // Get UUID from environment variable
    const uuid = process.env.EHOOK_UUID;
    
    if (!uuid) {
      console.error('Error: EHOOK_UUID environment variable is required');
      console.error('Usage: EHOOK_UUID=<your-uuid> ehook listen <port>');
      process.exit(1);
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uuid)) {
      console.error('Error: Invalid UUID format');
      process.exit(1);
    }

    // Validate port
    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      console.error('Error: Port must be a number between 1 and 65535');
      process.exit(1);
    }

    // Prepare path
    let path = options.path || '';
    if (path && !path.startsWith('/')) {
      path = '/' + path;
    }

    const proxyOptions: ProxyOptions = {
      port: portNum,
      path,
      uuid,
    };

    // Initialize UI
    displayUI(proxyOptions);

    // Start proxy
    await startProxy(proxyOptions);
  });

program.parse();

