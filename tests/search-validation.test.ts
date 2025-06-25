// ABOUTME: Tests for SearchService input validation and edge cases
// ABOUTME: Validates handling of invalid parameters, extreme inputs, and error conditions

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
// Use the EmbeddingService mock to avoid conflicts with global setup
import { EmbeddingService } from '../src/embeddings';
import { SearchService } from '../src/search';

describe('SearchService Input Validation', () => {
  let tempDir: string;
  let userTempDir: string;
  let searchService: SearchService;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'search-validation-test-'));
    userTempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'search-validation-user-test-'));
    searchService = new SearchService(tempDir, userTempDir);

    // Setup mocks for each test
    const mockEmbeddingService = EmbeddingService.getInstance();
    jest
      .spyOn(mockEmbeddingService, 'generateEmbedding')
      .mockResolvedValue([0.1, 0.2, 0.3, 0.4, 0.5]);
    jest.spyOn(mockEmbeddingService, 'cosineSimilarity').mockReturnValue(0.8);
    jest.spyOn(mockEmbeddingService, 'extractSearchableText').mockReturnValue({
      text: 'extracted text',
      sections: ['Feelings'],
    });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.rm(userTempDir, { recursive: true, force: true });
    jest.restoreAllMocks();
    // Reset the EmbeddingService singleton to avoid state leakage
    (EmbeddingService as any).instance = null;
  });

  // Issue 4: Missing Tests for SearchService with Invalid Inputs
  describe('Invalid Search Parameters', () => {
    it('should handle invalid search parameters gracefully', async () => {
      // Test with negative limit
      const results1 = await searchService.search('test query', { limit: -5 });
      expect(results1.length).toBeLessThanOrEqual(10); // Should use default or cap at reasonable value

      // Test with extremely high limit
      const results2 = await searchService.search('test query', { limit: 1000000 });
      expect(results2.length).toBeLessThanOrEqual(100); // Should have a reasonable upper limit

      // Test with invalid date range
      const results3 = await searchService.search('test query', {
        dateRange: {
          start: new Date('invalid date'),
          end: new Date(),
        },
      });
      expect(Array.isArray(results3)).toBe(true); // Should still return array, not crash
    });

    it('should handle extremely long search queries', async () => {
      const longQuery = 'test query '.repeat(1000); // Very long query
      const results = await searchService.search(longQuery);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle empty search queries', async () => {
      const results = await searchService.search('');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle whitespace-only search queries', async () => {
      const results = await searchService.search('   \n\t   ');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle special characters in search queries', async () => {
      const specialChars = '!@#$%^&*()[]{}|;:,.<>?/~`+=';
      const results = await searchService.search(specialChars);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle unicode characters in search queries', async () => {
      const unicodeQuery = '你好世界 مرحبا بالعالم 🌍🚀';
      const results = await searchService.search(unicodeQuery);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle null and undefined search options', async () => {
      // @ts-expect-error - Testing invalid input
      const results1 = await searchService.search('test', null);
      expect(Array.isArray(results1)).toBe(true);

      const results2 = await searchService.search('test', undefined);
      expect(Array.isArray(results2)).toBe(true);
    });

    it('should handle malformed date objects in date range', async () => {
      const results = await searchService.search('test query', {
        dateRange: {
          // @ts-expect-error - Testing invalid input
          start: 'not a date',
          // @ts-expect-error - Testing invalid input
          end: 'also not a date',
        },
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle reversed date range (end before start)', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 86400000); // 1 day ago

      const results = await searchService.search('test query', {
        dateRange: {
          start: now, // Later date
          end: pastDate, // Earlier date
        },
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle very large limit values', async () => {
      const results = await searchService.search('test', { limit: Number.MAX_SAFE_INTEGER });
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(1000); // Should cap at reasonable limit
    });

    it('should handle zero limit', async () => {
      const results = await searchService.search('test', { limit: 0 });
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should handle fractional limit values', async () => {
      const results = await searchService.search('test', { limit: 5.7 });
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Search Service Error Conditions', () => {
    it('should handle search when no journal entries exist', async () => {
      const results = await searchService.search('nonexistent query');
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should handle search in non-existent directory', async () => {
      const nonExistentPath = path.join(tempDir, 'does-not-exist');
      const nonExistentUserPath = path.join(userTempDir, 'does-not-exist');
      const badSearchService = new SearchService(nonExistentPath, nonExistentUserPath);

      const results = await badSearchService.search('test query');
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should handle concurrent search operations', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(searchService.search(`concurrent query ${i}`));
      }

      const results = await Promise.all(promises);
      expect(results.length).toBe(10);
      results.forEach((result) => {
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });
});
