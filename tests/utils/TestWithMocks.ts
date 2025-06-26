// ABOUTME: Utility for tests that want to use the new mock system
// ABOUTME: Provides clean module mocking without affecting other tests

import { EmbeddingMock } from '../mocks/EmbeddingMock';
import { FileSystemMock } from '../mocks/FileSystemMock';
import { HttpMock } from '../mocks/HttpMock';

export class TestWithMocks {
  private fileSystemMock: FileSystemMock;
  private embeddingMock: EmbeddingMock;
  private httpMock: HttpMock;
  private originalModules: any = {};

  constructor() {
    this.fileSystemMock = new FileSystemMock();
    this.embeddingMock = new EmbeddingMock();
    this.httpMock = new HttpMock();
  }

  // Setup mocks for this specific test
  setup() {
    // Store original modules
    this.originalModules.fs = require('node:fs/promises');

    // Replace modules in Jest's module registry
    jest.doMock('node:fs/promises', () => this.fileSystemMock);
    jest.doMock('@xenova/transformers', () => this.embeddingMock.getMockModule());
    jest.doMock('node-fetch', () => this.httpMock.getMockFetch());
  }

  // Cleanup - restore original modules
  cleanup() {
    // Reset modules to their original state
    jest.dontMock('node:fs/promises');
    jest.dontMock('@xenova/transformers');
    jest.dontMock('node-fetch');

    // Clear module cache to ensure fresh imports
    jest.resetModules();
  }

  // Reset mock state between tests
  reset() {
    this.fileSystemMock.reset();
    this.embeddingMock.reset();
    this.httpMock.reset();
  }

  // Configuration methods
  configureFileSystemFailure(type: 'permission' | 'disk-full' | 'network' | 'none') {
    this.fileSystemMock.setFailureMode(type);
  }

  configureEmbeddingFailure(type: 'initialization' | 'generation' | 'timeout' | 'memory' | 'none') {
    this.embeddingMock.setFailureMode(type);
  }

  configureHttpFailure(type: 'network' | 'timeout' | 'server-error' | 'none') {
    this.httpMock.setFailureMode(type);
  }

  configureHttpResponse(url: string, response: any) {
    this.httpMock.setResponse(url, response);
  }

  // Verification methods
  getWrittenFiles() {
    return this.fileSystemMock.getWrittenFiles();
  }

  getFileSystemCalls() {
    return this.fileSystemMock.getCalls();
  }

  getEmbeddingCalls() {
    return this.embeddingMock.getCalls();
  }

  getHttpCalls() {
    return this.httpMock.getCalls();
  }

  // Helper verification methods
  expectFileWritten(path: string) {
    return this.fileSystemMock.getWrittenFiles().has(path);
  }

  expectFileContent(path: string, content: string) {
    const writtenContent = this.fileSystemMock.getWrittenFiles().get(path);
    return writtenContent?.includes(content) ?? false;
  }

  expectEmbeddingGenerated(text?: string) {
    const calls = this.embeddingMock.getGenerationCalls();
    if (text) {
      return calls.some((call) => call.args[0] === text);
    }
    return calls.length > 0;
  }

  expectHttpRequest(url: string, method?: string) {
    const calls = this.httpMock.getCalls();
    return calls.some((call) => {
      const urlMatch = call.url === url;
      const methodMatch = method ? call.options?.method === method : true;
      return urlMatch && methodMatch;
    });
  }
}
