import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_REQUESTS_PER_EVENT = 3;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const {
      event_id,
      sender_participant_id,
      receiver_participant_id,
      access_code,
      compatibility_score,
    } = await req.json();

    if (!event_id || !sender_participant_id || !receiver_participant_id || !access_code) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (sender_participant_id === receiver_participant_id) {
      return new Response(JSON.stringify({ error: "No puedes enviarte una solicitud a ti mismo" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Validate sender identity via access_code
    const { data: sender, error: senderErr } = await supabase
      .from("participants")
      .select("id, event_id, access_code, name, first_name")
      .eq("id", sender_participant_id)
      .maybeSingle();

    if (senderErr || !sender || sender.event_id !== event_id || sender.access_code !== access_code) {
      return new Response(JSON.stringify({ error: "Autenticación inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate receiver
    const { data: receiver, error: recvErr } = await supabase
      .from("participants")
      .select("id, event_id, name, first_name")
      .eq("id", receiver_participant_id)
      .maybeSingle();

    if (recvErr || !receiver || receiver.event_id !== event_id) {
      return new Response(JSON.stringify({ error: "Destinatario no encontrado en este evento" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enforce per-participant limit
    const { count } = await supabase
      .from("wrapped_table_requests")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event_id)
      .eq("sender_participant_id", sender_participant_id);

    if ((count ?? 0) >= MAX_REQUESTS_PER_EVENT) {
      return new Response(
        JSON.stringify({
          error: `Has alcanzado el límite de ${MAX_REQUESTS_PER_EVENT} solicitudes por evento`,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Create request (unique constraint prevents duplicates)
    const { data: created, error: insertErr } = await supabase
      .from("wrapped_table_requests")
      .insert({
        event_id,
        sender_participant_id,
        receiver_participant_id,
        compatibility_score: compatibility_score ?? null,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertErr) {
      if (insertErr.code === "23505") {
        return new Response(
          JSON.stringify({ error: "Ya has enviado una solicitud a esta persona" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw insertErr;
    }

    return new Response(JSON.stringify({ success: true, request_id: created.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("request-wrapped-table error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
