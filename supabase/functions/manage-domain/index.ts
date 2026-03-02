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
    // Verify authentication
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

    // Get organizer
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

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, domain, sender_email, sender_name } = await req.json();

    if (action === "add") {
      if (!domain) {
        return new Response(JSON.stringify({ error: "domain is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Register domain in Resend
      const resendRes = await fetch("https://api.resend.com/domains", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: domain }),
      });

      if (!resendRes.ok) {
        const errText = await resendRes.text();
        console.error("Resend domain registration failed:", errText);
        return new Response(JSON.stringify({ error: "Failed to register domain", details: errText }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const resendData = await resendRes.json();
      console.log("Resend domain registered:", resendData);

      // Store in database
      const { data: domainRecord, error: insertError } = await supabase
        .from("organizer_verified_domains")
        .upsert({
          organizer_id: organizer.id,
          domain,
          resend_domain_id: resendData.id,
          status: "pending",
          dns_records: resendData.records || [],
          sender_email: sender_email || `noreply@${domain}`,
          sender_name: sender_name || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "organizer_id" })
        .select()
        .single();

      if (insertError) {
        console.error("Failed to store domain:", insertError);
        return new Response(JSON.stringify({ error: "Failed to store domain config" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, domain: domainRecord }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check") {
      // Get existing domain record
      const { data: domainRecord } = await supabase
        .from("organizer_verified_domains")
        .select("*")
        .eq("organizer_id", organizer.id)
        .single();

      if (!domainRecord?.resend_domain_id) {
        return new Response(JSON.stringify({ error: "No domain configured" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check status in Resend
      const resendRes = await fetch(`https://api.resend.com/domains/${domainRecord.resend_domain_id}`, {
        headers: { "Authorization": `Bearer ${RESEND_API_KEY}` },
      });

      if (!resendRes.ok) {
        const errText = await resendRes.text();
        console.error("Resend domain check failed:", errText);
        return new Response(JSON.stringify({ error: "Failed to check domain status" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const resendData = await resendRes.json();
      const newStatus = resendData.status === "verified" ? "verified" 
        : resendData.status === "failed" ? "failed" 
        : "pending";

      // Update status in database
      await supabase
        .from("organizer_verified_domains")
        .update({ 
          status: newStatus, 
          dns_records: resendData.records || domainRecord.dns_records,
          updated_at: new Date().toISOString() 
        })
        .eq("id", domainRecord.id);

      return new Response(JSON.stringify({ 
        success: true, 
        status: newStatus, 
        dns_records: resendData.records || domainRecord.dns_records 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "remove") {
      const { data: domainRecord } = await supabase
        .from("organizer_verified_domains")
        .select("*")
        .eq("organizer_id", organizer.id)
        .single();

      if (domainRecord?.resend_domain_id) {
        // Remove from Resend
        await fetch(`https://api.resend.com/domains/${domainRecord.resend_domain_id}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${RESEND_API_KEY}` },
        });
      }

      // Remove from database
      await supabase
        .from("organizer_verified_domains")
        .delete()
        .eq("organizer_id", organizer.id);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_sender") {
      const { error: updateError } = await supabase
        .from("organizer_verified_domains")
        .update({ 
          sender_email: sender_email,
          sender_name: sender_name,
          updated_at: new Date().toISOString() 
        })
        .eq("organizer_id", organizer.id);

      if (updateError) {
        return new Response(JSON.stringify({ error: "Failed to update sender" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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
