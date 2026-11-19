import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
export async function GET() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabase.rpc('export_my_data');
  if (error) return NextResponse.json({ error: 'Export failed' }, { status: 500 }); // no internals leaked
  return new NextResponse(JSON.stringify(data, null, 2), { headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="lumora-data.json"', 'Cache-Control': 'no-store' } });
}
