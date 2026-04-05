import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const escapeHtml = (unsafe: string): string =>
  unsafe.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { event_id, participant_id } = await req.json();
    if (!event_id || !participant_id) {
      return new Response(JSON.stringify({ error: "event_id and participant_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Get participant
    const { data: participant } = await supabase.from("participants").select("*").eq("id", participant_id).eq("event_id", event_id).single();
    if (!participant) {
      return new Response(JSON.stringify({ error: "Participant not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get event + organizer
    const { data: event } = await supabase.from("events").select("name, organizer_id, language").eq("id", event_id).single();
    if (!event) {
      return new Response(JSON.stringify({ error: "Event not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get organizer email
    const { data: organizer } = await supabase.from("organizers").select("contact_email, company_name").eq("user_id", event.organizer_id).maybeSingle();

    // Mark participant as no-show (keep in DB for recovery)
    await supabase.from("participants").update({ checked_in: false }).eq("id", participant_id);

    // Update global participant status if linked
    if (participant.global_participant_id) {
      await supabase.from("global_participants").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", participant.global_participant_id);
    }

    // Send notification email to organizer
    if (resendApiKey && organizer?.contact_email) {
      const isEn = event.language === "en";
      const subject = isEn
        ? `Cancellation: ${escapeHtml(participant.name)} - ${escapeHtml(event.name)}`
        : `Baja: ${escapeHtml(participant.name)} - ${escapeHtml(event.name)}`;

      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>${isEn ? "Participant Cancellation" : "Baja de participante"}</h2>
          <p><strong>${escapeHtml(participant.name)}</strong> ${isEn ? "has cancelled their attendance for" : "se ha dado de baja del evento"} <strong>${escapeHtml(event.name)}</strong>.</p>
          ${participant.email ? `<p>Email: ${escapeHtml(participant.email)}</p>` : ""}
          ${participant.phone ? `<p>${isEn ? "Phone" : "Teléfono"}: ${escapeHtml(participant.phone)}</p>` : ""}
          <p style="color: #888; font-size: 12px; margin-top: 20px;">${isEn ? "The participant has been kept in the database as non-attendee for recovery if needed." : "El participante se ha mantenido en la base de datos como no asistente por si necesitas recuperarlo."}</p>
        </div>
      `;

      const senderFrom = `${organizer.company_name || "Konektum"} <noreply@konektum.com>`;
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: senderFrom, to: [organizer.contact_email], subject, html }),
      });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errMsg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
