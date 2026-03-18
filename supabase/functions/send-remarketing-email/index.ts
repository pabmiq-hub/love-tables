import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { organizer_id, target_event_id, target_event_name, registration_link, subject, body, recipients } = await req.json();

    // Verify organizer owns this
    const { data: org } = await supabase
      .from("organizers")
      .select("id, company_name")
      .eq("id", organizer_id)
      .eq("user_id", user.id)
      .single();
    if (!org) throw new Error("Organizer not found");

    // Check for CRM feature
    const { data: hasFeature } = await supabase.rpc("has_feature", {
      _user_id: user.id,
      _feature_code: "crm",
    });
    if (!hasFeature) throw new Error("CRM feature not available in your plan");

    // Get Resend config - organizer's own or platform default
    let resendApiKey = Deno.env.get("RESEND_API_KEY")!;
    let senderEmail = "hola@konektum.com";
    let senderName = "Konektum";

    const { data: resendConfig } = await supabase
      .from("organizer_resend_config")
      .select("*")
      .eq("organizer_id", organizer_id)
      .eq("is_verified", true)
      .single();

    if (resendConfig) {
      resendApiKey = resendConfig.resend_api_key;
      senderEmail = resendConfig.sender_email;
      senderName = resendConfig.sender_name || org.company_name || "Konektum";
    }

    // Create campaign record
    const { data: campaign, error: campaignError } = await supabase
      .from("remarketing_campaigns")
      .insert({
        organizer_id,
        target_event_id,
        subject,
        body,
        recipients_count: recipients.length,
        status: "sending",
        recipients_filter: { mode: "manual", count: recipients.length },
      })
      .select("id")
      .single();

    if (campaignError) throw campaignError;

    let sentCount = 0;
    let errorCount = 0;

    for (const recipient of recipients) {
      try {
        const personalizedBody = body
          .replace(/\{\{nombre\}\}/g, escapeHtml(recipient.name))
          .replace(/\{\{evento\}\}/g, escapeHtml(target_event_name))
          .replace(/\{\{enlace_inscripcion\}\}/g, registration_link);

        const personalizedSubject = subject
          .replace(/\{\{nombre\}\}/g, recipient.name)
          .replace(/\{\{evento\}\}/g, target_event_name);

        const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px">
    <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
      ${personalizedBody}
    </div>
    <p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:24px">
      Enviado por ${escapeHtml(senderName)}
    </p>
  </div>
</body>
</html>`;

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: `${senderName} <${senderEmail}>`,
            to: [recipient.email],
            subject: personalizedSubject,
            html: emailHtml,
          }),
        });

        const result = await res.json();

        await supabase.from("remarketing_recipients").insert({
          campaign_id: campaign.id,
          global_participant_id: recipient.global_participant_id,
          email: recipient.email,
          status: res.ok ? "sent" : "failed",
          sent_at: res.ok ? new Date().toISOString() : null,
          error_message: res.ok ? null : JSON.stringify(result),
        });

        if (res.ok) {
          sentCount++;
        } else {
          errorCount++;
          if (res.status === 429) {
            // Rate limited - wait and retry
            const retryAfter = parseInt(res.headers.get("Retry-After") || "2");
            await new Promise(r => setTimeout(r, retryAfter * 1000));
          }
        }

        // Rate limit: 350ms between sends
        await new Promise(r => setTimeout(r, 350));
      } catch (err) {
        errorCount++;
        await supabase.from("remarketing_recipients").insert({
          campaign_id: campaign.id,
          global_participant_id: recipient.global_participant_id,
          email: recipient.email,
          status: "failed",
          error_message: String(err),
        });
      }
    }

    // Update campaign status
    await supabase
      .from("remarketing_campaigns")
      .update({
        status: errorCount === recipients.length ? "failed" : "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", campaign.id);

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, errors: errorCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
