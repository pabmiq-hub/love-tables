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

    // Use service role to check super_admin
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", claims.user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: not super_admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body
    const {
      email,
      password,
      company_name,
      contact_phone,
      plan_id,
      active_modules,
    } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 1. Create auth user with email confirmed
    const { data: newUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (createError) {
      return new Response(
        JSON.stringify({ error: `Error creating user: ${createError.message}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userId = newUser.user.id;

    // 2. Assign admin role in user_roles
    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });

    if (roleError) {
      console.error("Error assigning role:", roleError);
    }

    // 3. Create organizer profile
    const { data: organizer, error: orgError } = await adminClient
      .from("organizers")
      .insert({
        user_id: userId,
        contact_email: email,
        company_name: company_name || null,
        contact_phone: contact_phone || null,
        plan_id: plan_id || null,
        active_modules: active_modules || ["professional"],
        status: "active",
      })
      .select()
      .single();

    if (orgError) {
      console.error("Error creating organizer:", orgError);
      // Try to clean up the auth user
      await adminClient.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({
          error: `Error creating organizer profile: ${orgError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Send welcome email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      try {
        const escapedCompany = (company_name || "").replace(/[&<>"']/g, (c: string) => 
          ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
        const escapedEmail = email.replace(/[&<>"']/g, (c: string) => 
          ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));

        const loginUrl = "https://love-tables.lovable.app/admin/login";

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Konektum <noreply@konektum.com>",
            to: [email],
            subject: "Tu cuenta de organizador ha sido creada",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #1a1a2e; font-size: 24px;">¡Bienvenido a Konektum!</h1>
                </div>
                <p style="color: #333; font-size: 16px;">Hola${escapedCompany ? ` <strong>${escapedCompany}</strong>` : ''},</p>
                <p style="color: #333; font-size: 16px;">Tu cuenta de organizador ha sido creada y está lista para usar.</p>
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 5px 0; color: #333;"><strong>Email:</strong> ${escapedEmail}</p>
                  <p style="margin: 5px 0; color: #666; font-size: 14px;">La contraseña te ha sido comunicada por el administrador.</p>
                </div>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${loginUrl}" style="background: #6366f1; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                    Acceder a mi panel
                  </a>
                </div>
                <p style="color: #666; font-size: 14px;">Te recomendamos cambiar tu contraseña después del primer inicio de sesión.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                <p style="color: #999; font-size: 12px; text-align: center;">© Konektum - Plataforma de networking profesional</p>
              </div>
            `,
          }),
        });
        console.log("Welcome email sent to:", email);
      } catch (emailErr) {
        console.error("Error sending welcome email (non-blocking):", emailErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        organizer_id: organizer.id,
        email,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
