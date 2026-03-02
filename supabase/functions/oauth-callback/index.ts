import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    // Get the frontend origin for redirects
    const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://love-tables.lovable.app";

    if (error) {
      console.error("OAuth error from Google:", error);
      return Response.redirect(`${frontendUrl}/admin/dashboard?oauth_error=${encodeURIComponent(error)}`, 302);
    }

    if (!code || !state) {
      console.error("Missing code or state");
      return Response.redirect(`${frontendUrl}/admin/dashboard?oauth_error=missing_params`, 302);
    }

    // Decode state
    let stateData: { organizer_id: string; user_id: string; timestamp: number };
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      console.error("Invalid state parameter");
      return Response.redirect(`${frontendUrl}/admin/dashboard?oauth_error=invalid_state`, 302);
    }

    // Check state isn't too old (15 min max)
    if (Date.now() - stateData.timestamp > 15 * 60 * 1000) {
      console.error("State expired");
      return Response.redirect(`${frontendUrl}/admin/dashboard?oauth_error=expired`, 302);
    }

    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/oauth-callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("Token exchange failed:", errText);
      return Response.redirect(`${frontendUrl}/admin/dashboard?oauth_error=token_exchange_failed`, 302);
    }

    const tokens = await tokenResponse.json();
    console.log("Tokens obtained successfully");

    // Get user's email from Google
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    let emailAddress = "unknown";
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      emailAddress = userInfo.email || "unknown";
    }

    // Store tokens in database
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    // Upsert the connection (replace if exists for this organizer+provider)
    const { error: upsertError } = await supabase
      .from("organizer_email_connections")
      .upsert(
        {
          organizer_id: stateData.organizer_id,
          provider: "gmail",
          email_address: emailAddress,
          refresh_token: tokens.refresh_token,
          access_token: tokens.access_token,
          token_expires_at: expiresAt,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organizer_id,provider" }
      );

    if (upsertError) {
      console.error("Failed to store tokens:", upsertError);
      return Response.redirect(`${frontendUrl}/admin/dashboard?oauth_error=storage_failed`, 302);
    }

    console.log(`OAuth connection saved for organizer ${stateData.organizer_id} (${emailAddress})`);
    return Response.redirect(`${frontendUrl}/admin/dashboard?oauth_success=true&email=${encodeURIComponent(emailAddress)}`, 302);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("OAuth callback error:", errMsg);
    const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://love-tables.lovable.app";
    return Response.redirect(`${frontendUrl}/admin/dashboard?oauth_error=internal`, 302);
  }
});
