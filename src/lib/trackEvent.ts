import { supabase } from '@/integrations/supabase/client';

export function trackFunnelEvent(
  event: string,
  opts?: { source?: string; variant?: string; submission_id?: string }
) {
  try {
    supabase.from('funnel_events').insert({
      event,
      source: opts?.source || 'direct',
      variant: opts?.variant || null,
      submission_id: opts?.submission_id || null,
    }).then(() => {});
  } catch {}
}
