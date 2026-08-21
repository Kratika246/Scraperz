import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardShell from './DashboardShell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, email, role')
    .eq('id', user.id)
    .single();

  const { data: tenant } = profile
    ? await supabase
        .from('tenants')
        .select('name')
        .eq('id', profile.tenant_id)
        .single()
    : { data: null };

  const userName = user.user_metadata?.company_name || profile?.email?.split('@')[0] || 'User';
  const tenantName = tenant?.name || 'My Company';

  return (
    <DashboardShell userName={userName} tenantName={tenantName}>
      {children}
    </DashboardShell>
  );
}
