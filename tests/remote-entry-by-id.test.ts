// ABOUTME: Tests for getRemoteEntryById function and remote entry reading functionality
// ABOUTME: Validates individual entry fetching from remote server including error cases

import type { RemoteConfig } from '../src/remote';
import { getRemoteEntryById } from '../src/remote';

// Mock node-fetch
jest.mock('node-fetch', () => jest.fn());
const mockFetch = require('node-fetch') as jest.MockedFunction<typeof fetch>;

describe('getRemoteEntryById', () => {
  let remoteConfig: RemoteConfig;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    remoteConfig = {
      serverUrl: 'https://api.example.com',
      teamId: 'test-team-123',
      apiKey: 'test-api-key-456',
      enabled: true,
      remoteOnly: true,
    };

    // Mock console.error to keep test output clean
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('successful retrieval', () => {
    it('should successfully fetch entry by ID', async () => {
      const mockEntry = {
        id: 'entry-123',
        team_id: 'test-team-123',
        similarity_score: 1.0,
        timestamp: 1705316245123,
        created_at: '2024-01-15T10:30:45.123Z',
        sections: {
          feelings: 'I feel great today!',
          project_notes: 'Working on the new feature',
        },
        matched_sections: ['feelings', 'project_notes'],
      };

      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue(mockEntry),
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const result = await getRemoteEntryById(remoteConfig, 'entry-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/teams/test-team-123/journal/entries/entry-123',
        {
          method: 'GET',
          headers: {
            'X-API-Key': 'test-api-key-456',
          },
        }
      );

      expect(result).toEqual(mockEntry);
    });

    it('should fetch entry with content field instead of sections', async () => {
      const mockEntry = {
        id: 'entry-456',
        team_id: 'test-team-123',
        similarity_score: 1.0,
        timestamp: 1705316245123,
        created_at: '2024-01-15T10:30:45.123Z',
        content: 'This is a simple text entry without sections.',
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockEntry),
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const result = await getRemoteEntryById(remoteConfig, 'entry-456');

      expect(result).toEqual(mockEntry);
    });

    it('should handle entries with special characters in ID', async () => {
      const entryId = 'entry-with-special-chars_123-456';
      const mockEntry = {
        id: entryId,
        team_id: 'test-team-123',
        similarity_score: 1.0,
        timestamp: 1705316245123,
        created_at: '2024-01-15T10:30:45.123Z',
        content: 'Entry with special ID format',
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockEntry),
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const result = await getRemoteEntryById(remoteConfig, entryId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.example.com/teams/test-team-123/journal/entries/${entryId}`,
        expect.objectContaining({ method: 'GET' })
      );

      expect(result).toEqual(mockEntry);
    });
  });

  describe('entry not found', () => {
    it('should return null for 404 responses', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const result = await getRemoteEntryById(remoteConfig, 'non-existent-entry');

      expect(result).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should throw error for server errors (500)', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('Server is down'),
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      await expect(getRemoteEntryById(remoteConfig, 'entry-123')).rejects.toThrow(
        'Remote entry fetch error: 500 Internal Server Error - Server is down'
      );

      expect(mockResponse.text).toHaveBeenCalled();
    });

    it('should throw error for authentication failures (401)', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: jest.fn().mockResolvedValue('Invalid API key'),
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      await expect(getRemoteEntryById(remoteConfig, 'entry-123')).rejects.toThrow(
        'Remote entry fetch error: 401 Unauthorized - Invalid API key'
      );
    });

    it('should throw error for network failures', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      await expect(getRemoteEntryById(remoteConfig, 'entry-123')).rejects.toThrow(
        'Connection refused'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Remote entry fetch failed:',
        'Connection refused'
      );
    });

    it('should throw error for timeout', async () => {
      mockFetch.mockRejectedValue(new Error('Request timeout'));

      await expect(getRemoteEntryById(remoteConfig, 'entry-123')).rejects.toThrow(
        'Request timeout'
      );
    });

    it('should throw error for invalid JSON response', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      await expect(getRemoteEntryById(remoteConfig, 'entry-123')).rejects.toThrow('Invalid JSON');
    });
  });

  describe('configuration validation', () => {
    it('should throw error when remote config is disabled', async () => {
      const disabledConfig = { ...remoteConfig, enabled: false };

      await expect(getRemoteEntryById(disabledConfig, 'entry-123')).rejects.toThrow(
        'Remote server not configured'
      );

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('debug logging', () => {
    beforeEach(() => {
      process.env.JOURNAL_DEBUG = 'true';
    });

    afterEach(() => {
      delete process.env.JOURNAL_DEBUG;
    });

    it('should log debug information when JOURNAL_DEBUG is enabled', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue({
          id: 'entry-123',
          content: 'test content',
        }),
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      await getRemoteEntryById(remoteConfig, 'entry-123');

      // Just verify some basic debug messages are logged
      expect(consoleErrorSpy).toHaveBeenCalledWith('=== REMOTE ENTRY BY ID DEBUG ===');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Entry ID:', 'entry-123');
      expect(consoleErrorSpy).toHaveBeenCalledWith('=== END REMOTE ENTRY BY ID DEBUG ===');
      // Verify the debug section was called at least 6 times (start + url + id + status + data + end)
      expect(consoleErrorSpy).toHaveBeenCalledTimes(6);
    });

    it('should log debug information for 404 responses', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      await getRemoteEntryById(remoteConfig, 'missing-entry');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Entry not found on remote server');
      expect(consoleErrorSpy).toHaveBeenCalledWith('=== END REMOTE ENTRY BY ID DEBUG ===');
    });

    it('should log debug information for server errors', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('Server error details'),
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      await expect(getRemoteEntryById(remoteConfig, 'entry-123')).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Entry error response:', 'Server error details');
      expect(consoleErrorSpy).toHaveBeenCalledWith('=== END REMOTE ENTRY BY ID DEBUG ===');
    });
  });
});
