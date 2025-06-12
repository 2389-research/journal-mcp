// ABOUTME: Tests for remote journal posting with mock HTTP validation
// ABOUTME: Validates real HTTP request structure, headers, and payloads

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { JournalManager } from '../src/journal';
import { RemoteConfig } from '../src/remote';

// Mock node-fetch but capture the actual HTTP calls
jest.mock('node-fetch', () => jest.fn());
const mockFetch = require('node-fetch') as jest.MockedFunction<any>;

describe('Remote Journal HTTP Integration', () => {
  let projectTempDir: string;
  let userTempDir: string;
  let journalManager: JournalManager;
  let originalHome: string | undefined;
  let capturedFetchCalls: Array<{
    url: string;
    options: any;
    body: any;
  }>;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Mock console output to keep test output clean
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    projectTempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'journal-http-test-'));
    userTempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'journal-user-http-test-'));

    // Mock HOME environment
    originalHome = process.env.HOME;
    process.env.HOME = userTempDir;

    // Reset captured calls
    capturedFetchCalls = [];

    // Setup mock fetch to capture calls and return appropriate responses
    mockFetch.mockImplementation((url: string, options: any) => {
      const body = options.body ? JSON.parse(options.body) : null;
      capturedFetchCalls.push({ url, options, body });

      // Simulate different response scenarios
      const apiKey = options.headers?.['x-api-key'];
      const teamId = options.headers?.['x-team-id'];

      if (apiKey === 'invalid-key') {
        return Promise.resolve({
          ok: false,
          status: 403,
          statusText: 'Forbidden'
        });
      }

      if (teamId === 'error-team') {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        });
      }

      if (url.includes('unreachable')) {
        return Promise.reject(new Error('connect ECONNREFUSED'));
      }

      // Default successful response
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK'
      });
    });
  });

  afterEach(async () => {
    // Restore console methods
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();

    // Restore original HOME
    if (originalHome !== undefined) {
      process.env.HOME = originalHome;
    } else {
      delete process.env.HOME;
    }

    // Clear mock
    mockFetch.mockClear();

    await fs.rm(projectTempDir, { recursive: true, force: true });
    await fs.rm(userTempDir, { recursive: true, force: true });
  });

  test('sends POST request with correct URL and headers', async () => {
    const remoteConfig: RemoteConfig = {
      serverUrl: 'https://api.test.com',
      teamId: 'test-team',
      apiKey: 'test-api-key',
      enabled: true
    };

    journalManager = new JournalManager(projectTempDir, undefined, remoteConfig);

    await journalManager.writeEntry('Test HTTP request validation');

    // Wait for async HTTP request
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(capturedFetchCalls).toHaveLength(1);

    const call = capturedFetchCalls[0];
    expect(call.url).toBe('https://api.test.com/journal/entries');
    expect(call.options.method).toBe('POST');
    expect(call.options.headers['Content-Type']).toBe('application/json');
    expect(call.options.headers['x-api-key']).toBe('test-api-key');
    expect(call.options.headers['x-team-id']).toBe('test-team');
  });

  test('sends JSON payload with content and embedding vector', async () => {
    const remoteConfig: RemoteConfig = {
      serverUrl: 'https://api.test.com',
      teamId: 'test-team',
      apiKey: 'test-api-key',
      enabled: true
    };

    journalManager = new JournalManager(projectTempDir, undefined, remoteConfig);

    await journalManager.writeEntry('Testing payload structure');

    await new Promise(resolve => setTimeout(resolve, 50));

    const call = capturedFetchCalls[0];
    expect(call.body).toEqual({
      team_id: 'test-team',
      timestamp: expect.any(Number),
      content: 'Testing payload structure',
      embedding: expect.any(Array)
    });

    // Verify embedding is valid vector
    expect(call.body.embedding).toHaveLength(5); // Mock embedding length
    expect(call.body.embedding.every((n: any) => typeof n === 'number')).toBe(true);
  });

  test('sends structured thoughts with sections and embedding', async () => {
    const remoteConfig: RemoteConfig = {
      serverUrl: 'https://api.test.com',
      teamId: 'test-team',
      apiKey: 'test-api-key',
      enabled: true
    };

    journalManager = new JournalManager(projectTempDir, undefined, remoteConfig);

    const thoughts = {
      feelings: 'Testing HTTP integration feels great',
      project_notes: 'HTTP validation is working well',
      technical_insights: 'Mock fetch provides good test coverage'
    };

    await journalManager.writeThoughts(thoughts);

    await new Promise(resolve => setTimeout(resolve, 50));

    const call = capturedFetchCalls[0];
    expect(call.body).toEqual({
      team_id: 'test-team',
      timestamp: expect.any(Number),
      sections: {
        feelings: 'Testing HTTP integration feels great',
        project_notes: 'HTTP validation is working well',
        user_context: undefined,
        technical_insights: 'Mock fetch provides good test coverage',
        world_knowledge: undefined
      },
      embedding: expect.any(Array)
    });
  });

  test('validates timestamp precision in payload', async () => {
    const remoteConfig: RemoteConfig = {
      serverUrl: 'https://api.test.com',
      teamId: 'test-team',
      apiKey: 'test-api-key',
      enabled: true
    };

    journalManager = new JournalManager(projectTempDir, undefined, remoteConfig);

    const beforeTime = Date.now();
    await journalManager.writeEntry('Timestamp precision test');
    const afterTime = Date.now();

    await new Promise(resolve => setTimeout(resolve, 50));

    const call = capturedFetchCalls[0];
    expect(call.body.timestamp).toBeGreaterThanOrEqual(beforeTime);
    expect(call.body.timestamp).toBeLessThanOrEqual(afterTime);
    expect(Number.isInteger(call.body.timestamp)).toBe(true);
  });

  test('handles HTTP 403 authentication errors gracefully', async () => {
    const remoteConfig: RemoteConfig = {
      serverUrl: 'https://api.test.com',
      teamId: 'test-team',
      apiKey: 'invalid-key', // Triggers 403 response
      enabled: true
    };

    journalManager = new JournalManager(projectTempDir, undefined, remoteConfig);

    // Should not throw - local journaling continues
    await expect(journalManager.writeEntry('Auth error test')).resolves.not.toThrow();

    await new Promise(resolve => setTimeout(resolve, 50));

    // Verify request was attempted
    expect(capturedFetchCalls).toHaveLength(1);
    expect(capturedFetchCalls[0].options.headers['x-api-key']).toBe('invalid-key');

    // Verify local file was still created
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    const dayDir = path.join(projectTempDir, dateString);
    const files = await fs.readdir(dayDir);
    expect(files.some(f => f.endsWith('.md'))).toBe(true);
  });

  test('handles HTTP 500 server errors gracefully', async () => {
    const remoteConfig: RemoteConfig = {
      serverUrl: 'https://api.test.com',
      teamId: 'error-team', // Triggers 500 response
      apiKey: 'test-api-key',
      enabled: true
    };

    journalManager = new JournalManager(projectTempDir, undefined, remoteConfig);

    // Should not throw - local journaling continues
    await expect(journalManager.writeEntry('Server error test')).resolves.not.toThrow();

    await new Promise(resolve => setTimeout(resolve, 50));

    // Verify request was attempted
    expect(capturedFetchCalls).toHaveLength(1);
    expect(capturedFetchCalls[0].options.headers['x-team-id']).toBe('error-team');
  });

  test('handles network connection errors gracefully', async () => {
    const remoteConfig: RemoteConfig = {
      serverUrl: 'https://unreachable.test.com',
      teamId: 'test-team',
      apiKey: 'test-api-key',
      enabled: true
    };

    journalManager = new JournalManager(projectTempDir, undefined, remoteConfig);

    // Should not throw - local journaling continues
    await expect(journalManager.writeEntry('Connection error test')).resolves.not.toThrow();

    await new Promise(resolve => setTimeout(resolve, 50));

    // Verify request was attempted (but failed)
    expect(capturedFetchCalls).toHaveLength(1);

    // Verify local file was still created
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    const dayDir = path.join(projectTempDir, dateString);
    const files = await fs.readdir(dayDir);
    expect(files.some(f => f.endsWith('.md'))).toBe(true);
  });

  test('validates request body is properly JSON serialized', async () => {
    const remoteConfig: RemoteConfig = {
      serverUrl: 'https://api.test.com',
      teamId: 'test-team',
      apiKey: 'test-api-key',
      enabled: true
    };

    journalManager = new JournalManager(projectTempDir, undefined, remoteConfig);

    await journalManager.writeEntry('JSON serialization test');

    await new Promise(resolve => setTimeout(resolve, 50));

    const call = capturedFetchCalls[0];

    // Verify the body string is valid JSON
    expect(() => JSON.parse(call.options.body)).not.toThrow();

    // Verify parsed body matches expected structure
    const parsedBody = JSON.parse(call.options.body);
    expect(parsedBody).toHaveProperty('team_id');
    expect(parsedBody).toHaveProperty('timestamp');
    expect(parsedBody).toHaveProperty('content');
    expect(parsedBody).toHaveProperty('embedding');
  });

  test('validates all required headers are present', async () => {
    const remoteConfig: RemoteConfig = {
      serverUrl: 'https://api.test.com',
      teamId: 'test-team',
      apiKey: 'test-api-key',
      enabled: true
    };

    journalManager = new JournalManager(projectTempDir, undefined, remoteConfig);

    await journalManager.writeEntry('Header validation test');

    await new Promise(resolve => setTimeout(resolve, 50));

    const call = capturedFetchCalls[0];
    const headers = call.options.headers;

    expect(headers).toHaveProperty('Content-Type', 'application/json');
    expect(headers).toHaveProperty('x-api-key', 'test-api-key');
    expect(headers).toHaveProperty('x-team-id', 'test-team');
  });
});
