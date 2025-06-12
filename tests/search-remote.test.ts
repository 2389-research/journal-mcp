// ABOUTME: Tests for search service with remote server integration
// ABOUTME: Validates search behavior in hybrid and remote-only modes

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
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
      cosineSimilarity: jest.fn().mockReturnValue(0.8),
      extractSearchableText: jest.fn().mockReturnValue({
        text: 'extracted text',
        sections: ['Feelings']
      })
    })
  }
}));

describe('SearchService with Remote Integration', () => {
  let tempDir: string;
  let hybridSearchService: SearchService;
  let remoteOnlySearchService: SearchService;
  let hybridConfig: RemoteConfig;
  let remoteOnlyConfig: RemoteConfig;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Mock console.error to keep test output clean
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'search-remote-test-'));
    
    hybridConfig = {
      serverUrl: 'https://api.test.com',
      teamId: 'test-team',
      apiKey: 'test-key',
      enabled: true,
      remoteOnly: false
    };

    remoteOnlyConfig = {
      serverUrl: 'https://api.test.com',
      teamId: 'test-team',
      apiKey: 'test-key',
      enabled: true,
      remoteOnly: true
    };

    hybridSearchService = new SearchService(tempDir, undefined, undefined, hybridConfig);
    remoteOnlySearchService = new SearchService(tempDir, undefined, undefined, remoteOnlyConfig);
    
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Restore console.error
    consoleErrorSpy.mockRestore();
    
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('hybrid mode (local + remote)', () => {
    it('should use local search when not in remote-only mode', async () => {
      // Create some local test files first
      const dayDir = path.join(tempDir, '2024-05-31');
      await fs.mkdir(dayDir, { recursive: true });
      
      const testEntry = `---
title: "Test Entry"
date: 2024-05-31T14:30:45.123Z
timestamp: 1717160645123
---

## Feelings

I feel frustrated with TypeScript today`;

      const entryPath = path.join(dayDir, '14-30-45-123456.md');
      await fs.writeFile(entryPath, testEntry);

      // Create corresponding embedding file
      const embeddingData = {
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        text: 'I feel frustrated with TypeScript today',
        sections: ['Feelings'],
        timestamp: 1717160645123,
        path: entryPath
      };
      const embeddingPath = path.join(dayDir, '14-30-45-123456.embedding');
      await fs.writeFile(embeddingPath, JSON.stringify(embeddingData));

      const results = await hybridSearchService.search('frustrated TypeScript');

      // Should not call remote API in hybrid mode with local files
      expect(mockFetch).not.toHaveBeenCalled();
      // The mock returns 10 default results, so we should get multiple results
      expect(results.length).toBeGreaterThan(0);
      // Check that at least one result contains our text
      expect(results.some(r => r.text.includes('frustrated with TypeScript'))).toBe(true);
    });
  });

  describe('remote-only mode', () => {
    it('should use remote search API', async () => {
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

      const results = await remoteOnlySearchService.search('frustrated TypeScript');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/journal/search',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'test-key',
            'x-team-id': 'test-team'
          },
          body: expect.stringContaining('"query":"frustrated TypeScript"')
        })
      );

      expect(results).toHaveLength(1);
      expect(results[0].score).toBe(0.85);
      expect(results[0].path).toBe('entry_123');
      expect(results[0].text).toBe('## Feelings\n\nI feel frustrated with TypeScript');
    });

    it('should pass search options to remote API', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          results: [],
          total_count: 0
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await remoteOnlySearchService.search('test query', {
        limit: 20,
        minScore: 0.8,
        sections: ['feelings', 'project_notes'],
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31')
        }
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody).toEqual({
        query: 'test query',
        limit: 20,
        similarity_threshold: 0.8,
        sections: ['feelings', 'project_notes'],
        date_from: '2024-01-01T00:00:00.000Z',
        date_to: '2024-12-31T00:00:00.000Z'
      });
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

      const results = await remoteOnlySearchService.listRecent({ limit: 5 });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/journal/entries?limit=5',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'x-api-key': 'test-key',
            'x-team-id': 'test-team'
          }
        })
      );

      expect(results).toHaveLength(1);
      expect(results[0].path).toBe('entry_456');
      expect(results[0].text).toBe('Recent entry content');
    });

    it('should throw error when trying to read local files', async () => {
      await expect(remoteOnlySearchService.readEntry('/some/local/path.md')).rejects.toThrow(
        'Cannot read local files in remote-only mode. Use search to find entry content.'
      );
    });

    it('should handle remote search errors', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(remoteOnlySearchService.search('test query')).rejects.toThrow(
        'Remote search failed: Remote search error: 500 Internal Server Error'
      );
    });

    it('should handle remote listing errors', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found'
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(remoteOnlySearchService.listRecent()).rejects.toThrow(
        'Remote listing failed: Remote entries error: 404 Not Found'
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Connection timeout'));

      await expect(remoteOnlySearchService.search('test')).rejects.toThrow(
        'Remote search failed: Connection timeout'
      );

      await expect(remoteOnlySearchService.listRecent()).rejects.toThrow(
        'Remote listing failed: Connection timeout'
      );
    });
  });

  describe('content extraction from remote results', () => {
    beforeEach(() => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn()
      };
      mockFetch.mockResolvedValue(mockResponse as any);
    });

    it('should extract text from content-based entries', async () => {
      mockFetch.mockResolvedValue({
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
      });

      const results = await remoteOnlySearchService.search('simple content');
      expect(results[0].text).toBe('This is a simple content entry');
      expect(results[0].sections).toEqual([]);
    });

    it('should extract text from section-based entries', async () => {
      mockFetch.mockResolvedValue({
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
                project_notes: 'Working on new feature',
                technical_insights: 'TypeScript is great'
              },
              matched_sections: ['feelings', 'technical_insights']
            }
          ],
          total_count: 1
        })
      });

      const results = await remoteOnlySearchService.search('excited feature');
      
      expect(results[0].text).toBe(
        '## Feelings\n\nI feel excited\n\n## Project Notes\n\nWorking on new feature\n\n## Technical Insights\n\nTypeScript is great'
      );
      expect(results[0].sections).toEqual(['feelings', 'technical_insights']);
    });

    it('should extract sections correctly for listing', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          entries: [
            {
              id: 'entry_789',
              team_id: 'test-team',
              timestamp: 1717160645123,
              created_at: '2024-05-31T14:30:45.123Z',
              sections: {
                user_context: 'Harper likes concise responses',
                world_knowledge: 'AI is advancing rapidly'
              }
            }
          ],
          total_count: 1
        })
      });

      const results = await remoteOnlySearchService.listRecent();
      
      expect(results[0].sections).toEqual(['User Context', 'World Knowledge']);
    });

    it('should handle entries with no content or sections', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          results: [
            {
              id: 'entry_empty',
              team_id: 'test-team',
              similarity_score: 0.1,
              timestamp: 1717160645123,
              created_at: '2024-05-31T14:30:45.123Z'
            }
          ],
          total_count: 1
        })
      });

      const results = await remoteOnlySearchService.search('empty');
      
      expect(results[0].text).toBe('');
      expect(results[0].sections).toEqual([]);
    });
  });
});