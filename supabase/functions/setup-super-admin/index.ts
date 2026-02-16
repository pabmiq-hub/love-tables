import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { action, email, password, setupKey } = await req.json();

    // Security: Require a setup key to prevent unauthorized access
    const expectedSetupKey = Deno.env.get("SUPER_ADMIN_SETUP_KEY");
    if (!expectedSetupKey) {
      console.error("SUPER_ADMIN_SETUP_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Service not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (setupKey !== expectedSetupKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "create-super-admin") {
      // Create the user
      const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createError) {
        console.error("Error creating user:", createError);
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId = userData.user?.id;
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Failed to get user ID" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Assign super_admin role
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role: "super_admin" });

      if (roleError) {
        console.error("Error assigning role:", roleError);
        return new Response(
          JSON.stringify({ error: roleError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Super admin created successfully: ${email}`);
      return new Response(
        JSON.stringify({ success: true, userId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "remove-super-admin-role") {
      // Remove super_admin role from a user
      const { data: users, error: findError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (findError) {
        return new Response(
          JSON.stringify({ error: findError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const user = users.users.find(u => u.email === email);
      if (!user) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: deleteError } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", user.id)
        .eq("role", "super_admin");

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: deleteError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Super admin role removed from: ${email}`);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "create-pending-organizers") {
      // Get default plan
      const { data: defaultPlan } = await supabaseAdmin
        .from("subscription_plans")
        .select("id")
        .eq("is_default", true)
        .single();

      // Get all users
      const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (usersError) {
        return new Response(
          JSON.stringify({ error: usersError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get existing organizers
      const { data: existingOrganizers } = await supabaseAdmin
        .from("organizers")
        .select("user_id");

      const existingUserIds = new Set(existingOrganizers?.map(o => o.user_id) || []);

      // Get users with admin role (potential organizers)
      const { data: adminRoles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);

      // Filter users who:
      // 1. Have admin role OR are in auth.users
      // 2. Don't have an organizer profile
      // 3. Don't have super_admin role
      const { data: superAdminRoles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "super_admin");

      const superAdminUserIds = new Set(superAdminRoles?.map(r => r.user_id) || []);

      const usersWithoutProfile = usersData.users.filter(
        u => !existingUserIds.has(u.id) && !superAdminUserIds.has(u.id) && u.email
      );

      // Create pending organizer profiles with default social module
      const profilesToCreate = usersWithoutProfile.map(u => ({
        user_id: u.id,
        contact_email: u.email!,
        status: "pending",
        plan_id: defaultPlan?.id || null,
        active_modules: ["social"], // Default module
      }));

      if (profilesToCreate.length > 0) {
        const { error: insertError } = await supabaseAdmin
          .from("organizers")
          .insert(profilesToCreate);

        if (insertError) {
          console.error("Error creating organizer profiles:", insertError);
          return new Response(
            JSON.stringify({ error: insertError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      console.log(`Created ${profilesToCreate.length} pending organizer profiles`);
      return new Response(
        JSON.stringify({ success: true, count: profilesToCreate.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
