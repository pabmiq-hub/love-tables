import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

function replaceVariables(text: string, vars: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(key, value);
  }
  return result;
}

function nl2br(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

async function generateUniqueCode(supabase: any): Promise<string> {
  let attempts = 0;
  while (attempts < 10) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const { data: existing } = await supabase
      .from('participants')
      .select('id')
      .eq('verification_code', code)
      .maybeSingle();
    if (!existing) return code;
    attempts++;
  }
  throw new Error('Could not generate unique verification code');
}

async function sendWithRetry(resendInstance: any, emailPayload: any, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await resendInstance.emails.send(emailPayload);
    if (result.error) {
      if (result.error.statusCode === 429 && attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      return result;
    }
    return result;
  }
  return { error: { message: "Rate limit exceeded after retries", statusCode: 429 } };
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find events with automatic mode that are within 24h and not yet processed
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id, name, date, event_time, event_location, language, organizer_id, email_template")
      .eq("code_send_mode", "automatic")
      .in("status", ["pending", "active"])
      .lte("date", in24h.toISOString().split('T')[0]);

    if (eventsError) {
      console.error("[send-automatic-codes] Error fetching events:", eventsError);
      throw eventsError;
    }

    console.log(`[send-automatic-codes] Found ${events?.length || 0} potential events`);

    let totalSent = 0;
    let totalErrors = 0;

    for (const event of events || []) {
      // Compute exact event datetime
      const eventDateStr = event.date;
      let eventDateTime = new Date(eventDateStr + 'T00:00:00');
      if (event.event_time) {
        const timeParts = event.event_time.match(/(\d{1,2}):(\d{2})/);
        if (timeParts) {
          eventDateTime = new Date(`${eventDateStr}T${timeParts[1].padStart(2, '0')}:${timeParts[2]}:00`);
        }
      }

      const twentyFourBefore = new Date(eventDateTime.getTime() - 24 * 60 * 60 * 1000);
      
      // Only process if we're within the 24h window
      if (now < twentyFourBefore) {
        console.log(`[send-automatic-codes] Event ${event.name} not yet within 24h window, skipping`);
        continue;
      }

      // Find participants WITHOUT verification_code and WITH email
      const { data: participants, error: pError } = await supabase
        .from("participants")
        .select("id, name, email")
        .eq("event_id", event.id)
        .is("verification_code", null)
        .not("email", "is", null);

      if (pError) {
        console.error(`[send-automatic-codes] Error fetching participants for ${event.id}:`, pError);
        continue;
      }

      if (!participants || participants.length === 0) {
        console.log(`[send-automatic-codes] No participants need codes for event ${event.name}`);
        continue;
      }

      console.log(`[send-automatic-codes] Sending codes to ${participants.length} participants for event ${event.name}`);

      const lang = event.language || 'es';
      const isEn = lang === 'en';

      // Load branding
      const KONEKTUM_LOGO_URL = "https://konektum.com/konektum-logo.png";
      let defaultLogoUrl = KONEKTUM_LOGO_URL;
      let defaultBrandName = "Konektum";
      
      if (event.organizer_id) {
        const { data: organizer } = await supabase
          .from("organizers")
          .select("company_name, logo_url, active_modules")
          .eq("user_id", event.organizer_id)
          .maybeSingle();
        
        if (organizer) {
          const modules = organizer.active_modules || [];
          const isProfessionalOnly = modules.length === 1 && modules[0] === "professional";
          if (isProfessionalOnly && organizer.logo_url) {
            defaultLogoUrl = organizer.logo_url;
            defaultBrandName = organizer.company_name || "Konektum";
          }
        }
      }

      // Template resolution
      const emailTemplate = event.email_template as any;
      const communicationTemplate = emailTemplate?.communication_templates_v2 || emailTemplate || {};
      const tpl = communicationTemplate?.checkin_code;
      const primaryColor = communicationTemplate?.primaryColor || "#e11d48";
      const logoUrl = communicationTemplate?.logoUrl || defaultLogoUrl;
      const brandName = communicationTemplate?.brandName || defaultBrandName;
      const headerTitle = communicationTemplate?.headerTitle || (isEn ? "Welcome to the event!" : "¡Bienvenido/a al evento!");
      const rawLogoHeight = Number(communicationTemplate?.logoHeight ?? 48);
      const logoHeight = Number.isFinite(rawLogoHeight) ? Math.min(120, Math.max(24, rawLogoHeight)) : 48;

      // Countdown text
      const hoursUntil = Math.max(0, Math.round((eventDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)));
      const countdownText = isEn
        ? `⏰ The event starts in approximately ${hoursUntil} hours!`
        : `⏰ ¡El evento comienza en aproximadamente ${hoursUntil} horas!`;

      // Organizer's Resend config
      let senderFrom = `${brandName} <noreply@konektum.com>`;
      if (event.organizer_id) {
        const { data: resendConfig } = await supabase
          .from("organizer_resend_config")
          .select("resend_api_key, sender_email, sender_name")
          .eq("organizer_id", (await supabase.from("organizers").select("id").eq("user_id", event.organizer_id).single()).data?.id || '')
          .eq("is_verified", true)
          .maybeSingle();
        if (resendConfig) {
          senderFrom = `${resendConfig.sender_name || brandName} <${resendConfig.sender_email}>`;
        }
      }

      const publishedBaseUrl = "https://konektum.com";

      for (const participant of participants) {
        if (!participant.email) continue;

        try {
          // Generate unique code
          const code = await generateUniqueCode(supabase);

          // Save code to participant
          const { error: updateError } = await supabase
            .from("participants")
            .update({ verification_code: code })
            .eq("id", participant.id);

          if (updateError) {
            console.error(`[send-automatic-codes] Error saving code for ${participant.name}:`, updateError);
            totalErrors++;
            continue;
          }

          const vars: Record<string, string> = {
            "{{nombre}}": participant.name,
            "{{evento}}": event.name,
            "{{codigo}}": code,
          };

          const subject = tpl?.subject
            ? replaceVariables(tpl.subject, vars)
            : (isEn ? `Your access code - ${event.name}` : `Tu código de acceso - ${event.name}`);
          
          const greeting = tpl?.greeting
            ? replaceVariables(tpl.greeting, vars)
            : (isEn ? `Hi ${participant.name}!` : `¡Hola ${participant.name}!`);
          
          const intro = tpl?.intro
            ? replaceVariables(tpl.intro, vars)
            : (isEn
              ? `You have been registered for the event ${event.name}. Use this code to check in and access your panel.`
              : `Has sido registrado/a en el evento ${event.name}. Usa este código para hacer tu check-in y acceder a tu panel.`);
          
          const closing = tpl?.closing
            ? replaceVariables(tpl.closing, vars)
            : (isEn ? "Save this code, you will need it during and after the event." : "Guarda este código, lo necesitarás durante y después del evento.");
          
          const signature = tpl?.signature
            ? replaceVariables(tpl.signature, vars)
            : (isEn ? `Enjoy the event!\n${brandName} Team` : `¡Disfruta del evento!\nEquipo ${brandName}`);

          const accessUrl = `${publishedBaseUrl}/event/${event.id}/access`;

          const emailPayload = {
            from: senderFrom,
            to: [participant.email],
            subject,
            html: `
              <!DOCTYPE html>
              <html>
              <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
              <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
                <div style="background: ${primaryColor}; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                  ${logoUrl ? `<img src="${logoUrl}" alt="${escapeHtml(brandName)}" style="max-height: ${logoHeight}px; max-width: 260px; margin-bottom: 12px;" />` : ''}
                  <h1 style="color: white; margin: 0; font-size: 28px;">${escapeHtml(headerTitle)}</h1>
                </div>
                
                <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                  <p style="font-size: 18px; margin-bottom: 20px;">${nl2br(greeting)}</p>
                  
                  <div style="background: #fff3cd; border-radius: 8px; padding: 16px; margin-bottom: 20px; text-align: center; border: 1px solid #ffc107;">
                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: #856404;">${countdownText}</p>
                  </div>
                  
                  <div style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                    ${nl2br(intro)}
                  </div>
                  
                  <div style="background: #f8f9fa; border-radius: 10px; padding: 25px; margin: 25px 0; text-align: center;">
                    <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">${isEn ? 'Your personal access code:' : 'Tu código personal de acceso:'}</p>
                    <div style="background: ${primaryColor}; color: white; font-size: 36px; font-weight: bold; letter-spacing: 8px; padding: 20px; border-radius: 8px; font-family: 'Courier New', monospace;">
                      ${code}
                    </div>
                  </div>
                  
                  <p style="font-weight: bold; color: #333;">${isEn ? 'With this code you can:' : 'Con este código puedes:'}</p>
                  <ul style="color: #555; padding-left: 20px;">
                    <li style="margin-bottom: 10px;">✅ <strong>${isEn ? 'Check in' : 'Hacer check-in'}</strong> ${isEn ? 'when you arrive at the event' : 'al llegar al evento'}</li>
                    <li style="margin-bottom: 10px;">🪑 <strong>${isEn ? 'See your tables' : 'Ver tus mesas'}</strong> ${isEn ? 'assigned in each round' : 'asignadas en cada ronda'}</li>
                    <li style="margin-bottom: 10px;">💕 <strong>${isEn ? 'Send your selections' : 'Enviar tus selecciones'}</strong> ${isEn ? 'after the event' : 'después del evento'}</li>
                  </ul>
                  
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                    <p style="font-weight: bold; margin-bottom: 15px;">${isEn ? 'Access your panel:' : 'Accede a tu panel:'}</p>
                    <div style="text-align: center;">
                      <a href="${accessUrl}" style="display: inline-block; background: ${primaryColor}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                        🎫 ${isEn ? 'My event panel' : 'Mi panel del evento'}
                      </a>
                    </div>
                  </div>
                  
                  <div style="margin-top: 30px; padding: 15px; background: #fff3cd; border-radius: 5px; border-left: 4px solid #ffc107;">
                    <p style="margin: 0; color: #856404; font-size: 14px;">
                      <strong>⚠️ ${isEn ? 'Important:' : 'Importante:'}</strong> ${nl2br(closing)}
                    </p>
                  </div>
                </div>
                
                <div style="text-align: center; margin-top: 20px; color: #888; font-size: 12px;">
                  <p>${nl2br(signature)}</p>
                </div>
              </body>
              </html>
            `,
          };

          const emailResponse = await sendWithRetry(resend, emailPayload);

          // Log
          const logStatus = emailResponse.error ? "failed" : "sent";
          const logError = emailResponse.error ? (emailResponse.error.message || JSON.stringify(emailResponse.error)) : null;
          
          await supabase.from("email_logs").insert({
            event_id: event.id,
            participant_id: participant.id,
            email_type: "automatic_code",
            status: logStatus,
            error_message: logError,
            sent_at: logStatus === "sent" ? new Date().toISOString() : null,
          });

          if (emailResponse.error) {
            console.error(`[send-automatic-codes] Failed for ${participant.name}:`, emailResponse.error);
            totalErrors++;
          } else {
            totalSent++;
          }

          // Rate limit delay
          await delay(400);
        } catch (e) {
          console.error(`[send-automatic-codes] Error processing ${participant.name}:`, e);
          totalErrors++;
        }
      }
    }

    console.log(`[send-automatic-codes] Complete. Sent: ${totalSent}, Errors: ${totalErrors}`);

    return new Response(
      JSON.stringify({ success: true, sent: totalSent, errors: totalErrors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[send-automatic-codes] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
