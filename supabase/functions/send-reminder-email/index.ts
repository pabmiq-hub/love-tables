import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

function replaceVariables(text: string, vars: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(key, value);
  }
  return result;
}

function nl2br(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

function parseEventDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;

  const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!iso) return null;

  const year = Number(iso[1]);
  const month = Number(iso[2]);
  const day = Number(iso[3]);
  const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function normalizeUpcomingEventDate(dateStr?: string | null, status?: string | null): Date | null {
  const parsed = parseEventDate(dateStr);
  if (!parsed) return null;

  if (status !== 'pending') return parsed;

  const normalized = new Date(parsed);
  const threshold = new Date();
  threshold.setHours(12, 0, 0, 0);
  threshold.setMonth(threshold.getMonth() - 6);

  while (normalized < threshold) {
    normalized.setFullYear(normalized.getFullYear() + 1);
  }

  return normalized;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr?: string | null, status?: string | null, locale = 'es-ES'): string {
  const normalized = normalizeUpcomingEventDate(dateStr, status);
  if (!normalized) return dateStr || '';

  return normalized.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function serializeTemplate(template?: Record<string, unknown> | null): string {
  return JSON.stringify({
    subject: typeof template?.subject === 'string' ? template.subject.trim() : '',
    greeting: typeof template?.greeting === 'string' ? template.greeting.trim() : '',
    intro: typeof template?.intro === 'string' ? template.intro.trim() : '',
    closing: typeof template?.closing === 'string' ? template.closing.trim() : '',
    signature: typeof template?.signature === 'string' ? template.signature.trim() : '',
  });
}

function shouldFallbackToEventReminder(
  reminderTemplate?: Record<string, unknown> | null,
  selectionTemplate?: Record<string, unknown> | null,
): boolean {
  if (!reminderTemplate) return true;

  const text = [
    reminderTemplate.subject,
    reminderTemplate.intro,
    reminderTemplate.closing,
    reminderTemplate.signature,
  ]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();

  const looksLikeSelectionReminder = /(selecciones|matches|people you met|send your selections|submit your matches|indicar tus matches)/i.test(text);
  const hasEventSignals = /(\{\{fecha\}\}|\{\{ubicacion\}\}|\{\{hora\}\}|fecha|date|ubicación|location)/i.test(text);

  return (
    serializeTemplate(reminderTemplate) === serializeTemplate(selectionTemplate) ||
    (looksLikeSelectionReminder && !hasEventSignals)
  );
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const DELAY_BETWEEN_EMAILS = 550;
const RATE_LIMIT_RETRY_DELAY = 2000;
const MAX_RETRIES = 3;

const sendEmailWithRetry = async (
  resendApiKey: string,
  emailData: { from: string; to: string[]; subject: string; html: string },
  participantName: string
): Promise<{ success: boolean; error?: string }> => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Sending reminder to ${participantName} (attempt ${attempt}/${MAX_RETRIES})`);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(emailData),
      });
      
      if (res.ok) {
        console.log(`Reminder sent successfully to ${participantName}`);
        return { success: true };
      }
      
      const errorText = await res.text();
      
      if (res.status === 429 && attempt < MAX_RETRIES) {
        console.log(`Rate limit hit for ${participantName}, waiting ${RATE_LIMIT_RETRY_DELAY}ms before retry...`);
        await delay(RATE_LIMIT_RETRY_DELAY);
        continue;
      }
      
      console.error(`Failed to send reminder to ${participantName}: ${errorText}`);
      return { success: false, error: errorText };
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      if (attempt < MAX_RETRIES) {
        console.log(`Exception for ${participantName}, retrying: ${errMsg}`);
        await delay(RATE_LIMIT_RETRY_DELAY);
        continue;
      }
      console.error(`Exception sending reminder to ${participantName}: ${errMsg}`);
      return { success: false, error: errMsg };
    }
  }
  return { success: false, error: "Max retries exceeded" };
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-reminder-email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - No token provided" }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { event_id, participant_ids, reminder_type } = await req.json();
    const isSelectionReminder = reminder_type === "selection";

    if (!event_id) {
      return new Response(
        JSON.stringify({ error: "event_id is required" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "participant_ids array is required" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const logEmailResult = async (participantId: string, status: string, errorMessage?: string) => {
      try {
        await supabase.from("email_logs").insert({
          event_id,
          participant_id: participantId,
          email_type: isSelectionReminder ? 'selection_reminder' : 'event_reminder',
          status,
          error_message: errorMessage || null,
          sent_at: status === 'sent' ? new Date().toISOString() : null,
        });
      } catch (e) {
        console.error("Failed to log email result:", e);
      }
    };

    // Get event with email_template
    const { data: event } = await supabase
      .from("events")
      .select("name, organizer_id, language, email_template, date, event_time, event_location, status")
      .eq("id", event_id)
      .single();

    if (!event) {
      return new Response(
        JSON.stringify({ error: "Event not found" }), 
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (event.organizer_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Forbidden - You are not the organizer of this event" }), 
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isEn = event.language === 'en';

    // Load organizer branding defaults
    const KONEKTUM_LOGO_URL = "https://konektum.com/konektum-logo.png";
    let defaultLogoUrl = KONEKTUM_LOGO_URL;
    let defaultBrandName = "Konektum";
    
    if (event.organizer_id) {
      const { data: organizer } = await supabase
        .from("organizers")
        .select("company_name, logo_url, active_modules")
        .eq("user_id", event.organizer_id)
        .maybeSingle();
      
      if (organizer) {
        const modules = organizer.active_modules || [];
        const isProfessionalOnly = modules.length === 1 && modules[0] === "professional";
        if (isProfessionalOnly && organizer.logo_url) {
          defaultLogoUrl = organizer.logo_url;
          defaultBrandName = organizer.company_name || "Konektum";
        }
      }
    }

    // Read customized template - pick correct one based on reminder type
    const emailTemplate = event.email_template as any;
    const communicationTemplate = emailTemplate?.communication_templates_v2 || emailTemplate || {};
    const reminderOptions = isSelectionReminder 
      ? { showCalendarLinks: false, showUnsubscribe: false, showCountdown: false, unsubscribeText: '' }
      : (communicationTemplate?.reminderOptions || { showCalendarLinks: false, showUnsubscribe: false, showCountdown: false, unsubscribeText: '' });
    const primaryColor = communicationTemplate?.primaryColor || emailTemplate?.primaryColor || "#e11d48";
    const logoUrl = communicationTemplate?.logoUrl || emailTemplate?.logoUrl || defaultLogoUrl;
    const brandName = communicationTemplate?.brandName || emailTemplate?.brandName || defaultBrandName;
    const headerTitle = communicationTemplate?.headerTitle || (isEn ? "Welcome to the event!" : "¡Bienvenido/a al evento!");
    const rawLogoHeight = Number(communicationTemplate?.logoHeight ?? emailTemplate?.logoHeight ?? 48);
    const logoHeight = Number.isFinite(rawLogoHeight) ? Math.min(120, Math.max(24, rawLogoHeight)) : 48;

    // Determine sender
    let senderFrom = `${brandName} <noreply@konektum.com>`;
    if (event.organizer_id) {
      const { data: resendConfig } = await supabase
        .from("organizer_resend_config")
        .select("resend_api_key, sender_email, sender_name")
        .eq("organizer_id", (await supabase.from("organizers").select("id").eq("user_id", event.organizer_id).single()).data?.id || '')
        .eq("is_verified", true)
        .maybeSingle();
      
      if (resendConfig) {
        senderFrom = `${resendConfig.sender_name || brandName} <${resendConfig.sender_email}>`;
      }
    }

    // Get participants
    const { data: participants } = await supabase
      .from("participants")
      .select("id, name, email")
      .eq("event_id", event_id)
      .in("id", participant_ids);

    const stats = { total: 0, sent: 0, noEmail: 0, failed: 0 };
    const errors: string[] = [];

    const baseUrl = "https://konektum.com";

    // Default templates for each type
    const defaultEventReminderES = {
      subject: `📅 Recordatorio: ¡No te olvides de ${event.name}!`,
      greeting: `¡Hola {{nombre}}! 👋`,
      intro: `Te recordamos que se acerca el evento {{evento}}.\n\n📅 Fecha: {{fecha}}\n📍 Lugar: {{ubicacion}}\n🕐 Hora: {{hora}}\n\n¡Te esperamos! No olvides llegar a tiempo.`,
      closing: `¡Nos vemos pronto! 🎉`,
      signature: `Un saludo,\n${brandName}`,
    };
    const defaultEventReminderEN = {
      subject: `📅 Reminder: Don't forget about ${event.name}!`,
      greeting: `Hi {{nombre}}! 👋`,
      intro: `Just a reminder that the event {{evento}} is coming up.\n\n📅 Date: {{fecha}}\n📍 Location: {{ubicacion}}\n🕐 Time: {{hora}}\n\nWe look forward to seeing you!`,
      closing: `See you soon! 🎉`,
      signature: `Best regards,\n${brandName}`,
    };
    const defaultSelectionReminderES = {
      subject: `⏰ Recordatorio: ¡Envía tus selecciones para ${event.name}!`,
      greeting: `¡Hola {{nombre}}! 👋`,
      intro: `¡Aún estás a tiempo de indicar tus matches para el evento {{evento}}!\n\nNo te pierdas la oportunidad de conectar con las personas que conociste.`,
      closing: `¡Esperamos que hayas pasado un buen rato! 💕`,
      signature: `Este es un recordatorio automático de ${brandName}.\nSi ya has enviado tus selecciones, ignora este mensaje.`,
    };
    const defaultSelectionReminderEN = {
      subject: `⏰ Reminder: Send your selections for ${event.name}!`,
      greeting: `Hi {{nombre}}! 👋`,
      intro: `You still have time to submit your matches for the event {{evento}}!\n\nDon't miss the opportunity to connect with the people you met.`,
      closing: `We hope you had a great time! 💕`,
      signature: `This is an automatic reminder from ${brandName}.\nIf you have already sent your selections, please ignore this message.`,
    };

    const eventReminderDefaults = isEn ? defaultEventReminderEN : defaultEventReminderES;
    const selectionReminderDefaults = isEn ? defaultSelectionReminderEN : defaultSelectionReminderES;
    const tpl = isSelectionReminder
      ? (communicationTemplate?.selection_reminder || selectionReminderDefaults)
      : (
          shouldFallbackToEventReminder(
            communicationTemplate?.reminder,
            communicationTemplate?.selection_reminder,
          )
            ? eventReminderDefaults
            : (communicationTemplate?.reminder || eventReminderDefaults)
        );
    const defaults = isSelectionReminder ? selectionReminderDefaults : eventReminderDefaults;

    for (let i = 0; i < (participants || []).length; i++) {
      const participant = participants![i];
      stats.total++;
      
      if (!participant.email) {
        stats.noEmail++;
        continue;
      }

      const selectionUrl = `${baseUrl}/event/${event_id}/access`;
      const normalizedEventDate = normalizeUpcomingEventDate(event.date, event.status);
      const eventDateForLinks = normalizedEventDate ? toIsoDate(normalizedEventDate) : (event.date || '');
      const formattedEventDate = formatDisplayDate(event.date, event.status, isEn ? 'en-US' : 'es-ES');

      const vars: Record<string, string> = {
        "{{nombre}}": participant.name,
        "{{evento}}": event.name,
        "{{fecha}}": formattedEventDate,
        "{{ubicacion}}": event.event_location || "",
        "{{hora}}": event.event_time || "",
      };

      const subject = tpl?.subject
        ? replaceVariables(tpl.subject, vars)
        : replaceVariables(defaults.subject, vars);
      
      const greeting = tpl?.greeting
        ? replaceVariables(tpl.greeting, vars)
        : replaceVariables(defaults.greeting, vars);
      
      const intro = tpl?.intro
        ? replaceVariables(tpl.intro, vars)
        : replaceVariables(defaults.intro, vars);
      
      const closing = tpl?.closing
        ? replaceVariables(tpl.closing, vars)
        : replaceVariables(defaults.closing, vars);
      
      const signature = tpl?.signature
        ? replaceVariables(tpl.signature, vars)
        : replaceVariables(defaults.signature, vars);

      // CTA button - only for selection reminders
      const ctaHtml = isSelectionReminder ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${selectionUrl}" 
                 style="background: ${primaryColor}; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                ${isEn ? 'Send my selections' : 'Enviar mis selecciones'}
              </a>
            </div>` : '';

      // Calendar links - only for event reminders
      const calendarHtml = (!isSelectionReminder && reminderOptions.showCalendarLinks && eventDateForLinks) ? (() => {
        const eventDate = eventDateForLinks;
        const eventTime = event.event_time || "19:00";
        const eventLoc = event.event_location || "";
        const startDate = eventDate.replace(/-/g, '') + 'T' + eventTime.replace(':', '') + '00';
        const endHour = String(Math.min(23, parseInt(eventTime.split(':')[0]) + 2)).padStart(2, '0');
        const endDate = eventDate.replace(/-/g, '') + 'T' + endHour + eventTime.split(':')[1] + '00';
        const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.name)}&dates=${startDate}/${endDate}&location=${encodeURIComponent(eventLoc)}`;
        return `
        <div style="text-align: center; margin: 15px 0;">
          <a href="${gcalUrl}" style="display: inline-block; padding: 8px 16px; border: 1px solid ${primaryColor}; border-radius: 6px; color: ${primaryColor}; text-decoration: none; font-size: 13px; margin: 0 5px;">📅 Google Calendar</a>
        </div>`;
      })() : '';

      const countdownHtml = (!isSelectionReminder && reminderOptions.showCountdown && formattedEventDate) ? `
        <div style="text-align: center; padding: 12px; background: #f8f9fa; border-radius: 8px; margin: 15px 0;">
          <p style="font-size: 12px; color: #888; margin: 0 0 4px 0;">${isEn ? 'Event date' : 'Fecha del evento'}:</p>
          <p style="font-size: 18px; font-weight: bold; color: ${primaryColor}; margin: 0;">📅 ${escapeHtml(formattedEventDate)} ${event.event_time ? '🕐 ' + escapeHtml(event.event_time) : ''}</p>
        </div>` : '';

      const unsubscribeHtml = (!isSelectionReminder && reminderOptions.showUnsubscribe) ? `
        <p style="text-align: center; font-size: 12px; color: #888; margin-top: 15px;">
          <a href="${baseUrl}/event/${event_id}/cancel/${participant.id}" style="color: ${primaryColor}; text-decoration: underline;">${escapeHtml(reminderOptions.unsubscribeText || (isEn ? 'If you cannot attend, click here' : 'Si no puedes asistir, haz clic aquí'))}</a>
        </p>` : '';

      const html = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background: ${primaryColor}; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            ${logoUrl ? `<img src="${logoUrl}" alt="${escapeHtml(brandName)}" style="max-height: ${logoHeight}px; max-width: 260px; margin-bottom: 12px;" />` : ''}
            <h1 style="color: white; margin: 0; font-size: 24px;">${escapeHtml(headerTitle)}</h1>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="font-size: 18px; margin-bottom: 20px;">${nl2br(greeting)}</p>
            
            <div style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              ${nl2br(intro)}
            </div>
            
            ${ctaHtml}
            ${calendarHtml}
            ${countdownHtml}
            ${unsubscribeHtml}
            
            <p style="color: #888; font-size: 14px; text-align: center;">
              ${nl2br(closing)}
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #888; font-size: 12px;">
            <p>${nl2br(signature)}</p>
          </div>
        </body>
        </html>
      `;

      const result = await sendEmailWithRetry(
        resendApiKey,
        { from: senderFrom, to: [participant.email], subject, html },
        participant.name
      );

      if (result.success) {
        stats.sent++;
        await logEmailResult(participant.id, 'sent');
      } else {
        errors.push(`${participant.name}: ${result.error}`);
        stats.failed++;
        await logEmailResult(participant.id, 'failed', result.error);
      }

      if (i < (participants || []).length - 1) {
        await delay(DELAY_BETWEEN_EMAILS);
      }
      
      if ((i + 1) % 10 === 0) {
        console.log(`Progress: ${i + 1}/${participants?.length} reminders processed`);
      }
    }

    console.log("Reminder sending completed:", stats);

    return new Response(
      JSON.stringify({ success: true, stats, errors: errors.length > 0 ? errors : undefined }), 
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error:", errMsg);
    return new Response(
      JSON.stringify({ error: errMsg }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
