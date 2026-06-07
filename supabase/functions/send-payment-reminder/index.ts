import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");

const nl2br = (s: string) => escapeHtml(s).replace(/\n/g, "<br>");

const replaceVars = (text: string, vars: Record<string, string>) => {
  let out = text;
  for (const [k, v] of Object.entries(vars)) out = out.replaceAll(k, v);
  return out;
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const DELAY_BETWEEN_EMAILS = 550;

const DEFAULT_ES = {
  subject: "💳 Recordatorio: completa tu pago para {{evento}}",
  greeting: "¡Hola {{nombre}}! 👋",
  intro:
    "Te recordamos que tu inscripción a {{evento}} aún figura como pendiente de pago.\n\n📅 Fecha: {{fecha}}\n📍 Lugar: {{ubicacion}}\n🕐 Hora: {{hora}}\n\nPor favor, completa el pago para confirmar tu plaza.",
  closing: "Si ya has realizado el pago, ignora este mensaje. ¡Gracias!",
  signature: "Un saludo,\nEquipo Konektum",
};

const DEFAULT_EN = {
  subject: "💳 Reminder: complete your payment for {{evento}}",
  greeting: "Hi {{nombre}}! 👋",
  intro:
    "Just a reminder that your registration for {{evento}} is still marked as unpaid.\n\n📅 Date: {{fecha}}\n📍 Location: {{ubicacion}}\n🕐 Time: {{hora}}\n\nPlease complete the payment to secure your spot.",
  closing: "If you already paid, please ignore this message. Thank you!",
  signature: "Best regards,\nKonektum Team",
};

function parseEventDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], 12, 0, 0, 0);
}

function formatDate(dateStr?: string | null, locale = "es-ES") {
  const d = parseEventDate(dateStr);
  if (!d) return dateStr || "";
  return d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });
}

async function sendEmail(
  apiKey: string,
  data: { from: string; to: string[]; subject: string; html: string }
): Promise<{ ok: boolean; err?: string }> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) return { ok: true };
      const text = await res.text();
      if (res.status === 429 && attempt < 3) {
        await delay(2000);
        continue;
      }
      return { ok: false, err: text };
    } catch (e) {
      if (attempt < 3) {
        await delay(2000);
        continue;
      }
      return { ok: false, err: String(e) };
    }
  }
  return { ok: false, err: "max retries" };
}

async function processEvent(
  supabase: any,
  resendKey: string,
  event: any,
  participantIds: string[] | null,
  forceSend: boolean
): Promise<{ sent: number; failed: number; skipped: number }> {
  const stats = { sent: 0, failed: 0, skipped: 0 };

  if (event.is_test_event) {
    const tc = event.test_config || {};
    if (!tc.redirectEmail || tc.disableEmails === true) {
      return { ...stats, skipped: 999 };
    }
  }

  const isEn = event.language === "en";
  const emailTpl = event.email_template as any;
  const comm = emailTpl?.communication_templates_v2 || {};
  const tpl = comm.payment_reminder || (isEn ? DEFAULT_EN : DEFAULT_ES);
  const defaults = isEn ? DEFAULT_EN : DEFAULT_ES;
  const primaryColor = comm.primaryColor || "#e11d48";
  const KONEKTUM_LOGO = "https://konektum.com/konektum-logo.png";
  let logoUrl = comm.logoUrl || KONEKTUM_LOGO;
  let brandName = comm.brandName || "Konektum";
  const headerTitle = comm.headerTitle || (isEn ? "Welcome to the event!" : "¡Bienvenido/a al evento!");
  const logoHeight = Math.min(120, Math.max(24, Number(comm.logoHeight) || 48));

  // Resolve organizer branding + resend config
  let senderFrom = `${brandName} <noreply@konektum.com>`;
  let apiKey = resendKey;
  if (event.organizer_id) {
    const { data: org } = await supabase
      .from("organizers")
      .select("id, company_name, logo_url, active_modules")
      .eq("user_id", event.organizer_id)
      .maybeSingle();
    if (org) {
      const isPro =
        (org.active_modules || []).length === 1 && org.active_modules[0] === "professional";
      if (isPro && org.logo_url && !comm.logoUrl) logoUrl = org.logo_url;
      if (isPro && org.company_name && !comm.brandName) brandName = org.company_name;
      const { data: rc } = await supabase
        .from("organizer_resend_config")
        .select("resend_api_key, sender_email, sender_name")
        .eq("organizer_id", org.id)
        .eq("is_verified", true)
        .maybeSingle();
      if (rc) {
        senderFrom = `${rc.sender_name || brandName} <${rc.sender_email}>`;
        if (rc.resend_api_key) apiKey = rc.resend_api_key;
      }
    }
  }

  // Build participant query
  let q = supabase
    .from("participants")
    .select(
      "id, name, email, created_at, payment_status, payment_reminder_count, payment_last_reminder_at"
    )
    .eq("event_id", event.id)
    .neq("payment_status", "paid")
    .eq("is_fake", false);

  if (participantIds && participantIds.length > 0) {
    q = q.in("id", participantIds);
  }

  const { data: participants } = await q;
  if (!participants || participants.length === 0) return stats;

  const now = Date.now();
  const firstHours = Math.max(1, Number(event.payment_reminder_first_hours) || 24);
  const secondHours = event.payment_reminder_second_hours
    ? Math.max(firstHours + 1, Number(event.payment_reminder_second_hours))
    : null;

  const eligible = participants.filter((p: any) => {
    if (!p.email) return false;
    if (forceSend) return true;
    const ageH = (now - new Date(p.created_at).getTime()) / 3_600_000;
    const count = p.payment_reminder_count || 0;
    if (count === 0 && ageH >= firstHours) return true;
    if (count === 1 && secondHours && ageH >= secondHours) return true;
    return false;
  });

  if (eligible.length === 0) return stats;

  for (let i = 0; i < eligible.length; i++) {
    const p = eligible[i];
    const vars: Record<string, string> = {
      "{{nombre}}": p.name,
      "{{evento}}": event.name,
      "{{fecha}}": formatDate(event.date, isEn ? "en-US" : "es-ES"),
      "{{ubicacion}}": event.event_location || "",
      "{{hora}}": event.event_time || "",
    };

    const subject = replaceVars(tpl.subject || defaults.subject, vars);
    const greeting = replaceVars(tpl.greeting || defaults.greeting, vars);
    const intro = replaceVars(tpl.intro || defaults.intro, vars);
    const closing = replaceVars(tpl.closing || defaults.closing, vars);
    const signature = replaceVars(tpl.signature || defaults.signature, vars);

    const html = `
      <!DOCTYPE html><html><body style="font-family:'Segoe UI',Tahoma,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5;">
        <div style="background:${primaryColor};padding:30px;border-radius:10px 10px 0 0;text-align:center;">
          ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(brandName)}" style="max-height:${logoHeight}px;max-width:260px;margin-bottom:12px;" />` : ""}
          <h1 style="color:white;margin:0;font-size:24px;">${escapeHtml(headerTitle)}</h1>
        </div>
        <div style="background:white;padding:30px;border-radius:0 0 10px 10px;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
          <p style="font-size:18px;margin-bottom:20px;">${nl2br(greeting)}</p>
          <div style="color:#555;font-size:16px;margin-bottom:20px;">${nl2br(intro)}</div>
          <p style="color:#888;font-size:14px;text-align:center;">${nl2br(closing)}</p>
        </div>
        <div style="text-align:center;margin-top:20px;color:#888;font-size:12px;">
          <p>${nl2br(signature)}</p>
        </div>
      </body></html>`;

    const r = await sendEmail(apiKey, {
      from: senderFrom,
      to: [p.email],
      subject,
      html,
    });

    if (r.ok) {
      stats.sent++;
      await supabase
        .from("participants")
        .update({
          payment_reminder_count: (p.payment_reminder_count || 0) + 1,
          payment_last_reminder_at: new Date().toISOString(),
        })
        .eq("id", p.id);
      await supabase.from("email_logs").insert({
        event_id: event.id,
        participant_id: p.id,
        email_type: "payment_reminder",
        status: "sent",
        sent_at: new Date().toISOString(),
      });
    } else {
      stats.failed++;
      await supabase.from("email_logs").insert({
        event_id: event.id,
        participant_id: p.id,
        email_type: "payment_reminder",
        status: "failed",
        error_message: r.err,
      });
    }

    if (i < eligible.length - 1) await delay(DELAY_BETWEEN_EMAILS);
  }

  return stats;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const mode = body.mode === "automatic" ? "automatic" : "manual";

    if (mode === "manual") {
      // Auth: organizer ownership
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const supabaseAuth = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!
      );
      const { data: { user } } = await supabaseAuth.auth.getUser(
        authHeader.replace("Bearer ", "")
      );
      if (!user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { event_id, participant_ids } = body;
      if (!event_id) {
        return new Response(JSON.stringify({ error: "event_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: event } = await supabase
        .from("events")
        .select(
          "id, name, organizer_id, language, email_template, date, event_time, event_location, payment_tracking_enabled, payment_reminder_first_hours, payment_reminder_second_hours, is_test_event, test_config"
        )
        .eq("id", event_id)
        .single();

      if (!event || event.organizer_id !== user.id) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!event.payment_tracking_enabled) {
        return new Response(
          JSON.stringify({ error: "El seguimiento de pagos no está activo en este evento" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const stats = await processEvent(
        supabase,
        resendKey,
        event,
        Array.isArray(participant_ids) ? participant_ids : null,
        true
      );

      return new Response(JSON.stringify({ success: true, stats }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Automatic mode (cron)
    const { data: events } = await supabase
      .from("events")
      .select(
        "id, name, organizer_id, language, email_template, date, event_time, event_location, payment_tracking_enabled, payment_reminders_enabled, payment_reminder_first_hours, payment_reminder_second_hours, is_test_event, test_config"
      )
      .eq("payment_tracking_enabled", true)
      .eq("payment_reminders_enabled", true)
      .in("status", ["pending", "active"]);

    const results: any[] = [];
    for (const ev of events || []) {
      const stats = await processEvent(supabase, resendKey, ev, null, false);
      results.push({ event_id: ev.id, ...stats });
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
