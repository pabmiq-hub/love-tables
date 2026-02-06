import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, name, date")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      console.error("[send-checkin-code] Event not found:", eventError);
      return new Response(
        JSON.stringify({ error: "Evento no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build URLs with verification code
    const tablesUrl = `${baseUrl}/event/${eventId}/tables?code=${participant.verification_code}`;
    const selectUrl = `${baseUrl}/event/${eventId}/select?code=${participant.verification_code}`;

    // Send check-in code email
    const emailResponse = await resend.emails.send({
      from: "Konektum <noreply@konektum.es>",
      to: [participant.email],
      subject: `Tu código de acceso - ${event.name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Código de acceso</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">¡Bienvenido/a al evento!</h1>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="font-size: 18px; margin-bottom: 20px;">Hola <strong>${participant.name}</strong>,</p>
            
            <p>¡Tu check-in para <strong>${event.name}</strong> se ha completado!</p>
            
            <div style="background: #f8f9fa; border-radius: 10px; padding: 25px; margin: 25px 0; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Tu código personal de acceso:</p>
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 36px; font-weight: bold; letter-spacing: 8px; padding: 20px; border-radius: 8px; font-family: 'Courier New', monospace;">
                ${participant.verification_code}
              </div>
            </div>
            
            <p style="font-weight: bold; color: #333;">Con este código puedes:</p>
            <ul style="color: #555; padding-left: 20px;">
              <li style="margin-bottom: 10px;">🪑 <strong>Ver tus mesas</strong> asignadas en cada ronda</li>
              <li style="margin-bottom: 10px;">💕 <strong>Enviar tus selecciones</strong> después del evento</li>
            </ul>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="font-weight: bold; margin-bottom: 15px;">Enlaces directos:</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom: 10px;">
                    <a href="${tablesUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: 500;">
                      🪑 Ver mis mesas
                    </a>
                  </td>
                </tr>
                <tr>
                  <td>
                    <a href="${selectUrl}" style="display: inline-block; background: #e91e63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: 500;">
                      💕 Enviar selecciones
                    </a>
                  </td>
                </tr>
              </table>
            </div>
            
            <div style="margin-top: 30px; padding: 15px; background: #fff3cd; border-radius: 5px; border-left: 4px solid #ffc107;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>⚠️ Importante:</strong> Guarda este código, lo necesitarás durante y después del evento.
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #888; font-size: 12px;">
            <p>¡Disfruta del evento!</p>
            <p>Equipo Konektum</p>
          </div>
        </body>
        </html>
      `,
    });

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
