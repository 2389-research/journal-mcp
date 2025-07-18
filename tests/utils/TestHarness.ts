// ABOUTME: Test harness that coordinates all mock dependencies for testing
// ABOUTME: Provides clean test isolation and failure scenario configuration without Jest spies

import { EmbeddingMock } from '../mocks/EmbeddingMock';
import { FileSystemMock } from '../mocks/FileSystemMock';
import { HttpMock } from '../mocks/HttpMock';
import { injectMocksIntoGlobals } from '../setup-enhanced';

export class TestHarness {
  private fileSystemMock: FileSystemMock;
  private embeddingMock: EmbeddingMock;
  private httpMock: HttpMock;

  constructor() {
    // Create fresh instances for this test
    this.fileSystemMock = new FileSystemMock();
    this.embeddingMock = new EmbeddingMock();
    this.httpMock = new HttpMock();

    // Activate the file system mock for this test
    this.fileSystemMock.activate();

    // Inject these fresh instances into the global mocks
    // This ensures each test gets clean state
    injectMocksIntoGlobals({
      fileSystem: this.fileSystemMock,
      embedding: this.embeddingMock,
      http: this.httpMock,
    });
  }

  // Reset all mocks to clean state
  reset() {
    this.fileSystemMock.reset();
    this.embeddingMock.reset();
    this.httpMock.reset();
  }

  // File System Configuration
  configureFileSystemFailure(type: 'permission' | 'disk-full' | 'network' | 'none') {
    this.fileSystemMock.setFailureMode(type);
  }

  // Embedding Service Configuration
  configureEmbeddingFailure(type: 'initialization' | 'generation' | 'timeout' | 'memory' | 'none') {
    this.embeddingMock.setFailureMode(type);
  }

  // HTTP Client Configuration
  configureHttpFailure(type: 'network' | 'timeout' | 'server-error' | 'none') {
    this.httpMock.setFailureMode(type);
  }

  configureHttpResponse(url: string, response: any) {
    this.httpMock.setResponse(url, response);
  }

  // Verification Methods (replaces spy assertions)
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

  // Specific verification helpers
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

  // Get mock instances for Jest module replacement
  getFileSystemMock() {
    return this.fileSystemMock;
  }

  getEmbeddingMock() {
    return this.embeddingMock;
  }

  getHttpMock() {
    return this.httpMock;
  }

  // Utility methods for common test patterns
  simulateSuccessfulJournalWrite() {
    // No configuration needed - defaults to success
  }

  simulateCompleteSystemFailure() {
    this.configureFileSystemFailure('permission');
    this.configureEmbeddingFailure('initialization');
    this.configureHttpFailure('network');
  }

  simulatePartialFailure(component: 'filesystem' | 'embedding' | 'http') {
    switch (component) {
      case 'filesystem':
        this.configureFileSystemFailure('disk-full');
        break;
      case 'embedding':
        this.configureEmbeddingFailure('generation');
        break;
      case 'http':
        this.configureHttpFailure('timeout');
        break;
    }
  }

  // Debug helpers
  printAllCalls() {
    console.log('FileSystem calls:', this.getFileSystemCalls());
    console.log('Embedding calls:', this.getEmbeddingCalls());
    console.log('HTTP calls:', this.getHttpCalls());
  }

  getCombinedCallCount() {
    return (
      this.getFileSystemCalls().length +
      this.getEmbeddingCalls().length +
      this.getHttpCalls().length
    );
  }
}
