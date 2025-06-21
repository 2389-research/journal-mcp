// ABOUTME: Path resolution utilities for journal storage locations
// ABOUTME: Provides cross-platform fallback logic for finding suitable directories

import * as path from 'node:path';

/**
 * Resolves the best available directory for journal storage
 * @param subdirectory - subdirectory name (e.g., '.private-journal')
 * @param includeCurrentDirectory - whether to consider current working directory
 * @returns resolved path to journal directory
 */
export function resolveJournalPath(
  subdirectory: string = '.private-journal',
  includeCurrentDirectory: boolean = true
): string {
  const possiblePaths = [];

  // Try current working directory only if requested and it's reasonable
  if (includeCurrentDirectory) {
    try {
      const cwd = process.cwd();
      // Don't use root directories or other system directories
      if (cwd !== '/' && cwd !== 'C:\\' && cwd !== '/System' && cwd !== '/usr') {
        possiblePaths.push(path.join(cwd, subdirectory));
      }
    } catch {
      // Ignore errors getting cwd
    }
  }

  // Try home directories (cross-platform)
  if (process.env.HOME) {
    possiblePaths.push(path.join(process.env.HOME, subdirectory));
  }
  if (process.env.USERPROFILE) {
    possiblePaths.push(path.join(process.env.USERPROFILE, subdirectory));
  }

  // Try temp directories as last resort
  possiblePaths.push(path.join('/tmp', subdirectory));
  if (process.env.TEMP) {
    possiblePaths.push(path.join(process.env.TEMP, subdirectory));
  }
  if (process.env.TMP) {
    possiblePaths.push(path.join(process.env.TMP, subdirectory));
  }

  // Filter out null/undefined and return first valid path
  const validPaths = possiblePaths.filter(Boolean);
  return validPaths[0] || path.join('/tmp', subdirectory);
}

/**
 * Resolves user home directory for personal journal storage
 * @returns path to user's private journal directory
 */
export function resolveUserJournalPath(): string {
  return resolveJournalPath('.private-journal', false);
}

/**
 * Resolves project directory for project-specific journal storage
 * @returns path to project's private journal directory
 */
export function resolveProjectJournalPath(): string {
  return resolveJournalPath('.private-journal', true);
}
