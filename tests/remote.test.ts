// ABOUTME: Tests for remote journal posting functionality
// ABOUTME: Validates HTTP requests, error handling, and configuration parsing

import {
  createRemoteConfig,
  getRemoteEntries,
  postToRemoteServer,
  type RemoteConfig,
  type RemoteJournalPayload,
  searchRemoteServer,
} from '../src/remote';

// Mock node-fetch
jest.mock('node-fetch', () => jest.fn());
const mockFetch = require('node-fetch') as jest.MockedFunction<typeof fetch>;

describe('Remote Journal Posting', () => {
  const mockConfig: RemoteConfig = {
    serverUrl: 'https://api.example.com',
    teamId: 'test-team',
    apiKey: 'test-key',
    enabled: true,
  };

  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock console output to keep test output clean
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.REMOTE_JOURNAL_SERVER_URL;
    delete process.env.REMOTE_JOURNAL_TEAMID;
    delete process.env.REMOTE_JOURNAL_APIKEY;
    delete process.env.REMOTE_JOURNAL_ONLY;
  });

  afterEach(() => {
    // Restore console methods
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('postToRemoteServer', () => {
    it('should successfully post journal entry to remote server', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: jest.fn().mockResolvedValue('Success'),
        json: jest.fn().mockResolvedValue({}),
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const payload: RemoteJournalPayload = {
        team_id: 'test-team',
        timestamp: Date.now(),
        content: 'Test journal entry',
      };

      await postToRemoteServer(mockConfig, payload);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/teams/test-team/journal/entries',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'test-key',
          },
          body: JSON.stringify(payload),
        }
      );
    });

    it('should handle sections payload correctly', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: jest.fn().mockResolvedValue('Success'),
        json: jest.fn().mockResolvedValue({}),
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const payload: RemoteJournalPayload = {
        team_id: 'test-team',
        timestamp: Date.now(),
        sections: {
          feelings: 'I feel good',
          project_notes: 'Code is working well',
        },
      };

      await postToRemoteServer(mockConfig, payload);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/teams/test-team/journal/entries',
        expect.objectContaining({
          body: JSON.stringify(payload),
        })
      );
    });

    it('should handle payload with embedding vectors', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: jest.fn().mockResolvedValue('Success'),
        json: jest.fn().mockResolvedValue({}),
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const payload: RemoteJournalPayload = {
        team_id: 'test-team',
        timestamp: Date.now(),
        content: 'Test content with embedding',
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
      };

      await postToRemoteServer(mockConfig, payload);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/teams/test-team/journal/entries',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'test-key',
          },
          body: JSON.stringify(payload),
        })
      );

      // Verify the payload includes the embedding
      const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
      const sentPayload = JSON.parse(callArgs.body as string);
      expect(sentPayload.embedding).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
    });

    it('should skip posting when config is disabled', async () => {
      const disabledConfig: RemoteConfig = {
        ...mockConfig,
        enabled: false,
      };

      const payload: RemoteJournalPayload = {
        team_id: 'test-team',
        timestamp: Date.now(),
        content: 'Test entry',
      };

      await postToRemoteServer(disabledConfig, payload);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw error when server responds with error status', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('Server Error'),
        json: jest.fn().mockResolvedValue({}),
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const payload: RemoteJournalPayload = {
        team_id: 'test-team',
        timestamp: Date.now(),
        content: 'Test entry',
      };

      await expect(postToRemoteServer(mockConfig, payload)).rejects.toThrow(
        'Remote server error: 500 Internal Server Error'
      );
    });

    it('should throw error when fetch fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const payload: RemoteJournalPayload = {
        team_id: 'test-team',
        timestamp: Date.now(),
        content: 'Test entry',
      };

      await expect(postToRemoteServer(mockConfig, payload)).rejects.toThrow('Network error');
    });
  });

  describe('createRemoteConfig', () => {
    it('should create config from environment variables', () => {
      process.env.REMOTE_JOURNAL_SERVER_URL = 'https://api.example.com';
      process.env.REMOTE_JOURNAL_TEAMID = 'my-team';
      process.env.REMOTE_JOURNAL_APIKEY = 'secret-key';

      const config = createRemoteConfig();

      expect(config).toEqual({
        serverUrl: 'https://api.example.com',
        teamId: 'my-team',
        apiKey: 'secret-key',
        enabled: true,
        remoteOnly: false,
      });
    });

    it('should return undefined when environment variables are missing', () => {
      const config = createRemoteConfig();
      expect(config).toBeUndefined();
    });

    it('should return undefined when only some environment variables are set', () => {
      process.env.REMOTE_JOURNAL_SERVER_URL = 'https://api.example.com';
      process.env.REMOTE_JOURNAL_TEAMID = 'my-team';
      // Missing REMOTE_JOURNAL_APIKEY

      const config = createRemoteConfig();
      expect(config).toBeUndefined();
    });

    it('should enable remote-only mode when REMOTE_JOURNAL_ONLY is true', () => {
      process.env.REMOTE_JOURNAL_SERVER_URL = 'https://api.example.com';
      process.env.REMOTE_JOURNAL_TEAMID = 'my-team';
      process.env.REMOTE_JOURNAL_APIKEY = 'secret-key';
      process.env.REMOTE_JOURNAL_ONLY = 'true';

      const config = createRemoteConfig();

      expect(config).toEqual({
        serverUrl: 'https://api.example.com',
        teamId: 'my-team',
        apiKey: 'secret-key',
        enabled: true,
        remoteOnly: true,
      });
    });

    it('should disable remote-only mode when REMOTE_JOURNAL_ONLY is false', () => {
      process.env.REMOTE_JOURNAL_SERVER_URL = 'https://api.example.com';
      process.env.REMOTE_JOURNAL_TEAMID = 'my-team';
      process.env.REMOTE_JOURNAL_APIKEY = 'secret-key';
      process.env.REMOTE_JOURNAL_ONLY = 'false';

      const config = createRemoteConfig();

      expect(config).toEqual({
        serverUrl: 'https://api.example.com',
        teamId: 'my-team',
        apiKey: 'secret-key',
        enabled: true,
        remoteOnly: false,
      });
    });
  });

  describe('searchRemoteServer', () => {
    it('should successfully search remote server', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          results: [
            {
              id: 'entry_123',
              team_id: 'test-team',
              similarity_score: 0.85,
              timestamp: 1717160645123,
              created_at: '2024-05-31T14:30:45.123Z',
              sections: {
                feelings: 'I feel frustrated with TypeScript',
              },
              matched_sections: ['feelings'],
            },
          ],
          total_count: 1,
          query_embedding: [0.1, 0.2, 0.3],
        }),
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const searchRequest = {
        query: 'frustrated TypeScript',
        limit: 10,
        similarity_threshold: 0.7,
      };

      const result = await searchRemoteServer(mockConfig, searchRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/teams/test-team/journal/search',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'test-key',
          },
          body: JSON.stringify(searchRequest),
        }
      );

      expect(result.results).toHaveLength(1);
      expect(result.results[0].similarity_score).toBe(0.85);
      expect(result.total_count).toBe(1);
    });

    it('should throw error when config is disabled', async () => {
      const disabledConfig: RemoteConfig = {
        ...mockConfig,
        enabled: false,
      };

      await expect(searchRemoteServer(disabledConfig, { query: 'test' })).rejects.toThrow(
        'Remote server not configured'
      );
    });

    it('should throw error when search request fails', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('Server Error'),
        json: jest.fn().mockResolvedValue({}),
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      await expect(searchRemoteServer(mockConfig, { query: 'test' })).rejects.toThrow(
        'Remote search error: 500 Internal Server Error'
      );
    });
  });

  describe('getRemoteEntries', () => {
    it('should successfully get remote entries', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          entries: [
            {
              id: 'entry_123',
              team_id: 'test-team',
              timestamp: 1717160645123,
              created_at: '2024-05-31T14:30:45.123Z',
              content: 'Recent journal entry',
            },
            {
              id: 'entry_456',
              team_id: 'test-team',
              timestamp: 1717160644000,
              created_at: '2024-05-31T14:30:44.000Z',
              sections: {
                project_notes: 'Working on new feature',
              },
            },
          ],
          total_count: 2,
        }),
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const result = await getRemoteEntries(mockConfig, 10, 0);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/teams/test-team/journal/entries?limit=10&offset=0',
        {
          method: 'GET',
          headers: {
            'X-API-Key': 'test-key',
          },
        }
      );

      expect(result.entries).toHaveLength(2);
      expect(result.total_count).toBe(2);
      expect(result.entries[0].id).toBe('entry_123');
    });

    it('should handle entries request without limit and offset', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          entries: [],
          total_count: 0,
        }),
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      await getRemoteEntries(mockConfig);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/teams/test-team/journal/entries?',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should throw error when config is disabled', async () => {
      const disabledConfig: RemoteConfig = {
        ...mockConfig,
        enabled: false,
      };

      await expect(getRemoteEntries(disabledConfig)).rejects.toThrow(
        'Remote server not configured'
      );
    });

    it('should throw error when entries request fails', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: jest.fn().mockResolvedValue('Not Found'),
        json: jest.fn().mockResolvedValue({}),
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      await expect(getRemoteEntries(mockConfig)).rejects.toThrow(
        'Remote entries error: 404 Not Found'
      );
    });
  });

  // Issue 3: Missing Tests for Error Handling in Remote-Only Mode
  describe('Remote-Only Mode Error Handling', () => {
    const remoteOnlyConfig: RemoteConfig = {
      serverUrl: 'https://api.example.com',
      teamId: 'test-team',
      apiKey: 'test-key',
      enabled: true,
      remoteOnly: true,
    };

    it('should handle network timeout errors in remote-only mode', async () => {
      mockFetch.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Network timeout')), 50);
        });
      });

      const payload: RemoteJournalPayload = {
        team_id: 'test-team',
        timestamp: Date.now(),
        content: 'Test entry',
      };

      await expect(postToRemoteServer(remoteOnlyConfig, payload)).rejects.toThrow(
        'Network timeout'
      );
    });

    it('should handle malformed JSON responses in remote-only mode', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: jest.fn().mockResolvedValue('Not valid JSON'),
        json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
      };

      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const payload: RemoteJournalPayload = {
        team_id: 'test-team',
        timestamp: Date.now(),
        content: 'Test entry',
      };

      // This should still succeed as we don't parse the JSON response for posting
      await expect(postToRemoteServer(remoteOnlyConfig, payload)).resolves.not.toThrow();
    });
  });

  // Issue 9: Missing Tests for Environment Variable Configuration
  describe('Environment Variable Configuration', () => {
    it('should handle all environment variable configurations', () => {
      // Test with all variables set
      process.env.REMOTE_JOURNAL_SERVER_URL = 'https://api.example.com';
      process.env.REMOTE_JOURNAL_TEAMID = 'team1';
      process.env.REMOTE_JOURNAL_APIKEY = 'key1';
      process.env.REMOTE_JOURNAL_ONLY = 'true';

      let config = createRemoteConfig();
      expect(config).toEqual({
        serverUrl: 'https://api.example.com',
        teamId: 'team1',
        apiKey: 'key1',
        enabled: true,
        remoteOnly: true,
      });

      // Test with REMOTE_JOURNAL_ONLY=false
      process.env.REMOTE_JOURNAL_ONLY = 'false';
      config = createRemoteConfig();
      expect(config?.remoteOnly).toBe(false);

      // Test with REMOTE_JOURNAL_ONLY as invalid value (should default to false)
      process.env.REMOTE_JOURNAL_ONLY = 'invalid';
      config = createRemoteConfig();
      expect(config?.remoteOnly).toBe(false);

      // Test with missing SERVER_URL
      delete process.env.REMOTE_JOURNAL_SERVER_URL;
      config = createRemoteConfig();
      expect(config).toBeUndefined();

      // Test with empty values
      process.env.REMOTE_JOURNAL_SERVER_URL = '';
      process.env.REMOTE_JOURNAL_TEAMID = 'team1';
      process.env.REMOTE_JOURNAL_APIKEY = 'key1';
      config = createRemoteConfig();
      expect(config).toBeUndefined();

      // Reset env vars
      delete process.env.REMOTE_JOURNAL_SERVER_URL;
      delete process.env.REMOTE_JOURNAL_TEAMID;
      delete process.env.REMOTE_JOURNAL_APIKEY;
      delete process.env.REMOTE_JOURNAL_ONLY;
    });
  });

  // Issue 10: Missing Tests for Debug Logging
  describe('Debug Logging', () => {
    let originalConsoleError: typeof console.error;

    beforeEach(() => {
      originalConsoleError = console.error;
    });

    afterEach(() => {
      console.error = originalConsoleError;
      delete process.env.JOURNAL_DEBUG;
    });

    it('should trigger debug logging when JOURNAL_DEBUG environment variable is set', async () => {
      const mockConsoleError = jest.fn();
      console.error = mockConsoleError;

      // Enable debug logging
      process.env.JOURNAL_DEBUG = 'true';

      // Mock fetch to return success
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: jest.fn().mockResolvedValue('Success'),
        json: jest.fn().mockResolvedValue({}),
        headers: new Map([['content-type', 'application/json']]),
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const payload: RemoteJournalPayload = {
        team_id: 'test-team',
        timestamp: Date.now(),
        content: 'Debug test',
      };

      await postToRemoteServer(mockConfig, payload);

      // Verify debug logs were called
      expect(mockConsoleError).toHaveBeenCalledWith('=== REMOTE POST DEBUG ===');
      expect(mockConsoleError).toHaveBeenCalledWith(
        'URL:',
        'https://api.example.com/teams/test-team/journal/entries'
      );
      expect(mockConsoleError).toHaveBeenCalledWith('Headers:', expect.any(Object));
      expect(mockConsoleError).toHaveBeenCalledWith('Payload size:', expect.any(Number), 'bytes');

      // Repeat with debug disabled
      mockConsoleError.mockClear();
      process.env.JOURNAL_DEBUG = 'false';

      await postToRemoteServer(mockConfig, payload);

      // Verify debug logs were not called
      expect(mockConsoleError).not.toHaveBeenCalledWith('=== REMOTE POST DEBUG ===');
    });
  });
});
