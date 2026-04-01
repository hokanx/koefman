const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userId = claimsData.claims.sub;

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY is not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const { to, subject, documentType, documentId, publicLink, pdfBase64, pdfFilename } = body;
    const messageBody = body.body;

    if (!to || !subject) {
      return new Response(JSON.stringify({ error: 'Missing required fields: to, subject' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get sender settings
    const { data: settings } = await supabase
      .from('business_settings')
      .select('email, business_name, logo_url')
      .eq('user_id', userId)
      .maybeSingle();

    const senderName = settings?.business_name || 'KÖFMAN';
    const fromEmail = 'no-reply@koefman.de';
    const replyTo = settings?.email || undefined;
    const logoUrl = settings?.logo_url || undefined;

    // Build branded HTML email if we have a public link
    let htmlContent: string | undefined;
    let textContent: string;

    if (publicLink) {
      const ctaLabel = documentType === 'offer' 
        ? 'Angebot prüfen & bestätigen' 
        : 'Dokument ansehen';

      htmlContent = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
${logoUrl ? `<tr><td style="padding:32px 32px 16px 32px;" align="center"><img src="${logoUrl}" alt="${senderName}" style="max-height:48px;max-width:200px;" /></td></tr>` : ''}
<tr><td style="padding:${logoUrl ? '8' : '32'}px 32px 8px 32px;">
<p style="margin:0;font-size:18px;font-weight:700;color:#18181b;">${subject}</p>
</td></tr>
<tr><td style="padding:8px 32px 24px 32px;">
<p style="margin:0;font-size:14px;line-height:1.6;color:#52525b;white-space:pre-line;">${messageBody || `Sie haben ein Dokument von ${senderName} erhalten.`}</p>
</td></tr>
<tr><td style="padding:0 32px 32px 32px;" align="center">
<a href="${publicLink}" style="display:inline-block;background-color:#18181b;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">${ctaLabel}</a>
</td></tr>
<tr><td style="padding:0 32px 24px 32px;">
<p style="margin:0;font-size:11px;color:#a1a1aa;word-break:break-all;">${publicLink}</p>
</td></tr>
<tr><td style="border-top:1px solid #e4e4e7;padding:20px 32px;">
<p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;">Gesendet über KÖFMAN</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

      textContent = `${subject}\n\n${messageBody || `Sie haben ein Dokument von ${senderName} erhalten.`}\n\n${ctaLabel}: ${publicLink}`;
    } else {
      textContent = messageBody || subject;
    }

    // Build email payload
    const emailPayload: Record<string, unknown> = {
      from: `${senderName} via KÖFMAN <${fromEmail}>`,
      to: [to],
      subject,
      ...(htmlContent ? { html: htmlContent } : {}),
      text: textContent,
      ...(replyTo ? { reply_to: replyTo } : {}),
    };

    // Attach PDF if provided (legacy support)
    if (pdfBase64 && pdfFilename) {
      emailPayload.attachments = [{
        filename: pdfFilename,
        content: pdfBase64,
      }];
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendData);
      return new Response(JSON.stringify({ error: `Email send failed: ${JSON.stringify(resendData)}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Track the sent email
    if (documentType && documentId) {
      await supabase.from('document_emails').insert({
        user_id: userId,
        document_type: documentType,
        document_id: documentId,
        recipient_email: to,
        subject: subject,
      });
    }

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error sending email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
