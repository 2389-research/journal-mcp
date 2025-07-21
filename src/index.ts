#!/usr/bin/env node

// ABOUTME: Main entry point for the private journal MCP server
// ABOUTME: Handles command line arguments and starts the server

import * as path from 'node:path';
import { resolveProjectJournalPath } from './paths.js';
import { PrivateJournalServer } from './server.js';

function parseArguments(): string {
  const args = process.argv.slice(2);

  // Check for explicit journal path argument first
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--journal-path' && i + 1 < args.length) {
      return path.resolve(args[i + 1]);
    }
  }

  // Use shared path resolution logic
  return resolveProjectJournalPath();
}

async function main(): Promise<void> {
  try {
    const journalPath = parseArguments();
    const server = new PrivateJournalServer(journalPath);
    await server.run();
  } catch (error) {
    throw new Error(`Failed to start private journal MCP server: ${error}`);
  }
}

main().catch((error) => {
  process.stderr.write(`${error}\n`);
  process.exit(1);
});
