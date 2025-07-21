// ABOUTME: Test utilities for comprehensive mock management and spy cleanup
// ABOUTME: Provides aggressive cleanup functions to prevent Jest spy conflicts

import * as fs from 'node:fs/promises';

/**
 * Aggressively cleans up all Jest mocks and spies to prevent conflicts
 */
export function aggressiveCleanup(): void {
  // Clear all mocks first
  jest.clearAllMocks();

  // Restore all mocks
  jest.restoreAllMocks();

  // Manually check and restore specific fs methods that cause issues
  const fsMethods = ['mkdir', 'writeFile', 'readFile', 'readdir', 'stat', 'rm'];

  for (const method of fsMethods) {
    const fsMethod = (fs as any)[method];
    if (fsMethod && typeof fsMethod.mockRestore === 'function') {
      try {
        fsMethod.mockRestore();
      } catch {
        // Ignore if already restored
      }
    }
  }

  // Don't reset modules as it can cause issues with imports
}

// Global mock state for fs operations
let fsMockState: {
  mkdir?: (...args: any[]) => any;
  writeFile?: (...args: any[]) => any;
  readFile?: (...args: any[]) => any;
  readdir?: (...args: any[]) => any;
  [key: string]: any;
} = {};

/**
 * Sets up a centralized fs mock that all tests can share without conflicts
 */
export function setupFsMock(): void {
  const originalFs = jest.requireActual('node:fs/promises');

  jest.doMock('node:fs/promises', () => ({
    ...originalFs,
    mkdir: jest.fn().mockImplementation((...args: any[]) => {
      if (fsMockState.mkdir) {
        return fsMockState.mkdir(...args);
      }
      return originalFs.mkdir(...args);
    }),
    writeFile: jest.fn().mockImplementation((...args: any[]) => {
      if (fsMockState.writeFile) {
        return fsMockState.writeFile(...args);
      }
      return originalFs.writeFile(...args);
    }),
    readFile: jest.fn().mockImplementation((...args: any[]) => {
      if (fsMockState.readFile) {
        return fsMockState.readFile(...args);
      }
      return originalFs.readFile(...args);
    }),
    readdir: jest.fn().mockImplementation((...args: any[]) => {
      if (fsMockState.readdir) {
        return fsMockState.readdir(...args);
      }
      return originalFs.readdir(...args);
    }),
    stat: jest.fn().mockImplementation((...args: any[]) => {
      if (fsMockState.stat) {
        return fsMockState.stat(...args);
      }
      return originalFs.stat(...args);
    }),
    rm: jest.fn().mockImplementation((...args: any[]) => {
      if (fsMockState.rm) {
        return fsMockState.rm(...args);
      }
      return originalFs.rm(...args);
    }),
  }));
}

/**
 * Configures mock behavior for a specific fs method
 */
export function mockFsMethod<T extends keyof typeof fsMockState>(
  method: T,
  implementation: (...args: any[]) => any
): void {
  fsMockState[method] = implementation;
}

/**
 * Resets fs mock state
 */
export function resetFsMocks(): void {
  fsMockState = {};
}

/**
 * Safely creates a spy on an fs method, restoring any existing spy first
 */
export function safeSpy<T extends keyof typeof fs>(
  method: T,
  implementation?: (...args: any[]) => any
): jest.SpyInstance {
  const fsMethod = (fs as any)[method];

  // If there's already a mock, restore it first
  if (fsMethod && typeof fsMethod.mockRestore === 'function') {
    try {
      fsMethod.mockRestore();
    } catch {
      // Ignore if already restored
    }
  }

  // Create the spy
  const spy = jest.spyOn(fs, method as any);

  if (implementation) {
    spy.mockImplementation(implementation);
  }

  return spy;
}

/**
 * Checks if a function is currently mocked
 */
export function isMocked(fn: any): boolean {
  return fn && (fn._isMockFunction || typeof fn.mockRestore === 'function');
}
