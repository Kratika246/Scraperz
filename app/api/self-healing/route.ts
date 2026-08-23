import { NextResponse } from 'next/server';
import { getSelfHealingLogs } from '@/lib/self_healing';

export async function GET() {
  const logs = getSelfHealingLogs();
  const totalRecovered = logs.reduce((acc, l) => acc + l.items_recovered, 0);

  return NextResponse.json({
    status: 'active',
    mode: 'self-healing-resilient-v2',
    total_healing_events: logs.length,
    total_items_recovered: totalRecovered,
    logs,
  });
}
