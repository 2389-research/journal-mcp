// ABOUTME: Tests for journal manager with remote posting functionality
// ABOUTME: Validates integration between local journaling and remote server posting

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { JournalManager } from '../src/journal';
import type { RemoteConfig } from '../src/remote';

// Mock node-fetch for these tests
const mockFetch = require('node-fetch') as jest.MockedFunction<any>;

describe('JournalManager with Remote Posting', () => {
  let projectTempDir: string;
  let userTempDir: string;
  let journalManager: JournalManager;
  let originalHome: string | undefined;
  let mockConfig: RemoteConfig;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Mock console output to keep test output clean
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    projectTempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'journal-remote-test-'));
    userTempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'journal-user-remote-test-'));

    // Mock HOME environment
    originalHome = process.env.HOME;
    process.env.HOME = userTempDir;

    mockConfig = {
      serverUrl: 'https://api.test.com',
      teamId: 'test-team',
      apiKey: 'test-key',
      enabled: true,
      remoteOnly: false,
    };

    journalManager = new JournalManager(projectTempDir, undefined, mockConfig);

    // Reset fetch mock
    mockFetch.mockClear();
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

    await fs.rm(projectTempDir, { recursive: true, force: true });
    await fs.rm(userTempDir, { recursive: true, force: true });
  });

  test('posts to remote server when writing journal entry', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      text: jest.fn().mockResolvedValue('Success'),
      json: jest.fn().mockResolvedValue({}),
    };
    mockFetch.mockResolvedValue(mockResponse);

    const content = 'This is a test journal entry.';
    await journalManager.writeEntry(content);

    // Verify local file was created
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    const dayDir = path.join(projectTempDir, dateString);
    const files = await fs.readdir(dayDir);
    expect(files.some((f) => f.endsWith('.md'))).toBe(true);

    // Verify remote call was made
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.com/teams/test-team/journal/entries',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-key',
        },
      })
    );

    // Verify payload structure
    const callArgs = mockFetch.mock.calls[0][1];
    const payload = JSON.parse(callArgs.body);
    expect(payload).toEqual({
      team_id: 'test-team',
      timestamp: expect.any(Number),
      content: 'This is a test journal entry.',
      embedding: expect.any(Array),
    });

    // Verify embedding is a valid vector
    expect(payload.embedding).toHaveLength(5); // Mock embedding has 5 elements
    expect(payload.embedding.every((n: any) => typeof n === 'number')).toBe(true);
  });

  test('posts thoughts with sections to remote server', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      text: jest.fn().mockResolvedValue('Success'),
      json: jest.fn().mockResolvedValue({}),
    };
    mockFetch.mockResolvedValue(mockResponse);

    const thoughts = {
      feelings: 'I feel great',
      project_notes: 'Architecture is solid',
      technical_insights: 'TypeScript is powerful',
    };

    await journalManager.writeThoughts(thoughts);

    // Verify remote call was made
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.com/teams/test-team/journal/entries',
      expect.objectContaining({
        method: 'POST',
      })
    );

    // Verify payload structure for thoughts
    const callArgs = mockFetch.mock.calls[0][1];
    const payload = JSON.parse(callArgs.body);
    expect(payload).toEqual({
      team_id: 'test-team',
      timestamp: expect.any(Number),
      sections: {
        feelings: 'I feel great',
        project_notes: 'Architecture is solid',
        user_context: undefined,
        technical_insights: 'TypeScript is powerful',
        world_knowledge: undefined,
      },
      embedding: expect.any(Array),
    });

    // Verify embedding is included and valid
    expect(payload.embedding).toHaveLength(5); // Mock embedding has 5 elements
    expect(payload.embedding.every((n: any) => typeof n === 'number')).toBe(true);
  });

  test('continues local journaling when remote posting fails', async () => {
    // Mock fetch to fail
    mockFetch.mockRejectedValue(new Error('Network error'));

    const content = 'This should still be saved locally.';

    // This should not throw an error
    await journalManager.writeEntry(content);

    // Verify local file was still created
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    const dayDir = path.join(projectTempDir, dateString);
    const files = await fs.readdir(dayDir);
    expect(files.some((f) => f.endsWith('.md'))).toBe(true);

    const mdFile = files.find((f) => f.endsWith('.md'))!;
    const filePath = path.join(dayDir, mdFile);
    const fileContent = await fs.readFile(filePath, 'utf8');
    expect(fileContent).toContain('This should still be saved locally.');

    // Verify remote call was attempted
    expect(mockFetch).toHaveBeenCalled();
  });

  test('skips remote posting when config is disabled', async () => {
    const disabledConfig: RemoteConfig = {
      ...mockConfig,
      enabled: false,
    };

    const journalManagerDisabled = new JournalManager(projectTempDir, undefined, disabledConfig);

    const content = 'This should not be posted remotely.';
    await journalManagerDisabled.writeEntry(content);

    // Verify no remote call was made
    expect(mockFetch).not.toHaveBeenCalled();

    // Verify local file was still created
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    const dayDir = path.join(projectTempDir, dateString);
    const files = await fs.readdir(dayDir);
    expect(files.some((f) => f.endsWith('.md'))).toBe(true);
  });

  test('skips remote posting when no config is provided', async () => {
    const journalManagerNoRemote = new JournalManager(projectTempDir);

    const content = 'This should not be posted remotely.';
    await journalManagerNoRemote.writeEntry(content);

    // Verify no remote call was made
    expect(mockFetch).not.toHaveBeenCalled();

    // Verify local file was still created
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    const dayDir = path.join(projectTempDir, dateString);
    const files = await fs.readdir(dayDir);
    expect(files.some((f) => f.endsWith('.md'))).toBe(true);
  });

  describe('remote-only mode', () => {
    let remoteOnlyJournalManager: JournalManager;

    beforeEach(() => {
      const remoteOnlyConfig: RemoteConfig = {
        ...mockConfig,
        remoteOnly: true,
      };
      remoteOnlyJournalManager = new JournalManager(projectTempDir, undefined, remoteOnlyConfig);
    });

    test('skips local file creation in remote-only mode', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: jest.fn().mockResolvedValue('Success'),
        json: jest.fn().mockResolvedValue({}),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const content = 'This should only go to remote server.';
      await remoteOnlyJournalManager.writeEntry(content);

      // Verify NO local files were created
      const files = await fs.readdir(projectTempDir);
      expect(files).toHaveLength(0);

      // Verify remote call was made
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/teams/test-team/journal/entries',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    test('throws error when remote server fails in remote-only mode', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('Server Error'),
        json: jest.fn().mockResolvedValue({}),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const content = 'This should fail.';

      await expect(remoteOnlyJournalManager.writeEntry(content)).rejects.toThrow(
        'Remote journal posting failed: Remote server error: 500 Internal Server Error'
      );

      // Verify NO local files were created even on error
      const files = await fs.readdir(projectTempDir);
      expect(files).toHaveLength(0);
    });

    test('throws error when network fails in remote-only mode', async () => {
      mockFetch.mockRejectedValue(new Error('Network timeout'));

      const thoughts = {
        feelings: 'This should fail too',
      };

      await expect(remoteOnlyJournalManager.writeThoughts(thoughts)).rejects.toThrow(
        'Remote journal posting failed: Network timeout'
      );

      // Verify NO local files were created
      const files = await fs.readdir(projectTempDir);
      expect(files).toHaveLength(0);
    });

    test('skips local thoughts storage in remote-only mode', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: jest.fn().mockResolvedValue('Success'),
        json: jest.fn().mockResolvedValue({}),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const thoughts = {
        feelings: 'Remote only feelings',
        project_notes: 'Remote only project notes',
      };

      await remoteOnlyJournalManager.writeThoughts(thoughts);

      // Verify NO local files were created in project or user directories
      const projectFiles = await fs.readdir(projectTempDir);
      expect(projectFiles).toHaveLength(0);

      // Check user directory too (should be empty since no local storage)
      const userFiles = await fs.readdir(userTempDir);
      expect(userFiles).toHaveLength(0);

      // Verify remote call was made with correct payload
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/teams/test-team/journal/entries',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"sections"'),
        })
      );
    });
  });
});
