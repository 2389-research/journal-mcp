// ABOUTME: Tests for remote-only mode functionality
// ABOUTME: Validates journal manager and search service behavior when using only remote storage

import * as fs from 'fs/promises';
import * as path from 'path';
import { JournalManager } from '../src/journal';
import { SearchService } from '../src/search';
import { RemoteConfig } from '../src/remote';

// Mock node-fetch
jest.mock('node-fetch', () => jest.fn());
const mockFetch = require('node-fetch') as jest.MockedFunction<any>;

// Mock the embedding service
jest.mock('../src/embeddings', () => ({
  EmbeddingService: {
    getInstance: () => ({
      generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3, 0.4, 0.5]),
      extractSearchableText: jest.fn().mockReturnValue({
        text: 'extracted text',
        sections: ['Feelings']
      })
    })
  }
}));

describe('Remote-Only Mode', () => {
  let tempDir: string;
  let journalManager: JournalManager;
  let searchService: SearchService;
  let remoteOnlyConfig: RemoteConfig;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Mock console.error to keep test output clean
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // Create temporary directory
    tempDir = await fs.mkdtemp(path.join(require('os').tmpdir(), 'journal-test-'));

    remoteOnlyConfig = {
      serverUrl: 'https://api.example.com',
      teamId: 'test-team',
      apiKey: 'test-key',
      enabled: true,
      remoteOnly: true
    };

    journalManager = new JournalManager(tempDir, undefined, remoteOnlyConfig);
    searchService = new SearchService(tempDir, undefined, undefined, remoteOnlyConfig);

    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Restore console.error
    consoleErrorSpy.mockRestore();

    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('JournalManager in remote-only mode', () => {
    it('should skip local file creation for writeEntry', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: jest.fn().mockResolvedValue('Success'),
        json: jest.fn().mockResolvedValue({})
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await journalManager.writeEntry('Test journal entry');

      // Verify no local files were created
      const files = await fs.readdir(tempDir);
      expect(files).toHaveLength(0);

      // Verify remote posting was called
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/teams/test-team/journal/entries',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-API-Key': 'test-key'
          })
        })
      );
    });

    it('should skip local file creation for writeThoughts', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: jest.fn().mockResolvedValue('Success'),
        json: jest.fn().mockResolvedValue({})
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await journalManager.writeThoughts({
        feelings: 'I feel great',
        project_notes: 'Code is working well'
      });

      // Verify no local files were created
      const files = await fs.readdir(tempDir);
      expect(files).toHaveLength(0);

      // Verify remote posting was called with sections
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/teams/test-team/journal/entries',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"sections"')
        })
      );
    });

    it('should throw error when remote posting fails in remote-only mode', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('Server Error')
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(journalManager.writeEntry('Test entry')).rejects.toThrow(
        'Remote journal posting failed: Remote server error: 500 Internal Server Error'
      );

      // Verify no local files were created even on error
      const files = await fs.readdir(tempDir);
      expect(files).toHaveLength(0);
    });

    it('should throw error when network fails in remote-only mode', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(journalManager.writeThoughts({ feelings: 'test' })).rejects.toThrow(
        'Remote journal posting failed: Network error'
      );

      // Verify no local files were created
      const files = await fs.readdir(tempDir);
      expect(files).toHaveLength(0);
    });
  });

  describe('SearchService in remote-only mode', () => {
    it('should use remote search instead of local files', async () => {
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

      const results = await searchService.search('frustrated TypeScript');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/teams/test-team/journal/search',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"query":"frustrated TypeScript"')
        })
      );

      expect(results).toHaveLength(1);
      expect(results[0].score).toBe(0.85);
      expect(results[0].path).toBe('entry_123');
    });

    it('should use remote listing for recent entries', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          entries: [
            {
              id: 'entry_456',
              team_id: 'test-team',
              timestamp: 1717160644000,
              created_at: '2024-05-31T14:30:44.000Z',
              content: 'Recent entry content'
            }
          ],
          total_count: 1
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const results = await searchService.listRecent({ limit: 5 });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/teams/test-team/journal/entries?limit=5',
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(results).toHaveLength(1);
      expect(results[0].path).toBe('entry_456');
    });

    it('should throw error when trying to read local files in remote-only mode', async () => {
      await expect(searchService.readEntry('/some/local/path.md')).rejects.toThrow(
        'Cannot read local files in remote-only mode. Use search to find entry content.'
      );
    });

    it('should throw error when remote search fails', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('Server Error')
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(searchService.search('test query')).rejects.toThrow(
        'Remote search failed: Remote search error: 500 Internal Server Error'
      );
    });

    it('should handle search with options correctly', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          results: [],
          total_count: 0
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await searchService.search('test', {
        limit: 20,
        minScore: 0.8,
        sections: ['feelings', 'project_notes'],
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31')
        }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/teams/test-team/journal/search',
        expect.objectContaining({
          body: expect.stringContaining('"limit":20')
        })
      );

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody).toEqual({
        query: 'test',
        limit: 20,
        similarity_threshold: 0.8,
        sections: ['feelings', 'project_notes'],
        date_from: '2024-01-01T00:00:00.000Z',
        date_to: '2024-12-31T00:00:00.000Z'
      });
    });
  });

  describe('Error handling', () => {
    it('should propagate network errors appropriately', async () => {
      mockFetch.mockRejectedValue(new Error('Connection timeout'));

      await expect(journalManager.writeEntry('test')).rejects.toThrow(
        'Remote journal posting failed: Connection timeout'
      );

      await expect(searchService.search('test')).rejects.toThrow(
        'Remote search failed: Connection timeout'
      );

      await expect(searchService.listRecent()).rejects.toThrow(
        'Remote listing failed: Connection timeout'
      );
    });

    it('should handle malformed server responses', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(searchService.search('test')).rejects.toThrow(
        'Remote search failed: Invalid JSON'
      );
    });
  });

  describe('Content extraction from remote results', () => {
    it('should correctly extract text from content-based entries', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          results: [
            {
              id: 'entry_123',
              team_id: 'test-team',
              similarity_score: 0.9,
              timestamp: 1717160645123,
              created_at: '2024-05-31T14:30:45.123Z',
              content: 'This is a simple content entry'
            }
          ],
          total_count: 1
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const results = await searchService.search('simple content');

      expect(results[0].text).toBe('This is a simple content entry');
    });

    it('should correctly extract text from section-based entries', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          results: [
            {
              id: 'entry_456',
              team_id: 'test-team',
              similarity_score: 0.8,
              timestamp: 1717160645123,
              created_at: '2024-05-31T14:30:45.123Z',
              sections: {
                feelings: 'I feel excited',
                project_notes: 'Working on new feature'
              }
            }
          ],
          total_count: 1
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const results = await searchService.search('excited feature');

      expect(results[0].text).toBe('## Feelings\n\nI feel excited\n\n## Project Notes\n\nWorking on new feature');
      expect(results[0].sections).toEqual([]);
    });
  });
});
