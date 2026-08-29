import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Base64-encode bytes in chunks. Encoding in one pass would blow the argument
 * limit of String.fromCharCode on larger receipt scans.
 */
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { documentId, fileUrl } = await req.json();
    if (!documentId || !fileUrl) {
      return new Response(JSON.stringify({ error: "documentId and fileUrl required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");
    const GEMINI_MODEL = Deno.env.get("GEMINI_RECEIPT_MODEL") ?? "gemini-3.6-flash";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get signed URL for the image
    const { data: signedData, error: signedError } = await supabase.storage
      .from("client-documents")
      .createSignedUrl(fileUrl, 600);

    if (signedError || !signedData?.signedUrl) {
      console.error("Failed to create signed URL:", signedError);
      return new Response(JSON.stringify({ error: "Could not access file" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Google's OpenAI-compatible endpoint documents base64 data URIs for image
    // input, so send the bytes inline rather than a signed URL the model host
    // would have to fetch itself.
    const imageRes = await fetch(signedData.signedUrl);
    if (!imageRes.ok) {
      console.error("Failed to download file for analysis:", imageRes.status);
      return new Response(JSON.stringify({ error: "Could not access file" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const imageMediaType = imageRes.headers.get("content-type") ?? "image/jpeg";
    const imageUrl = `data:${imageMediaType};base64,${toBase64(new Uint8Array(await imageRes.arrayBuffer()))}`;

    // Call the Gemini API (OpenAI-compatible endpoint) with vision
    const aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        messages: [
          {
            role: "system",
            content: `Du bist ein Belegerkennungssystem für deutsche Buchhaltung. Analysiere das Bild eines Belegs und extrahiere strukturierte Daten. Antworte NUR mit dem tool call.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analysiere diesen Beleg und extrahiere die relevanten Daten.",
              },
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_receipt",
              description: "Extrahiere strukturierte Daten aus einem Beleg",
              parameters: {
                type: "object",
                properties: {
                  vendor_name: {
                    type: "string",
                    description: "Name des Ausstellers / Lieferanten / Geschäfts",
                  },
                  receipt_date: {
                    type: "string",
                    description: "Datum des Belegs im Format YYYY-MM-DD, oder leer wenn nicht erkennbar",
                  },
                  total_amount: {
                    type: "number",
                    description: "Gesamtbetrag (brutto) in Euro",
                  },
                  vat_amount: {
                    type: "number",
                    description: "Umsatzsteuerbetrag in Euro, oder 0 wenn nicht erkennbar",
                  },
                  net_amount: {
                    type: "number",
                    description: "Nettobetrag in Euro, oder 0 wenn nicht erkennbar",
                  },
                  suggested_category: {
                    type: "string",
                    enum: [
                      "eingangsrechnungen",
                      "bewirtung",
                      "fahrtkosten",
                      "reisekosten",
                      "miete",
                      "versicherungen",
                      "kontoauszuege",
                      "kreditkarte",
                      "sonstiges",
                    ],
                    description: "Vorgeschlagene Kategorie basierend auf dem Inhalt",
                  },
                  confidence: {
                    type: "string",
                    enum: ["high", "medium", "low"],
                    description: "Wie sicher die Erkennung ist (high = klar lesbar, low = unscharf/unklar)",
                  },
                  notes: {
                    type: "string",
                    description: "Kurze Anmerkung falls etwas unklar oder besonders ist",
                  },
                },
                required: ["suggested_category", "confidence"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_receipt" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("Gemini API error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Analyse gerade nicht verfügbar. Bitte versuchen Sie es später erneut." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI-Kontingent erschöpft." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Still save document without analysis
      return new Response(JSON.stringify({ extracted: null, error: "Analyse fehlgeschlagen" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    let extracted: Record<string, unknown> | null = null;

    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        extracted = JSON.parse(toolCall.function.arguments);
      }
    } catch (e) {
      console.error("Failed to parse AI response:", e);
    }

    // Update document with extracted data
    if (extracted) {
      const updates: Record<string, unknown> = { extracted_data: extracted };

      // If AI suggested a category with high confidence, update the category
      if (extracted.suggested_category && extracted.confidence === "high") {
        updates.category = extracted.suggested_category;
      }

      const { error: updateError } = await supabase
        .from("documents")
        .update(updates)
        .eq("id", documentId);

      if (updateError) console.error("Failed to update document:", updateError);
    }

    return new Response(JSON.stringify({ extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-receipt error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
