// ABOUTME: Test-only mock implementation of node-fetch for HTTP testing
// ABOUTME: Provides configurable HTTP responses and failure modes without network calls

export class HttpMock {
  private responses = new Map<string, any>();
  private calls: Array<{ url: string; options: any }> = [];
  private failureMode: 'none' | 'network' | 'timeout' | 'server-error' = 'none';

  setFailureMode(mode: 'none' | 'network' | 'timeout' | 'server-error') {
    this.failureMode = mode;
  }

  setResponse(url: string, response: any) {
    this.responses.set(url, response);
  }

  reset() {
    this.responses.clear();
    this.calls = [];
    this.failureMode = 'none';
  }

  getCalls() {
    return [...this.calls];
  }

  getCallsToUrl(url: string) {
    return this.calls.filter((call) => call.url === url);
  }

  // Mock fetch function
  getMockFetch() {
    return jest.fn().mockImplementation(async (url: string, options: any = {}) => {
      this.calls.push({ url, options });

      if (this.failureMode === 'network') {
        throw new Error('Network connection failed');
      }

      if (this.failureMode === 'timeout') {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 50);
        });
      }

      // Get configured response or default
      const configuredResponse = this.responses.get(url);

      if (this.failureMode === 'server-error') {
        return {
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          headers: new Map([['content-type', 'application/json']]),
          json: jest.fn().mockResolvedValue({ error: 'Server error' }),
          text: jest.fn().mockResolvedValue('Internal Server Error'),
        };
      }

      // Default successful response
      const response = {
        ok: configuredResponse?.ok ?? true,
        status: configuredResponse?.status ?? 200,
        statusText: configuredResponse?.statusText ?? 'OK',
        headers: new Map(
          Object.entries(configuredResponse?.headers || { 'content-type': 'application/json' })
        ),
        json: jest.fn().mockResolvedValue(configuredResponse?.data || { success: true }),
        text: jest.fn().mockResolvedValue(configuredResponse?.text || 'OK'),
      };

      return response;
    });
  }

  // Helper methods for common test scenarios
  expectPostToUrl(url: string) {
    const postCalls = this.calls.filter(
      (call) => call.url === url && call.options?.method === 'POST'
    );
    return postCalls;
  }

  expectHeaderSent(headerName: string, headerValue: string) {
    return this.calls.some((call) => call.options?.headers?.[headerName] === headerValue);
  }

  expectBodySent(expectedBody: any) {
    return this.calls.some((call) => {
      const body = call.options?.body;
      if (typeof body === 'string') {
        try {
          return JSON.stringify(JSON.parse(body)) === JSON.stringify(expectedBody);
        } catch {
          return body === expectedBody;
        }
      }
      return JSON.stringify(body) === JSON.stringify(expectedBody);
    });
  }
}
