import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

async function sendWithRetry(resend: any, emailPayload: any, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await resend.emails.send(emailPayload);
    if (result.error) {
      console.error(`[send-registration-confirmation] Attempt ${attempt + 1} error:`, result.error);
      if (result.error.statusCode === 429 && attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      return result;
    }
    return result;
  }
  return { error: { message: "Rate limit exceeded after retries", statusCode: 429 } };
}

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

interface RegistrationConfirmationRequest {
  participantId: string;
  eventId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { participantId, eventId }: RegistrationConfirmationRequest = await req.json();

    if (!participantId || !eventId) {
      return new Response(
        JSON.stringify({ error: "Faltan campos obligatorios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get participant details
    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select("id, name, email")
      .eq("id", participantId)
      .single();

    if (participantError || !participant) {
      console.error("[send-registration-confirmation] Participant not found:", participantError);
      return new Response(
        JSON.stringify({ error: "Participante no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!participant.email) {
      return new Response(
        JSON.stringify({ error: "El participante no tiene email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get event details including email_template
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, name, date, language, event_time, event_location, organizer_id, email_template")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      console.error("[send-registration-confirmation] Event not found:", eventError);
      return new Response(
        JSON.stringify({ error: "Evento no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lang = event.language || 'es';
    const isEn = lang === 'en';

    // Format event date
    const eventDate = new Date(event.date);
    const formattedDate = eventDate.toLocaleDateString(isEn ? "en-US" : "es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = event.event_time || '';
    const formattedDateTime = formattedTime ? `${formattedDate}, ${formattedTime}` : formattedDate;

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

    // Read customized template from event
    const emailTemplate = event.email_template as any;
    const tpl = emailTemplate?.registration_confirmation;
    const primaryColor = emailTemplate?.primaryColor || "#e11d48";
    const logoUrl = emailTemplate?.logoUrl || defaultLogoUrl;
    const brandName = emailTemplate?.brandName || defaultBrandName;

    // Template variables
    const vars: Record<string, string> = {
      "{{nombre}}": participant.name,
      "{{evento}}": event.name,
      "{{fecha}}": formattedDateTime,
      "{{ubicacion}}": event.event_location || (isEn ? 'TBD' : 'Por confirmar'),
      "{{hora}}": formattedTime || (isEn ? 'TBD' : 'Por confirmar'),
    };

    // Use customized template or defaults
    const subject = tpl?.subject
      ? replaceVariables(tpl.subject, vars)
      : (isEn ? `Registration confirmed! - ${event.name}` : `¡Registro confirmado! - ${event.name}`);
    
    const greeting = tpl?.greeting
      ? replaceVariables(tpl.greeting, vars)
      : (isEn ? `Hi ${participant.name}! 🎉` : `¡Hola ${participant.name}! 🎉`);
    
    const intro = tpl?.intro
      ? replaceVariables(tpl.intro, vars)
      : (isEn
        ? `Your registration for ${event.name} has been confirmed.\n\n📅 Date: ${formattedDateTime}\n📍 Location: ${event.event_location || 'TBD'}\n🕐 Time: ${formattedTime || 'TBD'}`
        : `Tu registro para ${event.name} ha sido confirmado.\n\n📅 Fecha: ${formattedDateTime}\n📍 Lugar: ${event.event_location || 'Por confirmar'}\n🕐 Hora: ${formattedTime || 'Por confirmar'}`);
    
    const closing = tpl?.closing
      ? replaceVariables(tpl.closing, vars)
      : (isEn ? "We'll send you an access code before the event. Make sure to arrive on time!" : "Te enviaremos un código de acceso antes del evento. ¡Asegúrate de llegar a tiempo!");
    
    const signature = tpl?.signature
      ? replaceVariables(tpl.signature, vars)
      : (isEn ? `See you at the event!\n${brandName} Team 🎉` : `¡Nos vemos en el evento!\nEquipo ${brandName} 🎉`);

    // Build calendar links
    const eventDateStr = event.date.replace(/-/g, '');
    let startDateTime = eventDateStr;
    let endDateTime = eventDateStr;

    if (event.event_time) {
      const timeParts = event.event_time.match(/(\d{1,2}):(\d{2})/);
      if (timeParts) {
        const hours = timeParts[1].padStart(2, '0');
        const mins = timeParts[2];
        startDateTime = `${eventDateStr}T${hours}${mins}00`;
        const endH = String(parseInt(hours) + 2).padStart(2, '0');
        endDateTime = `${eventDateStr}T${endH}${mins}00`;
      }
    }

    const calendarTitle = encodeURIComponent(event.name);
    const calendarLocation = encodeURIComponent(event.event_location || '');
    const calendarDetails = encodeURIComponent(
      isEn ? `Event organized via ${brandName}` : `Evento organizado a través de ${brandName}`
    );

    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${calendarTitle}&dates=${startDateTime}/${endDateTime}&location=${calendarLocation}&details=${calendarDetails}`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      `PRODID:-//${brandName}//Event//EN`,
      'BEGIN:VEVENT',
      `DTSTART:${startDateTime}`,
      `DTEND:${endDateTime}`,
      `SUMMARY:${event.name}`,
      `LOCATION:${event.event_location || ''}`,
      `DESCRIPTION:${isEn ? `Event organized via ${brandName}` : `Evento organizado a través de ${brandName}`}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const icsDataUri = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;

    const calendarButtonsHtml = `
      <div style="text-align: center; margin: 25px 0;">
        <p style="font-weight: bold; color: #333; margin-bottom: 15px;">📅 ${isEn ? 'Add to your calendar' : 'Añadir a tu calendario'}</p>
        <div style="display: inline-block;">
          <a href="${googleCalUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; background: ${primaryColor}; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 0 6px;">
            Google Calendar
          </a>
          <a href="${icsDataUri}" download="${event.name.replace(/[^a-zA-Z0-9]/g, '_')}.ics" style="display: inline-block; padding: 12px 24px; background: #333; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 0 6px;">
            iCalendar (.ics)
          </a>
        </div>
      </div>
    `;

    const emailPayload = {
      from: `${brandName} <noreply@konektum.com>`,
      to: [participant.email],
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background: ${primaryColor}; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            ${logoUrl ? `<img src="${logoUrl}" alt="${escapeHtml(brandName)}" style="max-height: 40px; max-width: 200px; margin-bottom: 12px;" />` : ''}
            <h1 style="color: white; margin: 0; font-size: 28px;">${isEn ? 'Registration confirmed!' : '¡Registro confirmado!'}</h1>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="font-size: 18px; margin-bottom: 20px;">${nl2br(greeting)}</p>
            
            <div style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              ${nl2br(intro)}
            </div>
            
            ${calendarButtonsHtml}
            
            <div style="color: #555; font-size: 15px; line-height: 1.6; margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px;">
              ${nl2br(closing)}
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #888; font-size: 12px;">
            <p>${nl2br(signature)}</p>
          </div>
        </body>
        </html>
      `,
    };

    // Check for organizer's own Resend config
    if (event.organizer_id) {
      const { data: resendConfig } = await supabase
        .from("organizer_resend_config")
        .select("resend_api_key, sender_email, sender_name")
        .eq("organizer_id", (await supabase.from("organizers").select("id").eq("user_id", event.organizer_id).single()).data?.id || '')
        .eq("is_verified", true)
        .maybeSingle();
      
      if (resendConfig) {
        emailPayload.from = `${resendConfig.sender_name || brandName} <${resendConfig.sender_email}>`;
      }
    }

    const emailResponse = await sendWithRetry(resend, emailPayload);

    // Log to email_logs
    const logStatus = emailResponse.error ? "failed" : "sent";
    const logError = emailResponse.error ? (emailResponse.error.message || JSON.stringify(emailResponse.error)) : null;
    
    await supabase.from("email_logs").insert({
      event_id: eventId,
      participant_id: participantId,
      email_type: "registration_confirmation",
      status: logStatus,
      error_message: logError,
      sent_at: logStatus === "sent" ? new Date().toISOString() : null,
    });

    if (emailResponse.error) {
      console.error("[send-registration-confirmation] Email send failed:", emailResponse.error);
      return new Response(
        JSON.stringify({ error: `Error al enviar email: ${emailResponse.error.message || 'Unknown error'}`, emailError: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[send-registration-confirmation] Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[send-registration-confirmation] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
