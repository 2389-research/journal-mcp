#!/usr/bin/env node

// ABOUTME: Main entry point for the private journal MCP server
// ABOUTME: Handles command line arguments and starts the server

import * as path from 'node:path';
import { resolveProjectJournalPath } from './paths';
import { PrivateJournalServer } from './server';

function showHelp(): void {
  console.log(`
Private Journal MCP Server v1.2.0

A comprehensive MCP server providing Claude with private journaling capabilities.

USAGE:
  private-journal-mcp [OPTIONS]

OPTIONS:
  --journal-path <path>    Specify custom journal directory path
  --help, -h              Show this help message

DESCRIPTION:
  This MCP server provides Claude with comprehensive journaling capabilities including:

  • Multi-section private journaling (feelings, project notes, technical insights, etc.)
  • Semantic search across all journal entries using local AI embeddings
  • MCP resources for discoverable journal entries
  • Guided prompts for reflection and learning

  Journal entries are stored locally with dual storage:
  • Project notes: .private-journal/ in current project directory
  • Personal thoughts: ~/.private-journal/ in user home directory

  All processing happens locally - no data leaves your machine.

ENVIRONMENT VARIABLES:
  JOURNAL_EMBEDDING_MODEL     Custom embedding model name
  JOURNAL_DEBUG              Enable debug logging (true/false)
  REMOTE_JOURNAL_SERVER_URL   Remote server URL (optional)
  REMOTE_JOURNAL_TEAMID       Remote team ID (optional)
  REMOTE_JOURNAL_APIKEY       Remote API key (optional)
  REMOTE_JOURNAL_ONLY         Remote-only mode (true/false)

EXAMPLES:
  # Start with default journal path resolution
  private-journal-mcp

  # Start with custom journal path
  private-journal-mcp --journal-path /custom/path

  # Show help
  private-journal-mcp --help

For more information, visit: https://github.com/2389-research/journal-mcp\n`);
}

function parseArguments(): string | null {
  const args = process.argv.slice(2);

  // Check for help flags first
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return null;
  }

  // Check for explicit journal path argument
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

    // If help was shown (journalPath is null), exit gracefully
    if (journalPath === null) {
      process.exit(0);
    }

    // Log environment info for debugging
    console.error('=== Private Journal MCP Server Debug Info ===');
    console.error(`Node.js version: ${process.version}`);
    console.error(`Platform: ${process.platform}`);
    console.error(`Architecture: ${process.arch}`);

    try {
      console.error(`Current working directory: ${process.cwd()}`);
    } catch (error) {
      console.error(`Failed to get current working directory: ${error}`);
    }

    console.error(`Environment variables:`);
    console.error(`  HOME: ${process.env.HOME || 'undefined'}`);
    console.error(`  USERPROFILE: ${process.env.USERPROFILE || 'undefined'}`);
    console.error(`  TEMP: ${process.env.TEMP || 'undefined'}`);
    console.error(`  TMP: ${process.env.TMP || 'undefined'}`);
    console.error(`  USER: ${process.env.USER || 'undefined'}`);
    console.error(`  USERNAME: ${process.env.USERNAME || 'undefined'}`);

    console.error(`Selected journal path: ${journalPath}`);
    console.error('===============================================');

    const server = new PrivateJournalServer(journalPath);
    await server.run();
  } catch (error) {
    console.error('Failed to start private journal MCP server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
