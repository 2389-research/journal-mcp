#!/usr/bin/env node
// ABOUTME: Installs this plugin the way Claude Code's /plugin install does, then starts each MCP server it declares
// ABOUTME: Copies git-tracked files, runs npm ci --ignore-scripts, and checks every server answers tools/list

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const TIMEOUT_MS = 30000;
const repo = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).stdout.trim();

// Claude Code clones the repo, so a user gets only the files git tracks.
function copyTrackedFiles(dest) {
  const listed = spawnSync('git', ['ls-files', '-z'], { cwd: repo, encoding: 'utf8' }).stdout;
  for (const file of listed.split('\0').filter(Boolean)) {
    const from = path.join(repo, file);
    if (!fs.existsSync(from)) continue; // deleted in the working tree, not yet staged
    fs.mkdirSync(path.dirname(path.join(dest, file)), { recursive: true });
    fs.copyFileSync(from, path.join(dest, file));
  }
}

// Claude Code runs `npm ci --ignore-scripts` when the plugin root holds package.json and
// package-lock.json, so no build or install script ever runs.
function installDependencies(root) {
  if (!fs.existsSync(path.join(root, 'package-lock.json'))) return null;
  const res = spawnSync('npm', ['ci', '--ignore-scripts'], { cwd: root, encoding: 'utf8' });
  return res.status === 0 ? null : `npm ci --ignore-scripts failed:\n${res.stderr}`;
}

// plugin.json's mcpServers is either the servers object or a path to a file that holds one
// under an mcpServers key.
function readServers(root) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin', 'plugin.json'), 'utf8'));
  let servers = manifest.mcpServers ?? {};
  if (typeof servers === 'string') {
    servers = JSON.parse(fs.readFileSync(path.join(root, servers), 'utf8')).mcpServers;
  }
  return servers;
}

// Claude Code expands ${CLAUDE_PLUGIN_ROOT}, ${VAR} and ${VAR:-default}; an unset ${VAR} stays literal.
function expand(value, root) {
  return value.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-([^}]*))?\}/g, (whole, name, fallback) => {
    if (name === 'CLAUDE_PLUGIN_ROOT') return root;
    if (name in process.env) return process.env[name];
    return fallback ?? whole;
  });
}

function checkServer(server, root, home, cwd) {
  // Only PATH and a scratch HOME, plus the plugin's own env block, so nothing from this shell leaks in.
  const env = { PATH: process.env.PATH, HOME: home };
  for (const [key, value] of Object.entries(server.env ?? {})) env[key] = expand(value, root);
  const args = (server.args ?? []).map((arg) => expand(arg, root));
  const child = spawn(expand(server.command, root), args, { cwd, env });

  return new Promise((resolve) => {
    let stderr = '';
    let buffer = '';
    let done = false;
    const finish = (ok, detail) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      child.kill();
      resolve({ ok, detail });
    };
    const timer = setTimeout(() => finish(false, `no tools/list reply within ${TIMEOUT_MS / 1000}s\n${stderr}`), TIMEOUT_MS);
    const send = (message) => child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`);

    child.on('error', (err) => finish(false, err.message));
    child.on('exit', (code) => finish(false, `exited with code ${code} before answering tools/list\n${stderr}`));
    child.stdin.on('error', () => {}); // a dead server is reported by the exit handler
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.stdout.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        let message;
        try { message = JSON.parse(line); } catch { continue; }
        if (message.id === 1 && message.error) finish(false, `initialize failed: ${JSON.stringify(message.error)}`);
        else if (message.id === 1) {
          send({ method: 'notifications/initialized' });
          send({ id: 2, method: 'tools/list', params: {} });
        } else if (message.id === 2) {
          const tools = message.result?.tools ?? [];
          finish(tools.length > 0, `${tools.length} tools`);
        }
      }
    });

    send({ id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'check-plugin-install', version: '1' } } });
  });
}

async function main() {
  const [root, home, cwd] = ['root', 'home', 'cwd'].map((label) => fs.mkdtempSync(path.join(os.tmpdir(), `plugin-install-${label}-`)));
  try {
    copyTrackedFiles(root);
    const installError = installDependencies(root);
    if (installError) {
      console.log(`FAIL ${installError}`);
      return 1;
    }
    const servers = Object.entries(readServers(root));
    if (servers.length === 0) {
      console.log('FAIL the plugin declares no MCP servers');
      return 1;
    }
    let failures = 0;
    for (const [name, server] of servers) {
      const result = await checkServer(server, root, home, cwd);
      console.log(`${result.ok ? 'PASS' : 'FAIL'} ${name}: ${result.detail}`);
      if (!result.ok) failures++;
    }
    return failures === 0 ? 0 : 1;
  } finally {
    for (const dir of [root, home, cwd]) fs.rmSync(dir, { recursive: true, force: true });
  }
}

process.exitCode = await main();
