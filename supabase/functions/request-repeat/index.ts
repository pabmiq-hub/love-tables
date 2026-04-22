import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const escapeHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

const textEncoder = new TextEncoder();
let repeatKeyPromise: Promise<CryptoKey> | null = null;

const toBase64Url = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const getRepeatKey = async (): Promise<CryptoKey> => {
  if (!repeatKeyPromise) {
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");
    repeatKeyPromise = crypto.subtle.importKey(
      "raw",
      textEncoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
  }
  return repeatKeyPromise;
};

const createRepeatToken = async (requestId: string): Promise<string> => {
  const key = await getRepeatKey();
  const payload = textEncoder.encode(`repeat:${requestId}`);
  const signature = await crypto.subtle.sign("HMAC", key, payload);
  return toBase64Url(signature);
};

// Anonymize: "Juan Pérez" -> "Juan P."
const anonymize = (fullName: string): string => {
  const parts = (fullName || "").trim().split(/\s+/);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.`;
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { event_id, requester_id, target_id } = await req.json();
    if (!event_id || !requester_id || !target_id) {
      return new Response(JSON.stringify({ error: "event_id, requester_id and target_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (requester_id === target_id) {
      return new Response(JSON.stringify({ error: "No puedes solicitarte a ti mismo" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Validate event
    const { data: event } = await supabase
      .from("events")
      .select("id, name, status, current_round, rounds, organizer_id, language, repeat_request_enabled")
      .eq("id", event_id)
      .maybeSingle();
    if (event && !(event as any).repeat_request_enabled) {
      return new Response(
        JSON.stringify({ error: "La función Repetir no está activada para este evento" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!event) {
      return new Response(JSON.stringify({ error: "Evento no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (event.status === "completed") {
      return new Response(JSON.stringify({ error: "El evento ha finalizado" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate participants
    const { data: parts } = await supabase
      .from("participants")
      .select("id, name, email, checked_in, cancelled_at, event_id")
      .in("id", [requester_id, target_id]);
    const requester = parts?.find((p: any) => p.id === requester_id);
    const target = parts?.find((p: any) => p.id === target_id);

    if (!requester || !target || requester.event_id !== event_id || target.event_id !== event_id) {
      return new Response(JSON.stringify({ error: "Participantes no válidos" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (requester.cancelled_at || target.cancelled_at) {
      return new Response(JSON.stringify({ error: "Uno de los participantes ya canceló" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!target.email) {
      return new Response(JSON.stringify({ error: "No se puede contactar al destinatario" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check existing request from this requester
    const { data: existing } = await supabase
      .from("repeat_requests")
      .select("id, status")
      .eq("event_id", event_id)
      .eq("requester_id", requester_id)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "Ya has usado tu solicitud de repetir en este evento", status: existing.status }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Insert pending request — token generated post-insert via id
    const { data: inserted, error: insertErr } = await supabase
      .from("repeat_requests")
      .insert({
        event_id,
        requester_id,
        target_id,
        status: "pending",
        token: crypto.randomUUID(), // temporary, will replace with HMAC
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();

    if (insertErr || !inserted) {
      console.error("[request-repeat] insert error", insertErr);
      return new Response(JSON.stringify({ error: "No se pudo crear la solicitud" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await createRepeatToken(inserted.id);
    await supabase.from("repeat_requests").update({ token }).eq("id", inserted.id);

    // Build accept/decline links — they hit a thin frontend page that calls respond-repeat
    const baseUrl = Deno.env.get("PUBLIC_APP_URL") || "https://konektum.com";
    const acceptUrl = `${baseUrl}/repeat-response?id=${inserted.id}&token=${token}&action=accept`;
    const declineUrl = `${baseUrl}/repeat-response?id=${inserted.id}&token=${token}&action=decline`;

    // Send email to target if Resend is configured
    if (resendApiKey && target.email) {
      const requesterDisplay = anonymize(requester.name || "Una persona del evento");
      const lang = event.language === "en" ? "en" : "es";

      // Load template from event.email_template.communication_templates_v2.repeat_request_received (if any)
      const { data: ev2 } = await supabase
        .from("events")
        .select("email_template")
        .eq("id", event_id)
        .maybeSingle();
      const stored = (ev2?.email_template as any)?.communication_templates_v2;
      const tpl = stored?.repeat_request_received || null;

      const renderVar = (s: string) =>
        (s || "")
          .replace(/\{\{nombre\}\}/g, escapeHtml(target.name || ""))
          .replace(/\{\{evento\}\}/g, escapeHtml(event.name))
          .replace(/\{\{solicitante\}\}/g, escapeHtml(requesterDisplay));

      const subject = tpl?.subject
        ? renderVar(tpl.subject)
        : (lang === "en"
          ? `🔁 ${requesterDisplay} wants to meet you again`
          : `🔁 ${requesterDisplay} quiere volver a coincidir contigo`);

      const greeting = renderVar(tpl?.greeting || (lang === "en" ? "Hi {{nombre}}! 👋" : "¡Hola {{nombre}}! 👋"));
      const intro = renderVar(tpl?.intro || (lang === "en"
        ? `{{solicitante}} has asked to meet you again at <strong>{{evento}}</strong>.`
        : `{{solicitante}} quiere volver a coincidir contigo en <strong>{{evento}}</strong>.`));
      const closing = renderVar(tpl?.closing || (lang === "en"
        ? "Tap a button below to respond. Your decision is fully confidential."
        : "Pulsa un botón para responder. Tu decisión es totalmente confidencial."));
      const signature = renderVar(tpl?.signature || (lang === "en" ? "With love,<br/>Konektum 💕" : "Con cariño,<br/>Konektum 💕"));
      const acceptLabel = lang === "en" ? "✅ Accept" : "✅ Aceptar";
      const declineLabel = lang === "en" ? "Decline" : "Rechazar";

      const html = `
        <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
          <h2 style="font-family: Outfit, Arial, sans-serif; color: #8B5CF6; margin-bottom: 8px;">${escapeHtml(greeting)}</h2>
          <p style="font-size: 15px; line-height: 1.5;">${intro.replace(/\n/g, '<br/>')}</p>
          <div style="margin: 28px 0; text-align: center;">
            <a href="${acceptUrl}" style="display: inline-block; background: #8B5CF6; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-right: 8px;">${acceptLabel}</a>
            <a href="${declineUrl}" style="display: inline-block; background: #f3f4f6; color: #374151; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">${declineLabel}</a>
          </div>
          <p style="font-size: 14px; color: #555; line-height: 1.5;">${escapeHtml(closing)}</p>
          <p style="font-size: 13px; color: #888; margin-top: 24px;">${signature}</p>
        </div>
      `;

      const senderEmail = "Konektum <hola@konektum.com>";
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: senderEmail,
            to: [target.email],
            subject,
            html,
          }),
        });
      } catch (mailErr) {
        console.error("[request-repeat] email send failed", mailErr);
      }
    }

    return new Response(JSON.stringify({ success: true, request_id: inserted.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[request-repeat] error", err);
    return new Response(JSON.stringify({ error: err.message || "Error interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
