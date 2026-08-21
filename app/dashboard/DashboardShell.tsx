'use client';

import React from 'react';
import Sidebar from '@/components/dashboard/Sidebar';

interface DashboardShellProps {
  userName: string;
  tenantName: string;
  children: React.ReactNode;
}

export default function DashboardShell({
  userName,
  tenantName,
  children,
}: DashboardShellProps) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar userName={userName} tenantName={tenantName} />
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  );
}
