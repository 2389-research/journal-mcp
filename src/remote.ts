// ABOUTME: Remote server posting functionality for journal entries
// ABOUTME: Handles HTTP POST requests to external journal servers with authentication

import fetch from 'node-fetch';

export interface RemoteConfig {
  serverUrl: string;
  teamId: string;
  apiKey: string;
  enabled: boolean;
  remoteOnly?: boolean; // Skip local storage, use server as single source of truth
}

export interface RemoteJournalPayload {
  team_id: string;
  timestamp: number;
  sections?: {
    feelings?: string;
    project_notes?: string;
    technical_insights?: string;
    user_context?: string;
    world_knowledge?: string;
  };
  content?: string;
  embedding?: number[];
}

export interface RemoteSearchRequest {
  query: string;
  limit?: number;
  offset?: number;
  date_from?: string;
  date_to?: string;
  sections?: string[];
  similarity_threshold?: number;
}

export interface RemoteSearchResult {
  id: string;
  team_id: string;
  similarity_score: number;
  timestamp: number;
  created_at: string;
  sections?: {
    feelings?: string;
    project_notes?: string;
    technical_insights?: string;
    user_context?: string;
    world_knowledge?: string;
  };
  content?: string;
  matched_sections?: string[];
}

export interface RemoteSearchResponse {
  results: RemoteSearchResult[];
  total_count: number;
  query_embedding?: number[];
}

export async function postToRemoteServer(
  config: RemoteConfig,
  payload: RemoteJournalPayload
): Promise<void> {
  if (!config.enabled) {
    return;
  }

  const debug = process.env.JOURNAL_DEBUG === 'true';
  const url = `${config.serverUrl}/teams/${config.teamId}/journal/entries`;

  if (debug) {
    console.error('=== REMOTE POST DEBUG ===');
    console.error('URL:', url);
    console.error('Headers:', {
      'Content-Type': 'application/json',
      'X-API-Key': `${config.apiKey.substring(0, 8)}...`,
    });
    console.error('Payload size:', JSON.stringify(payload).length, 'bytes');
    console.error('Payload structure:', {
      team_id: payload.team_id,
      timestamp: payload.timestamp,
      has_content: !!payload.content,
      has_sections: !!payload.sections,
      sections_count: payload.sections ? Object.keys(payload.sections).length : 0,
      embedding_length: payload.embedding?.length || 0,
    });
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (debug) {
      console.error('Response status:', response.status, response.statusText);
      console.error('Response headers:', Object.fromEntries(response.headers.entries()));
    }

    if (!response.ok) {
      const errorText = await response.text();
      if (debug) {
        console.error('Error response body:', errorText);
      }
      throw new Error(
        `Remote server error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const responseText = await response.text();
    if (debug) {
      console.error('Success response body:', responseText);
      console.error('=== END REMOTE POST DEBUG ===');
    }

    console.error('Remote journal post successful');
  } catch (error) {
    if (debug) {
      console.error('=== REMOTE POST ERROR ===');
      console.error('Error details:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('=== END REMOTE POST ERROR ===');
    }
    // Log error but don't rethrow - we want local journaling to continue
    console.error(
      'Remote journal post failed:',
      error instanceof Error ? error.message : String(error)
    );
    throw error; // Re-throw for caller to handle gracefully
  }
}

export async function searchRemoteServer(
  config: RemoteConfig,
  searchRequest: RemoteSearchRequest
): Promise<RemoteSearchResponse> {
  if (!config.enabled) {
    throw new Error('Remote server not configured');
  }

  const debug = process.env.JOURNAL_DEBUG === 'true';
  const url = `${config.serverUrl}/teams/${config.teamId}/journal/search`;

  if (debug) {
    console.error('=== REMOTE SEARCH DEBUG ===');
    console.error('URL:', url);
    console.error('Search request:', JSON.stringify(searchRequest, null, 2));
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey,
      },
      body: JSON.stringify(searchRequest),
    });

    if (debug) {
      console.error('Search response status:', response.status, response.statusText);
    }

    if (!response.ok) {
      const errorText = await response.text();
      if (debug) {
        console.error('Search error response:', errorText);
        console.error('=== END REMOTE SEARCH DEBUG ===');
      }
      throw new Error(
        `Remote search error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = (await response.json()) as RemoteSearchResponse;
    if (debug) {
      console.error('Search response data:', JSON.stringify(data, null, 2));
      console.error('=== END REMOTE SEARCH DEBUG ===');
    }
    return data;
  } catch (error) {
    if (debug) {
      console.error('=== REMOTE SEARCH ERROR ===');
      console.error('Error details:', error);
      console.error('=== END REMOTE SEARCH ERROR ===');
    }
    console.error('Remote search failed:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

export async function getRemoteEntries(
  config: RemoteConfig,
  limit?: number,
  offset?: number
): Promise<{ entries: RemoteSearchResult[]; total_count: number }> {
  if (!config.enabled) {
    throw new Error('Remote server not configured');
  }

  const debug = process.env.JOURNAL_DEBUG === 'true';
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());
  if (offset !== undefined) params.append('offset', offset.toString());

  const url = `${config.serverUrl}/teams/${config.teamId}/journal/entries?${params}`;

  if (debug) {
    console.error('=== REMOTE ENTRIES DEBUG ===');
    console.error('URL:', url);
    console.error('Params:', { limit, offset });
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': config.apiKey,
      },
    });

    if (debug) {
      console.error('Entries response status:', response.status, response.statusText);
    }

    if (!response.ok) {
      const errorText = await response.text();
      if (debug) {
        console.error('Entries error response:', errorText);
        console.error('=== END REMOTE ENTRIES DEBUG ===');
      }
      throw new Error(
        `Remote entries error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = (await response.json()) as { entries?: unknown[]; total_count?: number };
    if (debug) {
      console.error('Entries response data:', JSON.stringify(data, null, 2));
      console.error('=== END REMOTE ENTRIES DEBUG ===');
    }

    return {
      entries: (data.entries || []) as RemoteSearchResult[],
      total_count: data.total_count || 0,
    };
  } catch (error) {
    if (debug) {
      console.error('=== REMOTE ENTRIES ERROR ===');
      console.error('Error details:', error);
      console.error('=== END REMOTE ENTRIES ERROR ===');
    }
    console.error(
      'Remote entries fetch failed:',
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

export function createRemoteConfig(): RemoteConfig | undefined {
  const serverUrl = process.env.REMOTE_JOURNAL_SERVER_URL;
  const teamId = process.env.REMOTE_JOURNAL_TEAMID;
  const apiKey = process.env.REMOTE_JOURNAL_APIKEY;
  const remoteOnly = process.env.REMOTE_JOURNAL_ONLY === 'true';

  if (!serverUrl || !teamId || !apiKey) {
    return undefined;
  }

  return {
    serverUrl,
    teamId,
    apiKey,
    enabled: true,
    remoteOnly,
  };
}
