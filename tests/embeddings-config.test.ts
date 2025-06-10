// ABOUTME: Tests for configurable embedding models
// ABOUTME: Validates environment variable configuration and model selection

import { EmbeddingService } from '../src/embeddings';

describe('Embedding Model Configuration', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    // Save original environment variable
    originalEnv = process.env.JOURNAL_EMBEDDING_MODEL;
    // Reset singleton instance
    EmbeddingService.resetInstance();
  });

  afterEach(() => {
    // Restore original environment variable
    if (originalEnv !== undefined) {
      process.env.JOURNAL_EMBEDDING_MODEL = originalEnv;
    } else {
      delete process.env.JOURNAL_EMBEDDING_MODEL;
    }
    // Reset singleton instance
    EmbeddingService.resetInstance();
  });

  test('uses default model when no configuration provided', () => {
    delete process.env.JOURNAL_EMBEDDING_MODEL;
    
    const service = EmbeddingService.getInstance();
    expect(service.getModelName()).toBe('Xenova/all-MiniLM-L6-v2');
  });

  test('uses environment variable model when set', () => {
    process.env.JOURNAL_EMBEDDING_MODEL = 'Xenova/all-distilroberta-v1';
    
    const service = EmbeddingService.getInstance();
    expect(service.getModelName()).toBe('Xenova/all-distilroberta-v1');
  });

  test('parameter overrides environment variable', () => {
    process.env.JOURNAL_EMBEDDING_MODEL = 'Xenova/all-distilroberta-v1';
    
    const service = EmbeddingService.getInstance('Xenova/paraphrase-MiniLM-L6-v2');
    expect(service.getModelName()).toBe('Xenova/paraphrase-MiniLM-L6-v2');
  });

  test('singleton returns same instance with same model', () => {
    const service1 = EmbeddingService.getInstance('Xenova/all-MiniLM-L6-v2');
    const service2 = EmbeddingService.getInstance('Xenova/different-model');
    
    // Should return the same instance (singleton pattern)
    expect(service1).toBe(service2);
    expect(service1.getModelName()).toBe('Xenova/all-MiniLM-L6-v2');
  });

  test('reset instance allows new model configuration', () => {
    const service1 = EmbeddingService.getInstance('Xenova/model-1');
    expect(service1.getModelName()).toBe('Xenova/model-1');
    
    EmbeddingService.resetInstance();
    
    const service2 = EmbeddingService.getInstance('Xenova/model-2');
    expect(service2.getModelName()).toBe('Xenova/model-2');
    expect(service1).not.toBe(service2);
  });

  test('model selection priority: parameter > env var > default', () => {
    // Test default
    delete process.env.JOURNAL_EMBEDDING_MODEL;
    let service = EmbeddingService.getInstance();
    expect(service.getModelName()).toBe('Xenova/all-MiniLM-L6-v2');
    
    EmbeddingService.resetInstance();
    
    // Test environment variable
    process.env.JOURNAL_EMBEDDING_MODEL = 'env-model';
    service = EmbeddingService.getInstance();
    expect(service.getModelName()).toBe('env-model');
    
    EmbeddingService.resetInstance();
    
    // Test parameter override
    service = EmbeddingService.getInstance('param-model');
    expect(service.getModelName()).toBe('param-model');
  });
});