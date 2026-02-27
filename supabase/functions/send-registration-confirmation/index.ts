import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Get event details including language, time, location
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, name, date, language, event_time, event_location")
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
    const formattedDateTime = formattedTime 
      ? `${formattedDate}, ${formattedTime}` 
      : formattedDate;

    // Build calendar links
    const eventDateStr = event.date.replace(/-/g, ''); // YYYYMMDD
    let startDateTime = eventDateStr;
    let endDateTime = eventDateStr;

    if (event.event_time) {
      // Parse time like "18:00" or "18:30"
      const timeParts = event.event_time.match(/(\d{1,2}):(\d{2})/);
      if (timeParts) {
        const hours = timeParts[1].padStart(2, '0');
        const mins = timeParts[2];
        startDateTime = `${eventDateStr}T${hours}${mins}00`;
        // Default 2h duration
        const endH = String(parseInt(hours) + 2).padStart(2, '0');
        endDateTime = `${eventDateStr}T${endH}${mins}00`;
      }
    }

    const calendarTitle = encodeURIComponent(event.name);
    const calendarLocation = encodeURIComponent(event.event_location || '');
    const calendarDetails = encodeURIComponent(
      isEn ? `Event organized via Konektum` : `Evento organizado a través de Konektum`
    );

    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${calendarTitle}&dates=${startDateTime}/${endDateTime}&location=${calendarLocation}&details=${calendarDetails}`;

    // Build .ics content
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Konektum//Event//EN',
      'BEGIN:VEVENT',
      `DTSTART:${startDateTime}`,
      `DTEND:${endDateTime}`,
      `SUMMARY:${event.name}`,
      `LOCATION:${event.event_location || ''}`,
      `DESCRIPTION:${isEn ? 'Event organized via Konektum' : 'Evento organizado a través de Konektum'}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const icsDataUri = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;

    const calendarButtonsHtml = `
      <div style="text-align: center; margin: 25px 0;">
        <p style="font-weight: bold; color: #333; margin-bottom: 15px;">📅 ${isEn ? 'Add to your calendar' : 'Añadir a tu calendario'}</p>
        <div style="display: inline-block;">
          <a href="${googleCalUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; background: #4285f4; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 0 6px;">
            Google Calendar
          </a>
          <a href="${icsDataUri}" download="${event.name.replace(/[^a-zA-Z0-9]/g, '_')}.ics" style="display: inline-block; padding: 12px 24px; background: #333; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 0 6px;">
            iCalendar (.ics)
          </a>
        </div>
      </div>
    `;

    const emailPayload = {
      from: "Konektum <noreply@konektum.com>",
      to: [participant.email],
      subject: isEn ? `Registration confirmed! - ${event.name}` : `¡Registro confirmado! - ${event.name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${isEn ? 'Registration confirmed' : 'Registro confirmado'}</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">${isEn ? 'Registration confirmed!' : '¡Registro confirmado!'}</h1>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="font-size: 18px; margin-bottom: 20px;">${isEn ? 'Hello' : 'Hola'} <strong>${participant.name}</strong>,</p>
            
            <p>${isEn ? `Your registration for <strong>${event.name}</strong> has been confirmed.` : `Tu registro para <strong>${event.name}</strong> ha sido confirmado.`}</p>
            
            <p style="margin-bottom: 5px;"><strong>📅 ${isEn ? 'Date' : 'Fecha'}:</strong> ${formattedDateTime}</p>
            ${event.event_location ? `<p style="margin-bottom: 5px;"><strong>📍 ${isEn ? 'Location' : 'Lugar'}:</strong> ${event.event_location}</p>` : ''}
            
            ${calendarButtonsHtml}
            
            <div style="background: #f8f9fa; border-radius: 10px; padding: 25px; margin: 25px 0; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
              <p style="margin: 0; color: #666; font-size: 16px; font-weight: 500;">
                ${isEn ? 'Your spot is reserved!' : '¡Ya tienes tu plaza reservada!'}
              </p>
            </div>
            
            <div style="background: #e8f4fd; border-radius: 10px; padding: 20px; margin: 25px 0;">
              <p style="font-weight: bold; color: #333; margin-top: 0;">📱 ${isEn ? 'What will happen on event day?' : '¿Qué pasará el día del evento?'}</p>
              <ol style="color: #555; padding-left: 20px; margin-bottom: 0;">
                <li style="margin-bottom: 10px;">${isEn ? 'When you arrive, the organizer will <strong>check you in</strong>' : 'Cuando llegues, el organizador hará tu <strong>check-in</strong>'}</li>
                <li style="margin-bottom: 10px;">${isEn ? 'You will receive a <strong>personal 6-digit code</strong> by email' : 'Recibirás un <strong>código personal de 6 dígitos</strong> por email'}</li>
                <li style="margin-bottom: 10px;">${isEn ? 'With that code you can:' : 'Con ese código podrás:'}
                  <ul style="margin-top: 5px;">
                    <li>${isEn ? '🪑 See your assigned tables during the event' : '🪑 Ver tus mesas asignadas durante el evento'}</li>
                    <li>${isEn ? '💕 Send your selections after the event' : '💕 Enviar tus selecciones después del evento'}</li>
                  </ul>
                </li>
              </ol>
            </div>
            
            <div style="margin-top: 30px; padding: 15px; background: #fff3cd; border-radius: 5px; border-left: 4px solid #ffc107;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>⚠️ ${isEn ? 'Important:' : 'Importante:'}</strong> ${isEn ? 'Make sure to arrive on time so you don\'t miss any round.' : 'Asegúrate de llegar a tiempo para no perderte ninguna ronda.'}
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #888; font-size: 12px;">
            <p>${isEn ? 'See you at the event!' : '¡Nos vemos en el evento!'}</p>
            <p>${isEn ? 'Konektum Team' : 'Equipo Konektum'}</p>
          </div>
        </body>
        </html>
      `,
    };

    // Send with retry
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
