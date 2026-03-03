import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claims, error: claimsError } = await callerClient.auth.getUser();
    if (claimsError || !claims.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", claims.user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { organizer_id, notification_type } = await req.json();

    if (!organizer_id || !notification_type) {
      return new Response(
        JSON.stringify({ error: "organizer_id and notification_type required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get organizer details
    const { data: organizer, error: orgError } = await adminClient
      .from("organizers")
      .select("contact_email, company_name, active_modules")
      .eq("id", organizer_id)
      .single();

    if (orgError || !organizer) {
      return new Response(
        JSON.stringify({ error: "Organizer not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const escapedCompany = (organizer.company_name || "").replace(/[&<>"']/g, (c: string) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
    const loginUrl = "https://love-tables.lovable.app/admin/login";

    let subject = "";
    let htmlBody = "";

    if (notification_type === "approved") {
      subject = "Tu cuenta de organizador ha sido aprobada";
      htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a1a2e; font-size: 24px;">¡Cuenta aprobada!</h1>
          </div>
          <p style="color: #333; font-size: 16px;">Hola${escapedCompany ? ` <strong>${escapedCompany}</strong>` : ''},</p>
          <p style="color: #333; font-size: 16px;">Tu solicitud de organizador ha sido <strong>aprobada</strong>. Ya puedes acceder a tu panel y empezar a crear eventos.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" style="background: #6366f1; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Acceder a mi panel
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Si tienes alguna pregunta, no dudes en contactarnos.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #999; font-size: 12px; text-align: center;">© Konektum - Plataforma de networking profesional</p>
        </div>
      `;
    } else if (notification_type === "suspended") {
      subject = "Tu cuenta de organizador ha sido suspendida";
      htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a1a2e; font-size: 24px;">Cuenta suspendida</h1>
          </div>
          <p style="color: #333; font-size: 16px;">Hola${escapedCompany ? ` <strong>${escapedCompany}</strong>` : ''},</p>
          <p style="color: #333; font-size: 16px;">Tu cuenta de organizador ha sido <strong>suspendida</strong>. Si crees que se trata de un error, contacta con el administrador.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #999; font-size: 12px; text-align: center;">© Konektum - Plataforma de networking profesional</p>
        </div>
      `;
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid notification_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Konektum <noreply@konektum.com>",
        to: [organizer.contact_email],
        subject,
        html: htmlBody,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("Resend error:", errText);
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Notification email (${notification_type}) sent to:`, organizer.contact_email);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
