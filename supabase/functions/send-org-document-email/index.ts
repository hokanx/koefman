const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";

const DOC_TYPE_LABELS: Record<string, string> = {
  offer: 'Angebot',
  invoice: 'Rechnung',
  contract: 'Vertrag',
  reminder: 'Mahnung',
};

const DOC_TYPE_CTA: Record<string, string> = {
  offer: 'Angebot prüfen & bestätigen',
  invoice: 'Rechnung ansehen',
  contract: 'Vertrag prüfen & unterschreiben',
  reminder: 'Mahnung ansehen',
};

const LEGACY_DOC_TYPES = ['offer', 'invoice', 'contract', 'reminder'] as const;

const RequestSchema = z.object({
  document_id: z.string().uuid().optional(),
  organization_id: z.string().uuid().optional(),
  legacy_document_id: z.string().uuid().optional(),
  legacy_document_type: z.enum(LEGACY_DOC_TYPES).optional(),
  documentId: z.string().uuid().optional(),
  documentType: z.enum(LEGACY_DOC_TYPES).optional(),
  to: z.string().email().optional(),
  subject: z.string().trim().min(1).max(255).optional(),
  body: z.string().max(10000).optional(),
  public_link: z.string().url().optional(),
  publicLink: z.string().url().optional(),
  pdfBase64: z.string().optional(),
  pdfFilename: z.string().max(255).optional(),
}).refine((value) => {
  const hasOrgDocument = !!value.document_id;
  const hasLegacyDocument = !!(
    value.organization_id &&
    (value.legacy_document_id || value.documentId) &&
    (value.legacy_document_type || value.documentType)
  );

  return hasOrgDocument || hasLegacyDocument;
}, {
  message: 'document_id or organization_id + legacy document payload is required',
}).refine((value) => {
  const hasAttachmentContent = !!value.pdfBase64;
  const hasAttachmentFilename = !!value.pdfFilename;
  return hasAttachmentContent === hasAttachmentFilename;
}, {
  message: 'pdfBase64 and pdfFilename must be provided together',
});

type DocType = typeof LEGACY_DOC_TYPES[number];

type BrandingSettings = {
  footerText: string;
  logoUrl: string;
  replyTo?: string;
  senderName: string;
};

type ParsedRequest = {
  body?: string;
  documentId?: string;
  legacyDocumentId?: string;
  legacyDocumentType?: DocType;
  organizationId?: string;
  pdfBase64?: string;
  pdfFilename?: string;
  publicLink?: string;
  subject?: string;
  to?: string;
};

type LegacyDocumentContext = {
  amountTotal: number | null;
  documentId: string;
  documentTitle: string;
  documentType: DocType;
  recipientEmail: string | null;
  recipientName: string;
  serviceTypeLabel?: string;
  signingUrl?: string;
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatAmount(amount: number | null | undefined): string {
  return amount != null && amount > 0
    ? Number(amount).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
    : '–';
}

function getDefaultMessage(senderName: string, documentType: string, recipientName: string): string {
  const greeting = recipientName ? `Guten Tag ${recipientName},` : 'Guten Tag,';
  return `${greeting}\n\nSie haben ein neues ${documentType.toLowerCase()} von ${senderName} erhalten.`;
}

function buildTextBody(subject: string, messageBody: string, ctaLabel?: string, signingUrl?: string): string {
  const parts = [subject, '', messageBody];

  if (signingUrl) {
    parts.push('', `${ctaLabel || 'Dokument ansehen'}: ${signingUrl}`);
  }

  return parts.join('\n');
}

async function ensureOrganizationAccess(supabaseAdmin: any, userId: string, organizationId: string) {
  const [membershipResult, ownerResult, adminResult] = await Promise.all([
    supabaseAdmin
      .from('organization_memberships')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('id', organizationId)
      .eq('owner_user_id', userId)
      .limit(1)
      .maybeSingle(),
    supabaseAdmin.rpc('has_role', { _user_id: userId, _role: 'admin' }),
  ]);

  if (membershipResult.error) throw membershipResult.error;
  if (ownerResult.error) throw ownerResult.error;
  if (adminResult.error) throw adminResult.error;

  return Boolean(membershipResult.data || ownerResult.data || adminResult.data);
}

async function loadBranding(supabaseAdmin: any, organizationId: string, userId?: string): Promise<BrandingSettings> {
  const [{ data: org, error: orgError }, { data: emailSettings, error: emailSettingsError }] = await Promise.all([
    supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single(),
    supabaseAdmin
      .from('organization_email_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle(),
  ]);

  if (orgError || !org) {
    throw new Error('Organization not found');
  }

  if (emailSettingsError) {
    throw emailSettingsError;
  }

  // Fallback reply-to: try business_settings email if no reply_to configured
  let replyTo = emailSettings?.reply_to_email || undefined;
  if (!replyTo && userId) {
    const { data: bs } = await supabaseAdmin
      .from('business_settings')
      .select('email')
      .eq('user_id', userId)
      .maybeSingle();
    replyTo = bs?.email || undefined;
  }

  return {
    senderName: emailSettings?.sender_name || org.name || 'KÖFMAN',
    replyTo,
    logoUrl: emailSettings?.logo_url || '',
    footerText: emailSettings?.footer_text || '',
  };
}

function buildEmailHtml(vars: Record<string, string>): string {
  const ctaLabel = escapeHtml(vars.cta_label || 'DOKUMENT ANSEHEN');
  const footerText = vars.footer_text ? escapeHtml(vars.footer_text) : '';
  const signingUrl = vars.signing_url ? escapeHtml(vars.signing_url) : '';
  const messageBody = escapeHtml(vars.message_body || getDefaultMessage(vars.sender_name, vars.document_type_label, vars.recipient_name));

  const LOGO_URL = 'https://ppijwrrzjcbtokoxpctf.supabase.co/storage/v1/object/public/email-assets/koefman-wordmark.png';

  // Optional org logo below the KÖFMAN header
  const orgLogoRow = vars.logo_url
    ? `<tr><td align="center" style="padding:12px 20px 0 20px;background-color:#000000;"><img src="${escapeHtml(vars.logo_url)}" alt="${escapeHtml(vars.sender_name)}" width="140" style="display:block;max-width:140px;max-height:48px;width:auto;height:auto;" /></td></tr>`
    : '';

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>${escapeHtml(vars.document_title)}</title></head>
<body style="margin:0;padding:0;background-color:#000000;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;color:#FFFFFF;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#000000;min-width:100%;">
<tr><td align="center" valign="top" style="padding:0;background-color:#000000;">

<!--[if (gte mso 9)|(IE)]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;margin:0 auto;background-color:#000000;">

<!-- KÖFMAN Logo Header -->
<tr><td align="center" valign="middle" style="padding:56px 40px 20px 40px;background-color:#000000;">
<img src="${LOGO_URL}" alt="K\u00d6FMAN" width="220" height="55" style="display:block;width:220px;height:auto;max-width:100%;border:0;outline:none;text-decoration:none;" />
</td></tr>

${orgLogoRow}

<!-- Divider -->
<tr><td style="padding:12px 40px 0 40px;background-color:#000000;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-bottom:2px solid #FFFFFF;font-size:1px;line-height:1px;height:1px;">&nbsp;</td></tr></table>
</td></tr>

<!-- Document Type Label -->
<tr><td style="padding:32px 40px 6px 40px;background-color:#000000;">
<p style="color:#BBBBBB;font-size:13px;font-weight:bold;letter-spacing:0.15em;text-transform:uppercase;margin:0;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(vars.document_type_label)}</p>
</td></tr>

<!-- Headline -->
<tr><td style="padding:4px 40px 10px 40px;background-color:#000000;">
<h1 style="color:#FFFFFF;font-size:28px;font-weight:bold;letter-spacing:0.02em;margin:0;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(vars.document_title)}</h1>
</td></tr>

<!-- Amount -->
${vars.amount_total && vars.amount_total !== '\u2013' ? `<tr><td style="padding:6px 40px 28px 40px;background-color:#000000;"><p style="color:#FFFFFF;font-size:24px;font-weight:bold;margin:0;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(vars.amount_total)}</p></td></tr>` : '<tr><td style="padding:0 0 20px 0;background-color:#000000;"></td></tr>'}

<!-- Body text -->
<tr><td style="padding:0 40px 36px 40px;background-color:#000000;">
<p style="color:#EEEEEE;font-size:16px;line-height:1.75;margin:0;white-space:pre-line;font-family:Arial,Helvetica,sans-serif;">${messageBody}</p>
</td></tr>

<!-- CTA Button -->
${signingUrl ? `<tr><td align="center" style="padding:0 40px 20px 40px;background-color:#000000;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF;padding:20px 32px;text-align:center;">
<a href="${signingUrl}" target="_blank" style="color:#000000;font-size:16px;font-weight:bold;letter-spacing:0.1em;text-decoration:none;text-transform:uppercase;display:inline-block;font-family:Arial,Helvetica,sans-serif;">\u2192 ${ctaLabel}</a>
</td></tr></table>
</td></tr>` : ''}

<!-- Fallback link -->
${signingUrl ? `<tr><td style="padding:4px 40px 36px 40px;background-color:#000000;">
<p style="color:#999999;font-size:13px;line-height:1.6;margin:0;font-family:Arial,Helvetica,sans-serif;">Falls der Link nicht funktioniert:<br/><a href="${signingUrl}" style="color:#CCCCCC;word-break:break-all;text-decoration:underline;">${signingUrl}</a></p>
</td></tr>` : ''}

<!-- Footer divider -->
<tr><td style="padding:0 40px;background-color:#000000;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-bottom:1px solid #444444;font-size:1px;line-height:1px;height:1px;">&nbsp;</td></tr></table></td></tr>

${footerText ? `<tr><td style="padding:24px 40px 8px 40px;background-color:#000000;"><p style="color:#AAAAAA;font-size:13px;line-height:1.5;margin:0;white-space:pre-line;font-family:Arial,Helvetica,sans-serif;">${footerText}</p></td></tr>` : ''}

<tr><td style="padding:${footerText ? '12' : '28'}px 40px 52px 40px;background-color:#000000;"><p style="color:#666666;font-size:11px;letter-spacing:0.12em;margin:0;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">Gesendet \u00fcber K\u00d6FMAN</p></td></tr>

</table>
<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->

</td></tr>
</table>
</body>
</html>`;
}
async function sendViaResend(resendApiKey: string, emailPayload: Record<string, unknown>) {
  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailPayload),
  });

  const resendData = await resendResponse.json();

  if (!resendResponse.ok) {
    console.error('Resend error:', resendData);
    throw new Error(`Email failed: ${JSON.stringify(resendData)}`);
  }

  return resendData;
}

async function resolveLegacyDocument(
  supabaseAdmin: any,
  requestData: ParsedRequest,
  userId: string,
  appUrl: string,
): Promise<LegacyDocumentContext> {
  const legacyDocumentId = requestData.legacyDocumentId!;
  const legacyDocumentType = requestData.legacyDocumentType!;

  if (legacyDocumentType === 'offer') {
    const { data: offer, error } = await supabaseAdmin
      .from('offers')
      .select('id, user_id, offer_number, public_token, grand_total, service_type, customer:customers(name, email)')
      .eq('id', legacyDocumentId)
      .eq('user_id', userId)
      .single();

    if (error || !offer) {
      throw new Error('Offer not found');
    }

    let publicToken = offer.public_token;
    if (!publicToken && !requestData.publicLink) {
      publicToken = crypto.randomUUID();
      const { error: updateError } = await supabaseAdmin
        .from('offers')
        .update({ public_token: publicToken })
        .eq('id', legacyDocumentId)
        .eq('user_id', userId);

      if (updateError) {
        throw updateError;
      }
    }

    return {
      documentId: offer.id,
      documentType: 'offer',
      documentTitle: offer.offer_number || '(Ohne Titel)',
      recipientEmail: offer.customer?.email || null,
      recipientName: offer.customer?.name || '',
      amountTotal: offer.grand_total,
      serviceTypeLabel: offer.service_type === 'laufend' ? 'Wiederkehrend' : 'Einmalig',
      signingUrl: requestData.publicLink || (publicToken ? `${appUrl}/offer/view/${publicToken}` : undefined),
    };
  }

  if (legacyDocumentType === 'contract') {
    const { data: contract, error } = await supabaseAdmin
      .from('contracts')
      .select('id, user_id, contract_number, public_token, grand_total, frequency, customer:customers(name, email)')
      .eq('id', legacyDocumentId)
      .eq('user_id', userId)
      .single();

    if (error || !contract) {
      throw new Error('Contract not found');
    }

    let publicToken = contract.public_token;
    if (!publicToken && !requestData.publicLink) {
      publicToken = crypto.randomUUID();
      const { error: updateError } = await supabaseAdmin
        .from('contracts')
        .update({ public_token: publicToken })
        .eq('id', legacyDocumentId)
        .eq('user_id', userId);

      if (updateError) {
        throw updateError;
      }
    }

    const freqMap: Record<string, string> = { weekly: 'Wöchentlich', every_2_weeks: 'Alle 2 Wochen', monthly: 'Monatlich', quarterly: 'Vierteljährlich' };
    return {
      documentId: contract.id,
      documentType: 'contract',
      documentTitle: contract.contract_number || '(Ohne Titel)',
      recipientEmail: contract.customer?.email || null,
      recipientName: contract.customer?.name || '',
      amountTotal: contract.grand_total,
      serviceTypeLabel: `Wiederkehrend (${freqMap[contract.frequency] || contract.frequency})`,
      signingUrl: requestData.publicLink || (publicToken ? `${appUrl}/contract/view/${publicToken}` : undefined),
    };
  }

  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .select('id, user_id, invoice_number, grand_total, due_date, source_recurring_id, customer:customers(name, email)')
    .eq('id', legacyDocumentId)
    .eq('user_id', userId)
    .single();

  if (error || !invoice) {
    throw new Error('Invoice not found');
  }

  // Generate public token for invoice view
  let publicToken = (invoice as any).public_token;
  if (!publicToken && !requestData.publicLink) {
    publicToken = crypto.randomUUID();
    const { error: updateError } = await supabaseAdmin
      .from('invoices')
      .update({ public_token: publicToken })
      .eq('id', legacyDocumentId)
      .eq('user_id', userId);
    if (updateError) {
      throw updateError;
    }
  }

  return {
    documentId: invoice.id,
    documentType: legacyDocumentType,
    documentTitle: invoice.invoice_number || '(Ohne Titel)',
    recipientEmail: invoice.customer?.email || null,
    recipientName: invoice.customer?.name || '',
    amountTotal: invoice.grand_total,
    serviceTypeLabel: invoice.source_recurring_id ? 'Wiederkehrend' : 'Einmalig',
    signingUrl: requestData.publicLink || (publicToken ? `${appUrl}/invoice/view/${publicToken}` : undefined),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const appUrl = (Deno.env.get('PUBLIC_APP_URL') || 'https://koefman.de').replace(/\/+$/, '');

    if (!supabaseUrl || !serviceRoleKey || !anonKey || !resendApiKey) {
      console.error('Missing required environment variables for send-org-document-email', {
        hasAnonKey: !!anonKey,
        hasResendApiKey: !!resendApiKey,
        hasServiceRoleKey: !!serviceRoleKey,
        hasSupabaseUrl: !!supabaseUrl,
      });
      return jsonResponse({ error: 'Server configuration error: missing email service credentials.' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const supabaseAdmin: any = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    const supabaseUser: any = createClient(
      supabaseUrl,
      anonKey,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
    const userId = claimsData.claims.sub;

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const parsed = RequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonResponse({ error: parsed.error.issues[0]?.message || 'Invalid request body' }, 400);
    }

    const requestData: ParsedRequest = {
      documentId: parsed.data.document_id,
      organizationId: parsed.data.organization_id,
      legacyDocumentId: parsed.data.legacy_document_id || parsed.data.documentId,
      legacyDocumentType: parsed.data.legacy_document_type || parsed.data.documentType,
      to: parsed.data.to,
      subject: parsed.data.subject,
      body: parsed.data.body,
      publicLink: parsed.data.public_link || parsed.data.publicLink,
      pdfBase64: parsed.data.pdfBase64,
      pdfFilename: parsed.data.pdfFilename,
    };

    if (requestData.documentId) {
      const { data: doc, error: docError } = await supabaseAdmin
        .from('org_documents')
        .select('*')
        .eq('id', requestData.documentId)
        .single();
      if (docError || !doc) {
        return jsonResponse({ error: 'Document not found' }, 404);
      }

      const hasAccess = await ensureOrganizationAccess(supabaseAdmin, userId, doc.organization_id);
      if (!hasAccess) {
        return jsonResponse({ error: 'Forbidden' }, 403);
      }

      const branding = await loadBranding(supabaseAdmin, doc.organization_id, userId);
      const recipientEmail = requestData.to || doc.recipient_email;
      if (!recipientEmail) {
        return jsonResponse({ error: 'No recipient email on document' }, 400);
      }

      let publicToken = doc.public_token;
      if (!publicToken && !requestData.publicLink) {
        publicToken = crypto.randomUUID();
        await supabaseAdmin
          .from('org_documents')
          .update({ public_token: publicToken })
          .eq('id', requestData.documentId);
      }

      const signingUrl = requestData.publicLink || (publicToken ? `${appUrl}/document/view/${publicToken}` : undefined);
      const subject = requestData.subject || `${DOC_TYPE_LABELS[doc.document_type] || 'Dokument'}: ${doc.title || '(Ohne Titel)'}`;
      const messageBody = requestData.body || getDefaultMessage(branding.senderName, DOC_TYPE_LABELS[doc.document_type] || 'Dokument', doc.recipient_name || '');
      const ctaLabel = DOC_TYPE_CTA[doc.document_type] || 'Dokument ansehen';

      const emailHtml = buildEmailHtml({
        sender_name: branding.senderName,
        recipient_name: doc.recipient_name || '',
        document_title: doc.title || '(Ohne Titel)',
        document_type_label: DOC_TYPE_LABELS[doc.document_type] || doc.document_type,
        amount_total: formatAmount(doc.amount_total),
        signing_url: signingUrl || '',
        footer_text: branding.footerText,
        logo_url: branding.logoUrl,
        cta_label: ctaLabel.toUpperCase(),
        message_body: messageBody,
      });

      const resendBody: Record<string, unknown> = {
        from: `${branding.senderName} via KÖFMAN <no-reply@koefman.de>`,
        to: [recipientEmail],
        subject,
        html: emailHtml,
        text: buildTextBody(subject, messageBody, ctaLabel, signingUrl),
      };

      if (branding.replyTo) {
        resendBody.reply_to = branding.replyTo;
      }

      if (requestData.pdfBase64 && requestData.pdfFilename) {
        resendBody.attachments = [{
          filename: requestData.pdfFilename,
          content: requestData.pdfBase64,
        }];
      }

      const resendData = await sendViaResend(resendApiKey, resendBody);

      await supabaseAdmin
        .from('org_documents')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          sent_by_user_id: userId,
          public_token: publicToken,
          recipient_email: doc.recipient_email || recipientEmail,
        })
        .eq('id', requestData.documentId);

      await supabaseAdmin
        .from('org_document_emails')
        .insert({
          document_id: requestData.documentId,
          organization_id: doc.organization_id,
          recipient_email: recipientEmail,
          subject,
          sent_by_user_id: userId,
        });

      return jsonResponse({ success: true, id: resendData.id }, 200);
    }

    const organizationId = requestData.organizationId!;
    const hasAccess = await ensureOrganizationAccess(supabaseAdmin, userId, organizationId);
    if (!hasAccess) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    const branding = await loadBranding(supabaseAdmin, organizationId, userId);
    const legacyDocument = await resolveLegacyDocument(supabaseAdmin, requestData, userId, appUrl);
    const recipientEmail = requestData.to || legacyDocument.recipientEmail;

    if (!recipientEmail) {
      return jsonResponse({ error: 'No recipient email available' }, 400);
    }

    const ctaLabel = DOC_TYPE_CTA[legacyDocument.documentType] || 'Dokument ansehen';
    const subject = requestData.subject || `${DOC_TYPE_LABELS[legacyDocument.documentType] || 'Dokument'}: ${legacyDocument.documentTitle}`;
    const messageBody = requestData.body || getDefaultMessage(branding.senderName, DOC_TYPE_LABELS[legacyDocument.documentType] || 'Dokument', legacyDocument.recipientName);

    const emailHtml = buildEmailHtml({
      sender_name: branding.senderName,
      recipient_name: legacyDocument.recipientName,
      document_title: legacyDocument.documentTitle,
      document_type_label: DOC_TYPE_LABELS[legacyDocument.documentType] || legacyDocument.documentType,
      amount_total: formatAmount(legacyDocument.amountTotal),
      signing_url: legacyDocument.signingUrl || '',
      footer_text: branding.footerText,
      logo_url: branding.logoUrl,
      cta_label: ctaLabel.toUpperCase(),
      message_body: messageBody,
    });

    const resendBody: Record<string, unknown> = {
      from: `${branding.senderName} via KÖFMAN <no-reply@koefman.de>`,
      to: [recipientEmail],
      subject,
      html: emailHtml,
      text: buildTextBody(subject, messageBody, ctaLabel, legacyDocument.signingUrl),
    };

    if (branding.replyTo) {
      resendBody.reply_to = branding.replyTo;
    }

    if (requestData.pdfBase64 && requestData.pdfFilename) {
      resendBody.attachments = [{
        filename: requestData.pdfFilename,
        content: requestData.pdfBase64,
      }];
    }

    const resendData = await sendViaResend(resendApiKey, resendBody);

    await supabaseAdmin
      .from('document_emails')
      .insert({
        user_id: userId,
        document_type: legacyDocument.documentType,
        document_id: legacyDocument.documentId,
        recipient_email: recipientEmail,
        subject,
      });

    return jsonResponse({ success: true, id: resendData.id }, 200);
  } catch (error: unknown) {
    console.error('Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: msg }, 500);
  }
});
