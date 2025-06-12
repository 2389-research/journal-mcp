// ABOUTME: Tests for remote journal posting functionality
// ABOUTME: Validates HTTP requests, error handling, and configuration parsing

import { postToRemoteServer, createRemoteConfig, RemoteConfig, RemoteJournalPayload, searchRemoteServer, getRemoteEntries } from '../src/remote';

// Mock node-fetch
jest.mock('node-fetch', () => jest.fn());
const mockFetch = require('node-fetch') as jest.MockedFunction<any>;

describe('Remote Journal Posting', () => {
  const mockConfig: RemoteConfig = {
    serverUrl: 'https://api.example.com',
    teamId: 'test-team',
    apiKey: 'test-key',
    enabled: true
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
        statusText: 'OK'
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const payload: RemoteJournalPayload = {
        team_id: 'test-team',
        timestamp: Date.now(),
        content: 'Test journal entry'
      };

      await postToRemoteServer(mockConfig, payload);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/journal/entries',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'test-key',
            'x-team-id': 'test-team'
          },
          body: JSON.stringify(payload)
        }
      );
    });

    it('should handle sections payload correctly', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK'
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const payload: RemoteJournalPayload = {
        team_id: 'test-team',
        timestamp: Date.now(),
        sections: {
          feelings: 'I feel good',
          project_notes: 'Code is working well'
        }
      };

      await postToRemoteServer(mockConfig, payload);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/journal/entries',
        expect.objectContaining({
          body: JSON.stringify(payload)
        })
      );
    });

    it('should handle payload with embedding vectors', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK'
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const payload: RemoteJournalPayload = {
        team_id: 'test-team',
        timestamp: Date.now(),
        content: 'Test content with embedding',
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5]
      };

      await postToRemoteServer(mockConfig, payload);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/journal/entries',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'test-key',
            'x-team-id': 'test-team'
          },
          body: JSON.stringify(payload)
        })
      );

      // Verify the payload includes the embedding
      const callArgs = mockFetch.mock.calls[0][1];
      const sentPayload = JSON.parse(callArgs.body);
      expect(sentPayload.embedding).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
    });

    it('should skip posting when config is disabled', async () => {
      const disabledConfig: RemoteConfig = {
        ...mockConfig,
        enabled: false
      };

      const payload: RemoteJournalPayload = {
        team_id: 'test-team',
        timestamp: Date.now(),
        content: 'Test entry'
      };

      await postToRemoteServer(disabledConfig, payload);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw error when server responds with error status', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const payload: RemoteJournalPayload = {
        team_id: 'test-team',
        timestamp: Date.now(),
        content: 'Test entry'
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
        content: 'Test entry'
      };

      await expect(postToRemoteServer(mockConfig, payload)).rejects.toThrow(
        'Network error'
      );
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
        remoteOnly: false
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
        remoteOnly: true
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
        remoteOnly: false
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
                feelings: 'I feel frustrated with TypeScript'
              },
              matched_sections: ['feelings']
            }
          ],
          total_count: 1,
          query_embedding: [0.1, 0.2, 0.3]
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const searchRequest = {
        query: 'frustrated TypeScript',
        limit: 10,
        similarity_threshold: 0.7
      };

      const result = await searchRemoteServer(mockConfig, searchRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/journal/search',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'test-key',
            'x-team-id': 'test-team'
          },
          body: JSON.stringify(searchRequest)
        }
      );

      expect(result.results).toHaveLength(1);
      expect(result.results[0].similarity_score).toBe(0.85);
      expect(result.total_count).toBe(1);
    });

    it('should throw error when config is disabled', async () => {
      const disabledConfig: RemoteConfig = {
        ...mockConfig,
        enabled: false
      };

      await expect(searchRemoteServer(disabledConfig, { query: 'test' })).rejects.toThrow(
        'Remote server not configured'
      );
    });

    it('should throw error when search request fails', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      };
      mockFetch.mockResolvedValue(mockResponse as any);

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
              content: 'Recent journal entry'
            },
            {
              id: 'entry_456',
              team_id: 'test-team',
              timestamp: 1717160644000,
              created_at: '2024-05-31T14:30:44.000Z',
              sections: {
                project_notes: 'Working on new feature'
              }
            }
          ],
          total_count: 2
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await getRemoteEntries(mockConfig, 10, 0);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/journal/entries?limit=10&offset=0',
        {
          method: 'GET',
          headers: {
            'x-api-key': 'test-key',
            'x-team-id': 'test-team'
          }
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
          total_count: 0
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await getRemoteEntries(mockConfig);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/journal/entries?',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should throw error when config is disabled', async () => {
      const disabledConfig: RemoteConfig = {
        ...mockConfig,
        enabled: false
      };

      await expect(getRemoteEntries(disabledConfig)).rejects.toThrow(
        'Remote server not configured'
      );
    });

    it('should throw error when entries request fails', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found'
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(getRemoteEntries(mockConfig)).rejects.toThrow(
        'Remote entries error: 404 Not Found'
      );
    });
  });
});