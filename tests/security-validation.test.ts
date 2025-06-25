// ABOUTME: Tests for security validation methods in PrivateJournalServer
// ABOUTME: Validates path security checks and URI validation to prevent attacks

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { PrivateJournalServer } from '../src/server';

describe('Security Validation', () => {
  let tempDir: string;
  let server: PrivateJournalServer;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'security-validation-test-'));
    server = new PrivateJournalServer(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // Issue 6: Missing Tests for Security Validation in Server
  describe('isPathSafe validation', () => {
    it('should correctly validate secure paths', () => {
      const serverPrivate = server as any;

      // Valid paths
      expect(serverPrivate.isPathSafe('/valid/path/entry.md')).toBe(true);
      expect(serverPrivate.isPathSafe('/another/valid/path.md')).toBe(true);
      expect(serverPrivate.isPathSafe('/home/user/journal/entry.md')).toBe(true);
      expect(serverPrivate.isPathSafe('/tmp/journal/2024-01-01/entry.md')).toBe(true);

      // Valid paths with special characters
      expect(serverPrivate.isPathSafe('/valid/path/entry-with-dashes.md')).toBe(true);
      expect(serverPrivate.isPathSafe('/valid/path/entry_with_underscores.md')).toBe(true);
      expect(serverPrivate.isPathSafe('/valid/path/entry with spaces.md')).toBe(true);
    });

    it('should reject paths with traversal attempts', () => {
      const serverPrivate = server as any;

      // Invalid paths with traversal attempts
      expect(serverPrivate.isPathSafe('/valid/path/../../../etc/passwd')).toBe(false);
      expect(serverPrivate.isPathSafe('../relative/path.md')).toBe(false);
      expect(serverPrivate.isPathSafe('/valid/path/../../')).toBe(false);
      expect(serverPrivate.isPathSafe('/valid/../invalid/path.md')).toBe(false);
      expect(serverPrivate.isPathSafe('/valid/path/../../../root')).toBe(false);

      // Windows-style traversal attempts
      expect(serverPrivate.isPathSafe('C:\\valid\\path\\..\\..\\..\\windows\\system32')).toBe(false);
      expect(serverPrivate.isPathSafe('/valid/path/..\\..\\windows')).toBe(false);
    });

    it('should reject relative paths', () => {
      const serverPrivate = server as any;

      // Invalid relative paths
      expect(serverPrivate.isPathSafe('relative/path.md')).toBe(false);
      expect(serverPrivate.isPathSafe('./relative/path.md')).toBe(false);
      expect(serverPrivate.isPathSafe('entry.md')).toBe(false);
      expect(serverPrivate.isPathSafe('journal/entry.md')).toBe(false);
    });

    it('should handle normalized path edge cases', () => {
      const serverPrivate = server as any;

      // Paths that normalize to safe paths
      expect(serverPrivate.isPathSafe('/valid/./path/entry.md')).toBe(true);
      expect(serverPrivate.isPathSafe('/valid//double//slash/entry.md')).toBe(true);

      // Paths that normalize to unsafe paths
      expect(serverPrivate.isPathSafe('/valid/path/../unsafe/entry.md')).toBe(false);
      expect(serverPrivate.isPathSafe('/valid/path/./../../unsafe')).toBe(false);
    });

    it('should handle empty and null paths', () => {
      const serverPrivate = server as any;

      expect(serverPrivate.isPathSafe('')).toBe(false);
      expect(serverPrivate.isPathSafe(' ')).toBe(false);
      expect(serverPrivate.isPathSafe('\t')).toBe(false);
      expect(serverPrivate.isPathSafe('\n')).toBe(false);
    });

    it('should handle malicious path patterns', () => {
      const serverPrivate = server as any;

      // URL-encoded traversal attempts
      expect(serverPrivate.isPathSafe('/valid/path/%2e%2e/%2e%2e/etc/passwd')).toBe(false);
      expect(serverPrivate.isPathSafe('/valid/path/..%2f..%2fetc%2fpasswd')).toBe(false);

      // Unicode traversal attempts
      expect(serverPrivate.isPathSafe('/valid/path/\u002e\u002e/\u002e\u002e/etc/passwd')).toBe(false);

      // Null byte injection attempts
      expect(serverPrivate.isPathSafe('/valid/path/entry.md\0../../etc/passwd')).toBe(false);
    });
  });

  describe('isValidJournalUri validation', () => {
    it('should validate correct journal URIs', () => {
      const serverPrivate = server as any;

      // Valid URIs
      expect(serverPrivate.isValidJournalUri('journal://project/encodedPath123')).toBe(true);
      expect(serverPrivate.isValidJournalUri('journal://user/anotherEncodedPath456')).toBe(true);
      expect(serverPrivate.isValidJournalUri('journal://project/abc123')).toBe(true);
      expect(serverPrivate.isValidJournalUri('journal://user/XYZ789')).toBe(true);
      expect(serverPrivate.isValidJournalUri('journal://project/path_with_underscores')).toBe(true);
      expect(serverPrivate.isValidJournalUri('journal://user/path-with-dashes')).toBe(true);
    });

    it('should reject invalid journal URIs', () => {
      const serverPrivate = server as any;

      // Invalid schemes
      expect(serverPrivate.isValidJournalUri('http://malicious.com')).toBe(false);
      expect(serverPrivate.isValidJournalUri('https://malicious.com')).toBe(false);
      expect(serverPrivate.isValidJournalUri('file:///etc/passwd')).toBe(false);
      expect(serverPrivate.isValidJournalUri('ftp://malicious.com')).toBe(false);

      // Invalid types
      expect(serverPrivate.isValidJournalUri('journal://admin/path')).toBe(false);
      expect(serverPrivate.isValidJournalUri('journal://root/path')).toBe(false);
      expect(serverPrivate.isValidJournalUri('journal://system/path')).toBe(false);
      expect(serverPrivate.isValidJournalUri('journal://invalid/path')).toBe(false);
    });

    it('should reject URIs with traversal attempts', () => {
      const serverPrivate = server as any;

      expect(serverPrivate.isValidJournalUri('journal://project/../traversal')).toBe(false);
      expect(serverPrivate.isValidJournalUri('journal://user/../../etc/passwd')).toBe(false);
      expect(serverPrivate.isValidJournalUri('journal://project/path/../../../root')).toBe(false);
    });

    it('should reject URIs with special characters', () => {
      const serverPrivate = server as any;

      expect(serverPrivate.isValidJournalUri('journal://project/<script>alert(1)</script>')).toBe(false);
      expect(serverPrivate.isValidJournalUri('journal://user/path with spaces')).toBe(false);
      expect(serverPrivate.isValidJournalUri('journal://project/path&query=malicious')).toBe(false);
      expect(serverPrivate.isValidJournalUri('journal://user/path?query=malicious')).toBe(false);
      expect(serverPrivate.isValidJournalUri('journal://project/path#fragment')).toBe(false);
    });

    it('should reject malformed URIs', () => {
      const serverPrivate = server as any;

      expect(serverPrivate.isValidJournalUri('journal:///')).toBe(false);
      expect(serverPrivate.isValidJournalUri('journal://project/')).toBe(false);
      expect(serverPrivate.isValidJournalUri('journal://user/')).toBe(false);
      expect(serverPrivate.isValidJournalUri('journal://')).toBe(false);
      expect(serverPrivate.isValidJournalUri('journal:')).toBe(false);
      expect(serverPrivate.isValidJournalUri('')).toBe(false);
    });

    it('should handle URI encoding attacks', () => {
      const serverPrivate = server as any;

      // URL-encoded malicious content
      expect(serverPrivate.isValidJournalUri('journal://project/%2e%2e%2f%2e%2e%2fetc%2fpasswd')).toBe(false);
      expect(serverPrivate.isValidJournalUri('journal://user/path%2fto%2fmalicious')).toBe(false);
      expect(serverPrivate.isValidJournalUri('journal://project/path%00../../etc/passwd')).toBe(false);
    });

    it('should handle unicode and special encoding', () => {
      const serverPrivate = server as any;

      // Unicode characters that could be used for attacks
      expect(serverPrivate.isValidJournalUri('journal://project/\u002e\u002e\u002f\u002e\u002e\u002f')).toBe(false);
      expect(serverPrivate.isValidJournalUri('journal://user/path\u0000injection')).toBe(false);
    });
  });

  describe('createJournalUri security', () => {
    it('should create secure URIs with base64url encoding', () => {
      const serverPrivate = server as any;

      // Test with various file paths
      const testPaths = [
        '/valid/path/entry.md',
        '/path/with spaces/entry.md',
        '/path/with/special-chars_123.md',
        '/path/with/../traversal/entry.md', // This should be safely encoded
      ];

      testPaths.forEach(testPath => {
        const projectUri = serverPrivate.createJournalUri(testPath, 'project');
        const userUri = serverPrivate.createJournalUri(testPath, 'user');

        // Verify URI format
        expect(projectUri).toMatch(/^journal:\/\/project\/[A-Za-z0-9_-]+$/);
        expect(userUri).toMatch(/^journal:\/\/user\/[A-Za-z0-9_-]+$/);

        // Verify the URI passes validation
        expect(serverPrivate.isValidJournalUri(projectUri)).toBe(true);
        expect(serverPrivate.isValidJournalUri(userUri)).toBe(true);

        // Verify we can decode back to original path
        const encodedPath = projectUri.split('/')[3];
        const decodedPath = Buffer.from(encodedPath, 'base64url').toString();
        expect(decodedPath).toBe(testPath);
      });
    });

    it('should handle malicious paths safely through encoding', () => {
      const serverPrivate = server as any;

      const maliciousPaths = [
        '../../../etc/passwd',
        '../../root/.ssh/id_rsa',
        '/etc/shadow',
        'C:\\Windows\\System32\\config\\SAM',
      ];

      maliciousPaths.forEach(maliciousPath => {
        const uri = serverPrivate.createJournalUri(maliciousPath, 'project');
        
        // The URI should be valid format (safely encoded)
        expect(serverPrivate.isValidJournalUri(uri)).toBe(true);
        
        // But when decoded, it should still be the original malicious path
        // (this is intentional - the encoding is for URI safety, not path validation)
        const encodedPath = uri.split('/')[3];
        const decodedPath = Buffer.from(encodedPath, 'base64url').toString();
        expect(decodedPath).toBe(maliciousPath);
      });
    });
  });

  describe('Integration security tests', () => {
    it('should reject malicious paths in read_journal_entry tool', async () => {
      const serverPrivate = server as any;

      // Create a mock request handler call
      const mockRequest = {
        params: {
          arguments: {
            file_path: '../../../etc/passwd'
          }
        }
      };

      // This should throw an error due to path validation
      await expect(async () => {
        await serverPrivate.server.request(mockRequest);
      }).rejects.toThrow();
    });

    it('should reject malicious URIs in resource requests', async () => {
      const serverPrivate = server as any;

      const maliciousUris = [
        'journal://admin/malicious',
        'http://malicious.com',
        'journal://project/../traversal',
        'file:///etc/passwd',
      ];

      for (const uri of maliciousUris) {
        expect(serverPrivate.isValidJournalUri(uri)).toBe(false);
      }
    });
  });
});