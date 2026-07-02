import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { request_id, receiver_participant_id, access_code, action } = await req.json();

    if (!request_id || !receiver_participant_id || !access_code || !action) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["accept", "reject"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth check
    const { data: receiver } = await supabase
      .from("participants")
      .select("id, access_code")
      .eq("id", receiver_participant_id)
      .maybeSingle();

    if (!receiver || receiver.access_code !== access_code) {
      return new Response(JSON.stringify({ error: "Autenticación inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get request
    const { data: request, error: reqErr } = await supabase
      .from("wrapped_table_requests")
      .select("id, event_id, sender_participant_id, receiver_participant_id, status")
      .eq("id", request_id)
      .maybeSingle();

    if (reqErr || !request) {
      return new Response(JSON.stringify({ error: "Solicitud no encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (request.receiver_participant_id !== receiver_participant_id) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (request.status !== "pending") {
      return new Response(JSON.stringify({ error: "Solicitud ya respondida" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newStatus = action === "accept" ? "accepted" : "rejected";

    const { error: updErr } = await supabase
      .from("wrapped_table_requests")
      .update({ status: newStatus, responded_at: new Date().toISOString() })
      .eq("id", request_id);

    if (updErr) throw updErr;

    // On accept: materialize as a participant_inclusion so the next generated round seats them together
    if (action === "accept") {
      const a = request.sender_participant_id;
      const b = request.receiver_participant_id;
      const [p1, p2] = [a, b].sort();

      const { error: incErr } = await supabase
        .from("participant_inclusions")
        .insert({
          event_id: request.event_id,
          participant_a_id: p1,
          participant_b_id: p2,
          reason: "wrapped_table_request",
        });

      // Ignore duplicate (already included) errors
      if (incErr && incErr.code !== "23505") {
        console.warn("Could not insert inclusion:", incErr);
      }
    }

    return new Response(JSON.stringify({ success: true, status: newStatus }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("respond-wrapped-table error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
