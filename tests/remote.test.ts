// ABOUTME: Tests for remote journal posting functionality
// ABOUTME: Validates HTTP requests, error handling, and configuration parsing

import { postToRemoteServer, createRemoteConfig, RemoteConfig, RemoteJournalPayload } from '../src/remote';

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

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.REMOTE_JOURNAL_SERVER_URL;
    delete process.env.REMOTE_JOURNAL_TEAMID;
    delete process.env.REMOTE_JOURNAL_APIKEY;
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
        enabled: true
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
  });
});