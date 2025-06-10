// Global test setup
// Mock the transformers library to avoid ES module issues in Jest
jest.mock('@xenova/transformers', () => ({
  pipeline: jest.fn().mockResolvedValue(
    jest.fn().mockResolvedValue({
      data: new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]) // Mock embedding vector
    })
  ),
}));

// Mock node-fetch for all tests
jest.mock('node-fetch', () => jest.fn());