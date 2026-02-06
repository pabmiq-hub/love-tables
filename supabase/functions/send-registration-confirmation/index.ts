import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, name, date")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      console.error("[send-registration-confirmation] Event not found:", eventError);
      return new Response(
        JSON.stringify({ error: "Evento no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format event date
    const eventDate = new Date(event.date);
    const formattedDate = eventDate.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    // Send confirmation email WITHOUT verification code
    const emailResponse = await resend.emails.send({
      from: "Konektum <noreply@konektum.es>",
      to: [participant.email],
      subject: `¡Registro confirmado! - ${event.name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Registro confirmado</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">¡Registro confirmado!</h1>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="font-size: 18px; margin-bottom: 20px;">Hola <strong>${participant.name}</strong>,</p>
            
            <p>Tu registro para <strong>${event.name}</strong> ha sido confirmado.</p>
            
            <p style="margin-bottom: 5px;"><strong>📅 Fecha:</strong> ${formattedDate}</p>
            
            <div style="background: #f8f9fa; border-radius: 10px; padding: 25px; margin: 25px 0; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
              <p style="margin: 0; color: #666; font-size: 16px; font-weight: 500;">
                ¡Ya tienes tu plaza reservada!
              </p>
            </div>
            
            <div style="background: #e8f4fd; border-radius: 10px; padding: 20px; margin: 25px 0;">
              <p style="font-weight: bold; color: #333; margin-top: 0;">📱 ¿Qué pasará el día del evento?</p>
              <ol style="color: #555; padding-left: 20px; margin-bottom: 0;">
                <li style="margin-bottom: 10px;">Cuando llegues, el organizador hará tu <strong>check-in</strong></li>
                <li style="margin-bottom: 10px;">Recibirás un <strong>código personal de 6 dígitos</strong> por email</li>
                <li style="margin-bottom: 10px;">Con ese código podrás:
                  <ul style="margin-top: 5px;">
                    <li>🪑 Ver tus mesas asignadas durante el evento</li>
                    <li>💕 Enviar tus selecciones después del evento</li>
                  </ul>
                </li>
              </ol>
            </div>
            
            <div style="margin-top: 30px; padding: 15px; background: #fff3cd; border-radius: 5px; border-left: 4px solid #ffc107;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>⚠️ Importante:</strong> Asegúrate de llegar a tiempo para no perderte ninguna ronda.
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #888; font-size: 12px;">
            <p>¡Nos vemos en el evento!</p>
            <p>Equipo Konektum</p>
          </div>
        </body>
        </html>
      `,
    });

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
