import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date().toISOString().split('T')[0];

    // Get all active recurring invoices due today or earlier
    const { data: dueRecurring, error: fetchError } = await supabase
      .from('recurring_invoices')
      .select('*, source_invoice:invoices(*, invoice_items:invoice_items(*))')
      .eq('status', 'active')
      .eq('auto_generate', true)
      .lte('next_run_date', today);

    if (fetchError) throw fetchError;

    let generated = 0;

    for (const rec of dueRecurring || []) {
      const source = rec.source_invoice;
      if (!source) continue;

      // Check if end_date is past
      if (rec.end_date && rec.end_date < today) {
        await supabase.from('recurring_invoices').update({ status: 'ended' }).eq('id', rec.id);
        continue;
      }

      // Get invoice count for numbering
      const { count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', rec.user_id);

      // Get user settings for prefix
      const { data: settings } = await supabase
        .from('business_settings')
        .select('invoice_number_prefix, payment_terms')
        .eq('user_id', rec.user_id)
        .maybeSingle();

      const prefix = settings?.invoice_number_prefix || 'RE-';
      const year = new Date().getFullYear();
      const seq = String((count || 0) + 1).padStart(3, '0');
      const invoiceNumber = `${prefix}${year}-${seq}`;

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      // Create invoice
      const { data: newInvoice, error: insertError } = await supabase
        .from('invoices')
        .insert({
          user_id: rec.user_id,
          customer_id: rec.customer_id,
          invoice_number: invoiceNumber,
          date: today,
          due_date: dueDate.toISOString().split('T')[0],
          status: 'open',
          notes: source.notes,
          intro_text: source.intro_text,
          footer_text: source.footer_text,
          closing_text: source.closing_text,
          subtotal: source.subtotal,
          tax_total: source.tax_total,
          grand_total: source.grand_total,
          source_recurring_id: rec.id,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating invoice for recurring', rec.id, insertError);
        continue;
      }

      // Copy line items
      const sourceItems = source.invoice_items || [];
      if (sourceItems.length > 0) {
        await supabase.from('invoice_items').insert(
          sourceItems.map((item: any, i: number) => ({
            invoice_id: newInvoice.id,
            title: item.title,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate,
            total: item.total,
            sort_order: i,
          }))
        );
      }

      // Calculate next run date
      const nextRun = new Date(rec.next_run_date);
      switch (rec.frequency) {
        case 'weekly': nextRun.setDate(nextRun.getDate() + 7); break;
        case 'every_2_weeks': nextRun.setDate(nextRun.getDate() + 14); break;
        case 'monthly': nextRun.setMonth(nextRun.getMonth() + 1); break;
        case 'quarterly': nextRun.setMonth(nextRun.getMonth() + 3); break;
      }

      await supabase
        .from('recurring_invoices')
        .update({ next_run_date: nextRun.toISOString().split('T')[0] })
        .eq('id', rec.id);

      generated++;
    }

    return new Response(JSON.stringify({ success: true, generated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error generating recurring invoices:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
