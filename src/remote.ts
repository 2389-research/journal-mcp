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

  const url = `${config.serverUrl}/teams/${config.teamId}/journal/entries`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Remote server error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }
  } catch (error) {
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

  const url = `${config.serverUrl}/teams/${config.teamId}/journal/search`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey,
      },
      body: JSON.stringify(searchRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Remote search error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = (await response.json()) as RemoteSearchResponse;
    return data;
  } catch (error) {
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

  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());
  if (offset !== undefined) params.append('offset', offset.toString());

  const url = `${config.serverUrl}/teams/${config.teamId}/journal/entries?${params}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': config.apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Remote entries error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = (await response.json()) as { entries?: unknown[]; total_count?: number };
    return {
      entries: (data.entries || []) as RemoteSearchResult[],
      total_count: data.total_count || 0,
    };
  } catch (error) {
    throw error;
  }
}

export async function getRemoteEntryById(
  config: RemoteConfig,
  entryId: string
): Promise<RemoteSearchResult | null> {
  if (!config.enabled) {
    throw new Error('Remote server not configured');
  }

  const url = `${config.serverUrl}/teams/${config.teamId}/journal/entries/${entryId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': config.apiKey,
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Remote entry fetch error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = (await response.json()) as RemoteSearchResult;
    return data;
  } catch (error) {
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
