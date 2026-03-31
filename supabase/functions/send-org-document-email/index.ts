const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function injectVariables(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value ?? '');
  }
  return result;
}

function buildEmailHtml(vars: Record<string, string>): string {
  const logoBlock = vars.logo_url
    ? `<tr><td align="center" style="padding:30px 20px 10px 20px;"><img src="${vars.logo_url}" alt="${vars.sender_name}" style="max-width:180px;max-height:60px;" /></td></tr>`
    : '';

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background-color:#000000;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;">
<tr><td align="center" style="padding:20px 0;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
${logoBlock}
<tr><td style="padding:30px 30px 10px 30px;">
<h1 style="color:#FFFFFF;font-size:22px;margin:0 0 8px 0;">${vars.document_title}</h1>
<p style="color:#999999;font-size:14px;margin:0 0 4px 0;">${vars.document_type_label}</p>
${vars.amount_total && vars.amount_total !== '–' ? `<p style="color:#FFFFFF;font-size:16px;font-weight:bold;margin:8px 0 0 0;">${vars.amount_total}</p>` : ''}
</td></tr>
<tr><td style="padding:10px 30px 20px 30px;">
<p style="color:#CCCCCC;font-size:14px;line-height:1.6;margin:0;">
Guten Tag${vars.recipient_name ? ' ' + vars.recipient_name : ''},<br/><br/>
Sie haben ein neues Dokument von <strong style="color:#FFFFFF;">${vars.sender_name}</strong> erhalten.
Bitte öffnen Sie den folgenden Link, um das Dokument einzusehen${vars.is_signable === 'true' ? ' und zu unterschreiben' : ''}.
</p>
</td></tr>
<tr><td align="center" style="padding:10px 30px 10px 30px;">
<p style="margin:0;"><a href="${vars.signing_url}" style="color:#FFFFFF;font-size:16px;font-weight:bold;text-decoration:none;">→ DOKUMENT ANSEHEN${vars.is_signable === 'true' ? ' & UNTERSCHREIBEN' : ''}</a></p>
</td></tr>
<tr><td style="padding:10px 30px 20px 30px;">
<p style="color:#666666;font-size:11px;line-height:1.5;margin:0;">
Falls der Link nicht direkt funktioniert, kopiere ihn in deinen Browser:<br/>
<a href="${vars.signing_url}" style="color:#666666;word-break:break-all;">${vars.signing_url}</a>
</p>
</td></tr>
${vars.footer_text ? `<tr><td style="padding:10px 30px 30px 30px;border-top:1px solid #222222;"><p style="color:#666666;font-size:11px;line-height:1.5;margin:0;">${vars.footer_text}</p></td></tr>` : ''}
<tr><td style="padding:10px 30px 30px 30px;"><p style="color:#444444;font-size:10px;margin:0;">Gesendet über KÖFMAN</p></td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  offer: 'Angebot',
  invoice: 'Rechnung',
  contract: 'Vertrag',
  reminder: 'Mahnung',
};

const SIGNABLE_TYPES = ['offer', 'contract'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub;

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { document_id } = await req.json();
    if (!document_id) {
      return new Response(JSON.stringify({ error: 'document_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Load document (use admin client to avoid RLS issues for service operations)
    const { data: doc, error: docError } = await supabaseAdmin
      .from('org_documents')
      .select('*')
      .eq('id', document_id)
      .single();
    if (docError || !doc) {
      return new Response(JSON.stringify({ error: 'Document not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!doc.recipient_email) {
      return new Response(JSON.stringify({ error: 'No recipient email on document' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Load organization
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', doc.organization_id)
      .single();

    // Load email settings
    const { data: emailSettings } = await supabaseAdmin
      .from('organization_email_settings')
      .select('*')
      .eq('organization_id', doc.organization_id)
      .maybeSingle();

    // Generate public_token if missing
    let publicToken = doc.public_token;
    if (!publicToken) {
      publicToken = crypto.randomUUID();
      await supabaseAdmin
        .from('org_documents')
        .update({ public_token: publicToken })
        .eq('id', document_id);
    }

    const appUrl = (Deno.env.get('PUBLIC_APP_URL') || 'https://koefman.de').replace(/\/+$/, '');
    const signingUrl = `${appUrl}/document/view/${publicToken}`;

    const senderName = emailSettings?.sender_name || org?.name || 'KÖFMAN';
    const replyTo = emailSettings?.reply_to_email || undefined;
    const logoUrl = emailSettings?.logo_url || '';
    const footerText = emailSettings?.footer_text || '';
    const isSignable = SIGNABLE_TYPES.includes(doc.document_type);

    const amountFormatted = doc.amount_total != null && doc.amount_total > 0
      ? Number(doc.amount_total).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
      : '–';

    const vars: Record<string, string> = {
      sender_name: senderName,
      recipient_name: doc.recipient_name || '',
      document_title: doc.title || '(Ohne Titel)',
      document_type: doc.document_type,
      document_type_label: DOC_TYPE_LABELS[doc.document_type] || doc.document_type,
      amount_total: amountFormatted,
      signing_url: signingUrl,
      footer_text: footerText,
      organization_name: org?.name || 'KÖFMAN',
      logo_url: logoUrl,
      is_signable: isSignable ? 'true' : 'false',
    };

    const emailHtml = buildEmailHtml(vars);
    const subject = `${DOC_TYPE_LABELS[doc.document_type] || 'Dokument'}: ${doc.title || '(Ohne Titel)'}`;

    const resendBody: Record<string, unknown> = {
      from: `${senderName} via KÖFMAN <no-reply@koefman.de>`,
      to: [doc.recipient_email],
      subject,
      html: emailHtml,
    };
    if (replyTo) {
      resendBody.reply_to = replyTo;
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendBody),
    });

    const resendData = await resendResponse.json();
    if (!resendResponse.ok) {
      console.error('Resend error:', resendData);
      return new Response(JSON.stringify({ error: `Email failed: ${JSON.stringify(resendData)}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Update document status
    await supabaseAdmin
      .from('org_documents')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_by_user_id: userId,
        public_token: publicToken,
      })
      .eq('id', document_id);

    // Log email
    await supabaseAdmin
      .from('org_document_emails')
      .insert({
        document_id,
        organization_id: doc.organization_id,
        recipient_email: doc.recipient_email,
        subject,
        sent_by_user_id: userId,
      });

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
