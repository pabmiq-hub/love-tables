import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const escapeHtml = (s: string): string =>
  (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

const sendRequesterEmail = async (params: {
  resendApiKey: string;
  requesterEmail: string;
  requesterName: string;
  eventName: string;
  eventLang: "es" | "en";
  status: "accepted" | "declined" | "expired";
  scheduledRound?: number;
  storedTpl?: any;
}) => {
  const { resendApiKey, requesterEmail, requesterName, eventName, eventLang: lang, status, scheduledRound, storedTpl } = params;
  if (!resendApiKey || !requesterEmail) return;

  const tplKey = status === "accepted" ? "repeat_request_accepted" : "repeat_request_declined";
  const tpl = storedTpl?.[tplKey] || null;

  const renderVar = (s: string) =>
    (s || "")
      .replace(/\{\{nombre\}\}/g, escapeHtml(requesterName))
      .replace(/\{\{evento\}\}/g, escapeHtml(eventName))
      .replace(/\{\{ronda\}\}/g, String(scheduledRound ?? ""));

  const defaults = status === "accepted"
    ? {
        subject: lang === "en" ? `✅ Your repeat request was accepted at {{evento}}!` : `✅ ¡Tu solicitud de repetir ha sido aceptada en {{evento}}!`,
        greeting: lang === "en" ? `Hi {{nombre}}! 🎉` : `¡Hola {{nombre}}! 🎉`,
        intro: lang === "en"
          ? `Great news! The person you asked to meet again has accepted.\n\nWe'll seat you at the same table in round {{ronda}}.`
          : `¡Buenas noticias! La persona a la que pediste volver a coincidir ha aceptado.\n\nOs sentaremos en la misma mesa en la ronda {{ronda}}.`,
        closing: lang === "en" ? `Enjoy the reconnection!` : `¡Disfruta del reencuentro!`,
        signature: lang === "en" ? `With love,<br/>Konektum 💕` : `Con cariño,<br/>Konektum 💕`,
      }
    : {
        subject: lang === "en" ? `About your repeat request at {{evento}}` : `Sobre tu solicitud de repetir en {{evento}}`,
        greeting: lang === "en" ? `Hi {{nombre}}! 👋` : `¡Hola {{nombre}}! 👋`,
        intro: lang === "en"
          ? `We've delivered your repeat request, but it wasn't possible to apply it this time. Don't be discouraged!`
          : `Hemos comunicado tu solicitud de repetir, pero en esta ocasión no ha sido posible aplicarla. ¡No te desanimes!`,
        closing: lang === "en" ? `Keep enjoying the experience.` : `Sigue con tu experiencia y revisa tus matches al final del evento.`,
        signature: lang === "en" ? `With love,<br/>Konektum 💕` : `Con cariño,<br/>Konektum 💕`,
      };

  const subject = renderVar(tpl?.subject || defaults.subject);
  const greeting = renderVar(tpl?.greeting || defaults.greeting);
  const intro = renderVar(tpl?.intro || defaults.intro);
  const closing = renderVar(tpl?.closing || defaults.closing);
  const signature = renderVar(tpl?.signature || defaults.signature);
  const accent = status === "accepted" ? "#10B981" : "#8B5CF6";

  const html = `
    <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
      <h2 style="font-family: Outfit, Arial, sans-serif; color: ${accent}; margin-bottom: 8px;">${escapeHtml(greeting)}</h2>
      <p style="font-size: 15px; line-height: 1.5;">${intro.replace(/\n/g, '<br/>')}</p>
      <p style="font-size: 14px; color: #555; line-height: 1.5; margin-top: 16px;">${escapeHtml(closing)}</p>
      <p style="font-size: 13px; color: #888; margin-top: 24px;">${signature}</p>
    </div>
  `;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "Konektum <hola@konektum.com>", to: [requesterEmail], subject, html }),
    });
  } catch (mailErr) {
    console.error("[respond-repeat] email send failed", mailErr);
  }
};

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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { request_id, token, action } = await req.json();
    if (!request_id || !token || !["accept", "decline"].includes(action)) {
      return new Response(JSON.stringify({ error: "request_id, token y action (accept|decline) requeridos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expected = await createRepeatToken(request_id);
    if (token !== expected) {
      return new Response(JSON.stringify({ error: "Enlace inválido o caducado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: rr } = await supabase
      .from("repeat_requests")
      .select("id, event_id, requester_id, target_id, status, expires_at")
      .eq("id", request_id)
      .maybeSingle();

    if (!rr) {
      return new Response(JSON.stringify({ error: "Solicitud no encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (rr.status !== "pending") {
      return new Response(
        JSON.stringify({ error: "Esta solicitud ya fue procesada", status: rr.status }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (rr.expires_at && new Date(rr.expires_at) < new Date()) {
      await supabase.from("repeat_requests").update({ status: "expired" }).eq("id", request_id);
      return new Response(JSON.stringify({ error: "La solicitud ha caducado" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "decline") {
      await supabase.from("repeat_requests").update({ status: "declined" }).eq("id", request_id);
      return new Response(JSON.stringify({ success: true, status: "declined" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Accept: validate the event still has rounds remaining
    const { data: event } = await supabase
      .from("events")
      .select("id, status, current_round, rounds, tables, tables_generation_mode")
      .eq("id", rr.event_id)
      .maybeSingle();

    if (!event || event.status === "completed") {
      await supabase.from("repeat_requests").update({ status: "expired" }).eq("id", request_id);
      return new Response(JSON.stringify({ error: "El evento ya ha finalizado" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const generated = Array.isArray(event.tables) ? event.tables.length : 0;
    const totalRounds = event.rounds || 0;
    const cur = event.current_round || 0;

    // Need a future round to materialize. In per_round mode the next round is generated on completion.
    // In upfront mode the next round must already exist as data in event.tables.
    if (cur >= totalRounds) {
      await supabase.from("repeat_requests").update({ status: "expired" }).eq("id", request_id);
      return new Response(JSON.stringify({ error: "Ya no quedan rondas para aplicar la solicitud" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a participant_inclusion so the next generated round seats them together.
    // For upfront mode, the organizer must regenerate the next round manually (UI alert).
    const a = rr.requester_id < rr.target_id ? rr.requester_id : rr.target_id;
    const b = rr.requester_id < rr.target_id ? rr.target_id : rr.requester_id;
    await supabase.from("participant_inclusions").insert({
      event_id: rr.event_id,
      participant_1_id: a,
      participant_2_id: b,
      reason: `repeat_request:${rr.id}`,
    });

    const scheduledRound = Math.max(cur + 1, generated + 1);
    await supabase
      .from("repeat_requests")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        scheduled_round: scheduledRound,
      })
      .eq("id", request_id);

    return new Response(
      JSON.stringify({ success: true, status: "accepted", scheduled_round: scheduledRound }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[respond-repeat] error", err);
    return new Response(JSON.stringify({ error: err.message || "Error interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
