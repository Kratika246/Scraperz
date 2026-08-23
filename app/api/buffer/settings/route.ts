import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  fetchBufferProfiles,
  getActiveBufferToken,
  setRuntimeBufferConfig,
  getRuntimeBufferConfig,
  type BufferChannel,
} from '@/lib/buffer';

async function persistTenantFields(
  userClient: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  payload: Record<string, unknown>
) {
  const { data, error } = await userClient
    .from('tenants')
    .update(payload)
    .eq('id', tenantId)
    .select('id')
    .maybeSingle();

  if (!error && data?.id) {
    return;
  }

  try {
    const admin = createAdminClient();
    const { data: adminData, error: adminError } = await admin
      .from('tenants')
      .update(payload)
      .eq('id', tenantId)
      .select('id')
      .maybeSingle();

    if (!adminError && adminData?.id) {
      return;
    }

    throw new Error(
      adminError?.message || error?.message || 'Could not save Buffer settings to the workspace'
    );
  } catch (adminErr) {
    throw new Error(
      adminErr instanceof Error
        ? adminErr.message
        : error?.message || 'Could not save Buffer settings to the workspace'
    );
  }
}

const DEMO_FALLBACK_CHANNELS: BufferChannel[] = [
  {
    id: 'demo_linkedin_ch_101',
    service: 'linkedin',
    service_username: 'Brand Official LinkedIn Page',
    formatted_username: 'Brand Official LinkedIn Page',
    default: true,
  },
  {
    id: 'demo_twitter_ch_102',
    service: 'twitter',
    service_username: 'Brand Official X/Twitter',
    formatted_username: 'Brand Official X/Twitter',
    default: false,
  },
];

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  const tenantId = profile?.tenant_id;
  const token = await getActiveBufferToken(supabase, tenantId);

  let channels: BufferChannel[] = [];
  let tokenStatus = 'not_configured';
  let errorMsg = '';

  if (token) {
    try {
      channels = await fetchBufferProfiles(token);
      tokenStatus = 'connected';
    } catch (err) {
      tokenStatus = 'simulation';
      errorMsg = err instanceof Error ? err.message : 'Invalid or unverified Buffer Access Token';
      channels = DEMO_FALLBACK_CHANNELS;
    }
  }

  const mem = tenantId ? getRuntimeBufferConfig(tenantId) : null;
  let dbSettings: Record<string, unknown> = mem?.settings || {};

  if (tenantId && Object.keys(dbSettings).length === 0) {
    try {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('buffer_settings')
        .eq('id', tenantId)
        .single();
      if (tenant?.buffer_settings) {
        dbSettings = tenant.buffer_settings;
      }
    } catch {
      /* ignore if column doesn't exist */
    }
  }

  return NextResponse.json({
    ok: true,
    token_configured: Boolean(token),
    token_masked: token ? `${token.slice(0, 6)}...${token.slice(-4)}` : '',
    token_status: tokenStatus,
    error_message: errorMsg,
    channels,
    settings: dbSettings,
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { buffer_access_token, buffer_settings } = body as {
    buffer_access_token?: string;
    buffer_settings?: Record<string, unknown>;
  };

  const incomingToken = (buffer_access_token || '').trim();
  const existingToken = await getActiveBufferToken(supabase, profile.tenant_id);
  const tokenToUse = incomingToken || existingToken;

  if (incomingToken) {
    setRuntimeBufferConfig(profile.tenant_id, incomingToken, buffer_settings);
  } else {
    setRuntimeBufferConfig(profile.tenant_id, undefined, buffer_settings);
  }

  const updatePayload: Record<string, unknown> = {};
  if (incomingToken) {
    updatePayload.buffer_access_token = incomingToken;
  }
  if (buffer_settings !== undefined) {
    updatePayload.buffer_settings = buffer_settings;
  }

  if (Object.keys(updatePayload).length > 0) {
    try {
      await persistTenantFields(supabase, profile.tenant_id, updatePayload);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Failed to persist Buffer settings' },
        { status: 500 }
      );
    }
  }

  let channels: BufferChannel[] = [];
  let warningMessage = '';
  let tokenStatus = tokenToUse ? 'connected' : 'not_configured';

  if (tokenToUse) {
    try {
      channels = await fetchBufferProfiles(tokenToUse);
      tokenStatus = 'connected';
    } catch (err) {
      console.warn('Buffer Token Verification Note:', err instanceof Error ? err.message : err);
      tokenStatus = 'error';
      warningMessage =
        err instanceof Error ? err.message : 'Buffer rejected the saved access token';
    }
  }

  return NextResponse.json({
    ok: true,
    message: warningMessage || 'Buffer configuration saved successfully',
    warning: warningMessage || undefined,
    token_configured: Boolean(tokenToUse),
    token_masked: tokenToUse ? `${tokenToUse.slice(0, 6)}...${tokenToUse.slice(-4)}` : '',
    token_status: tokenStatus,
    channels,
  });
}
