import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMAIL_FROM = "Köfman <no-reply@koefman.de>";
const STRATEGY_SESSION_URL = "https://koefman.lovable.app/landing";

function buildEmailHtml(
  name: string,
  analysis: { main_issue: string; practical_meaning: string; priorities: string[]; next_step: string },
  variant?: string
) {
  const ctaUrl = `${STRATEGY_SESSION_URL}?source=email${variant ? `&variant=${variant}` : ""}`;

  const prioritiesHtml = analysis.priorities
    .filter((p: string) => p)
    .map(
      (p: string, i: number) =>
        `<tr><td style="padding:10px 12px 10px 0;color:#A0A0A0;vertical-align:top;font-size:13px;width:24px;font-family:Inter,Helvetica,Arial,sans-serif;">${i + 1}.</td><td style="padding:10px 0;color:#FFFFFF;font-size:14px;line-height:1.6;font-family:Inter,Helvetica,Arial,sans-serif;">${p}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#000000;font-family:Inter,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;padding:40px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

<!-- Brand -->
<tr><td style="padding:0 0 32px 0;">
  <p style="color:#A0A0A0;font-size:10px;letter-spacing:0.14em;margin:0;text-transform:uppercase;font-family:Inter,Helvetica,Arial,sans-serif;">KÖFMAN</p>
</td></tr>

<!-- Greeting -->
<tr><td style="padding:0 0 24px 0;">
  <p style="color:#FFFFFF;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;margin:0;font-family:Inter,Helvetica,Arial,sans-serif;">
    ${name ? `HALLO ${name.toUpperCase()},` : "HALLO,"}
  </p>
</td></tr>

<!-- Intro -->
<tr><td style="padding:0 0 32px 0;">
  <p style="color:#A0A0A0;font-size:13px;line-height:1.7;margin:0;font-family:Inter,Helvetica,Arial,sans-serif;">
    Hier ist deine Kurzanalyse basierend auf deinen Angaben.
  </p>
</td></tr>

<!-- Main Issue -->
<tr><td style="border-top:1px solid #1A1A1A;padding:28px 0 8px 0;">
  <p style="color:#A0A0A0;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 10px 0;font-family:Inter,Helvetica,Arial,sans-serif;">WAHRSCHEINLICH GRÖSSTE SCHWACHSTELLE</p>
  <p style="color:#FFFFFF;font-size:15px;line-height:1.6;margin:0;font-family:Inter,Helvetica,Arial,sans-serif;">${analysis.main_issue}</p>
</td></tr>

<!-- Practical Meaning -->
<tr><td style="border-top:1px solid #1A1A1A;padding:28px 0 8px 0;">
  <p style="color:#A0A0A0;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 10px 0;font-family:Inter,Helvetica,Arial,sans-serif;">WAS DAS PRAKTISCH BEDEUTET</p>
  <p style="color:#FFFFFF;font-size:15px;line-height:1.6;margin:0;font-family:Inter,Helvetica,Arial,sans-serif;">${analysis.practical_meaning}</p>
</td></tr>

<!-- Priorities -->
<tr><td style="border-top:1px solid #1A1A1A;padding:28px 0 8px 0;">
  <p style="color:#A0A0A0;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 14px 0;font-family:Inter,Helvetica,Arial,sans-serif;">DEINE NÄCHSTEN 3 HEBEL</p>
  <table width="100%" cellpadding="0" cellspacing="0">${prioritiesHtml}</table>
</td></tr>

<!-- Next Step -->
<tr><td style="border-top:1px solid #1A1A1A;padding:28px 0 8px 0;">
  <p style="color:#A0A0A0;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 10px 0;font-family:Inter,Helvetica,Arial,sans-serif;">NÄCHSTER SINNVOLLER SCHRITT</p>
  <p style="color:#FFFFFF;font-size:15px;line-height:1.6;margin:0;font-family:Inter,Helvetica,Arial,sans-serif;">${analysis.next_step}</p>
</td></tr>

<!-- Decision Block -->
<tr><td style="border-top:1px solid #1A1A1A;padding:36px 0 12px 0;">
  <p style="color:#A0A0A0;font-size:11px;line-height:1.7;margin:0 0 24px 0;text-align:center;font-family:Inter,Helvetica,Arial,sans-serif;">
    Du hast zwei Optionen:<br/>
    Weitermachen wie bisher – oder herausfinden, was sich konkret ändern lässt.
  </p>
</td></tr>

<!-- CTA Button - White BG, Black Text -->
<tr><td style="padding:0 0 0 0;" align="center">
  <table cellpadding="0" cellspacing="0" width="100%" style="max-width:400px;">
    <tr><td align="center">
      <a href="${ctaUrl}" style="display:block;background-color:#FFFFFF;color:#000000;text-decoration:none;padding:18px 32px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;font-weight:700;font-family:Inter,Helvetica,Arial,sans-serif;text-align:center;mso-padding-alt:0;">KOSTENLOSE STRATEGIE-SESSION BUCHEN</a>
    </td></tr>
  </table>
</td></tr>

<!-- Sub-CTA text -->
<tr><td style="padding:28px 0 0 0;">
  <p style="color:#A0A0A0;font-size:11px;line-height:1.6;margin:0;text-align:center;font-family:Inter,Helvetica,Arial,sans-serif;">
    Wir zeigen dir konkret, wo du Geld verlierst – und wie du es fixst.
  </p>
</td></tr>

<!-- Footer -->
<tr><td style="padding:48px 0 0 0;border-top:1px solid #1A1A1A;margin-top:32px;">
  <p style="color:#A0A0A0;font-size:10px;letter-spacing:0.14em;text-align:center;margin:24px 0 0 0;text-transform:uppercase;font-family:Inter,Helvetica,Arial,sans-serif;">KÖFMAN</p>
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
  variant?: string
): Promise<boolean> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY || !email) return false;

  const emailHtml = buildEmailHtml(name, analysis, variant);

  const emailRes = await fetch("https://api.resend.com/emails", {
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
    const {
      name,
      email,
      company,
      business_type,
      lead_flow,
      revenue_clarity,
      main_problem,
      variant,
      qr_session_id,
      // Resend-only mode: just re-send email for existing submission
      resend_submission_id,
    } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── RESEND MODE: re-send email for existing analysis ──
    if (resend_submission_id) {
      const { data: sub } = await supabase
        .from("diagnostic_submissions")
        .select("*")
        .eq("id", resend_submission_id)
        .single();
      if (!sub) throw new Error("Submission not found");

      const { data: existingAnalysis } = await supabase
        .from("lead_analyses")
        .select("*")
        .eq("submission_id", resend_submission_id)
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

      const sent = await sendAnalysisEmail(sub.email, sub.name, analysis, sub.variant);
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

    // ── STANDARD MODE: generate new analysis ──
    if (!name || !email) {
      return new Response(
        JSON.stringify({ success: false, error: "Name und E-Mail sind erforderlich." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Store diagnostic submission
    const { data: submission, error: subErr } = await supabase
      .from("diagnostic_submissions")
      .insert({
        name,
        email,
        company: company || null,
        business_type: business_type || "",
        lead_flow: lead_flow || "",
        revenue_clarity: revenue_clarity || "",
        main_problem: main_problem || "",
        variant: variant || null,
        qr_session_id: qr_session_id || null,
      })
      .select()
      .single();

    if (subErr) throw subErr;

    // 2. Also insert into landing_leads for admin backward compatibility
    await supabase.from("landing_leads").insert({
      name,
      email,
      company: company || "",
      industry: business_type || "unknown",
      situation: `Anfragen: ${lead_flow || "-"}, Umsatzverlust: ${revenue_clarity || "-"}`,
      needs: [main_problem || "unknown"],
      contact_method: "email",
      status: "neu",
      admin_notes: `QR-Variante: ${variant || "direct"}. Submission-ID: ${submission.id}`,
    });

    // 3. Generate AI analysis
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
        unklare_ablaeufe: "Unklare Abläufe",
        keine_conversion: "Keine klare Conversion-Struktur",
        unsicher: "Nicht sicher, wo das Problem liegt",
      };
      const typeLabels: Record<string, string> = {
        dienstleistung: "Dienstleistung",
        lokal: "Lokales Geschäft",
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
- Die Analyse soll Interesse an einer Strategie-Session verstärken.
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
- Bekommt kontinuierlich Anfragen: ${lead_flow || "keine Angabe"}
- Weiß, wo Umsatz verloren geht: ${revenue_clarity || "keine Angabe"}
- Hauptproblem: ${problemLabels[main_problem] || main_problem || "keine Angabe"}
- Firma: ${company || "nicht angegeben"}
- Variante: ${variant || "direct"}

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
                      headline: {
                        type: "string",
                        description: "Kurze Überschrift der Analyse (z.B. 'Deine Kurzanalyse')",
                      },
                      main_issue: {
                        type: "string",
                        description:
                          "Wahrscheinlich größte Schwachstelle (1-2 Sätze, konkret)",
                      },
                      practical_meaning: {
                        type: "string",
                        description:
                          "Was das praktisch für das Unternehmen bedeutet (1-2 Sätze)",
                      },
                      priorities: {
                        type: "array",
                        items: { type: "string" },
                        description: "Genau 3 konkrete Prioritäten (je 1 Satz)",
                      },
                      next_step: {
                        type: "string",
                        description:
                          "Der nächste sinnvolle Schritt (1 Satz, konkret)",
                      },
                    },
                    required: [
                      "headline",
                      "main_issue",
                      "practical_meaning",
                      "priorities",
                      "next_step",
                    ],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: {
              type: "function",
              function: { name: "create_analysis" },
            },
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
          if (!Array.isArray(analysis.priorities)) {
            analysis.priorities = [];
          }
          while (analysis.priorities.length < 3) {
            analysis.priorities.push("");
          }
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

    // 4. Store analysis
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

    // 5. Send email
    let emailSent = false;
    if (analysisStatus === "completed") {
      try {
        emailSent = await sendAnalysisEmail(email, name, analysis, variant);
        if (emailSent && savedAnalysis) {
          await supabase
            .from("lead_analyses")
            .update({
              email_sent: true,
              email_sent_at: new Date().toISOString(),
            })
            .eq("id", savedAnalysis.id);
        }
      } catch (emailErr) {
        console.error("Email error:", emailErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: {
          headline: analysis.headline,
          main_issue: analysis.main_issue,
          practical_meaning: analysis.practical_meaning,
          priorities: analysis.priorities,
          next_step: analysis.next_step,
        },
        analysis_status: analysisStatus,
        email_sent: emailSent,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
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
