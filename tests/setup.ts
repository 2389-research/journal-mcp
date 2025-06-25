// Global test setup
// Mock the transformers library to avoid ES module issues in Jest
jest.mock('@xenova/transformers', () => ({
  pipeline: jest.fn().mockResolvedValue(
    jest.fn().mockResolvedValue({
      data: new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]), // Mock embedding vector
    })
  ),
}));

// Mock node-fetch for all tests
jest.mock('node-fetch', () => jest.fn());

// Mock MCP SDK to avoid ES module issues
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn().mockImplementation(() => {
    const requestHandlers = new Map();
    let handlerIndex = 0;
    const knownMethods = [
      'tools/list',
      'tools/call',
      'resources/list',
      'resources/read',
      'prompts/list',
      'prompts/get',
    ];

    return {
      setRequestHandler: jest.fn((schema, handler) => {
        // Since we can't reliably extract methods from mocked schemas,
        // use the order of registration to map to known methods
        const key = knownMethods[handlerIndex] || `unknown-${handlerIndex}`;
        handlerIndex++;
        requestHandlers.set(key, handler);
      }),
      connect: jest.fn(),
      requestHandlers,
    };
  }),
}));

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@modelcontextprotocol/sdk/types.js', () => ({
  CallToolRequestSchema: {},
  ErrorCode: {},
  McpError: jest.fn(),
  ListToolsRequestSchema: {},
  ListResourcesRequestSchema: {},
  ReadResourceRequestSchema: {},
  ListPromptsRequestSchema: {},
  GetPromptRequestSchema: {},
}));
