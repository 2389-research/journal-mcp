// ABOUTME: Enhanced test setup that replaces entire modules with mocks to avoid Jest spy conflicts
// ABOUTME: Uses Jest's module mocking system to substitute dependencies without spies

import { EmbeddingMock } from './mocks/EmbeddingMock';
import { FileSystemMock } from './mocks/FileSystemMock';
import { HttpMock } from './mocks/HttpMock';

// Create global mock instances that will be shared across all tests
// Tests can reset and configure these through the TestHarness
let globalFileSystemMock: FileSystemMock;
let globalEmbeddingMock: EmbeddingMock;
let globalHttpMock: HttpMock;

// Initialize global mocks
function initializeGlobalMocks() {
  globalFileSystemMock = new FileSystemMock();
  globalEmbeddingMock = new EmbeddingMock();
  globalHttpMock = new HttpMock();
}

// Call initialization
initializeGlobalMocks();

// Create a hybrid that falls back to real fs when not configured
const realFs = jest.requireActual('node:fs/promises');

jest.doMock('node:fs/promises', () => {
  return new Proxy(globalFileSystemMock, {
    get(target, prop) {
      // If the method exists on our mock and the mock is being used, use the mock
      if (prop in target && target.isActive && target.isActive()) {
        return target[prop as keyof typeof target];
      }
      // Otherwise fall back to real fs
      return realFs[prop];
    },
  });
});

// Replace the @xenova/transformers module
jest.doMock('@xenova/transformers', () => globalEmbeddingMock.getMockModule());

// Replace node-fetch
jest.doMock('node-fetch', () => globalHttpMock.getMockFetch());

// Export mock instances for test harness access
export { globalFileSystemMock, globalEmbeddingMock, globalHttpMock };

// Export function to reset all global mocks
export function resetAllGlobalMocks() {
  globalFileSystemMock.reset();
  globalEmbeddingMock.reset();
  globalHttpMock.reset();
}

// Export function to get fresh mock instances (for TestHarness)
export function createFreshMocks() {
  return {
    fileSystem: new FileSystemMock(),
    embedding: new EmbeddingMock(),
    http: new HttpMock(),
  };
}

// Helper to inject mocks into global instances
export function injectMocksIntoGlobals(mocks: {
  fileSystem?: FileSystemMock;
  embedding?: EmbeddingMock;
  http?: HttpMock;
}) {
  if (mocks.fileSystem) {
    Object.setPrototypeOf(globalFileSystemMock, Object.getPrototypeOf(mocks.fileSystem));
    Object.assign(globalFileSystemMock, mocks.fileSystem);
  }

  if (mocks.embedding) {
    Object.setPrototypeOf(globalEmbeddingMock, Object.getPrototypeOf(mocks.embedding));
    Object.assign(globalEmbeddingMock, mocks.embedding);
  }

  if (mocks.http) {
    Object.setPrototypeOf(globalHttpMock, Object.getPrototypeOf(mocks.http));
    Object.assign(globalHttpMock, mocks.http);
  }
}
