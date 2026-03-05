import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "resend";
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

interface VerificationEmailRequest {
  participantId: string;
  eventId: string;
  baseUrl: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { participantId, eventId, baseUrl }: VerificationEmailRequest = await req.json();

    if (!participantId || !eventId || !baseUrl) {
      return new Response(
        JSON.stringify({ error: "Faltan campos obligatorios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get participant and event details
    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select("id, name, email, verification_code, verification_email_sent_at")
      .eq("id", participantId)
      .single();

    if (participantError || !participant) {
      console.error("[send-verification-email] Participant not found:", participantError);
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

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, name, date, language, organizer_id")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      console.error("[send-verification-email] Event not found:", eventError);
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

    // Format event date
    const eventDate = new Date(event.date);
    const formattedDate = eventDate.toLocaleDateString(isEn ? "en-US" : "es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    const publishedBaseUrl = "https://konektum.com";
    const accessUrl = `${publishedBaseUrl}/event/${eventId}/access`;
    const checkinUrl = `${publishedBaseUrl}/event/${eventId}/checkin?code=${participant.verification_code}`;

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Konektum <noreply@konektum.com>",
      to: [participant.email],
      subject: isEn ? `Your access code for ${event.name}` : `Tu código de acceso para ${event.name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${isEn ? 'Verification code' : 'Código de verificación'}</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <img src="${logoUrl}" alt="${escapeHtml(brandName)}" style="max-height: 40px; max-width: 200px; margin-bottom: 12px;" />
            <h1 style="color: white; margin: 0; font-size: 28px;">${isEn ? 'Registration confirmed!' : '¡Registro confirmado!'}</h1>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="font-size: 18px; margin-bottom: 20px;">${isEn ? 'Hello' : 'Hola'} <strong>${escapeHtml(participant.name)}</strong>,</p>
            
            <p>${isEn
              ? `Your registration for <strong>${escapeHtml(event.name)}</strong> has been confirmed.`
              : `Tu registro para <strong>${escapeHtml(event.name)}</strong> ha sido confirmado.`
            }</p>
            
            <p style="margin-bottom: 5px;"><strong>📅 ${isEn ? 'Date' : 'Fecha'}:</strong> ${formattedDate}</p>
            
            <div style="background: #f8f9fa; border-radius: 10px; padding: 25px; margin: 25px 0; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">${isEn ? 'Your personal access code:' : 'Tu código personal de acceso:'}</p>
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 36px; font-weight: bold; letter-spacing: 8px; padding: 20px; border-radius: 8px; font-family: 'Courier New', monospace;">
                ${participant.verification_code}
              </div>
            </div>
            
            <p style="font-weight: bold; color: #333;">${isEn ? 'With this code you can:' : 'Con este código podrás:'}</p>
            <ul style="color: #555; padding-left: 20px;">
              <li style="margin-bottom: 10px;">✅ ${isEn ? 'Check in when you arrive at the event' : 'Hacer check-in cuando llegues al evento'}</li>
              <li style="margin-bottom: 10px;">🪑 ${isEn ? 'See which tables you are assigned to during the event' : 'Ver en qué mesas estás asignado/a durante el evento'}</li>
              <li style="margin-bottom: 10px;">💕 ${isEn ? 'Send your selections after the event' : 'Enviar tus selecciones después del evento'}</li>
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
                <strong>⚠️ ${isEn ? 'Important:' : 'Importante:'}</strong> ${isEn ? 'Save this code, you will need it to participate in the event.' : 'Guarda este código, lo necesitarás para participar en el evento.'}
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #888; font-size: 12px;">
            <p>${isEn ? 'See you at the event!' : '¡Nos vemos en el evento!'}</p>
            <p>${isEn ? `${escapeHtml(brandName)} Team` : `Equipo ${escapeHtml(brandName)}`}</p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("[send-verification-email] Email sent successfully:", emailResponse);

    // Update verification_email_sent_at
    await supabase
      .from("participants")
      .update({ verification_email_sent_at: new Date().toISOString() })
      .eq("id", participantId);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[send-verification-email] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
