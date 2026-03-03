import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: organizer } = await supabase
      .from("organizers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!organizer) {
      return new Response(JSON.stringify({ error: "Organizer not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, resend_api_key, sender_email, sender_name } = await req.json();

    if (action === "save") {
      if (!resend_api_key || !sender_email) {
        return new Response(JSON.stringify({ error: "resend_api_key and sender_email are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate the API key by calling Resend API
      const testRes = await fetch("https://api.resend.com/domains", {
        headers: { "Authorization": `Bearer ${resend_api_key}` },
      });

      const isValid = testRes.ok;
      if (!isValid) {
        return new Response(JSON.stringify({ error: "La API Key de Resend no es válida. Verifica que sea correcta." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Upsert config
      const { data: config, error: upsertError } = await supabase
        .from("organizer_resend_config")
        .upsert({
          organizer_id: organizer.id,
          resend_api_key,
          sender_email,
          sender_name: sender_name || null,
          is_verified: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "organizer_id" })
        .select()
        .single();

      if (upsertError) {
        console.error("Failed to save config:", upsertError);
        return new Response(JSON.stringify({ error: "Failed to save configuration" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, config }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "test") {
      // Get config
      const { data: config } = await supabase
        .from("organizer_resend_config")
        .select("*")
        .eq("organizer_id", organizer.id)
        .single();

      if (!config) {
        return new Response(JSON.stringify({ error: "No configuration found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Send a test email to the organizer
      const { data: org } = await supabase
        .from("organizers")
        .select("contact_email")
        .eq("id", organizer.id)
        .single();

      const testEmail = org?.contact_email;
      if (!testEmail) {
        return new Response(JSON.stringify({ error: "No contact email found for organizer" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const fromAddr = config.sender_name 
        ? `${config.sender_name} <${config.sender_email}>`
        : config.sender_email;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.resend_api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddr,
          to: testEmail,
          subject: "✅ Email de prueba - Configuración correcta",
          html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
            <h2 style="color:#16a34a;">¡Configuración correcta!</h2>
            <p>Este email confirma que tu configuración de Resend funciona correctamente.</p>
            <p>Los emails de tu plataforma se enviarán desde: <strong>${config.sender_email}</strong></p>
          </div>`,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Test email failed:", errText);
        return new Response(JSON.stringify({ 
          error: "No se pudo enviar el email de prueba. Verifica que el dominio esté verificado en Resend.",
          details: errText 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, sent_to: testEmail }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "remove") {
      await supabase
        .from("organizer_resend_config")
        .delete()
        .eq("organizer_id", organizer.id);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error in manage-domain:", errMsg);
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
