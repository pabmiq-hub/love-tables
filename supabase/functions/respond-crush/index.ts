import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const escapeHtml = (s: string): string =>
  (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

const textEncoder = new TextEncoder();
let crushKeyPromise: Promise<CryptoKey> | null = null;

const toBase64Url = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const getCrushKey = async (): Promise<CryptoKey> => {
  if (!crushKeyPromise) {
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");
    crushKeyPromise = crypto.subtle.importKey(
      "raw",
      textEncoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
  }
  return crushKeyPromise;
};

const createCrushToken = async (requestId: string): Promise<string> => {
  const key = await getCrushKey();
  const payload = textEncoder.encode(`crush:${requestId}`);
  const signature = await crypto.subtle.sign("HMAC", key, payload);
  return toBase64Url(signature);
};

interface SendArgs {
  resendApiKey: string;
  toEmail: string;
  recipientName: string;
  partnerName: string;
  partnerEmail: string;
  partnerPhone: string;
  eventName: string;
  lang: "es" | "en";
  variant: "mutual" | "declined";
  scheduledRound?: number;
  storedTpl?: any;
}

const sendCrushEmail = async (args: SendArgs) => {
  const { resendApiKey, toEmail, recipientName, partnerName, partnerEmail, partnerPhone, eventName, lang, variant, scheduledRound, storedTpl } = args;
  if (!resendApiKey || !toEmail) return;

  const tplKey = variant === "mutual" ? "crush_mutual" : "crush_declined";
  const tpl = storedTpl?.[tplKey] || null;

  const phoneDisplay = partnerPhone || (lang === "en" ? "(not provided)" : "(no facilitado)");

  const renderVar = (s: string) => (s || "")
    .replace(/\{\{nombre\}\}/g, escapeHtml(recipientName))
    .replace(/\{\{evento\}\}/g, escapeHtml(eventName))
    .replace(/\{\{otraPersona\}\}/g, escapeHtml(partnerName))
    .replace(/\{\{contactoTelefono\}\}/g, escapeHtml(phoneDisplay))
    .replace(/\{\{contactoEmail\}\}/g, escapeHtml(phoneDisplay))
    .replace(/\{\{ronda\}\}/g, scheduledRound ? String(scheduledRound) : "");

  const defaults = variant === "mutual"
    ? {
        subject: lang === "en"
          ? `💘 Mutual Flechazo with {{otraPersona}} at {{evento}}!`
          : `💘 ¡Flechazo mutuo con {{otraPersona}} en {{evento}}!`,
        greeting: lang === "en" ? `Hi {{nombre}}! 🎉` : `¡Hola {{nombre}}! 🎉`,
        intro: lang === "en"
          ? `Great news! You and <strong>{{otraPersona}}</strong> have a mutual Flechazo at {{evento}}.\n\nHere's their contact phone so you can reach out: <strong>{{contactoTelefono}}</strong>${scheduledRound ? `\n\nWe'll also seat you together at the same table in round {{ronda}}.` : ""}`
          : `¡Buenas noticias! Tú y <strong>{{otraPersona}}</strong> tenéis un Flechazo mutuo en {{evento}}.\n\nAquí tienes su teléfono de contacto para que puedas escribirle: <strong>{{contactoTelefono}}</strong>${scheduledRound ? `\n\nAdemás, os sentaremos en la misma mesa en la ronda {{ronda}}.` : ""}`,

        closing: lang === "en" ? `Enjoy the connection!` : `¡Disfruta de la conexión!`,
        signature: lang === "en" ? `With love,<br/>Konektum 💕` : `Con cariño,<br/>Konektum 💕`,
      }
    : {
        subject: lang === "en" ? `About your Flechazo at {{evento}}` : `Sobre tu Flechazo en {{evento}}`,
        greeting: lang === "en" ? `Hi {{nombre}}! 👋` : `¡Hola {{nombre}}! 👋`,
        intro: lang === "en"
          ? `We've delivered your Flechazo, but the other person decided not to accept this time. Don't be discouraged — every event brings new opportunities!`
          : `Hemos entregado tu Flechazo, pero la otra persona ha decidido no aceptarlo en esta ocasión. ¡No te desanimes! Cada evento trae nuevas oportunidades.`,
        closing: lang === "en" ? `Keep enjoying the experience.` : `Sigue disfrutando de la experiencia.`,
        signature: lang === "en" ? `With love,<br/>Konektum 💕` : `Con cariño,<br/>Konektum 💕`,
      };

  const subject = renderVar(tpl?.subject || defaults.subject);
  const greeting = renderVar(tpl?.greeting || defaults.greeting);
  const intro = renderVar(tpl?.intro || defaults.intro);
  const closing = renderVar(tpl?.closing || defaults.closing);
  const signature = renderVar(tpl?.signature || defaults.signature);
  const accent = variant === "mutual" ? "#e11d48" : "#8B5CF6";

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
      body: JSON.stringify({ from: "Konektum <hola@konektum.com>", to: [toEmail], subject, html }),
    });
  } catch (mailErr) {
    console.error("[respond-crush] email send failed", mailErr);
  }
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { request_id, token, action } = await req.json();
    if (!request_id || !token || !["accept", "decline"].includes(action)) {
      return new Response(JSON.stringify({ error: "request_id, token y action (accept|decline) requeridos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expected = await createCrushToken(request_id);
    if (token !== expected) {
      return new Response(JSON.stringify({ error: "Enlace inválido o caducado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";

    const { data: cr } = await supabase
      .from("crush_requests")
      .select("id, event_id, requester_id, target_id, status")
      .eq("id", request_id)
      .maybeSingle();

    if (!cr) {
      return new Response(JSON.stringify({ error: "Flechazo no encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (cr.status !== "pending") {
      return new Response(
        JSON.stringify({ error: "Este flechazo ya fue procesado", status: cr.status }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: event } = await supabase
      .from("events")
      .select("id, name, status, current_round, rounds, language, email_template")
      .eq("id", cr.event_id)
      .maybeSingle();

    const { data: people } = await supabase
      .from("participants")
      .select("id, name, email, phone")
      .in("id", [cr.requester_id, cr.target_id]);
    const requester = people?.find((p: any) => p.id === cr.requester_id);
    const target = people?.find((p: any) => p.id === cr.target_id);

    const lang = (event as any)?.language === "en" ? "en" : "es";
    const storedTpl = ((event as any)?.email_template as any)?.communication_templates_v2;
    const eventName = (event as any)?.name || "";

    if (action === "decline") {
      await supabase
        .from("crush_requests")
        .update({ status: "declined", responded_at: new Date().toISOString() })
        .eq("id", request_id);

      if (requester?.email) {
        await sendCrushEmail({
          resendApiKey,
          toEmail: requester.email,
          recipientName: requester.name || "",
          partnerName: target?.name || "",
          partnerEmail: target?.email || "",
          partnerPhone: (target as any)?.phone || "",
          eventName, lang, variant: "declined",
          storedTpl,
        });
      }

      return new Response(JSON.stringify({ success: true, status: "declined" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // accept: maybe schedule a round inclusion
    let scheduledRound: number | undefined;
    if (event && event.status !== "completed") {
      const generated = Array.isArray((event as any).tables) ? (event as any).tables.length : 0;
      const totalRounds = (event as any).rounds || 0;
      const cur = (event as any).current_round || 0;
      if (cur < totalRounds) {
        const a = cr.requester_id < cr.target_id ? cr.requester_id : cr.target_id;
        const b = cr.requester_id < cr.target_id ? cr.target_id : cr.requester_id;
        await supabase.from("participant_inclusions").insert({
          event_id: cr.event_id,
          participant_1_id: a,
          participant_2_id: b,
          reason: `crush_request:${cr.id}`,
        });
        scheduledRound = Math.max(cur + 1, generated + 1);
      }
    }

    await supabase
      .from("crush_requests")
      .update({
        status: "accepted",
        responded_at: new Date().toISOString(),
        scheduled_round: scheduledRound ?? null,
      })
      .eq("id", request_id);

    // Send mutual emails (reciprocal contact exchange)
    if (requester?.email && target) {
      await sendCrushEmail({
        resendApiKey,
        toEmail: requester.email,
        recipientName: requester.name || "",
        partnerName: target.name || "",
        partnerEmail: target.email || "",
        partnerPhone: (target as any).phone || "",
        eventName, lang, variant: "mutual", scheduledRound, storedTpl,
      });
    }
    if (target?.email && requester) {
      // 350ms rate-limit safety for Resend
      await new Promise((r) => setTimeout(r, 350));
      await sendCrushEmail({
        resendApiKey,
        toEmail: target.email,
        recipientName: target.name || "",
        partnerName: requester.name || "",
        partnerEmail: requester.email || "",
        eventName, lang, variant: "mutual", scheduledRound, storedTpl,
      });
    }

    return new Response(
      JSON.stringify({ success: true, status: "accepted", scheduled_round: scheduledRound ?? null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[respond-crush] error", err);
    return new Response(JSON.stringify({ error: err.message || "Error interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
