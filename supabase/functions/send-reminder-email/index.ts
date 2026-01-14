import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-reminder-email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized - No token provided" }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Create auth client to verify token
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      console.log("Invalid token:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authenticated user:", user.id);

    const { event_id, participant_ids } = await req.json();
    console.log("Processing reminder for event:", event_id, "participants:", participant_ids?.length);

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

    // Verify user is the event organizer
    const { data: event } = await supabase
      .from("events")
      .select("name, organizer_id")
      .eq("id", event_id)
      .single();

    if (!event) {
      return new Response(
        JSON.stringify({ error: "Event not found" }), 
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (event.organizer_id !== user.id) {
      console.log("User is not the organizer. User:", user.id, "Organizer:", event.organizer_id);
      return new Response(
        JSON.stringify({ error: "Forbidden - You are not the organizer of this event" }), 
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authorization verified - user is event organizer");

    // Get participants
    const { data: participants } = await supabase
      .from("participants")
      .select("id, name, email")
      .eq("event_id", event_id)
      .in("id", participant_ids);

    const stats = { total: 0, sent: 0, noEmail: 0, failed: 0 };
    const errors: string[] = [];

    // Get the selection page URL
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const projectRef = supabaseUrl.replace("https://", "").split(".")[0];
    const baseUrl = `https://${projectRef}.lovable.app`;

    for (const participant of participants || []) {
      stats.total++;
      
      if (!participant.email) {
        stats.noEmail++;
        continue;
      }

      const selectionUrl = `${baseUrl}/participant/${event_id}/select?participantId=${participant.id}`;

      const html = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eee;">
            <h2 style="color: #e11d48;">Konektum</h2>
          </div>
          
          <h1 style="color: #333;">¡Hola ${participant.name}! 👋</h1>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            ¡Aún estás a tiempo de indicar tus matches para el evento <strong>${event.name}</strong>!
          </p>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            No te pierdas la oportunidad de conectar con las personas que conociste. 
            Haz clic en el botón de abajo para enviar tus selecciones:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${selectionUrl}" 
               style="background: linear-gradient(135deg, #e11d48, #f43f5e); 
                      color: white; 
                      padding: 14px 28px; 
                      border-radius: 8px; 
                      text-decoration: none; 
                      font-weight: bold;
                      display: inline-block;">
              Enviar mis selecciones
            </a>
          </div>
          
          <p style="color: #888; font-size: 14px; text-align: center;">
            ¡Esperamos que hayas pasado un buen rato! 💕
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #888; font-size: 12px; text-align: center;">
            Este es un recordatorio automático de Konektum.<br>
            Si ya has enviado tus selecciones, ignora este mensaje.
          </p>
        </body>
        </html>
      `;

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Konektum <hola@konektum.com>",
            to: [participant.email],
            subject: `⏰ Recordatorio: ¡Envía tus selecciones para ${event.name}!`,
            html,
          }),
        });

        if (res.ok) {
          stats.sent++;
          console.log(`Reminder sent to ${participant.name}`);
        } else {
          const errorText = await res.text();
          errors.push(`${participant.name}: ${errorText}`);
          stats.failed++;
          console.error(`Failed to send to ${participant.name}:`, errorText);
        }
      } catch (e: unknown) {
        const errMsg = e instanceof Error ? e.message : String(e);
        errors.push(`${participant.name}: ${errMsg}`);
        stats.failed++;
        console.error(`Error sending to ${participant.name}:`, errMsg);
      }
    }

    console.log("Reminder sending completed:", stats);

    return new Response(
      JSON.stringify({ 
        success: true, 
        stats,
        errors: errors.length > 0 ? errors : undefined 
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
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
