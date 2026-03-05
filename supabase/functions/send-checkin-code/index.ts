import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

async function sendWithRetry(resend: any, emailPayload: any, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await resend.emails.send(emailPayload);
    if (result.error) {
      console.error(`[send-checkin-code] Attempt ${attempt + 1} error:`, result.error);
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

interface CheckinCodeRequest {
  participantId: string;
  eventId: string;
  baseUrl: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { participantId, eventId, baseUrl }: CheckinCodeRequest = await req.json();

    if (!participantId || !eventId || !baseUrl) {
      return new Response(
        JSON.stringify({ error: "Faltan campos obligatorios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get participant details with verification code
    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select("id, name, email, verification_code")
      .eq("id", participantId)
      .single();

    if (participantError || !participant) {
      console.error("[send-checkin-code] Participant not found:", participantError);
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

    if (!participant.verification_code) {
      return new Response(
        JSON.stringify({ error: "El participante no tiene código de verificación" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get event details including language and organizer
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, name, date, language, organizer_id")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      console.error("[send-checkin-code] Event not found:", eventError);
      return new Response(
        JSON.stringify({ error: "Evento no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lang = event.language || 'es';
    const isEn = lang === 'en';

    // Load organizer branding for logo
    const KONEKTUM_LOGO_URL = "https://konektum.com/konektum-logo.png";
    let logoUrl = KONEKTUM_LOGO_URL;
    let brandName = "Konektum";
    
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
          logoUrl = organizer.logo_url;
          brandName = organizer.company_name || "Konektum";
        }
      }
    }

    // Use the published domain
    const publishedBaseUrl = "https://konektum.com";
    const accessUrl = `${publishedBaseUrl}/event/${eventId}/access`;

    const emailPayload = {
      from: "Konektum <noreply@konektum.com>",
      to: [participant.email],
      subject: isEn ? `Your access code - ${event.name}` : `Tu código de acceso - ${event.name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${isEn ? 'Access code' : 'Código de acceso'}</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <img src="${logoUrl}" alt="${escapeHtml(brandName)}" style="max-height: 40px; max-width: 200px; margin-bottom: 12px;" />
            <h1 style="color: white; margin: 0; font-size: 28px;">${isEn ? 'Welcome to the event!' : '¡Bienvenido/a al evento!'}</h1>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="font-size: 18px; margin-bottom: 20px;">${isEn ? 'Hello' : 'Hola'} <strong>${escapeHtml(participant.name)}</strong>,</p>
            
            <p>${isEn
              ? `You have been registered for the event <strong>${escapeHtml(event.name)}</strong>. Use this code to check in and access your panel.`
              : `Has sido registrado/a en el evento <strong>${escapeHtml(event.name)}</strong>. Usa este código para hacer tu check-in y acceder a tu panel.`
            }</p>
            
            <div style="background: #f8f9fa; border-radius: 10px; padding: 25px; margin: 25px 0; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">${isEn ? 'Your personal access code:' : 'Tu código personal de acceso:'}</p>
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 36px; font-weight: bold; letter-spacing: 8px; padding: 20px; border-radius: 8px; font-family: 'Courier New', monospace;">
                ${participant.verification_code}
              </div>
            </div>
            
            <p style="font-weight: bold; color: #333;">${isEn ? 'With this code you can:' : 'Con este código puedes:'}</p>
            <ul style="color: #555; padding-left: 20px;">
              <li style="margin-bottom: 10px;">✅ <strong>${isEn ? 'Check in' : 'Hacer check-in'}</strong> ${isEn ? 'when you arrive at the event (scan the QR)' : 'al llegar al evento (escanea el QR)'}</li>
              <li style="margin-bottom: 10px;">🪑 <strong>${isEn ? 'See your tables' : 'Ver tus mesas'}</strong> ${isEn ? 'assigned in each round' : 'asignadas en cada ronda'}</li>
              <li style="margin-bottom: 10px;">💕 <strong>${isEn ? 'Send your selections' : 'Enviar tus selecciones'}</strong> ${isEn ? 'after the event' : 'después del evento'}</li>
            </ul>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="font-weight: bold; margin-bottom: 15px;">${isEn ? 'Access your panel:' : 'Accede a tu panel:'}</p>
              <div style="text-align: center;">
                <a href="${accessUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  🎫 ${isEn ? 'My event panel' : 'Mi panel del evento'}
                </a>
              </div>
              <p style="color: #888; font-size: 13px; text-align: center; margin-top: 10px;">
                ${isEn ? 'From your panel you can see your tables and send your selections.' : 'Desde tu panel podrás ver tus mesas y enviar tus selecciones.'}
              </p>
            </div>
            
            <div style="margin-top: 30px; padding: 15px; background: #fff3cd; border-radius: 5px; border-left: 4px solid #ffc107;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>⚠️ ${isEn ? 'Important:' : 'Importante:'}</strong> ${isEn ? 'Save this code, you will need it during and after the event.' : 'Guarda este código, lo necesitarás durante y después del evento.'}
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #888; font-size: 12px;">
            <p>${isEn ? 'Enjoy the event!' : '¡Disfruta del evento!'}</p>
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
      email_type: "checkin_code",
      status: logStatus,
      error_message: logError,
      sent_at: logStatus === "sent" ? new Date().toISOString() : null,
    });

    if (emailResponse.error) {
      console.error("[send-checkin-code] Email send failed:", emailResponse.error);
      return new Response(
        JSON.stringify({ error: `Error al enviar email: ${emailResponse.error.message || 'Unknown error'}`, emailError: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[send-checkin-code] Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[send-checkin-code] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
