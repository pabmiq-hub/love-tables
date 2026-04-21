import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

function nl2br(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

async function sendWithRetry(resend: any, emailPayload: any, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await resend.emails.send(emailPayload);
    if (result.error) {
      console.error(`[send-waitlist-confirmation] Attempt ${attempt + 1} error:`, result.error);
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eventId, name, email, position } = await req.json();

    if (!eventId || !name || !email) {
      return new Response(
        JSON.stringify({ error: "Faltan campos obligatorios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, name, date, language, event_time, event_location, organizer_id, email_template, is_test_event, test_config")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      console.error("[send-waitlist-confirmation] Event not found:", eventError);
      return new Response(
        JSON.stringify({ error: "Evento no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Test event: short-circuit
    if ((event as any).is_test_event) {
      const testConfig = (event as any).test_config || {};
      const redirect = typeof testConfig.redirectEmail === 'string' ? testConfig.redirectEmail.trim() : '';
      if (!redirect || testConfig.disableEmails === true) {
        console.log(`[send-waitlist-confirmation] Skipped: event ${eventId} is in test mode`);
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: "test_event" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const lang = event.language || 'es';
    const isEn = lang === 'en';

    // Format event date
    const eventDate = new Date(event.date);
    const formattedDate = eventDate.toLocaleDateString(isEn ? "en-US" : "es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = event.event_time || '';
    const formattedDateTime = formattedTime ? `${formattedDate}, ${formattedTime}` : formattedDate;

    // Load organizer branding
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

    // Read branding from email template
    const emailTemplate = event.email_template as any;
    const communicationTemplate = emailTemplate?.communication_templates_v2 || emailTemplate || {};
    const primaryColor = communicationTemplate?.primaryColor || emailTemplate?.primaryColor || "#e11d48";
    const logoUrl = communicationTemplate?.logoUrl || emailTemplate?.logoUrl || defaultLogoUrl;
    const brandName = communicationTemplate?.brandName || emailTemplate?.brandName || defaultBrandName;
    const rawLogoHeight = Number(communicationTemplate?.logoHeight ?? emailTemplate?.logoHeight ?? 48);
    const logoHeight = Number.isFinite(rawLogoHeight) ? Math.min(120, Math.max(24, rawLogoHeight)) : 48;

    const safeName = escapeHtml(name);
    const safeEventName = escapeHtml(event.name);
    const safeBrandName = escapeHtml(brandName);

    const subject = isEn
      ? `You're on the waitlist - ${event.name}`
      : `Estás en la lista de espera - ${event.name}`;

    const emailPayload = {
      from: `${brandName} <noreply@konektum.com>`,
      to: [email],
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background: ${primaryColor}; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            ${logoUrl ? `<img src="${logoUrl}" alt="${safeBrandName}" style="max-height: ${logoHeight}px; max-width: 260px; margin-bottom: 12px;" />` : ''}
            <h1 style="color: white; margin: 0; font-size: 28px;">⏳ ${isEn ? 'Waitlist Confirmation' : 'Lista de espera'}</h1>
          </div>

          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="font-size: 18px; margin-bottom: 20px;">
              ${isEn ? `Hi ${safeName}!` : `¡Hola ${safeName}!`}
            </p>

            <div style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              ${isEn
                ? `We've received your registration for <strong>${safeEventName}</strong>. Registration is currently full, but you've been added to the waitlist.`
                : `Hemos recibido tu inscripción para <strong>${safeEventName}</strong>. Las inscripciones están completas, pero has sido añadido/a a la lista de espera.`
              }
            </div>

            <div style="background: #fef3c7; border-radius: 10px; padding: 25px; margin: 25px 0; text-align: center; border-left: 4px solid #f59e0b;">
              <div style="font-size: 48px; margin-bottom: 10px;">⏳</div>
              <p style="font-weight: bold; color: #92400e; font-size: 18px; margin: 0;">
                ${isEn
                  ? `Your position: #${position || '—'}`
                  : `Tu posición: #${position || '—'}`
                }
              </p>
            </div>

            <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="font-weight: bold; color: #333; margin: 0 0 10px 0;">
                📅 ${isEn ? 'Event details' : 'Detalles del evento'}
              </p>
              <p style="margin: 5px 0; color: #555;">
                <strong>${safeEventName}</strong><br>
                📅 ${formattedDateTime}<br>
                ${event.event_location ? `📍 ${escapeHtml(event.event_location)}` : ''}
              </p>
            </div>

            <div style="color: #555; font-size: 15px; line-height: 1.6; margin: 20px 0;">
              <p style="font-weight: bold;">${isEn ? 'What happens next?' : '¿Qué pasa ahora?'}</p>
              <ul style="padding-left: 20px;">
                <li style="margin-bottom: 8px;">
                  ${isEn
                    ? 'If a spot opens up, you\'ll be <strong>automatically registered</strong> in order of position.'
                    : 'Si se produce una baja, serás <strong>inscrito/a automáticamente</strong> en orden de posición.'
                  }
                </li>
                <li style="margin-bottom: 8px;">
                  ${isEn
                    ? 'You\'ll receive an <strong>email notification</strong> confirming your registration.'
                    : 'Recibirás un <strong>email de confirmación</strong> con tu inscripción.'
                  }
                </li>
                <li style="margin-bottom: 8px;">
                  ${isEn
                    ? 'No action needed on your part — we\'ll take care of everything.'
                    : 'No necesitas hacer nada — nosotros nos encargamos de todo.'
                  }
                </li>
              </ul>
            </div>
          </div>

          <div style="text-align: center; margin-top: 20px; color: #888; font-size: 12px;">
            <p>${isEn ? `Thanks for your patience!` : `¡Gracias por tu paciencia!`}<br>${safeBrandName} Team</p>
          </div>
        </body>
        </html>
      `,
    };

    // Check for organizer's own Resend config
    if (event.organizer_id) {
      const { data: resendConfig } = await supabase
        .from("organizer_resend_config")
        .select("resend_api_key, sender_email, sender_name")
        .eq("organizer_id", (await supabase.from("organizers").select("id").eq("user_id", event.organizer_id).single()).data?.id || '')
        .eq("is_verified", true)
        .maybeSingle();

      if (resendConfig) {
        emailPayload.from = `${resendConfig.sender_name || brandName} <${resendConfig.sender_email}>`;
      }
    }

    const emailResponse = await sendWithRetry(resend, emailPayload);

    if (emailResponse.error) {
      console.error("[send-waitlist-confirmation] Email send failed:", emailResponse.error);
      return new Response(
        JSON.stringify({ error: `Error al enviar email: ${emailResponse.error.message || 'Unknown error'}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[send-waitlist-confirmation] Email sent successfully to:", email);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[send-waitlist-confirmation] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
