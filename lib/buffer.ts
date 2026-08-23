import type { SupabaseClient } from '@supabase/supabase-js';

export type BufferChannel = {
  id: string;
  service: string; // 'linkedin', 'twitter', 'facebook', 'instagram', 'pinterest'
  service_username: string;
  formatted_username: string;
  avatar_https?: string;
  default?: boolean;
};

export type BufferUpdateResponse = {
  success: boolean;
  message?: string;
  updates?: Array<{
    id: string;
    created_at: number;
    day: string;
    status: string;
    text: string;
    service_update_id?: string;
    via?: string;
  }>;
};

export const BUFFER_GRAPHQL_ENDPOINT = process.env.BUFFER_GRAPHQL_ENDPOINT || 'https://api.buffer.com';

/**
 * Execute a GraphQL query or mutation against Buffer's GraphQL API (api.buffer.com)
 */
export async function bufferGraphQLRequest<T = any>(
  accessToken: string,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const res = await fetch(BUFFER_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken.trim()}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Buffer GraphQL API HTTP ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = await res.json();
  if (json.errors && json.errors.length > 0) {
    const errMessage = json.errors.map((e: any) => e.message).join('; ');
    throw new Error(`Buffer GraphQL error: ${errMessage}`);
  }

  return json.data as T;
}

const runtimeTokenStore = new Map<string, { token?: string; settings?: Record<string, unknown> }>();

export function setRuntimeBufferConfig(tenantId: string, token?: string, settings?: Record<string, unknown>) {
  const current = runtimeTokenStore.get(tenantId) || {};
  if (token !== undefined) {
    current.token = token.trim() || undefined;
  }
  if (settings !== undefined) current.settings = settings;
  runtimeTokenStore.set(tenantId, current);
}

export function getRuntimeBufferConfig(tenantId: string) {
  return runtimeTokenStore.get(tenantId);
}

export async function getActiveBufferToken(
  supabase: SupabaseClient,
  tenantId?: string
): Promise<string | null> {
  if (tenantId) {
    const mem = runtimeTokenStore.get(tenantId);
    if (mem?.token) {
      return mem.token;
    }

    try {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('buffer_access_token')
        .eq('id', tenantId)
        .single();
      if (tenant?.buffer_access_token) {
        return tenant.buffer_access_token.trim();
      }
    } catch {
      /* fallback if column not created on DB table */
    }
  }
  return process.env.BUFFER_ACCESS_TOKEN?.trim() || null;
}

/**
 * Fetch connected social channels via Buffer GraphQL API (query channels)
 * Fallback to REST v1 profiles endpoint if GraphQL schema differs.
 */
export async function fetchBufferProfiles(accessToken: string): Promise<BufferChannel[]> {
  try {
    // Step 1: Query account organizations to get the required organizationId
    const accountQuery = `
      query GetBufferAccount {
        account {
          id
          organizations {
            id
          }
        }
      }
    `;

    const accountData = await bufferGraphQLRequest<{
      account?: {
        id?: string;
        organizations?: Array<{ id: string }>;
      };
    }>(accessToken, accountQuery);

    const orgId = accountData?.account?.organizations?.[0]?.id;

    if (orgId) {
      // Step 2: Query channels using the retrieved organizationId
      const channelsQuery = `
        query GetBufferChannels($input: ChannelsInput!) {
          channels(input: $input) {
            id
            service
            name
            displayName
            avatar
          }
        }
      `;

      const channelsData = await bufferGraphQLRequest<{
        channels: Array<{
          id: string;
          service: string;
          name?: string;
          displayName?: string;
          avatar?: string;
        }>;
      }>(accessToken, channelsQuery, {
        input: { organizationId: orgId },
      });

      if (channelsData && Array.isArray(channelsData.channels) && channelsData.channels.length > 0) {
        return channelsData.channels.map((c) => ({
          id: c.id,
          service: c.service || 'social',
          service_username: c.name || c.displayName || c.service,
          formatted_username: c.displayName || c.name || c.service,
          avatar_https: c.avatar,
          default: true,
        }));
      }
    }
  } catch (graphqlError) {
    console.warn(
      '[BUFFER GRAPHQL] Falling back to REST API for channels:',
      graphqlError instanceof Error ? graphqlError.message : graphqlError
    );
  }

  // REST fallback
  const url = `https://api.bufferapp.com/1/profiles.json?access_token=${encodeURIComponent(accessToken.trim())}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Buffer API error ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error('Buffer API returned unexpected profile format');
  }

  return data.map((p: any) => ({
    id: p.id,
    service: p.service,
    service_username: p.service_username || p.formatted_username || p.service,
    formatted_username: p.formatted_username || p.service_username || p.service,
    avatar_https: p.avatar_https || p.avatar,
    default: p.default || false,
  }));
}

const CREATE_POST_MUTATION = `
  mutation CreateBufferPost($input: CreatePostInput!) {
    createPost(input: $input) {
      ... on PostActionSuccess {
        post {
          id
          status
          text
          externalLink
        }
      }
      ... on MutationError {
        message
      }
    }
  }
`;

function toIsoDate(value: string): string {
  const asNumber = Number(value);
  if (!Number.isNaN(asNumber) && value.trim() !== '') {
    const ms = asNumber < 1e12 ? asNumber * 1000 : asNumber;
    return new Date(ms).toISOString();
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return value;
}

/**
 * Create a Buffer post via GraphQL createPost.
 * Public API tokens cannot use the deprecated REST API, so this is GraphQL-only.
 */
export async function postToBuffer(
  accessToken: string,
  profileIds: string[],
  text: string,
  mediaUrl?: string | null,
  scheduledAt?: string | null
): Promise<BufferUpdateResponse> {
  const channelIds = profileIds.filter(Boolean);
  const activeProfileId = channelIds[0] || 'demo-profile';

  if (activeProfileId.startsWith('demo')) {
    return {
      success: true,
      updates: [
        {
          id: `buf_${Date.now()}`,
          created_at: Date.now(),
          day: 'today',
          status: 'sent',
          text,
          service_update_id: `17892348${Math.floor(Math.random() * 100000)}`,
        },
      ],
    };
  }

  const assets = mediaUrl ? [{ image: { url: mediaUrl } }] : [];
  const mode = scheduledAt ? 'customScheduled' : 'shareNow';
  const inputBase: Record<string, unknown> = {
    text,
    schedulingType: 'automatic',
    mode,
    needsApproval: false,
    assets,
  };
  if (scheduledAt) {
    inputBase.dueAt = toIsoDate(scheduledAt);
  }

  const updates: NonNullable<BufferUpdateResponse['updates']> = [];

  for (const channelId of channelIds) {
    const gqlResult = await bufferGraphQLRequest<{
      createPost?: {
        post?: { id: string; status: string; text?: string; externalLink?: string | null };
        message?: string;
      };
    }>(accessToken, CREATE_POST_MUTATION, {
      input: {
        ...inputBase,
        channelId,
      },
    });

    const payload = gqlResult?.createPost;
    if (payload?.message) {
      throw new Error(`Buffer createPost failed: ${payload.message}`);
    }
    if (!payload?.post?.id) {
      throw new Error('Buffer createPost returned no post id');
    }

    let liveUrl = payload.post.externalLink || undefined;
    let status = payload.post.status || (scheduledAt ? 'scheduled' : 'sent');

    if (!liveUrl && !scheduledAt) {
      const resolved = await resolveBufferPostUrl(accessToken, payload.post.id);
      liveUrl = resolved.live ? resolved.url : undefined;
      status = resolved.status || status;
    }

    updates.push({
      id: payload.post.id,
      created_at: Date.now(),
      day: 'today',
      status,
      text,
      via: liveUrl || bufferDashboardPostUrl(payload.post.id),
    });
  }

  return { success: true, updates };
}

const GET_POST_QUERY = `
  query GetBufferPost($input: PostInput!) {
    post(input: $input) {
      id
      status
      text
      externalLink
      dueAt
      sentAt
    }
  }
`;

export type BufferPostSnapshot = {
  id: string;
  status?: string;
  text?: string;
  externalLink?: string | null;
  dueAt?: string | null;
  sentAt?: string | null;
};

export function bufferDashboardPostUrl(postId: string): string {
  return `https://publish.buffer.com/all-channels?postId=${encodeURIComponent(postId)}`;
}

export async function fetchBufferPost(
  accessToken: string,
  postId: string
): Promise<BufferPostSnapshot | null> {
  if (!postId || postId.startsWith('demo') || postId.startsWith('buf_')) {
    return null;
  }

  const data = await bufferGraphQLRequest<{ post?: BufferPostSnapshot | null }>(
    accessToken,
    GET_POST_QUERY,
    { input: { id: postId } }
  );

  return data?.post ?? null;
}

export async function resolveBufferPostUrl(
  accessToken: string,
  postId: string,
  attempts = 4
): Promise<{ url: string; status?: string; live: boolean }> {
  let lastStatus: string | undefined;

  for (let i = 0; i < attempts; i += 1) {
    try {
      const post = await fetchBufferPost(accessToken, postId);
      lastStatus = post?.status;
      if (post?.externalLink) {
        return { url: post.externalLink, status: post.status, live: true };
      }
    } catch (err) {
      console.warn(
        '[BUFFER POST QUERY]',
        err instanceof Error ? err.message : err
      );
      break;
    }

    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, 1200));
    }
  }

  return {
    url: bufferDashboardPostUrl(postId),
    status: lastStatus,
    live: false,
  };
}

export function buildPublishedUrl(
  _service: string,
  bufferUpdateId: string,
  serviceUpdateId?: string,
  _username?: string
): string {
  if (serviceUpdateId?.startsWith('http')) {
    return serviceUpdateId;
  }
  if (bufferUpdateId.startsWith('http')) {
    return bufferUpdateId;
  }
  return bufferDashboardPostUrl(bufferUpdateId);
}