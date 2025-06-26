// ABOUTME: Test-only mock implementation of @xenova/transformers for embedding tests
// ABOUTME: Provides predictable embedding responses with configurable failure modes

export class EmbeddingMock {
  private calls: Array<{ method: string; args: any[] }> = [];
  private failureMode: 'none' | 'initialization' | 'generation' | 'timeout' | 'memory' = 'none';
  private initialized = false;

  setFailureMode(mode: 'none' | 'initialization' | 'generation' | 'timeout' | 'memory') {
    this.failureMode = mode;
  }

  reset() {
    this.calls = [];
    this.failureMode = 'none';
    this.initialized = false;
  }

  getCalls() {
    return [...this.calls];
  }

  // Mock the pipeline function from @xenova/transformers
  getMockPipeline() {
    return jest.fn().mockImplementation(async (task: string, modelName: string) => {
      this.calls.push({ method: 'pipeline', args: [task, modelName] });

      if (this.failureMode === 'initialization') {
        throw new Error('Failed to load model');
      }

      if (this.failureMode === 'timeout') {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Model loading timeout')), 100);
        });
      }

      if (this.failureMode === 'memory') {
        throw new Error('Cannot allocate memory for model');
      }

      this.initialized = true;

      // Return mock extractor function
      return jest.fn().mockImplementation(async (text: string) => {
        this.calls.push({ method: 'extract', args: [text] });

        if (this.failureMode === 'generation') {
          throw new Error('Embedding generation failed');
        }

        // Return mock embedding data
        return {
          data: new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]),
        };
      });
    });
  }

  // Mock the entire transformers module
  getMockModule() {
    return {
      pipeline: this.getMockPipeline(),
    };
  }

  isInitialized() {
    return this.initialized;
  }

  // Utility methods for test assertions
  getInitializationCalls() {
    return this.calls.filter((call) => call.method === 'pipeline');
  }

  getGenerationCalls() {
    return this.calls.filter((call) => call.method === 'extract');
  }

  getCallCount() {
    return this.calls.length;
  }
}
