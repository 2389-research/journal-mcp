// ABOUTME: Tests for read_journal_entry MCP tool in both local and remote modes
// ABOUTME: Comprehensive coverage of the MCP tool functionality including error cases

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { getRemoteEntryById } from '../src/remote';
import { PrivateJournalServer } from '../src/server';

// Mock node-fetch for remote tests
jest.mock('node-fetch', () => jest.fn());
const mockFetch = require('node-fetch') as jest.MockedFunction<typeof fetch>;

// Mock the remote functions for specific tests
jest.mock('../src/remote', () => ({
  ...jest.requireActual('../src/remote'),
  createRemoteConfig: jest.fn(),
  getRemoteEntryById: jest.fn(),
}));

const mockCreateRemoteConfig = require('../src/remote')
  .createRemoteConfig as jest.MockedFunction<any>;
const mockGetRemoteEntryById = getRemoteEntryById as jest.MockedFunction<typeof getRemoteEntryById>;

describe('read_journal_entry MCP tool', () => {
  let tempDir: string;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'read-journal-mcp-test-'));
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(async () => {
    consoleErrorSpy.mockRestore();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('local mode functionality', () => {
    let server: PrivateJournalServer;

    beforeEach(() => {
      mockCreateRemoteConfig.mockReturnValue(undefined);
      server = new PrivateJournalServer(tempDir);
    });

    it('should successfully read existing local journal entry', async () => {
      // Create a test journal entry
      const testDate = '2024-01-15';
      const testTime = '10-30-45-123456';
      const testFilename = `${testTime}.md`;
      const testDayDir = path.join(tempDir, testDate);
      const testFilePath = path.join(testDayDir, testFilename);

      await fs.mkdir(testDayDir, { recursive: true });

      const testContent = `---
title: Test Entry
date: 2024-01-15T10:30:45.123Z
timestamp: 1705316245123
---

# Test Entry

## Feelings

This is a test entry for feelings.

## Project Notes

Some technical notes about the project.
`;

      await fs.writeFile(testFilePath, testContent);

      // Create MCP request
      const request = {
        params: {
          name: 'read_journal_entry',
          arguments: {
            path: testFilePath,
          },
        },
      };

      // Call the tool handler directly
      const serverAny = server as any;
      const response = await serverAny.server.requestHandlers.get('tools/call')(request);

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
      expect(response.content[0].type).toBe('text');
      expect(response.content[0].text).toBe(testContent);
    });

    it('should return error for non-existent local file', async () => {
      const testDate = '2024-01-15';
      const testDayDir = path.join(tempDir, testDate);
      await fs.mkdir(testDayDir, { recursive: true });

      const nonExistentPath = path.join(testDayDir, 'nonexistent.md');

      const request = {
        params: {
          name: 'read_journal_entry',
          arguments: {
            path: nonExistentPath,
          },
        },
      };

      const serverAny = server as any;

      await expect(async () => {
        await serverAny.server.requestHandlers.get('tools/call')(request);
      }).rejects.toThrow('Failed to read entry: Entry not found');
    });

    it('should reject malicious file paths in local mode', async () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '../../root/.ssh/id_rsa',
        '/etc/shadow',
        'relative/path.md',
      ];

      for (const maliciousPath of maliciousPaths) {
        const request = {
          params: {
            name: 'read_journal_entry',
            arguments: {
              path: maliciousPath,
            },
          },
        };

        const serverAny = server as any;

        await expect(async () => {
          await serverAny.server.requestHandlers.get('tools/call')(request);
        }).rejects.toThrow('Access denied: Invalid file path');
      }
    });
  });

  describe('remote-only mode functionality', () => {
    let server: PrivateJournalServer;

    beforeEach(() => {
      mockCreateRemoteConfig.mockReturnValue({
        serverUrl: 'https://test-server.com',
        teamId: 'test-team',
        apiKey: 'test-api-key',
        enabled: true,
        remoteOnly: true,
      });
      server = new PrivateJournalServer(tempDir);
    });

    it('should successfully read entry from remote server using entry ID', async () => {
      const entryId = 'remote-entry-123';
      const mockRemoteEntry = {
        id: entryId,
        team_id: 'test-team',
        similarity_score: 1.0,
        timestamp: 1705316245123,
        created_at: '2024-01-15T10:30:45.123Z',
        sections: {
          feelings: 'This is a test entry for feelings.',
          project_notes: 'Some technical notes about the project.',
        },
      };

      mockGetRemoteEntryById.mockResolvedValue(mockRemoteEntry);

      const request = {
        params: {
          name: 'read_journal_entry',
          arguments: {
            path: entryId,
          },
        },
      };

      const serverAny = server as any;
      const response = await serverAny.server.requestHandlers.get('tools/call')(request);

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
      expect(response.content[0].type).toBe('text');
      expect(response.content[0].text).toContain('## Feelings');
      expect(response.content[0].text).toContain('This is a test entry for feelings.');
      expect(response.content[0].text).toContain('## Project Notes');
      expect(response.content[0].text).toContain('Some technical notes about the project.');

      expect(mockGetRemoteEntryById).toHaveBeenCalledWith(
        expect.objectContaining({
          serverUrl: 'https://test-server.com',
          teamId: 'test-team',
          apiKey: 'test-api-key',
          enabled: true,
          remoteOnly: true,
        }),
        entryId
      );
    });

    it('should return error for non-existent remote entry', async () => {
      const entryId = 'non-existent-entry';
      mockGetRemoteEntryById.mockResolvedValue(null);

      const request = {
        params: {
          name: 'read_journal_entry',
          arguments: {
            path: entryId,
          },
        },
      };

      const serverAny = server as any;

      await expect(async () => {
        await serverAny.server.requestHandlers.get('tools/call')(request);
      }).rejects.toThrow('Failed to read entry: Entry not found');

      expect(mockGetRemoteEntryById).toHaveBeenCalledWith(
        expect.objectContaining({ remoteOnly: true }),
        entryId
      );
    });

    it('should handle remote server errors gracefully', async () => {
      const entryId = 'error-entry';
      mockGetRemoteEntryById.mockRejectedValue(new Error('Remote server connection failed'));

      const request = {
        params: {
          name: 'read_journal_entry',
          arguments: {
            path: entryId,
          },
        },
      };

      const serverAny = server as any;

      await expect(async () => {
        await serverAny.server.requestHandlers.get('tools/call')(request);
      }).rejects.toThrow('Failed to read entry: Remote server connection failed');
    });

    it('should handle entries with content field instead of sections', async () => {
      const entryId = 'content-entry-123';
      const mockRemoteEntry = {
        id: entryId,
        team_id: 'test-team',
        similarity_score: 1.0,
        timestamp: 1705316245123,
        created_at: '2024-01-15T10:30:45.123Z',
        content: 'This is a plain content entry without sections.',
      };

      mockGetRemoteEntryById.mockResolvedValue(mockRemoteEntry);

      const request = {
        params: {
          name: 'read_journal_entry',
          arguments: {
            path: entryId,
          },
        },
      };

      const serverAny = server as any;
      const response = await serverAny.server.requestHandlers.get('tools/call')(request);

      expect(response.content[0].text).toBe('This is a plain content entry without sections.');
    });

    it('should reject file paths in remote-only mode', async () => {
      const filePaths = [
        '/some/local/path.md',
        'C:\\Windows\\file.txt',
        './relative/path.md',
        '../parent/file.md',
        'folder/subfolder/file.md',
      ];

      for (const filePath of filePaths) {
        const request = {
          params: {
            name: 'read_journal_entry',
            arguments: {
              path: filePath,
            },
          },
        };

        const serverAny = server as any;

        await expect(async () => {
          await serverAny.server.requestHandlers.get('tools/call')(request);
        }).rejects.toThrow('Failed to read entry: Cannot read local files in remote-only mode');

        expect(mockGetRemoteEntryById).not.toHaveBeenCalled();
        jest.clearAllMocks();
      }
    });

    it('should accept valid entry IDs in remote-only mode', async () => {
      const validEntryIds = [
        'entry-123',
        'user_entry_456',
        'ENTRY-789',
        'entry123456',
        'a1b2c3d4e5f6',
      ];

      for (const entryId of validEntryIds) {
        mockGetRemoteEntryById.mockResolvedValue({
          id: entryId,
          team_id: 'test-team',
          similarity_score: 1.0,
          timestamp: Date.now(),
          created_at: new Date().toISOString(),
          content: `Content for ${entryId}`,
        });

        const request = {
          params: {
            name: 'read_journal_entry',
            arguments: {
              path: entryId,
            },
          },
        };

        const serverAny = server as any;
        const response = await serverAny.server.requestHandlers.get('tools/call')(request);

        expect(response.content[0].text).toBe(`Content for ${entryId}`);
        expect(mockGetRemoteEntryById).toHaveBeenCalledWith(expect.any(Object), entryId);
        jest.clearAllMocks();
      }
    });
  });

  describe('parameter validation', () => {
    let server: PrivateJournalServer;

    beforeEach(() => {
      mockCreateRemoteConfig.mockReturnValue(undefined);
      server = new PrivateJournalServer(tempDir);
    });

    it('should require path parameter', async () => {
      const request = {
        params: {
          name: 'read_journal_entry',
          arguments: {},
        },
      };

      const serverAny = server as any;

      await expect(async () => {
        await serverAny.server.requestHandlers.get('tools/call')(request);
      }).rejects.toThrow('path is required and must be a string');
    });

    it('should validate path parameter type', async () => {
      const invalidPaths = [123, true, null, undefined, [], {}];

      for (const invalidPath of invalidPaths) {
        const request = {
          params: {
            name: 'read_journal_entry',
            arguments: {
              path: invalidPath,
            },
          },
        };

        const serverAny = server as any;

        await expect(async () => {
          await serverAny.server.requestHandlers.get('tools/call')(request);
        }).rejects.toThrow('path is required and must be a string');
      }
    });

    it('should handle empty string path', async () => {
      const request = {
        params: {
          name: 'read_journal_entry',
          arguments: {
            path: '',
          },
        },
      };

      const serverAny = server as any;

      // Empty string should be treated as invalid file path in local mode
      await expect(async () => {
        await serverAny.server.requestHandlers.get('tools/call')(request);
      }).rejects.toThrow('Access denied: Invalid file path');
    });
  });

  describe('hybrid mode (remote enabled but not remote-only)', () => {
    let server: PrivateJournalServer;

    beforeEach(() => {
      mockCreateRemoteConfig.mockReturnValue({
        serverUrl: 'https://test-server.com',
        teamId: 'test-team',
        apiKey: 'test-api-key',
        enabled: true,
        remoteOnly: false, // Hybrid mode
      });
      server = new PrivateJournalServer(tempDir);
    });

    it('should read local files in hybrid mode', async () => {
      const testDate = '2024-01-15';
      const testTime = '10-30-45-123456';
      const testFilename = `${testTime}.md`;
      const testDayDir = path.join(tempDir, testDate);
      const testFilePath = path.join(testDayDir, testFilename);

      await fs.mkdir(testDayDir, { recursive: true });
      const testContent = 'Test content for hybrid mode';
      await fs.writeFile(testFilePath, testContent);

      const request = {
        params: {
          name: 'read_journal_entry',
          arguments: {
            path: testFilePath,
          },
        },
      };

      const serverAny = server as any;
      const response = await serverAny.server.requestHandlers.get('tools/call')(request);

      expect(response.content[0].text).toBe(testContent);
      // Should not call remote functions in hybrid mode for local file paths
      expect(mockGetRemoteEntryById).not.toHaveBeenCalled();
    });

    it('should still validate file paths in hybrid mode', async () => {
      const request = {
        params: {
          name: 'read_journal_entry',
          arguments: {
            path: '../../../etc/passwd',
          },
        },
      };

      const serverAny = server as any;

      await expect(async () => {
        await serverAny.server.requestHandlers.get('tools/call')(request);
      }).rejects.toThrow('Access denied: Invalid file path');
    });
  });
});
