import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMAIL_FROM = "Köfman <no-reply@koefman.de>";
const BOOKING_URL = "https://koefman.lovable.app/book";


function buildEmailHtml(
  name: string,
  analysis: { main_issue: string; practical_meaning: string; priorities: string[]; next_step: string },
  submissionId?: string,
  variant?: string
) {
  const ctaUrl = `${BOOKING_URL}?sid=${submissionId || ""}&source=email${variant ? `&variant=${variant}` : ""}`;

  const prioritiesHtml = analysis.priorities
    .filter((p: string) => p)
    .map(
      (p: string, i: number) =>
        `<tr><td style="padding:8px 12px 8px 0;color:#9A9A9A;vertical-align:top;font-size:14px;width:28px;font-family:Arial,Helvetica,sans-serif;">${i + 1}.</td><td style="padding:8px 0;color:#FFFFFF;font-size:15px;line-height:1.65;font-family:Arial,Helvetica,sans-serif;">${p}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="de" xml:lang="de">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Deine K&#246;fman Kurzanalyse</title>
<style type="text/css">
:root { color-scheme: light dark; supported-color-schemes: light dark; }
@media (prefers-color-scheme: dark) {
  .email-bg { background-color: #000000 !important; }
  .email-container { background-color: #000000 !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background-color:#000000;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;font-family:Arial,Helvetica,sans-serif;" class="email-bg">

<div style="display:none;font-size:1px;color:#000000;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
Deine Kurzanalyse basierend auf deinen Angaben ist bereit.
</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#000000;" class="email-bg">
<tr><td align="center" style="padding:32px 16px;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;background-color:#000000;border:1px solid #1A1A1A;" class="email-container">

<!-- Logo -->
<tr><td style="padding:48px 32px 36px 32px;text-align:center;background-color:#000000;">
  <img src="https://ppijwrrzjcbtokoxpctf.supabase.co/storage/v1/object/public/brand-assets/logo-icon-white.png" alt="K&#214;FMAN" width="112" height="112" style="display:block;margin:0 auto 16px auto;width:112px;height:112px;border:0;outline:none;" />
  <span style="color:#FFFFFF;font-size:18px;letter-spacing:0.22em;font-weight:700;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;">K&#214;FMAN</span>
</td></tr>

<tr><td style="padding:0 32px;background-color:#000000;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:1px solid #2A2A2A;font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>

<!-- Greeting -->
<tr><td style="padding:28px 32px 8px 32px;background-color:#000000;">
  <p style="color:#FFFFFF;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;margin:0;font-family:Arial,Helvetica,sans-serif;font-weight:600;">
    ${name ? `HALLO ${name.toUpperCase()},` : "HALLO,"}
  </p>
</td></tr>

<tr><td style="padding:12px 32px 28px 32px;background-color:#000000;">
  <p style="color:#B3B3B3;font-size:14px;line-height:1.7;margin:0;font-family:Arial,Helvetica,sans-serif;">
    Hier ist deine Kurzanalyse basierend auf deinen Angaben.
  </p>
</td></tr>

<tr><td style="padding:0 32px;background-color:#000000;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:1px solid #2A2A2A;font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>

<!-- Main Issue -->
<tr><td style="padding:28px 32px 24px 32px;background-color:#000000;">
  <p style="color:#9A9A9A;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;font-weight:600;">GR&#214;SSTE SCHWACHSTELLE</p>
  <p style="color:#FFFFFF;font-size:15px;line-height:1.65;margin:0;font-family:Arial,Helvetica,sans-serif;">${analysis.main_issue}</p>
</td></tr>

<tr><td style="padding:0 32px;background-color:#000000;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:1px solid #2A2A2A;font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>

<!-- Practical Meaning -->
<tr><td style="padding:28px 32px 24px 32px;background-color:#000000;">
  <p style="color:#9A9A9A;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;font-weight:600;">WAS DAS PRAKTISCH BEDEUTET</p>
  <p style="color:#FFFFFF;font-size:15px;line-height:1.65;margin:0;font-family:Arial,Helvetica,sans-serif;">${analysis.practical_meaning}</p>
</td></tr>

<tr><td style="padding:0 32px;background-color:#000000;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:1px solid #2A2A2A;font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>

<!-- Priorities -->
<tr><td style="padding:28px 32px 24px 32px;background-color:#000000;">
  <p style="color:#9A9A9A;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-weight:600;">DEINE N&#196;CHSTEN 3 HEBEL</p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${prioritiesHtml}</table>
</td></tr>

<tr><td style="padding:0 32px;background-color:#000000;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:1px solid #2A2A2A;font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>

<!-- Next Step -->
<tr><td style="padding:28px 32px 24px 32px;background-color:#000000;">
  <p style="color:#9A9A9A;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;font-weight:600;">N&#196;CHSTER SINNVOLLER SCHRITT</p>
  <p style="color:#FFFFFF;font-size:15px;line-height:1.65;margin:0;font-family:Arial,Helvetica,sans-serif;">${analysis.next_step}</p>
</td></tr>

<tr><td style="padding:0 32px;background-color:#000000;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:1px solid #2A2A2A;font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>


<!-- CTA -->
<tr><td style="padding:32px 32px 0 32px;background-color:#000000;" align="center">
  <a href="${ctaUrl}" target="_blank" style="color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:28px;font-weight:700;letter-spacing:0.04em;text-decoration:underline;text-transform:uppercase;-webkit-text-size-adjust:none;mso-line-height-rule:exactly;">&#8594; STRATEGIEGESPR&#196;CH BUCHEN</a>
</td></tr>

<tr><td style="padding:16px 32px 0 32px;background-color:#000000;">
  <p style="color:#9A9A9A;font-size:11px;line-height:1.5;margin:0 0 6px 0;text-align:center;font-family:Arial,Helvetica,sans-serif;">
    Falls der Link nicht direkt funktioniert, kopiere ihn in deinen Browser:
  </p>
  <p style="color:#A0A0A0;font-size:11px;line-height:1.5;margin:0;text-align:center;font-family:Arial,Helvetica,sans-serif;word-break:break-all;">
    ${ctaUrl}
  </p>
</td></tr>

<tr><td style="padding:20px 32px 0 32px;background-color:#000000;">
  <p style="color:#A0A0A0;font-size:11px;line-height:1.6;margin:0;text-align:center;font-family:Arial,Helvetica,sans-serif;">
    Wir zeigen dir konkret, wo du Geld verlierst &#8211; und wie du es behebst.
  </p>
</td></tr>

<tr><td style="padding:32px 32px 0 32px;background-color:#000000;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:1px solid #2A2A2A;font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>

<tr><td style="padding:24px 32px 40px 32px;background-color:#000000;">
  <p style="color:#9A9A9A;font-size:10px;letter-spacing:0.18em;text-align:center;margin:0;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;font-weight:600;">K&#214;FMAN</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

async function sendAnalysisEmail(
  email: string,
  name: string,
  analysis: { main_issue: string; practical_meaning: string; priorities: string[]; next_step: string },
  submissionId?: string,
  variant?: string
): Promise<boolean> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY || !email) return false;

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const RESEND_GATEWAY = "https://connector-gateway.lovable.dev/resend";

  const emailHtml = buildEmailHtml(name, analysis, submissionId, variant);

  // Try gateway first, fall back to direct
  let emailRes: Response;
  if (LOVABLE_API_KEY) {
    emailRes = await fetch(`${RESEND_GATEWAY}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [email],
        subject: "Deine Köfman Kurzanalyse",
        html: emailHtml,
      }),
    });
  } else {
    emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: email,
        subject: "Deine Köfman Kurzanalyse",
        html: emailHtml,
      }),
    });
  }

  if (!emailRes.ok) {
    console.error("Email send failed:", emailRes.status, await emailRes.text());
    return false;
  }
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── MODE 1: Capture lead (name+email) for existing submission ──
    if (body.capture_lead && body.submission_id) {
      const { name, email, submission_id } = body;
      if (!name || !email) {
        return new Response(
          JSON.stringify({ success: false, error: "Name und E-Mail sind erforderlich." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update submission with name + email
      await supabase
        .from("diagnostic_submissions")
        .update({ name, email, lead_status: "kontaktiert" })
        .eq("id", submission_id);

      // Get analysis for this submission
      const { data: existingAnalysis } = await supabase
        .from("lead_analyses")
        .select("*")
        .eq("submission_id", submission_id)
        .eq("analysis_status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      // Send email
      let emailSent = false;
      if (existingAnalysis) {
        const analysis = {
          main_issue: existingAnalysis.main_issue,
          practical_meaning: existingAnalysis.practical_meaning,
          priorities: [existingAnalysis.priority_1, existingAnalysis.priority_2, existingAnalysis.priority_3],
          next_step: existingAnalysis.next_step,
        };
        const { data: sub } = await supabase
          .from("diagnostic_submissions")
          .select("variant")
          .eq("id", submission_id)
          .single();

        emailSent = await sendAnalysisEmail(
          email, name, analysis,
          submission_id, sub?.variant
        );
        if (emailSent) {
          await supabase
            .from("lead_analyses")
            .update({ email_sent: true, email_sent_at: new Date().toISOString() })
            .eq("id", existingAnalysis.id);
        }
      }

      // Also insert into landing_leads for backward compat
      const { data: sub } = await supabase
        .from("diagnostic_submissions")
        .select("*")
        .eq("id", submission_id)
        .single();
      if (sub) {
        await supabase.from("landing_leads").insert({
          name, email,
          company: sub.company || "",
          industry: sub.business_type || "unknown",
          situation: `Anfragen: ${sub.lead_flow || "-"}, Größe: ${sub.company_size || "-"}`,
          needs: sub.problems?.length ? sub.problems : [sub.main_problem || "unknown"],
          contact_method: "email",
          status: "neu",
          admin_notes: `Submission-ID: ${submission_id}`,
        });
      }

      return new Response(
        JSON.stringify({ success: true, email_sent: emailSent }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── MODE 2: Resend email for existing submission ──
    if (body.resend_submission_id) {
      const { data: sub } = await supabase
        .from("diagnostic_submissions")
        .select("*")
        .eq("id", body.resend_submission_id)
        .single();
      if (!sub) throw new Error("Submission not found");

      const { data: existingAnalysis } = await supabase
        .from("lead_analyses")
        .select("*")
        .eq("submission_id", body.resend_submission_id)
        .eq("analysis_status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (!existingAnalysis) throw new Error("No completed analysis found");

      const analysis = {
        main_issue: existingAnalysis.main_issue,
        practical_meaning: existingAnalysis.practical_meaning,
        priorities: [existingAnalysis.priority_1, existingAnalysis.priority_2, existingAnalysis.priority_3],
        next_step: existingAnalysis.next_step,
      };

      const sent = await sendAnalysisEmail(
        sub.email, sub.name, analysis,
        sub.id, sub.variant
      );
      if (sent) {
        await supabase
          .from("lead_analyses")
          .update({ email_sent: true, email_sent_at: new Date().toISOString() })
          .eq("id", existingAnalysis.id);
      }

      return new Response(
        JSON.stringify({ success: true, email_sent: sent }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── MODE 3: Generate new analysis (without name/email if skip_email=true) ──
    const {
      name, email, company,
      business_type, lead_flow, revenue_clarity, main_problem,
      variant, qr_session_id,
      company_size, problems, free_text,
      importance, commitment, urgency, intent_score,
      skip_email,
    } = body;

    // 1. Store diagnostic submission (name/email optional)
    const { data: submission, error: subErr } = await supabase
      .from("diagnostic_submissions")
      .insert({
        name: name || "",
        email: email || "",
        company: company || null,
        business_type: business_type || "",
        lead_flow: lead_flow || "",
        revenue_clarity: revenue_clarity || "",
        main_problem: main_problem || "",
        variant: variant || null,
        qr_session_id: qr_session_id || null,
        company_size: company_size || "",
        problems: problems || [],
        free_text: free_text || "",
        importance: importance || "",
        commitment: commitment || "",
        urgency: urgency || "",
        intent_score: intent_score || "medium",
      })
      .select()
      .single();

    if (subErr) throw subErr;


    // 2. Generate AI analysis
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let analysis: {
      headline: string;
      main_issue: string;
      practical_meaning: string;
      priorities: string[];
      next_step: string;
    };
    let analysisStatus = "completed";
    let errorMessage: string | null = null;

    if (!LOVABLE_API_KEY) {
      analysisStatus = "failed";
      errorMessage = "LOVABLE_API_KEY not configured";
      analysis = {
        headline: "Kurzanalyse",
        main_issue: "Analyse konnte nicht generiert werden.",
        practical_meaning: "Deine Angaben wurden gespeichert.",
        priorities: ["Wir kümmern uns darum."],
        next_step: "Wir melden uns bei dir.",
      };
    } else {
      const problemLabels: Record<string, string> = {
        wenig_anfragen: "Zu wenig qualifizierte Anfragen",
        schlechte_umwandlung: "Schlechte Umwandlung von Anfragen",
        unklare_ablaeufe: "Unklare Abläufe",
        zeitverlust: "Zeitverlust durch fehlende Struktur",
        keine_struktur: "Keine klare Struktur",
      };
      const typeLabels: Record<string, string> = {
        dienstleistung: "Dienstleistung",
        lokal: "Lokales Geschäft",
        handwerk: "Handwerk",
        online: "Online Business",
        andere: "Andere Branche",
      };

      const aiResponse = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: `Du bist ein präziser deutscher B2B Analyse-Assistent für Köfman.

Deine Aufgabe: Erstelle auf Basis der Intake-Antworten eine kurze, glaubwürdige und hochwertige Mini-Analyse auf Deutsch.

Wichtige Regeln:
- Schreibe nur auf Basis der tatsächlichen Angaben.
- Erfinde keine Fakten.
- Gib keine absolute Sicherheit vor, wenn sie aus den Angaben nicht ableitbar ist.
- Klinge klar, hochwertig und professionell.
- Klinge nicht generisch, nicht verspielt und nicht wie leeres Marketing.
- Die Analyse soll kurz, verständlich und nützlich sein.
- Die Analyse soll dem Lead das Gefühl geben, verstanden worden zu sein.
- Gib keine vollständige Beratung oder vollständige Lösung.
- Keine Markdown-Formatierung.
- Jedes Feld maximal 2 Sätze.

Stil: direkt, seriös, klar, premium, knapp, menschlich, glaubwürdig.

Formuliere vorsichtig bei begrenzten Informationen:
- "wirkt aktuell so, als ob ..."
- "es spricht dafür, dass ..."
- "wahrscheinlich ..."
- "ein möglicher Engpass ist ..."

Vermeide: Übertreibung, künstliche Dramatik, Fachjargon ohne Nutzen, leere Motivationssätze, Behauptungen die nicht aus den Daten folgen.`,
              },
              {
                role: "user",
                content: `Intake-Daten eines potenziellen Kunden:
- Unternehmenstyp: ${typeLabels[business_type] || business_type || "unbekannt"}
- Unternehmensgröße: ${company_size || "keine Angabe"}
- Bekommt kontinuierlich Anfragen: ${lead_flow || "keine Angabe"}
- Weiß, wo Umsatz verloren geht: ${revenue_clarity || "keine Angabe"}
- Hauptprobleme: ${(problems || []).map((p: string) => problemLabels[p] || p).join(", ") || main_problem || "keine Angabe"}
- Eigene Beschreibung: ${free_text || "keine Angabe"}
- Wichtigkeit der Lösung: ${importance || "keine Angabe"}
- Offen für Umsetzung: ${commitment || "keine Angabe"}
- Gewünschte Geschwindigkeit: ${urgency || "keine Angabe"}
- Firma: ${company || "nicht angegeben"}

Erstelle eine strukturierte Mini-Analyse.`,
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "create_analysis",
                  description: "Erstelle eine strukturierte Kurzanalyse",
                  parameters: {
                    type: "object",
                    properties: {
                      headline: { type: "string", description: "Kurze Überschrift der Analyse" },
                      main_issue: { type: "string", description: "Wahrscheinlich größte Schwachstelle (1-2 Sätze)" },
                      practical_meaning: { type: "string", description: "Was das praktisch bedeutet (1-2 Sätze)" },
                      priorities: { type: "array", items: { type: "string" }, description: "Genau 3 konkrete Prioritäten (je 1 Satz)" },
                      next_step: { type: "string", description: "Der nächste sinnvolle Schritt (1 Satz)" },
                    },
                    required: ["headline", "main_issue", "practical_meaning", "priorities", "next_step"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "create_analysis" } },
          }),
        }
      );

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI gateway error:", aiResponse.status, errText);
        analysisStatus = "failed";
        errorMessage = `AI gateway ${aiResponse.status}: ${errText.slice(0, 200)}`;
        analysis = {
          headline: "Kurzanalyse",
          main_issue: "Analyse konnte gerade nicht generiert werden.",
          practical_meaning: "Deine Angaben wurden gespeichert und wir kümmern uns darum.",
          priorities: ["Wir werden deine Situation manuell prüfen.", "", ""],
          next_step: "Wir melden uns in Kürze bei dir.",
        };
      } else {
        const aiData = await aiResponse.json();
        try {
          const toolCall = aiData.choices[0].message.tool_calls[0];
          analysis = JSON.parse(toolCall.function.arguments);
          if (!Array.isArray(analysis.priorities)) analysis.priorities = [];
          while (analysis.priorities.length < 3) analysis.priorities.push("");
        } catch (parseErr) {
          console.error("AI parse error:", parseErr);
          analysisStatus = "failed";
          errorMessage = `Parse error: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`;
          analysis = {
            headline: "Kurzanalyse",
            main_issue: "Analyse konnte nicht vollständig erstellt werden.",
            practical_meaning: "Deine Angaben wurden gespeichert.",
            priorities: ["Wir kümmern uns darum.", "", ""],
            next_step: "Wir melden uns bei dir.",
          };
        }
      }
    }

    // 3. Store analysis with package recommendation
    const { data: savedAnalysis } = await supabase
      .from("lead_analyses")
      .insert({
        submission_id: submission.id,
        analysis_status: analysisStatus,
        headline: analysis.headline || "Kurzanalyse",
        main_issue: analysis.main_issue || "",
        practical_meaning: analysis.practical_meaning || "",
        priority_1: analysis.priorities[0] || "",
        priority_2: analysis.priorities[1] || "",
        priority_3: analysis.priorities[2] || "",
        next_step: analysis.next_step || "",
        full_analysis_json: analysis,
        error_message: errorMessage,
      })
      .select()
      .single();

    // 4. Send email only if name+email provided AND skip_email is not true
    let emailSent = false;
    if (!skip_email && name && email && analysisStatus === "completed") {
      try {
        emailSent = await sendAnalysisEmail(email, name, analysis, submission.id, variant);
        if (emailSent && savedAnalysis) {
          await supabase
            .from("lead_analyses")
            .update({ email_sent: true, email_sent_at: new Date().toISOString() })
            .eq("id", savedAnalysis.id);
        }
      } catch (emailErr) {
        console.error("Email error:", emailErr);
      }

      // Also insert into landing_leads
      await supabase.from("landing_leads").insert({
        name, email,
        company: company || "",
        industry: business_type || "unknown",
        situation: `Anfragen: ${lead_flow || "-"}, Größe: ${company_size || "-"}`,
        needs: problems?.length ? problems : [main_problem || "unknown"],
        contact_method: "email",
        status: "neu",
        admin_notes: `Intent: ${intent_score || "medium"}. Submission-ID: ${submission.id}`,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        submission_id: submission.id,
        analysis: {
          headline: analysis.headline,
          main_issue: analysis.main_issue,
          practical_meaning: analysis.practical_meaning,
          priorities: analysis.priorities,
          next_step: analysis.next_step,
          recommended_package: recPkg,
        },
        analysis_status: analysisStatus,
        email_sent: emailSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-lead-analysis error:", e);
    return new Response(
      JSON.stringify({
        success: false,
        error: e instanceof Error ? e.message : "Unbekannter Fehler",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
